from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services import ml_service, physics_service
from app.database import database

router = APIRouter()


class PredictionRequest(BaseModel):
    mass: float = Field(..., gt=0, description="Mass of projectile in kg")
    velocity: float = Field(..., ge=0, description="Launch velocity in m/s")
    height: float = Field(..., ge=0, description="Launch height in meters")
    gravity: float = Field(default=9.8, gt=0, description="Gravitational acceleration in m/s^2")
    force: float = Field(..., ge=0, description="Applied or gravitational force in N")
    kinetic_energy: float = Field(..., ge=0, description="Kinetic energy in Joules")
    potential_energy: float = Field(..., ge=0, description="Potential energy in Joules")
    total_energy: float = Field(..., ge=0, description="Total mechanical energy in Joules")
    work_done: float = Field(..., ge=0, description="Work done in Joules")
    # Optional parameters for kinematics / trajectory calculation
    launch_angle: Optional[float] = Field(default=45.0, ge=0, le=90, description="Launch angle in degrees")
    save_to_history: Optional[bool] = Field(default=True, description="Whether to record in SQLite database")


class DerivedFeaturesRequest(BaseModel):
    mass: float = Field(..., gt=0)
    velocity: float = Field(..., ge=0)
    height: float = Field(default=0.0, ge=0)
    gravity: float = Field(default=9.8, gt=0)


class TheoreticalCalculationRequest(BaseModel):
    velocity: float = Field(..., ge=0)
    angle_deg: float = Field(..., ge=0, le=90)
    launch_height: float = Field(default=0.0, ge=0)
    gravity: float = Field(default=9.8, gt=0)
    mass: float = Field(default=1.0, gt=0)


@router.get("/model-info")
def get_model_info():
    """Returns verified metadata and feature specification of the trained ML model."""
    info = ml_service.get_model_info()
    return info


@router.get("/status")
def model_status():
    """Checks whether the original trained model is ready for predictions."""
    loaded = ml_service.is_model_loaded()
    return {
        "model_loaded": loaded,
        "message": "Original trained model is active and ready." if loaded else "Model not found."
    }


@router.post("/compute-derived-features")
def compute_derived(req: DerivedFeaturesRequest):
    """
    Computes standard physical energy features (KE, PE, Total Energy, Force, Work Done)
    from fundamental mechanics to populate the 9 model input features.
    """
    derived = physics_service.compute_derived_features(
        mass=req.mass,
        velocity=req.velocity,
        height=req.height,
        gravity=req.gravity,
    )
    return derived


@router.post("/calculate-theoretical")
def calculate_theoretical(req: TheoreticalCalculationRequest):
    """Computes theoretical projectile kinematics and trajectory coordinates."""
    result = physics_service.calculate_theoretical_trajectory(
        velocity=req.velocity,
        angle_deg=req.angle_deg,
        launch_height=req.launch_height,
        gravity=req.gravity,
        mass=req.mass,
    )
    return result


@router.post("/predict")
def predict(req: PredictionRequest):
    """
    Executes prediction using the original trained ML model.
    Enforces exact 9 input features in trained order and optionally calculates
    theoretical trajectory for side-by-side comparison.
    """
    try:
        features_dict = {
            "mass": req.mass,
            "velocity": req.velocity,
            "height": req.height,
            "gravity": req.gravity,
            "force": req.force,
            "kinetic_energy": req.kinetic_energy,
            "potential_energy": req.potential_energy,
            "total_energy": req.total_energy,
            "work_done": req.work_done,
        }

        # 1. Run actual ML prediction with the original model
        ml_result = ml_service.predict_distance(features_dict)
        predicted_distance = ml_result["predicted_distance"]

        # 2. Compute theoretical kinematics for comparison
        theoretical = physics_service.calculate_theoretical_trajectory(
            velocity=req.velocity,
            angle_deg=req.launch_angle if req.launch_angle is not None else 45.0,
            launch_height=req.height,
            gravity=req.gravity,
            mass=req.mass,
        )

        difference = round(abs(predicted_distance - theoretical["theoretical_range"]), 4)

        response_payload = {
            "success": True,
            "ml_prediction": {
                "predicted_distance": predicted_distance,
                "unit": "meters",
                "model_name": ml_result["model_name"],
                "features_used": ml_result["features_used"],
            },
            "theoretical_physics": theoretical,
            "comparison": {
                "difference_meters": difference,
                "note": "ML model predicts real-world basketball/drag distance based on energy features, while theoretical calculation assumes ideal kinematic equations."
            }
        }

        # 3. Save to SQLite database if requested
        if req.save_to_history:
            history_data = {
                **features_dict,
                "launch_angle": req.launch_angle,
                "predicted_distance": predicted_distance,
                "theoretical_range": theoretical["theoretical_range"],
                "max_height": theoretical["max_height"],
                "flight_time": theoretical["flight_time"],
                "model_name": ml_result["model_name"],
            }
            record_id = database.save_simulation(history_data)
            response_payload["saved_record_id"] = record_id

        return response_payload

    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@router.get("/history")
def get_history(limit: int = Query(default=100, ge=1, le=500)):
    """Retrieves previous simulation runs from SQLite database."""
    history = database.get_all_simulations(limit=limit)
    return {"count": len(history), "history": history}


@router.delete("/history/{record_id}")
def delete_record(record_id: int):
    """Deletes a single simulation record from the history."""
    deleted = database.delete_simulation(record_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Simulation record not found.")
    return {"success": True, "message": f"Record {record_id} deleted."}


@router.delete("/history")
def clear_history():
    """Clears all simulation records."""
    count = database.clear_simulations()
    return {"success": True, "deleted_count": count}
