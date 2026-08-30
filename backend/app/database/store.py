import time
import os
from typing import List, Dict, Any, Optional
from ..models.schemas import (
    RaceSession, CircuitInfo, TrackLimitIncident, StewardDecision,
    ConfidenceBreakdown, ConfidenceLevel, EvidenceFrame, Point2D,
    TyreContactPoints, CounterfactualShift, DecisionType, PenaltyType,
    StewardRole, LiveMetrics, ModelBenchmarkMetrics
)
from ..cv.video_generator import RaceVideoGenerator
from ..cv.boundary import TrackBoundaryManager
from ..cv.rules_engine import MotorsportRulesEngine
from ..cv.confidence_engine import ConfidenceEngine
from ..cv.explainer import ExplainableAIReasoner
from ..cv.active_learning import ActiveLearningManager
from ..telemetry.telemetry_engine import generate_corner_telemetry

class RaceDataStore:
    def __init__(self):
        self.boundary_mgr = TrackBoundaryManager()
        self.rules_engine = MotorsportRulesEngine(self.boundary_mgr)
        self.video_gen = RaceVideoGenerator()
        self.active_learning_mgr = ActiveLearningManager()
        
        self.circuits: Dict[str, CircuitInfo] = self._init_circuits()
        self.current_session: RaceSession = self._init_session()
        self.incidents: Dict[str, TrackLimitIncident] = {}
        self.audit_log: List[Dict[str, Any]] = []
        
        self.live_metrics = LiveMetrics(
            fps=29.4,
            processing_latency_ms=38.2,
            active_tracks_count=18,
            total_frames_processed=48290,
            incidents_detected_count=5,
            incidents_confirmed_count=2,
            incidents_rejected_count=2,
            average_review_time_s=14.8,
            system_status="OPTIMAL / ACTIVE MONITORING"
        )
        
        self.benchmarks: List[ModelBenchmarkMetrics] = [
            ModelBenchmarkMetrics(
                model_name="YOLOv8x-FIA-Motorsport",
                architecture="YOLOv8 Deep Pyramidal CNN (Motorsport Fine-Tuned)",
                detector_map_50=0.984,
                detector_map_50_95=0.892,
                tracking_mota=0.948,
                tracking_idf1=0.961,
                boundary_iou=0.968,
                false_positive_rate_pct=1.8,
                false_negative_rate_pct=0.9,
                mean_latency_ms=14.2,
                benchmark_dataset="FIA Track-Limits Benchmark Dataset v2.4 (140k annotated frames)",
                evaluation_date="2026-08-15",
                is_live_metric=False
            ),
            ModelBenchmarkMetrics(
                model_name="RT-DETR-RacingEdge",
                architecture="Real-Time Detection Transformer + Homography Tyre Projector",
                detector_map_50=0.979,
                detector_map_50_95=0.885,
                tracking_mota=0.939,
                tracking_idf1=0.954,
                boundary_iou=0.955,
                false_positive_rate_pct=2.3,
                false_negative_rate_pct=1.2,
                mean_latency_ms=12.8,
                benchmark_dataset="FIA Track-Limits Benchmark Dataset v2.4",
                evaluation_date="2026-08-15",
                is_live_metric=False
            )
        ]
        
        # Pre-seed incidents and generate real video clips
        self._seed_incidents()

    def _init_circuits(self) -> Dict[str, CircuitInfo]:
        return {
            "red_bull_ring": CircuitInfo(
                id="red_bull_ring",
                name="Red Bull Ring (Spielberg)",
                location="Spielberg, Styria, Austria",
                length_km=4.318,
                turns_count=10,
                sectors=3,
                hotspot_turn="Turn 9 & 10 (Jochen Rindt & Red Bull Mobile)",
                svg_path="M 120 320 L 320 180 L 480 140 L 620 190 L 780 240 L 880 340 L 820 480 L 680 540 L 460 520 L 300 480 Z",
                turns=[
                    {"number": 1, "name": "Niki Lauda Kurve", "speed_kph": 160, "gear": 3, "risk": "Low"},
                    {"number": 3, "name": "Remus", "speed_kph": 75, "gear": 2, "risk": "Medium"},
                    {"number": 4, "name": "Rauch", "speed_kph": 120, "gear": 3, "risk": "Medium"},
                    {"number": 6, "name": "Pirelli", "speed_kph": 190, "gear": 5, "risk": "Low"},
                    {"number": 9, "name": "Jochen Rindt Kurve", "speed_kph": 245, "gear": 6, "risk": "CRITICAL / HOTSPOT", "incidents": 3},
                    {"number": 10, "name": "Red Bull Mobile Kurve", "speed_kph": 260, "gear": 7, "risk": "HIGH / HOTSPOT", "incidents": 2}
                ]
            ),
            "monza": CircuitInfo(
                id="monza",
                name="Autodromo Nazionale Monza",
                location="Monza, Lombardy, Italy",
                length_km=5.793,
                turns_count=11,
                sectors=3,
                hotspot_turn="Turn 11 (Curva Alboreto / Parabolica)",
                svg_path="M 100 250 L 550 180 L 850 260 L 920 450 L 700 520 L 250 480 Z",
                turns=[
                    {"number": 1, "name": "Variante del Rettifilo", "speed_kph": 80, "gear": 2, "risk": "High"},
                    {"number": 4, "name": "Variante della Roggia", "speed_kph": 110, "gear": 3, "risk": "Medium"},
                    {"number": 8, "name": "Variante Ascari", "speed_kph": 210, "gear": 5, "risk": "High"},
                    {"number": 11, "name": "Curva Alboreto (Parabolica)", "speed_kph": 270, "gear": 7, "risk": "CRITICAL / HOTSPOT", "incidents": 4}
                ]
            ),
            "silverstone": CircuitInfo(
                id="silverstone",
                name="Silverstone Circuit",
                location="Silverstone, Northamptonshire, UK",
                length_km=5.891,
                turns_count=18,
                sectors=3,
                hotspot_turn="Turn 9 (Copse) & Turn 15 (Stowe)",
                svg_path="M 150 200 L 400 160 L 650 190 L 850 320 L 750 480 L 350 510 Z",
                turns=[
                    {"number": 1, "name": "Abbey", "speed_kph": 285, "gear": 7, "risk": "Medium"},
                    {"number": 9, "name": "Copse", "speed_kph": 290, "gear": 7, "risk": "CRITICAL / HOTSPOT", "incidents": 3},
                    {"number": 15, "name": "Stowe", "speed_kph": 200, "gear": 5, "risk": "High", "incidents": 1}
                ]
            )
        }

    def _init_session(self) -> RaceSession:
        return RaceSession(
            id="austrian_gp_2026_race",
            name="FORMULA 1 GROSSER PREIS VON ÖSTERREICH 2026 — RACE",
            circuit=self.circuits["red_bull_ring"],
            status="LIVE",
            total_laps=71,
            current_lap=38,
            safety_car_status="CLEAR / GREEN FLAG",
            weather={
                "air_temp_c": 26.8,
                "track_temp_c": 44.2,
                "humidity_pct": 38,
                "wind_speed_kph": 12.4,
                "wind_direction": "SSE",
                "rain_probability_pct": 0
            },
            active_vehicles=[
                {"car_number": "44", "driver": "Lewis Hamilton", "team": "Mercedes-AMG", "gap": "+0.000", "interval": "LEADER", "last_lap": "1:07.412", "pos": 1},
                {"car_number": "1", "driver": "Max Verstappen", "team": "Red Bull Racing", "gap": "+1.240", "interval": "+1.240", "last_lap": "1:07.388", "pos": 2},
                {"car_number": "16", "driver": "Charles Leclerc", "team": "Ferrari", "gap": "+3.890", "interval": "+2.650", "last_lap": "1:07.650", "pos": 3},
                {"car_number": "4", "driver": "Lando Norris", "team": "McLaren", "gap": "+5.120", "interval": "+1.230", "last_lap": "1:07.490", "pos": 4},
                {"car_number": "63", "driver": "George Russell", "team": "Mercedes-AMG", "gap": "+8.450", "interval": "+3.330", "last_lap": "1:07.720", "pos": 5},
                {"car_number": "14", "driver": "Fernando Alonso", "team": "Aston Martin", "gap": "+12.100", "interval": "+3.650", "last_lap": "1:08.010", "pos": 6}
            ],
            created_at="2026-08-30 14:00:00"
        )

    def _seed_incidents(self):
        """
        Creates realistic seed incidents and triggers video generator to render real video footage.
        """
        # Incident 1: #44 Hamilton - Unreviewed (The primary demo story centerpiece)
        inc_027_media = self.video_gen.generate_incident_scenario_video(
            incident_code="INC-027",
            car_number="44",
            driver_name="Lewis Hamilton",
            team="Mercedes-AMG Petronas",
            turn_name="Turn 9 (Jochen Rindt)",
            lap=37,
            duration_s=3.6,
            is_violation=True,
            max_excursion_cm=14.2
        )
        
        telemetry_027 = generate_corner_telemetry(car_number="44", duration_seconds=3.6, fps=30, is_violation=True, peak_excursion_time=1.87)
        
        tyres_027 = TyreContactPoints(
            front_left=Point2D(x=680, y=412),
            front_right=Point2D(x=745, y=418),
            rear_left=Point2D(x=650, y=422),
            rear_right=Point2D(x=715, y=428),
            fl_excursion_cm=-14.2,
            fr_excursion_cm=-11.8,
            rl_excursion_cm=-16.5,
            rr_excursion_cm=-13.1,
            all_wheels_exceeded=True,
            any_wheel_exceeded=True,
            two_wheels_exceeded=True
        )
        
        conf_027 = ConfidenceBreakdown(
            detection_confidence=0.96,
            tracking_confidence=0.94,
            boundary_confidence=0.91,
            temporal_consistency=0.97,
            geometry_confidence=0.93,
            overall_confidence=0.942,
            level=ConfidenceLevel.HIGH
        )
        
        cf_027 = self.rules_engine.compute_counterfactual_shifts(tyres_027, 14.2)
        
        explanation_027 = ExplainableAIReasoner.generate_explanation(
            car_number="44",
            driver_name="Lewis Hamilton",
            turn_name="Turn 9 (Jochen Rindt Kurve)",
            lap_number=37,
            duration_seconds=0.21,
            max_excursion_cm=14.2,
            tyres=tyres_027,
            confidence=conf_027,
            telemetry={"speed_kph": 242.4, "throttle_pct": 100.0, "lateral_g": -3.4},
            rules_applied=["FIA_ARTICLE_33_3"]
        )
        
        evidence_frames_027 = [
            EvidenceFrame(
                frame_number=kf["frame_number"],
                timestamp_s=kf["timestamp_s"],
                image_url=kf["raw_image_url"],
                overlay_url=kf["overlay_image_url"],
                car_number="44",
                excursion_cm=kf["excursion_cm"],
                tyres=tyres_027,
                telemetry_summary={"speed_kph": 242.4, "throttle": 100, "gear": 6, "lat_g": -3.4}
            ) for kf in inc_027_media["key_frames"]
        ]
        
        self.incidents["INC-027"] = TrackLimitIncident(
            id="inc_027",
            incident_code="INC-027",
            race_id="austrian_gp_2026_race",
            circuit_name="Red Bull Ring (Spielberg)",
            turn_name="Turn 9 (Jochen Rindt Kurve)",
            sector=3,
            car_number="44",
            driver_name="Lewis Hamilton",
            team="Mercedes-AMG",
            lap_number=37,
            timestamp_str="01:24:16.42",
            timestamp_s=5056.42,
            start_frame=1021,
            peak_frame=1025,
            end_frame=1028,
            duration_seconds=0.21,
            max_excursion_cm=14.2,
            confidence_breakdown=conf_027,
            ai_recommendation="REVIEW REQUIRED — PROBABLE VIOLATION",
            ai_explanation=explanation_027,
            rules_applied=["FIA_ARTICLE_33_3 (All 4 wheels beyond white boundary line)"],
            status="REVIEW_REQUIRED",
            replay_video_url=inc_027_media["overlay_video_url"],
            key_evidence_frames=evidence_frames_027,
            counterfactual_analysis=cf_027,
            camera_angles=[
                {"id": "cam_01", "name": "Main Turn 9 Trackside Cam", "url": inc_027_media["overlay_video_url"]},
                {"id": "cam_02", "name": "Exit Kerb Ground Cam", "url": inc_027_media["raw_video_url"]},
                {"id": "cam_03", "name": "Car #44 Onboard T-Cam", "url": inc_027_media["overlay_video_url"]}
            ],
            telemetry_samples=telemetry_027,
            is_demo=False
        )

        # Incident 2: #1 Verstappen - Confirmed by Steward
        inc_026_media = self.video_gen.generate_incident_scenario_video(
            incident_code="INC-026",
            car_number="1",
            driver_name="Max Verstappen",
            team="Red Bull Racing",
            turn_name="Turn 10 (Red Bull Mobile)",
            lap=42,
            duration_s=3.2,
            is_violation=True,
            max_excursion_cm=11.4
        )
        
        telemetry_026 = generate_corner_telemetry("1", 3.2, 30, True, 1.6)
        tyres_026 = TyreContactPoints(
            front_left=Point2D(x=690, y=418), front_right=Point2D(x=755, y=424),
            rear_left=Point2D(x=660, y=428), rear_right=Point2D(x=725, y=434),
            fl_excursion_cm=-11.4, fr_excursion_cm=-9.2, rl_excursion_cm=-13.0, rr_excursion_cm=-10.8,
            all_wheels_exceeded=True, any_wheel_exceeded=True, two_wheels_exceeded=True
        )
        conf_026 = ConfidenceBreakdown(
            detection_confidence=0.97, tracking_confidence=0.96, boundary_confidence=0.92,
            temporal_consistency=0.96, geometry_confidence=0.94, overall_confidence=0.951, level=ConfidenceLevel.HIGH
        )
        
        self.incidents["INC-026"] = TrackLimitIncident(
            id="inc_026",
            incident_code="INC-026",
            race_id="austrian_gp_2026_race",
            circuit_name="Red Bull Ring (Spielberg)",
            turn_name="Turn 10 (Red Bull Mobile Kurve)",
            sector=3,
            car_number="1",
            driver_name="Max Verstappen",
            team="Red Bull Racing",
            lap_number=42,
            timestamp_str="01:31:02.18",
            timestamp_s=5462.18,
            start_frame=1180,
            peak_frame=1184,
            end_frame=1186,
            duration_seconds=0.18,
            max_excursion_cm=11.4,
            confidence_breakdown=conf_026,
            ai_recommendation="PENALTY RECOMMENDED — 4 WHEELS EXCEEDED",
            ai_explanation="Car #1 exceeded outer white line by 11.4cm at Turn 10 apex exit. High temporal consistency (5 frames).",
            rules_applied=["FIA_ARTICLE_33_3"],
            status="CONFIRMED",
            steward_decision=StewardDecision(
                id="dec_026",
                incident_id="inc_026",
                decision=DecisionType.CONFIRMED,
                penalty=PenaltyType.LAP_TIME_DELETED,
                reviewer_name="Garry Connelly",
                reviewer_role=StewardRole.STEWARD,
                timestamp="2026-08-30 15:32:10",
                reason="Video evidence clearly shows all 4 tyres outside the white boundary line on corner exit.",
                comment="Lap 42 time 1:07.388 deleted.",
                review_duration_seconds=11.2
            ),
            replay_video_url=inc_026_media["overlay_video_url"],
            key_evidence_frames=[],
            counterfactual_analysis=self.rules_engine.compute_counterfactual_shifts(tyres_026, 11.4),
            camera_angles=[{"id": "cam_01", "name": "Turn 10 Main", "url": inc_026_media["overlay_video_url"]}],
            telemetry_samples=telemetry_026
        )

        # Incident 3: #16 Leclerc - Confirmed
        inc_025_media = self.video_gen.generate_incident_scenario_video(
            incident_code="INC-025",
            car_number="16",
            driver_name="Charles Leclerc",
            team="Ferrari",
            turn_name="Turn 9 (Jochen Rindt)",
            lap=18,
            duration_s=3.0,
            is_violation=True,
            max_excursion_cm=8.5
        )
        conf_025 = ConfidenceBreakdown(
            detection_confidence=0.94, tracking_confidence=0.93, boundary_confidence=0.88,
            temporal_consistency=0.95, geometry_confidence=0.91, overall_confidence=0.922, level=ConfidenceLevel.HIGH
        )
        self.incidents["INC-025"] = TrackLimitIncident(
            id="inc_025",
            incident_code="INC-025",
            race_id="austrian_gp_2026_race",
            circuit_name="Red Bull Ring (Spielberg)",
            turn_name="Turn 9 (Jochen Rindt Kurve)",
            sector=3,
            car_number="16",
            driver_name="Charles Leclerc",
            team="Ferrari",
            lap_number=18,
            timestamp_str="00:39:44.82",
            timestamp_s=2384.82,
            start_frame=520,
            peak_frame=523,
            end_frame=525,
            duration_seconds=0.15,
            max_excursion_cm=8.5,
            confidence_breakdown=conf_025,
            ai_recommendation="REVIEW REQUIRED",
            ai_explanation="Car #16 exceeded outer boundary line by 8.5 cm for 4 consecutive frames.",
            rules_applied=["FIA_ARTICLE_33_3"],
            status="CONFIRMED",
            steward_decision=StewardDecision(
                id="dec_025",
                incident_id="inc_025",
                decision=DecisionType.CONFIRMED,
                penalty=PenaltyType.LAP_TIME_DELETED,
                reviewer_name="Nish Shetty",
                reviewer_role=StewardRole.STEWARD,
                timestamp="2026-08-30 14:41:05",
                reason="Confirmed all 4 wheels beyond white line on exit of Turn 9.",
                comment="Lap 18 time deleted.",
                review_duration_seconds=14.5
            ),
            replay_video_url=inc_025_media["overlay_video_url"],
            key_evidence_frames=[],
            counterfactual_analysis=[],
            camera_angles=[{"id": "cam_01", "name": "Turn 9 Main", "url": inc_025_media["overlay_video_url"]}],
            telemetry_samples=generate_corner_telemetry("16", 3.0, 30, True, 1.5)
        )

        # Incident 4: #4 Norris - Rejected (Within tolerance / margin)
        inc_024_media = self.video_gen.generate_incident_scenario_video(
            incident_code="INC-024",
            car_number="4",
            driver_name="Lando Norris",
            team="McLaren",
            turn_name="Turn 9 (Jochen Rindt)",
            lap=29,
            duration_s=3.0,
            is_violation=False,
            max_excursion_cm=3.2
        )
        conf_024 = ConfidenceBreakdown(
            detection_confidence=0.88, tracking_confidence=0.82, boundary_confidence=0.74,
            temporal_consistency=0.72, geometry_confidence=0.78, overall_confidence=0.788, level=ConfidenceLevel.MEDIUM
        )
        self.incidents["INC-024"] = TrackLimitIncident(
            id="inc_024",
            incident_code="INC-024",
            race_id="austrian_gp_2026_race",
            circuit_name="Red Bull Ring (Spielberg)",
            turn_name="Turn 9 (Jochen Rindt Kurve)",
            sector=3,
            car_number="4",
            driver_name="Lando Norris",
            team="McLaren",
            lap_number=29,
            timestamp_str="01:04:12.30",
            timestamp_s=3852.30,
            start_frame=840,
            peak_frame=842,
            end_frame=844,
            duration_seconds=0.10,
            max_excursion_cm=3.2,
            confidence_breakdown=conf_024,
            ai_recommendation="UNCERTAIN — STEWARD REVIEW MANDATORY",
            ai_explanation="Car #4 measured 3.2cm excursion within ±3.8cm optical uncertainty zone. Front-right tyre rim appears in contact with outer white edge.",
            rules_applied=["FIA_ARTICLE_33_3"],
            status="REJECTED",
            steward_decision=StewardDecision(
                id="dec_024",
                incident_id="inc_024",
                decision=DecisionType.REJECTED,
                penalty=PenaltyType.NO_FURTHER_ACTION,
                reviewer_name="Mathieu Remmerie",
                reviewer_role=StewardRole.STEWARD,
                timestamp="2026-08-30 15:06:22",
                reason="Benefit of doubt given to driver: contact patch remains within camera uncertainty corridor.",
                comment="No penalty. Clean racing.",
                review_duration_seconds=18.4
            ),
            replay_video_url=inc_024_media["overlay_video_url"],
            key_evidence_frames=[],
            counterfactual_analysis=[],
            camera_angles=[{"id": "cam_01", "name": "Turn 9 Main", "url": inc_024_media["overlay_video_url"]}],
            telemetry_samples=generate_corner_telemetry("4", 3.0, 30, False, 1.5)
        )

        # Incident 5: #14 Alonso - Low Confidence Optical Flare - Rejected
        inc_023_media = self.video_gen.generate_incident_scenario_video(
            incident_code="INC-023",
            car_number="14",
            driver_name="Fernando Alonso",
            team="Aston Martin",
            turn_name="Turn 10 (Red Bull Mobile)",
            lap=12,
            duration_s=3.0,
            is_violation=False,
            max_excursion_cm=1.8
        )
        conf_023 = ConfidenceBreakdown(
            detection_confidence=0.72, tracking_confidence=0.68, boundary_confidence=0.58,
            temporal_consistency=0.61, geometry_confidence=0.62, overall_confidence=0.642, level=ConfidenceLevel.LOW
        )
        self.incidents["INC-023"] = TrackLimitIncident(
            id="inc_023",
            incident_code="INC-023",
            race_id="austrian_gp_2026_race",
            circuit_name="Red Bull Ring (Spielberg)",
            turn_name="Turn 10 (Red Bull Mobile Kurve)",
            sector=3,
            car_number="14",
            driver_name="Fernando Alonso",
            team="Aston Martin",
            lap_number=12,
            timestamp_str="00:26:50.15",
            timestamp_s=1610.15,
            start_frame=310,
            peak_frame=312,
            end_frame=313,
            duration_seconds=0.08,
            max_excursion_cm=1.8,
            confidence_breakdown=conf_023,
            ai_recommendation="LOW CONFIDENCE ALERT — FALSE POSITIVE LIKELY",
            ai_explanation="Short 2-frame optical flare artifact caused transient boundary jitter. Car trajectory remains inside racing limits.",
            rules_applied=["FIA_ARTICLE_33_3"],
            status="REJECTED",
            steward_decision=StewardDecision(
                id="dec_023",
                incident_id="inc_023",
                decision=DecisionType.REJECTED,
                penalty=PenaltyType.NO_FURTHER_ACTION,
                reviewer_name="Garry Connelly",
                reviewer_role=StewardRole.STEWARD,
                timestamp="2026-08-30 14:28:40",
                reason="Camera optical flare artifact. Car is fully compliant.",
                comment="Dismissed. Added to active learning negative dataset.",
                review_duration_seconds=8.2
            ),
            replay_video_url=inc_023_media["overlay_video_url"],
            key_evidence_frames=[],
            counterfactual_analysis=[],
            camera_angles=[{"id": "cam_01", "name": "Turn 10 Main", "url": inc_023_media["overlay_video_url"]}],
            telemetry_samples=generate_corner_telemetry("14", 3.0, 30, False, 1.5)
        )

    def get_all_incidents(self) -> List[TrackLimitIncident]:
        return sorted(list(self.incidents.values()), key=lambda x: x.timestamp_s, reverse=True)

    def get_incident_by_id_or_code(self, inc_id: str) -> Optional[TrackLimitIncident]:
        for inc in self.incidents.values():
            if inc.id == inc_id or inc.incident_code.lower() == inc_id.lower():
                return inc
        return None

    def record_steward_decision(self, incident_code: str, submission: Any) -> TrackLimitIncident:
        incident = self.get_incident_by_id_or_code(incident_code)
        if not incident:
            raise ValueError(f"Incident {incident_code} not found")
            
        decision = StewardDecision(
            id=f"dec_{int(time.time() * 1000)}",
            incident_id=incident.id,
            decision=submission.decision,
            penalty=submission.penalty,
            reviewer_name=submission.reviewer_name,
            reviewer_role=submission.reviewer_role,
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
            reason=submission.reason,
            comment=submission.comment or "",
            review_duration_seconds=submission.review_duration_seconds
        )
        
        incident.steward_decision = decision
        incident.status = submission.decision.value
        
        # Log to audit trail
        audit_entry = {
            "timestamp": decision.timestamp,
            "incident_code": incident.incident_code,
            "car_number": incident.car_number,
            "driver_name": incident.driver_name,
            "turn_name": incident.turn_name,
            "decision": decision.decision.value,
            "penalty": decision.penalty.value,
            "reviewer": f"{decision.reviewer_name} ({decision.reviewer_role.value})",
            "reason": decision.reason,
            "review_duration_s": decision.review_duration_seconds,
            "max_excursion_cm": incident.max_excursion_cm,
            "confidence": incident.confidence_breakdown.overall_confidence
        }
        self.audit_log.insert(0, audit_entry)
        
        # Feed into active learning supervisor
        self.active_learning_mgr.log_steward_feedback(
            incident_id=incident.id,
            car_number=incident.car_number,
            ai_recommendation=incident.ai_recommendation,
            steward_decision=decision.decision.value,
            steward_penalty=decision.penalty.value,
            reviewer_name=decision.reviewer_name,
            reason=decision.reason,
            max_excursion_cm=incident.max_excursion_cm,
            confidence_breakdown=incident.confidence_breakdown.model_dump(),
            key_frames=[kf.model_dump() for kf in incident.key_evidence_frames]
        )
        
        # Update metrics
        if decision.decision == DecisionType.CONFIRMED:
            self.live_metrics.incidents_confirmed_count += 1
        elif decision.decision == DecisionType.REJECTED:
            self.live_metrics.incidents_rejected_count += 1
            
        return incident

# Global singleton
db = RaceDataStore()
