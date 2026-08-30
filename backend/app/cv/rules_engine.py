import math
from typing import List, Dict, Any, Tuple, Optional
from ..models.schemas import Point2D, TyreContactPoints, VehicleDetection, ConfidenceBreakdown, ConfidenceLevel, TrackLimitIncident, CounterfactualShift, EvidenceFrame
from .boundary import TrackBoundaryManager

class MotorsportRulesEngine:
    def __init__(self, boundary_mgr: TrackBoundaryManager):
        self.boundary_mgr = boundary_mgr
        self.default_rule_profile = "FIA_ARTICLE_33_3" # All 4 wheels off track
        self.consecutive_frames_threshold = 3
        self.noise_margin_cm = 1.5

    def estimate_tyre_contact_points(
        self,
        bbox: List[float], # [x1, y1, x2, y2]
        heading_deg: float,
        boundary_polyline: List[Point2D],
        pixels_per_meter: float = 50.0
    ) -> TyreContactPoints:
        """
        Calculates 4 tyre contact points (FL, FR, RL, RR) based on 2D bounding box
        and vehicle orientation vector with perspective foreshortening.
        """
        x1, y1, x2, y2 = bbox
        bw = x2 - x1
        bh = y2 - y1
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0
        
        # Vehicle aspect ratio and tyre offsets
        # Tyres are positioned at ~15% inset from corners of bottom contact polygon
        # Wheelbase is represented in perspective
        rad = math.radians(heading_deg)
        cos_h = math.cos(rad)
        sin_h = math.sin(rad)
        
        # In frame coordinates, bottom of car touches road
        bottom_y = y2 - bh * 0.15
        top_contact_y = y2 - bh * 0.45
        
        fl_x = cx - (bw * 0.42 * cos_h) + (bh * 0.1 * sin_h)
        fl_y = top_contact_y - (bw * 0.1 * sin_h)
        
        fr_x = cx + (bw * 0.42 * cos_h) - (bh * 0.1 * sin_h)
        fr_y = top_contact_y + (bw * 0.1 * sin_h)
        
        rl_x = cx - (bw * 0.44 * cos_h) - (bh * 0.15 * sin_h)
        rl_y = bottom_y - (bw * 0.08 * sin_h)
        
        rr_x = cx + (bw * 0.44 * cos_h) + (bh * 0.15 * sin_h)
        rr_y = bottom_y + (bw * 0.08 * sin_h)
        
        pt_fl = Point2D(x=fl_x, y=fl_y)
        pt_fr = Point2D(x=fr_x, y=fr_y)
        pt_rl = Point2D(x=rl_x, y=rl_y)
        pt_rr = Point2D(x=rr_x, y=rr_y)
        
        # Calculate signed excursion distance for each tyre
        dist_fl = self.boundary_mgr.calculate_signed_distance_to_boundary(pt_fl, boundary_polyline, pixels_per_meter)
        dist_fr = self.boundary_mgr.calculate_signed_distance_to_boundary(pt_fr, boundary_polyline, pixels_per_meter)
        dist_rl = self.boundary_mgr.calculate_signed_distance_to_boundary(pt_rl, boundary_polyline, pixels_per_meter)
        dist_rr = self.boundary_mgr.calculate_signed_distance_to_boundary(pt_rr, boundary_polyline, pixels_per_meter)
        
        # Negative means outside the line
        fl_out = dist_fl < 0.0
        fr_out = dist_fr < 0.0
        rl_out = dist_rl < 0.0
        rr_out = dist_rr < 0.0
        
        all_wheels_exceeded = fl_out and fr_out and rl_out and rr_out
        any_wheel_exceeded = fl_out or fr_out or rl_out or rr_out
        two_wheels_exceeded = sum([fl_out, fr_out, rl_out, rr_out]) >= 2
        
        return TyreContactPoints(
            front_left=pt_fl,
            front_right=pt_fr,
            rear_left=pt_rl,
            rear_right=pt_rr,
            fl_excursion_cm=round(dist_fl, 1),
            fr_excursion_cm=round(dist_fr, 1),
            rl_excursion_cm=round(dist_rl, 1),
            rr_excursion_cm=round(dist_rr, 1),
            all_wheels_exceeded=all_wheels_exceeded,
            any_wheel_exceeded=any_wheel_exceeded,
            two_wheels_exceeded=two_wheels_exceeded
        )

    def evaluate_frame_violation(
        self,
        tyres: TyreContactPoints,
        rule_mode: str = "FIA_ARTICLE_33_3"
    ) -> Tuple[bool, float]:
        """
        Evaluates whether current frame is a violation based on rule profile.
        Returns (is_violation, max_excursion_cm).
        """
        if rule_mode == "FIA_ARTICLE_33_3":
            # FIA: All 4 wheels must be outside white line
            if tyres.all_wheels_exceeded:
                # Max excursion is the least negative or average excursion beyond line
                # E.g., if all 4 are outside: -14cm, -12cm, -16cm, -15cm -> car is 12cm fully outside
                max_exc = max([abs(tyres.fl_excursion_cm), abs(tyres.fr_excursion_cm), abs(tyres.rl_excursion_cm), abs(tyres.rr_excursion_cm)])
                return True, max_exc
            return False, 0.0
        elif rule_mode == "ANY_WHEEL":
            if tyres.any_wheel_exceeded:
                excursions = [abs(d) for d in [tyres.fl_excursion_cm, tyres.fr_excursion_cm, tyres.rl_excursion_cm, tyres.rr_excursion_cm] if d < 0]
                return True, max(excursions) if excursions else 0.0
            return False, 0.0
        elif rule_mode == "TWO_WHEELS":
            if tyres.two_wheels_exceeded:
                excursions = [abs(d) for d in [tyres.fl_excursion_cm, tyres.fr_excursion_cm, tyres.rl_excursion_cm, tyres.rr_excursion_cm] if d < 0]
                return True, max(excursions) if excursions else 0.0
            return False, 0.0
        
        return tyres.all_wheels_exceeded, 0.0

    def compute_counterfactual_shifts(
        self,
        tyres: TyreContactPoints,
        original_max_excursion_cm: float,
        uncertainty_band_cm: float = 3.8
    ) -> List[CounterfactualShift]:
        """
        Performs counterfactual review:
        What if boundary was shifted by -15cm, -10cm, -5cm, 0cm, +5cm, +10cm, +15cm?
        """
        shifts = [-15.0, -10.0, -5.0, 0.0, 5.0, 10.0, 15.0]
        results: List[CounterfactualShift] = []
        
        for shift in shifts:
            # Positive shift means boundary moved outward (more permissive)
            # Negative shift means boundary moved inward (stricter)
            fl_new = tyres.fl_excursion_cm + shift
            fr_new = tyres.fr_excursion_cm + shift
            rl_new = tyres.rl_excursion_cm + shift
            rr_new = tyres.rr_excursion_cm + shift
            
            all_out = (fl_new < 0) and (fr_new < 0) and (rl_new < 0) and (rr_new < 0)
            
            # Check if within camera uncertainty zone
            dist_to_boundary = min(abs(fl_new), abs(fr_new), abs(rl_new), abs(rr_new))
            
            if dist_to_boundary < uncertainty_band_cm:
                status = "UNCERTAIN"
                confidence = 0.62
                explanation = f"Within ±{uncertainty_band_cm}cm sensor resolution tolerance; steward manual visual confirmation advised."
            elif all_out:
                status = "VIOLATION"
                confidence = 0.96 if dist_to_boundary > 8.0 else 0.88
                explanation = f"All 4 wheels remain beyond shifted track boundary by {dist_to_boundary:.1f}cm."
            else:
                status = "LEGAL"
                confidence = 0.95
                explanation = f"At least one tyre contact patch ({max(fl_new, fr_new, rl_new, rr_new):.1f}cm inside) remains within legal limits."
                
            results.append(CounterfactualShift(
                boundary_shift_cm=shift,
                predicted_status=status,
                new_excursion_cm=round(-dist_to_boundary if all_out else dist_to_boundary, 1),
                confidence=round(confidence, 2),
                explanation=explanation
            ))
            
        return results
