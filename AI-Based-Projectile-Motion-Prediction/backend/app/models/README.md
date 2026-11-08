# Model Directory

### 📌 PASTE YOUR TRAINED MODEL HERE:
Replace or paste your pre-trained model file as:
```
backend/app/models/projectile_model.pkl
```

### Important Notes:
- Keep the filename as `projectile_model.pkl` (or configure via `.env` `MODEL_PATH`).
- Supported serialization formats: Scikit-learn models serialized with `joblib.dump()` or `pickle.dump()`.
- Do not commit large binary models (>50MB) directly to public git repositories if using Git LFS / GitHub limits.
