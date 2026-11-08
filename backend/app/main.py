import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.routes import prediction, chatbot
from app.services import ml_service
from app.database import database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB and load ML model once
    print("[Startup] Initializing SQLite database...")
    database.init_db()
    print("[Startup] Loading original ML model...")
    model = ml_service.load_model()
    if model:
        print("[Startup] Model successfully initialized in memory.")
    else:
        print("[Startup] Warning: Model could not be loaded at startup.")
    yield
    # Shutdown
    print("[Shutdown] Cleaning up resources.")


app = FastAPI(
    title="AI-Based Projectile Motion Prediction API",
    description="Scientific Backend API for Projectile Motion Kinematics and Machine Learning Prediction",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ai-based-projectile-motion-prediction.vercel.app",
]

# Allow custom frontend domain(s) if provided in environment variables
env_origins = os.environ.get("ALLOWED_ORIGINS", "") + "," + os.environ.get("FRONTEND_URL", "")
for url in env_origins.split(","):
    trimmed = url.strip().rstrip("/")
    if trimmed and trimmed not in origins:
        origins.append(trimmed)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app|https?://localhost.*|https?://127\.0\.0\.1.*|https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Route Mounts
app.include_router(prediction.router, prefix="/api/prediction", tags=["Prediction"])
app.include_router(chatbot.router, prefix="/api/chatbot", tags=["AI Tutor"])
app.include_router(chatbot.router, prefix="/api/assistant", tags=["AI Assistant (Alias)"])


@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "online",
        "service": "AI-Based Projectile Motion Prediction API",
        "model_loaded": ml_service.is_model_loaded(),
        "endpoints": {
            "model_info": "/api/prediction/model-info",
            "predict": "/api/prediction/predict",
            "history": "/api/prediction/history",
            "assistant_chat": "/api/assistant/chat",
            "docs": "/docs",
        },
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)

