from fastapi import APIRouter, HTTPException, UploadFile, File
import cv2
import numpy as np
from ..database.store import db
from ..models.schemas import BoundaryCalibration, Point2D

router = APIRouter(prefix="/api/calibration", tags=["Track Boundary Calibration"])

@router.get("/{circuit_turn}", response_model=BoundaryCalibration)
async def get_calibration(circuit_turn: str):
    return db.boundary_mgr.get_calibration(circuit_turn)

@router.post("/{circuit_turn}/save", response_model=BoundaryCalibration)
async def save_calibration(circuit_turn: str, calibration: BoundaryCalibration):
    db.boundary_mgr.set_calibration(circuit_turn, calibration)
    return calibration

@router.post("/auto-detect", response_model=BoundaryCalibration)
async def auto_detect_boundary(file: UploadFile = File(None)):
    """
    Mode B: Computer vision boundary auto-segmentation using OpenCV.
    """
    if file:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    else:
        # Generate sample frame
        img = np.zeros((720, 1280, 3), dtype=np.uint8)
        db.video_gen._draw_track_surface(img, 1280, 720)
        
    pts = db.boundary_mgr.run_cv_boundary_segmentation(img)
    
    calib = db.boundary_mgr.get_calibration("red_bull_ring_turn9")
    calib.boundary_polyline = pts
    calib.mode = "CV_EDGE_SEGMENTATION"
    calib.updated_at = "Auto-detected by OpenCV CV Engine"
    calib.updated_by = "APEX Computer Vision Segmenter"
    
    db.boundary_mgr.set_calibration("red_bull_ring_turn9", calib)
    return calib
