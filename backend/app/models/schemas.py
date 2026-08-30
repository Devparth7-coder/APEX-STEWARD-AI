from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from enum import Enum
import time

class StewardRole(str, Enum):
    STEWARD = "Steward"
    RACE_ENGINEER = "Race Engineer"
    RACE_DIRECTOR = "Race Director"
    ADMINISTRATOR = "Administrator"

class DecisionType(str, Enum):
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"
    NEED_MORE_REVIEW = "NEED_MORE_REVIEW"
    UNDER_INVESTIGATION = "UNDER_INVESTIGATION"

class PenaltyType(str, Enum):
    LAP_TIME_DELETED = "LAP_TIME_DELETED"
    FIVE_SEC_PENALTY = "FIVE_SEC_PENALTY"
    TEN_SEC_PENALTY = "TEN_SEC_PENALTY"
    BLACK_WHITE_WARNING = "BLACK_WHITE_WARNING"
    DRIVE_THROUGH = "DRIVE_THROUGH"
    NO_FURTHER_ACTION = "NO_FURTHER_ACTION"

class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class BoundaryCalibrationMode(str, Enum):
    MODE_A_MANUAL = "MANUAL_CALIBRATION"
    MODE_B_CV = "CV_EDGE_SEGMENTATION"
    MODE_C_PRESET = "CIRCUIT_PRESET"

class Point2D(BaseModel):
    x: float
    y: float

class TyreContactPoints(BaseModel):
    front_left: Point2D
    front_right: Point2D
    rear_left: Point2D
    rear_right: Point2D
    # Excursion distances in cm (positive = legal inside, negative = outside boundary)
    fl_excursion_cm: float
    fr_excursion_cm: float
    rl_excursion_cm: float
    rr_excursion_cm: float
    all_wheels_exceeded: bool
    any_wheel_exceeded: bool
    two_wheels_exceeded: bool

class VehicleDetection(BaseModel):
    track_id: int
    car_number: str
    driver_name: str
    team: str
    confidence: float
    bbox: List[float] # [x1, y1, x2, y2]
    velocity_kph: float
    heading_deg: float
    tyres: TyreContactPoints
    frame_number: int
    timestamp_s: float

class ConfidenceBreakdown(BaseModel):
    detection_confidence: float = Field(..., description="YOLO / Object detector confidence")
    tracking_confidence: float = Field(..., description="Kalman trajectory smoothness and track continuity")
    boundary_confidence: float = Field(..., description="Track edge segmentation & homography contrast quality")
    temporal_consistency: float = Field(..., description="Consecutive frame stability without dropout")
    geometry_confidence: float = Field(..., description="3D perspective and tyre contact aspect confidence")
    overall_confidence: float = Field(..., description="Weighted composite confidence score")
    level: ConfidenceLevel

class EvidenceFrame(BaseModel):
    frame_number: int
    timestamp_s: float
    image_url: str
    overlay_url: Optional[str] = None
    car_number: str
    excursion_cm: float
    tyres: TyreContactPoints
    telemetry_summary: Dict[str, Any]

class TelemetryDataPoint(BaseModel):
    timestamp_ms: int
    car_number: str
    speed_kph: float
    throttle_pct: float
    brake_pct: float
    steering_deg: float
    gear: int
    rpm: int
    lateral_g: float
    longitudinal_g: float
    drs_active: bool
    gps_x: float
    gps_y: float
    lap: int
    sector: int

class CounterfactualShift(BaseModel):
    boundary_shift_cm: float # e.g. -15, -10, -5, 0, +5, +10, +15
    predicted_status: str # "VIOLATION", "LEGAL", "UNCERTAIN"
    new_excursion_cm: float
    confidence: float
    explanation: str

class StewardDecisionSubmission(BaseModel):
    decision: DecisionType
    penalty: PenaltyType = PenaltyType.NO_FURTHER_ACTION
    reviewer_name: str
    reviewer_role: StewardRole = StewardRole.STEWARD
    reason: str
    comment: Optional[str] = ""
    review_duration_seconds: float = 12.5

class StewardDecision(BaseModel):
    id: str
    incident_id: str
    decision: DecisionType
    penalty: PenaltyType
    reviewer_name: str
    reviewer_role: StewardRole
    timestamp: str
    reason: str
    comment: Optional[str] = ""
    review_duration_seconds: float

class TrackLimitIncident(BaseModel):
    id: str
    incident_code: str # e.g. "INC-027"
    race_id: str
    circuit_name: str
    turn_name: str
    sector: int
    car_number: str
    driver_name: str
    team: str
    lap_number: int
    timestamp_str: str
    timestamp_s: float
    start_frame: int
    peak_frame: int
    end_frame: int
    duration_seconds: float
    max_excursion_cm: float
    confidence_breakdown: ConfidenceBreakdown
    ai_recommendation: str
    ai_explanation: str
    rules_applied: List[str]
    status: str # "REVIEW_REQUIRED", "CONFIRMED", "REJECTED", "UNDER_INVESTIGATION"
    steward_decision: Optional[StewardDecision] = None
    replay_video_url: str
    key_evidence_frames: List[EvidenceFrame]
    counterfactual_analysis: List[CounterfactualShift]
    camera_angles: List[Dict[str, str]]
    telemetry_samples: List[TelemetryDataPoint]
    is_demo: bool = False

class BoundaryCalibration(BaseModel):
    mode: BoundaryCalibrationMode
    circuit_id: str
    turn_name: str
    boundary_polyline: List[Point2D]
    inner_kerb_polyline: Optional[List[Point2D]] = []
    runoff_polygon: Optional[List[Point2D]] = []
    uncertainty_band_cm: float = 4.5
    pixels_per_meter: float = 48.0
    updated_at: str
    updated_by: str

class CircuitInfo(BaseModel):
    id: str
    name: str
    location: str
    length_km: float
    turns_count: int
    sectors: int
    svg_path: str
    turns: List[Dict[str, Any]]
    hotspot_turn: str

class RaceSession(BaseModel):
    id: str
    name: str
    circuit: CircuitInfo
    status: str # "LIVE", "PRACTICE", "QUALIFYING", "FINISHED"
    total_laps: int
    current_lap: int
    safety_car_status: str # "CLEAR", "VSC", "SC", "RED"
    weather: Dict[str, Any]
    active_vehicles: List[Dict[str, Any]]
    created_at: str

class LiveMetrics(BaseModel):
    fps: float
    processing_latency_ms: float
    active_tracks_count: int
    total_frames_processed: int
    incidents_detected_count: int
    incidents_confirmed_count: int
    incidents_rejected_count: int
    average_review_time_s: float
    system_status: str

class ModelBenchmarkMetrics(BaseModel):
    model_name: str
    architecture: str
    detector_map_50: float
    detector_map_50_95: float
    tracking_mota: float
    tracking_idf1: float
    boundary_iou: float
    false_positive_rate_pct: float
    false_negative_rate_pct: float
    mean_latency_ms: float
    benchmark_dataset: str
    evaluation_date: str
    is_live_metric: bool = False
