import math
import random
from typing import List, Dict, Any
from ..models.schemas import TelemetryDataPoint

def generate_corner_telemetry(
    car_number: str,
    duration_seconds: float = 4.0,
    fps: int = 30,
    is_violation: bool = True,
    peak_excursion_time: float = 2.0
) -> List[TelemetryDataPoint]:
    """
    Generates high-fidelity motorsport telemetry for a vehicle navigating a high-speed turn.
    If is_violation is True, telemetry shows slight oversteer / counter-steer / aggressive throttle on exit curb.
    """
    total_frames = int(duration_seconds * fps)
    telemetry: List[TelemetryDataPoint] = []
    
    # Base car attributes based on car number
    base_specs = {
        "44": {"gear_max": 8, "top_speed": 315, "team": "Mercedes-AMG F1"},
        "1": {"gear_max": 8, "top_speed": 320, "team": "Red Bull Racing"},
        "16": {"gear_max": 8, "top_speed": 318, "team": "Scuderia Ferrari"},
        "4": {"gear_max": 8, "top_speed": 316, "team": "McLaren F1"},
        "14": {"gear_max": 8, "top_speed": 314, "team": "Aston Martin F1"},
        "63": {"gear_max": 8, "top_speed": 315, "team": "Mercedes-AMG F1"},
        "55": {"gear_max": 8, "top_speed": 317, "team": "Williams Racing"},
        "81": {"gear_max": 8, "top_speed": 316, "team": "McLaren F1"}
    }
    
    spec = base_specs.get(car_number, {"gear_max": 8, "top_speed": 315, "team": "Formula 1 Team"})
    
    for i in range(total_frames):
        t = i / fps # time in seconds
        progress = t / duration_seconds # 0.0 to 1.0
        timestamp_ms = int(t * 1000)
        
        # Turn phase:
        # 0.0 - 0.3: High-speed braking / entry
        # 0.3 - 0.6: Apex compression / max lateral load
        # 0.6 - 1.0: Corner exit / full throttle over kerb
        
        if progress < 0.3:
            # Entry / Braking
            entry_p = progress / 0.3
            speed_kph = 285.0 - (entry_p * 90.0) + random.uniform(-1.5, 1.5)
            throttle_pct = max(0.0, 100.0 - (entry_p * 100.0))
            brake_pct = min(100.0, (entry_p * 95.0))
            steering_deg = (entry_p * -18.0) + random.uniform(-0.5, 0.5) # left-hand or right-hand corner
            gear = 7 if entry_p < 0.5 else 5
            rpm = int(11800 - (entry_p * 2800) + random.uniform(-100, 100))
            lateral_g = -(entry_p * 2.8) + random.uniform(-0.1, 0.1)
            longitudinal_g = -(brake_pct / 100.0) * 4.2
        elif progress < 0.6:
            # Apex
            apex_p = (progress - 0.3) / 0.3
            speed_kph = 195.0 + (apex_p * 35.0) + random.uniform(-1.0, 1.0)
            throttle_pct = min(75.0, apex_p * 80.0)
            brake_pct = max(0.0, 20.0 - (apex_p * 20.0))
            steering_deg = -22.0 + (apex_p * 6.0) + random.uniform(-0.8, 0.8)
            gear = 5 if apex_p < 0.6 else 6
            rpm = int(9800 + (apex_p * 2200) + random.uniform(-100, 100))
            lateral_g = -3.8 - (math.sin(apex_p * math.pi) * 1.1) + random.uniform(-0.15, 0.15) # Up to 4.9G peak
            longitudinal_g = (throttle_pct / 100.0) * 1.4
        else:
            # Exit
            exit_p = (progress - 0.6) / 0.4
            speed_kph = 230.0 + (exit_p * 68.0) + random.uniform(-1.0, 1.0)
            throttle_pct = 100.0
            brake_pct = 0.0
            
            # If violation, counter-steer wobble at peak
            if is_violation and abs(t - peak_excursion_time) < 0.4:
                # Driver correction / snap oversteer
                snap = math.sin((t - peak_excursion_time) * 15.0) * 8.5
                steering_deg = -6.0 + snap
                lateral_g = -3.2 + (snap * 0.15)
            else:
                steering_deg = max(0.0, -12.0 + (exit_p * 12.0))
                lateral_g = -2.6 + (exit_p * 2.2)
                
            gear = 6 if exit_p < 0.4 else (7 if exit_p < 0.8 else 8)
            rpm = int(10800 + (exit_p * 2400) + random.uniform(-100, 100))
            longitudinal_g = 1.6 - (exit_p * 0.4)
        
        gps_x = 450.0 + (progress * 380.0) + math.sin(progress * math.pi) * 60.0
        gps_y = 620.0 - (progress * 280.0) + math.cos(progress * math.pi) * 35.0
        
        telemetry.append(TelemetryDataPoint(
            timestamp_ms=timestamp_ms,
            car_number=car_number,
            speed_kph=round(speed_kph, 1),
            throttle_pct=round(throttle_pct, 1),
            brake_pct=round(brake_pct, 1),
            steering_deg=round(steering_deg, 1),
            gear=gear,
            rpm=rpm,
            lateral_g=round(lateral_g, 2),
            longitudinal_g=round(longitudinal_g, 2),
            drs_active=progress > 0.8,
            gps_x=round(gps_x, 2),
            gps_y=round(gps_y, 2),
            lap=37,
            sector=3
        ))
        
    return telemetry
