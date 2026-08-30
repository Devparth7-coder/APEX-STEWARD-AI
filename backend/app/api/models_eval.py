from fastapi import APIRouter
from typing import List, Dict, Any
from ..database.store import db
from ..models.schemas import ModelBenchmarkMetrics

router = APIRouter(prefix="/api/models", tags=["Model Performance & Active Learning"])

@router.get("/benchmarks", response_model=List[ModelBenchmarkMetrics])
async def get_model_benchmarks():
    return db.benchmarks

@router.get("/active-learning")
async def get_active_learning_queue() -> Dict[str, Any]:
    feedback = db.active_learning_mgr.get_all_feedback()
    stats = db.active_learning_mgr.get_stats()
    return {
        "stats": stats,
        "queue": feedback
    }

@router.post("/active-learning/trigger-export")
async def export_active_learning_dataset() -> Dict[str, Any]:
    feedback = db.active_learning_mgr.get_all_feedback()
    return {
        "status": "SUCCESS",
        "exported_samples": len(feedback),
        "dataset_archive": "/media/datasets/active_learning_feedback.json",
        "message": f"Exported {len(feedback)} supervised steward annotations for PyTorch fine-tuning."
    }
