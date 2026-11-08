import os
import joblib
import pickle
import warnings
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Any, Dict, List, Optional

# Resolve model path relative to this backend app
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"
PRIMARY_MODEL_PATH = MODEL_DIR / "projectile_model.pkl"
FALLBACK_MODEL_PATH = MODEL_DIR / "best_random_forest_model.pkl"

_model: Optional[Any] = None
_model_metadata: Dict[str, Any] = {}

EXPECTED_FEATURES: List[str] = [
    "mass",
    "velocity",
    "height",
    "gravity",
    "force",
    "kinetic_energy",
    "potential_energy",
    "total_energy",
    "work_done",
]


def resolve_model_path() -> Optional[Path]:
    """Finds the available trained model file."""
    custom_path = os.getenv("MODEL_PATH")
    if custom_path:
        p = Path(custom_path)
        if p.exists() and p.stat().st_size > 0:
            return p

    if PRIMARY_MODEL_PATH.exists() and PRIMARY_MODEL_PATH.stat().st_size > 0:
        return PRIMARY_MODEL_PATH
    if FALLBACK_MODEL_PATH.exists() and FALLBACK_MODEL_PATH.stat().st_size > 0:
        return FALLBACK_MODEL_PATH

    return None


def load_model() -> Optional[Any]:
    """
    Loads the original trained Random Forest model safely.
    Preserves original training feature order and metadata.
    """
    global _model, _model_metadata
    model_path = resolve_model_path()
    if not model_path:
        print(f"[ML Service] No non-empty model file found in {MODEL_DIR}")
        return None

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            _model = joblib.load(model_path)
        print(f"[ML Service] Model successfully loaded via joblib from {model_path.name}")
    except Exception as e_joblib:
        try:
            with open(model_path, "rb") as f:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    _model = pickle.load(f)
            print(f"[ML Service] Model successfully loaded via pickle from {model_path.name}")
        except Exception as e_pickle:
            print(f"[ML Service] Error loading model: joblib ({e_joblib}), pickle ({e_pickle})")
            _model = None
            return None

    if _model is not None:
        feature_names = getattr(_model, "feature_names_in_", None)
        if feature_names is not None:
            feature_list = list(feature_names)
        else:
            feature_list = EXPECTED_FEATURES

        _model_metadata = {
            "model_type": type(_model).__name__,
            "sklearn_version": getattr(_model, "_sklearn_version", "1.6.1"),
            "n_estimators": len(getattr(_model, "estimators_", [])),
            "n_features_in": getattr(_model, "n_features_in_", len(feature_list)),
            "feature_names": feature_list,
            "target": "predicted_distance",
            "target_unit": "meters (m)",
            "model_file": model_path.name,
            "file_size_bytes": model_path.stat().st_size,
        }

    return _model


def get_model() -> Optional[Any]:
    """Returns the cached model instance, loading if necessary."""
    global _model
    if _model is None:
        _model = load_model()
    return _model


def is_model_loaded() -> bool:
    """Checks whether the model is loaded in memory."""
    return get_model() is not None


def get_model_info() -> Dict[str, Any]:
    """Returns verified model metadata and feature specification."""
    model = get_model()
    if model is None:
        return {
            "status": "unavailable",
            "message": "Model file not found or could not be loaded.",
            "expected_features": EXPECTED_FEATURES,
        }
    return {
        "status": "loaded",
        **_model_metadata,
    }


def predict_distance(features_dict: Dict[str, float]) -> Dict[str, Any]:
    """
    Predicts projectile distance using the original trained model.
    Enforces exact feature names and order without fabrication.
    """
    model = get_model()
    if model is None:
        raise RuntimeError("Model is not loaded. Ensure projectile_model.pkl exists.")

    feature_names = _model_metadata.get("feature_names", EXPECTED_FEATURES)

    # Validate all required features are present
    missing = [f for f in feature_names if f not in features_dict]
    if missing:
        raise ValueError(f"Missing required input features: {missing}")

    # Build input DataFrame matching exact feature names and order
    ordered_values = {f: [float(features_dict[f])] for f in feature_names}
    input_df = pd.DataFrame(ordered_values)

    # Execute model prediction
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        prediction_result = model.predict(input_df)

    predicted_val = float(prediction_result[0])

    return {
        "predicted_distance": round(predicted_val, 4),
        "unit": "meters",
        "model_name": _model_metadata.get("model_type", "RandomForestRegressor"),
        "features_used": {f: float(features_dict[f]) for f in feature_names},
    }
