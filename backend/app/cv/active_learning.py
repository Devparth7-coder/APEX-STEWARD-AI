import os
import json
import time
from typing import List, Dict, Any, Optional

class ActiveLearningManager:
    def __init__(self, storage_dir: str = "/home/user/apex-steward-ai/backend/static/datasets"):
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
        self.feedback_file = os.path.join(storage_dir, "active_learning_feedback.json")
        self.feedback_records: List[Dict[str, Any]] = self._load_records()

    def _load_records(self) -> List[Dict[str, Any]]:
        if os.path.exists(self.feedback_file):
            try:
                with open(self.feedback_file, "r") as f:
                    return json.load(f)
            except Exception:
                return []
        return []

    def _save_records(self):
        try:
            with open(self.feedback_file, "w") as f:
                json.dump(self.feedback_records, f, indent=2)
        except Exception as e:
            print(f"Error saving active learning feedback: {e}")

    def log_steward_feedback(
        self,
        incident_id: str,
        car_number: str,
        ai_recommendation: str,
        steward_decision: str,
        steward_penalty: str,
        reviewer_name: str,
        reason: str,
        max_excursion_cm: float,
        confidence_breakdown: Dict[str, Any],
        key_frames: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Stores steward decision as supervised active learning feedback.
        """
        is_agreement = (ai_recommendation == "PENALTY_RECOMMENDED" and steward_decision == "CONFIRMED") or \
                       (ai_recommendation == "REVIEW_REQUIRED" and steward_decision in ["CONFIRMED", "REJECTED"])
        
        record = {
            "feedback_id": f"AL-{int(time.time() * 1000)}",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "incident_id": incident_id,
            "car_number": car_number,
            "ai_recommendation": ai_recommendation,
            "steward_decision": steward_decision,
            "steward_penalty": steward_penalty,
            "reviewer_name": reviewer_name,
            "steward_reason": reason,
            "agreement_with_ai": is_agreement,
            "max_excursion_cm": max_excursion_cm,
            "confidence_scores": confidence_breakdown,
            "annotated_frames_count": len(key_frames),
            "exportable_for_training": True,
            "loss_weight": 2.0 if not is_agreement else 1.0 # Hard negative mining
        }
        
        self.feedback_records.insert(0, record)
        self._save_records()
        return record

    def get_all_feedback(self) -> List[Dict[str, Any]]:
        return self.feedback_records

    def get_stats(self) -> Dict[str, Any]:
        total = len(self.feedback_records)
        agreements = sum(1 for r in self.feedback_records if r.get("agreement_with_ai", False))
        disagreements = total - agreements
        return {
            "total_supervised_samples": total,
            "steward_agreements": agreements,
            "hard_negatives_identified": disagreements,
            "retraining_queue_ready": total >= 5,
            "dataset_version": "v1.4.2-active-learning"
        }
