import asyncio
import json
import random
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
from ..database.store import db

router = APIRouter(tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

@router.websocket("/ws/live")
async def websocket_live_stream(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        lap_t = 0.0
        while True:
            lap_t += 0.1
            # Broadcast simulated high-frequency telemetry & live tracks
            payload = {
                "type": "TELEMETRY_TICK",
                "timestamp_ms": int(time.time() * 1000),
                "fps": round(29.4 + random.uniform(-0.5, 0.5), 1),
                "latency_ms": round(38.2 + random.uniform(-1.0, 1.0), 1),
                "active_tracks_count": 18,
                "weather": db.current_session.weather,
                "cars": [
                    {
                        "car_number": "44",
                        "driver": "Lewis Hamilton",
                        "team": "Mercedes-AMG",
                        "speed_kph": round(240.0 + random.uniform(-5, 5), 1),
                        "throttle_pct": 100.0 if (int(lap_t) % 4 != 0) else 45.0,
                        "brake_pct": 0.0 if (int(lap_t) % 4 != 0) else 65.0,
                        "gear": 6,
                        "lat_g": round(-3.2 + random.uniform(-0.3, 0.3), 2),
                        "gps_x": round(450.0 + (math_x := (lap_t * 20) % 500), 1),
                        "gps_y": round(300.0 + (math_y := random.uniform(-10, 10)), 1),
                        "status": "TRACK_LIMIT_MONITORING"
                    },
                    {
                        "car_number": "1",
                        "driver": "Max Verstappen",
                        "team": "Red Bull Racing",
                        "speed_kph": round(242.5 + random.uniform(-4, 4), 1),
                        "throttle_pct": 100.0,
                        "brake_pct": 0.0,
                        "gear": 7,
                        "lat_g": round(-3.4 + random.uniform(-0.2, 0.2), 2),
                        "gps_x": round(430.0 + math_x, 1),
                        "gps_y": round(305.0 + math_y, 1),
                        "status": "COMPLIANT"
                    }
                ]
            }
            await websocket.send_json(payload)
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
