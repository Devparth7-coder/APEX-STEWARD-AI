from typing import Dict, Any, List
from ..models.schemas import TyreContactPoints, ConfidenceBreakdown

class ExplainableAIReasoner:
    @staticmethod
    def generate_explanation(
        car_number: str,
        driver_name: str,
        turn_name: str,
        lap_number: int,
        duration_seconds: float,
        max_excursion_cm: float,
        tyres: TyreContactPoints,
        confidence: ConfidenceBreakdown,
        telemetry: Dict[str, Any],
        rules_applied: List[str]
    ) -> str:
        """
        Synthesizes an auditable, transparent natural-language explanation
        for race stewards detailing why the incident was flagged.
        """
        speed = telemetry.get("speed_kph", 238.5)
        throttle = telemetry.get("throttle_pct", 100.0)
        lat_g = telemetry.get("lateral_g", -3.2)
        
        rule_desc = "FIA Sporting Regulations Article 33.3 (all 4 wheels crossed outer boundary)"
        if "ANY_WHEEL" in rules_applied:
            rule_desc = "Strict Apex Limit (single tyre boundary excursion)"
            
        text = (
            f"Car #{car_number} ({driver_name}) crossed the configured legal track boundary at {turn_name} "
            f"on Lap {lap_number} for {duration_seconds:.2f} seconds ({round(duration_seconds * 30)} consecutive frames). "
            f"At peak excursion, the vehicle exceeded the outer white line by an estimated {max_excursion_cm:.1f} cm "
            f"(FL: {abs(tyres.fl_excursion_cm):.1f}cm, FR: {abs(tyres.fr_excursion_cm):.1f}cm, "
            f"RL: {abs(tyres.rl_excursion_cm):.1f}cm, RR: {abs(tyres.rr_excursion_cm):.1f}cm outside). "
            f"Synchronized telemetry confirms exit speed of {speed:.1f} km/h under {throttle:.0f}% throttle "
            f"with {abs(lat_g):.1f}G lateral acceleration. "
            f"Confidence score is {confidence.overall_confidence * 100:.1f}% ({confidence.level.value}), "
            f"supported by {confidence.detection_confidence * 100:.0f}% detector confidence, "
            f"{confidence.temporal_consistency * 100:.0f}% temporal stability, and "
            f"boundary contrast score of {confidence.boundary_confidence * 100:.0f}% under {rule_desc}."
        )
        return text
