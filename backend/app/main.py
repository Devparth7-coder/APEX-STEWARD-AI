import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api.races import router as races_router
from .api.incidents import router as incidents_router
from .api.calibration import router as calibration_router
from .api.analysis import router as analysis_router
from .api.analytics import router as analytics_router
from .api.models_eval import router as models_router
from .api.ws import router as ws_router

app = FastAPI(
    title="APEX STEWARD AI — Race Intelligence Backend",
    description="Computer Vision & Multimodal Motorsport Decision-Support System for Race Stewards",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure static directories exist
static_root = "/home/user/apex-steward-ai/backend/static"
os.makedirs(os.path.join(static_root, "videos"), exist_ok=True)
os.makedirs(os.path.join(static_root, "evidence"), exist_ok=True)
os.makedirs(os.path.join(static_root, "datasets"), exist_ok=True)

# Mount media static files
app.mount("/media", StaticFiles(directory=static_root), name="media")

# Include API routers
app.include_router(races_router)
app.include_router(incidents_router)
app.include_router(calibration_router)
app.include_router(analysis_router)
app.include_router(analytics_router)
app.include_router(models_router)
app.include_router(ws_router)

@app.get("/")
async def root():
    return {
        "system": "APEX STEWARD AI",
        "tagline": "AI that sees every boundary.",
        "status": "OPERATIONAL",
        "version": "1.0.0",
        "docs": "/docs"
    }
