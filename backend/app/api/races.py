from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..database.store import db
from ..models.schemas import RaceSession, CircuitInfo

router = APIRouter(prefix="/api", tags=["Races & Circuits"])

@router.get("/races/current", response_model=RaceSession)
async def get_current_race():
    return db.current_session

@router.get("/circuits", response_model=List[CircuitInfo])
async def get_circuits():
    return list(db.circuits.values())

@router.get("/circuits/{circuit_id}", response_model=CircuitInfo)
async def get_circuit(circuit_id: str):
    if circuit_id in db.circuits:
        return db.circuits[circuit_id]
    raise HTTPException(status_code=404, detail="Circuit not found")
