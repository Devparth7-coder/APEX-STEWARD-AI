from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from ..database.store import db
from ..models.schemas import TrackLimitIncident, StewardDecisionSubmission, CounterfactualShift

router = APIRouter(prefix="/api", tags=["Incidents & Steward Decisions"])

@router.get("/incidents", response_model=List[TrackLimitIncident])
async def list_incidents(
    status: Optional[str] = Query(None, description="Filter by status e.g. REVIEW_REQUIRED, CONFIRMED, REJECTED"),
    car_number: Optional[str] = Query(None, description="Filter by car number"),
    confidence_level: Optional[str] = Query(None, description="HIGH, MEDIUM, LOW")
):
    all_incidents = db.get_all_incidents()
    filtered = all_incidents
    
    if status:
        filtered = [inc for inc in filtered if inc.status.lower() == status.lower()]
    if car_number:
        filtered = [inc for inc in filtered if inc.car_number == car_number]
    if confidence_level:
        filtered = [inc for inc in filtered if inc.confidence_breakdown.level.value.lower() == confidence_level.lower()]
        
    return filtered

@router.get("/incidents/{incident_id}", response_model=TrackLimitIncident)
async def get_incident(incident_id: str):
    inc = db.get_incident_by_id_or_code(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return inc

@router.post("/incidents/{incident_id}/decision", response_model=TrackLimitIncident)
async def submit_steward_decision(incident_id: str, submission: StewardDecisionSubmission):
    try:
        updated_incident = db.record_steward_decision(incident_id, submission)
        return updated_incident
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/incidents/{incident_id}/counterfactual", response_model=List[CounterfactualShift])
async def reevaluate_counterfactual(incident_id: str, custom_shift_cm: float = Query(0.0)):
    inc = db.get_incident_by_id_or_code(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if len(inc.key_evidence_frames) > 0:
        tyres = inc.key_evidence_frames[0].tyres
    else:
        # Fallback default tyre points
        tyres = inc.counterfactual_analysis[0] if inc.counterfactual_analysis else None
        
    if not tyres:
        raise HTTPException(status_code=400, detail="No tyre geometry available for this incident")
        
    shifts = db.rules_engine.compute_counterfactual_shifts(tyres, inc.max_excursion_cm)
    return shifts

@router.get("/audit-trail", response_model=List[Dict[str, Any]])
async def get_audit_trail():
    return db.audit_log
