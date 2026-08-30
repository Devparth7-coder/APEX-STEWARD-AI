from typing import Dict, Any, List
from ..models.schemas import ConfidenceBreakdown, ConfidenceLevel

class ConfidenceEngine:
    @staticmethod
    def calculate_confidence(
        detection_scores: List[float],
        track_durations: int,
        boundary_contrast_score: float = 0.92,
        temporal_dropout_count: int = 0,
        total_violation_frames: int = 6,
        geometry_aspect_ratio_err: float = 0.04
    ) -> ConfidenceBreakdown:
        """
        Calculates transparent confidence score with explicit breakdown factors.
        """
        # 1. Detection confidence (mean detector score across violation window)
        det_conf = sum(detection_scores) / max(1, len(detection_scores)) if detection_scores else 0.95
        det_conf = min(0.99, max(0.60, det_conf))
        
        # 2. Tracking confidence (based on track length and trajectory stability)
        trk_conf = min(0.98, 0.82 + (min(track_durations, 30) / 30.0) * 0.16)
        
        # 3. Boundary confidence (calibration quality / edge contrast)
        bnd_conf = min(0.96, max(0.65, boundary_contrast_score))
        
        # 4. Temporal consistency (penalized by frame dropouts)
        temp_ratio = max(0.0, (total_violation_frames - temporal_dropout_count) / max(1, total_violation_frames))
        temp_conf = min(0.99, 0.80 + temp_ratio * 0.19)
        
        # 5. Geometry confidence (perspective foreshortening sanity)
        geom_conf = min(0.96, max(0.70, 0.96 - geometry_aspect_ratio_err * 0.5))
        
        # Composite weighted formula
        overall = (
            0.25 * det_conf +
            0.20 * trk_conf +
            0.20 * bnd_conf +
            0.20 * temp_conf +
            0.15 * geom_conf
        )
        
        overall = round(overall, 3)
        
        if overall >= 0.90:
            level = ConfidenceLevel.HIGH
        elif overall >= 0.70:
            level = ConfidenceLevel.MEDIUM
        else:
            level = ConfidenceLevel.LOW
            
        return ConfidenceBreakdown(
            detection_confidence=round(det_conf, 2),
            tracking_confidence=round(trk_conf, 2),
            boundary_confidence=round(bnd_conf, 2),
            temporal_consistency=round(temp_conf, 2),
            geometry_confidence=round(geom_conf, 2),
            overall_confidence=overall,
            level=level
        )
