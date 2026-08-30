import os
import math
import subprocess
import numpy as np
import cv2
from typing import List, Dict, Any, Tuple
from ..models.schemas import Point2D, TyreContactPoints, EvidenceFrame

class RaceVideoGenerator:
    def __init__(self, output_dir: str = "/home/user/apex-steward-ai/backend/static"):
        self.output_dir = output_dir
        self.video_dir = os.path.join(output_dir, "videos")
        self.evidence_dir = os.path.join(output_dir, "evidence")
        os.makedirs(self.video_dir, exist_ok=True)
        os.makedirs(self.evidence_dir, exist_ok=True)
        
        # Locate ffmpeg executable
        try:
            import imageio_ffmpeg
            self.ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            self.ffmpeg_path = "ffmpeg"

    def _draw_track_surface(self, frame: np.ndarray, width: int, height: int, turn_type: str = "red_bull_ring"):
        """
        Renders a realistic motorsport corner surface with asphalt, painted white line,
        red/white rumble strip kerb, and gravel/grass runoff.
        """
        # 1. Background / Runoff (Gravel & green artificial turf)
        frame[:] = (45, 55, 40) # Muted grass/turf green
        
        # Runoff gravel trap zone (upper half)
        cv2.rectangle(frame, (0, 0), (width, int(height * 0.45)), (55, 75, 110), -1) # Gravel brownish
        
        # Add subtle gravel texture noise
        noise = np.random.randint(-8, 8, (int(height * 0.45), width, 3), dtype=np.int16)
        gravel_sub = frame[0:int(height * 0.45), 0:width].astype(np.int16) + noise
        frame[0:int(height * 0.45), 0:width] = np.clip(gravel_sub, 0, 255).astype(np.uint8)

        # 2. Main Racing Asphalt Surface (bottom polygon)
        # Polyline curve defining track boundary
        track_poly = np.array([
            [0, height],
            [0, int(height * 0.78)],
            [int(width * 0.3), int(height * 0.68)],
            [int(width * 0.55), int(height * 0.60)],
            [int(width * 0.78), int(height * 0.54)],
            [width, int(height * 0.51)],
            [width, height]
        ], dtype=np.int32)
        
        # Asphalt dark grey color
        cv2.fillPoly(frame, [track_poly], (38, 42, 48))
        
        # Add subtle asphalt asphalt grain
        asphalt_noise = np.random.randint(-4, 4, frame.shape, dtype=np.int16)
        frame[:] = np.clip(frame.astype(np.int16) + asphalt_noise, 0, 255).astype(np.uint8)

        # 3. Red & White Kerb (Rumble Strip)
        kerb_pts = [
            (0, int(height * 0.78)),
            (int(width * 0.3), int(height * 0.68)),
            (int(width * 0.55), int(height * 0.60)),
            (int(width * 0.78), int(height * 0.54)),
            (width, int(height * 0.51))
        ]
        
        # Draw alternating red and white teeth
        num_teeth = 36
        for i in range(num_teeth):
            t0 = i / num_teeth
            t1 = (i + 1) / num_teeth
            
            # Interpolate along kerb curve
            def get_pt(t):
                idx = int(t * (len(kerb_pts) - 1))
                next_idx = min(len(kerb_pts) - 1, idx + 1)
                sub_t = (t * (len(kerb_pts) - 1)) - idx
                x = int(kerb_pts[idx][0] + sub_t * (kerb_pts[next_idx][0] - kerb_pts[idx][0]))
                y = int(kerb_pts[idx][1] + sub_t * (kerb_pts[next_idx][1] - kerb_pts[idx][1]))
                return x, y
                
            p0_x, p0_y = get_pt(t0)
            p1_x, p1_y = get_pt(t1)
            
            # Kerb width vector (perpendicular upwards)
            kw = 32
            color = (30, 30, 220) if (i % 2 == 0) else (230, 230, 230) # Red or White
            
            poly = np.array([
                [p0_x, p0_y],
                [p1_x, p1_y],
                [p1_x, p1_y - kw],
                [p0_x, p0_y - kw]
            ], dtype=np.int32)
            cv2.fillPoly(frame, [poly], color)
            cv2.polylines(frame, [poly], True, (20, 20, 20), 1)

        # 4. Legal Track Boundary White Line (Painted line between asphalt and kerb)
        white_line_pts = np.array(kerb_pts, dtype=np.int32)
        cv2.polylines(frame, [white_line_pts], False, (245, 245, 245), 6, cv2.LINE_AA)
        
        # 5. Distance marker board (e.g. 50m marker on grass)
        cv2.rectangle(frame, (int(width * 0.85), int(height * 0.36)), (int(width * 0.92), int(height * 0.44)), (240, 240, 240), -1)
        cv2.rectangle(frame, (int(width * 0.85), int(height * 0.36)), (int(width * 0.92), int(height * 0.44)), (20, 20, 20), 2)
        cv2.putText(frame, "50", (int(width * 0.865), int(height * 0.42)), cv2.FONT_HERSHEY_DUPLEX, 0.7, (20, 20, 20), 2)

    def _draw_f1_car(
        self,
        frame: np.ndarray,
        center_x: float,
        center_y: float,
        scale: float,
        heading_deg: float,
        car_number: str = "44",
        team: str = "Mercedes-AMG"
    ) -> Tuple[List[float], List[Tuple[float, float]]]:
        """
        Draws an aerodynamic modern race car with front wing, halo, sidepods, rear wing,
        and 4 wheels with yellow/red tyre markings.
        Returns (bbox [x1, y1, x2, y2], wheel_centers [(fl_x, fl_y), (fr_x, fr_y), (rl_x, rl_y), (rr_x, rr_y)])
        """
        # Livery colors (BGR)
        livery_map = {
            "44": {"body": (180, 180, 180), "accent": (210, 240, 0), "halo": (20, 20, 20), "name": "HAM"}, # Mercedes Teal/Silver
            "1": {"body": (140, 30, 20), "accent": (0, 215, 255), "halo": (0, 0, 230), "name": "VER"}, # Red Bull Navy/Yellow
            "16": {"body": (25, 25, 215), "accent": (255, 255, 255), "halo": (20, 20, 20), "name": "LEC"}, # Ferrari Scarlet
            "4": {"body": (20, 120, 255), "accent": (210, 210, 0), "halo": (20, 20, 20), "name": "NOR"}, # McLaren Papaya
            "14": {"body": (60, 110, 0), "accent": (20, 230, 200), "halo": (20, 20, 20), "name": "ALO"}, # Aston Martin Green
            "63": {"body": (170, 170, 170), "accent": (210, 240, 0), "halo": (20, 20, 20), "name": "RUS"}
        }
        spec = livery_map.get(car_number, {"body": (120, 120, 120), "accent": (0, 200, 255), "halo": (20, 20, 20), "name": car_number})
        
        car_w = 95.0 * scale
        car_h = 42.0 * scale
        
        # Bounding box
        x1 = center_x - car_w / 2.0
        y1 = center_y - car_h / 2.0
        x2 = center_x + car_w / 2.0
        y2 = center_y + car_h / 2.0
        
        rad = math.radians(heading_deg)
        cos_a = math.cos(rad)
        sin_a = math.sin(rad)
        
        def rot(dx, dy):
            rx = center_x + dx * cos_a - dy * sin_a
            ry = center_y + dx * sin_a + dy * cos_a
            return int(rx), int(ry)

        # Wheels coordinates relative to center
        # Front axle: dx = +car_w*0.38, Rear axle: dx = -car_w*0.38
        wheel_w = 16.0 * scale
        wheel_h = 24.0 * scale
        
        fl = (int(center_x + car_w * 0.36 * cos_a - (-car_h * 0.44) * sin_a),
              int(center_y + car_w * 0.36 * sin_a + (-car_h * 0.44) * cos_a))
        fr = (int(center_x + car_w * 0.36 * cos_a - (car_h * 0.44) * sin_a),
              int(center_y + car_w * 0.36 * sin_a + (car_h * 0.44) * cos_a))
        rl = (int(center_x - car_w * 0.36 * cos_a - (-car_h * 0.44) * sin_a),
              int(center_y - car_w * 0.36 * sin_a + (-car_h * 0.44) * cos_a))
        rr = (int(center_x - car_w * 0.36 * cos_a - (car_h * 0.44) * sin_a),
              int(center_y - car_w * 0.36 * sin_a + (car_h * 0.44) * cos_a))
        
        # Draw 4 Wheels (Tyres)
        for wx, wy in [fl, fr, rl, rr]:
            cv2.ellipse(frame, (wx, wy), (int(wheel_w / 2), int(wheel_h / 2)), heading_deg, 0, 360, (18, 18, 18), -1)
            # Yellow Pirelli tyre ring decal
            cv2.ellipse(frame, (wx, wy), (int(wheel_w / 2 * 0.7), int(wheel_h / 2 * 0.7)), heading_deg, 0, 360, (0, 215, 255), 1)

        # Draw Chassis / Bodywork Polygon
        body_pts = [
            rot(car_w * 0.48, 0),              # Nose tip
            rot(car_w * 0.38, -car_h * 0.22),  # Front wing left
            rot(car_w * 0.15, -car_h * 0.35),  # Sidepod left
            rot(-car_w * 0.35, -car_h * 0.30), # Engine cover left
            rot(-car_w * 0.48, -car_h * 0.38), # Rear wing endplate left
            rot(-car_w * 0.48, car_h * 0.38),  # Rear wing endplate right
            rot(-car_w * 0.35, car_h * 0.30),  # Engine cover right
            rot(car_w * 0.15, car_h * 0.35),   # Sidepod right
            rot(car_w * 0.38, car_h * 0.22),   # Front wing right
        ]
        cv2.fillPoly(frame, [np.array(body_pts, dtype=np.int32)], spec["body"])
        cv2.polylines(frame, [np.array(body_pts, dtype=np.int32)], True, (25, 25, 25), 2)
        
        # Accent Livery Stripe
        accent_pts = [
            rot(car_w * 0.30, 0),
            rot(car_w * 0.10, -car_h * 0.15),
            rot(-car_w * 0.25, -car_h * 0.10),
            rot(-car_w * 0.25, car_h * 0.10),
            rot(car_w * 0.10, car_h * 0.15),
        ]
        cv2.fillPoly(frame, [np.array(accent_pts, dtype=np.int32)], spec["accent"])

        # Cockpit & Halo
        cv2.ellipse(frame, rot(car_w * 0.05, 0), (int(car_w * 0.12), int(car_h * 0.14)), heading_deg, 0, 360, spec["halo"], -1)
        # Driver Helmet
        cv2.circle(frame, rot(car_w * 0.02, 0), int(5 * scale), (0, 240, 255), -1)

        # Front Wing bar
        fw_pts = [
            rot(car_w * 0.42, -car_h * 0.45),
            rot(car_w * 0.46, -car_h * 0.45),
            rot(car_w * 0.46, car_h * 0.45),
            rot(car_w * 0.42, car_h * 0.45),
        ]
        cv2.fillPoly(frame, [np.array(fw_pts, dtype=np.int32)], (30, 30, 30))
        
        # Rear Wing bar
        rw_pts = [
            rot(-car_w * 0.45, -car_h * 0.44),
            rot(-car_w * 0.49, -car_h * 0.44),
            rot(-car_w * 0.49, car_h * 0.44),
            rot(-car_w * 0.45, car_h * 0.44),
        ]
        cv2.fillPoly(frame, [np.array(rw_pts, dtype=np.int32)], (20, 20, 20))

        # Car number text on nose
        num_pos = rot(car_w * 0.22, 0)
        cv2.putText(frame, car_number, (num_pos[0] - 6, num_pos[1] + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.35 * scale, (255, 255, 255), 1)

        return [x1, y1, x2, y2], [fl, fr, rl, rr]

    def generate_incident_scenario_video(
        self,
        incident_code: str = "INC-027",
        car_number: str = "44",
        driver_name: str = "Lewis Hamilton",
        team: str = "Mercedes-AMG Petronas",
        turn_name: str = "Turn 9 (Jochen Rindt)",
        lap: int = 37,
        duration_s: float = 4.0,
        fps: int = 30,
        is_violation: bool = True,
        max_excursion_cm: float = 14.2
    ) -> Dict[str, Any]:
        """
        Renders complete video clips (Raw footage + AI Overlay replay + Keyframe images)
        for an incident scenario.
        """
        width, height = 1280, 720
        total_frames = int(duration_s * fps)
        
        raw_video_filename = f"{incident_code.lower()}_raw.mp4"
        overlay_video_filename = f"{incident_code.lower()}_overlay.mp4"
        raw_video_path = os.path.join(self.video_dir, raw_video_filename)
        overlay_video_path = os.path.join(self.video_dir, overlay_video_filename)
        
        # We will collect frames for both raw and overlay
        raw_frames = []
        overlay_frames = []
        key_frames_data = []
        
        # Boundary line polyline (coordinates on 1280x720)
        boundary_pts = [
            (0, 560),
            (380, 490),
            (680, 435),
            (960, 395),
            (1280, 370)
        ]
        
        # Trajectory calculation
        # Vehicle enters from (x=100, y=660) and sweeps across Turn 9 exit
        # If is_violation: around t=0.45 to 0.65, apex drifts up past boundary into kerb
        peak_frame = int(total_frames * 0.52)
        
        for i in range(total_frames):
            t = i / total_frames # 0.0 to 1.0
            raw_frame = np.zeros((height, width, 3), dtype=np.uint8)
            self._draw_track_surface(raw_frame, width, height)
            
            # Vehicle position calculation
            # X travels from 80 to 1200
            cx = 80 + (t * 1120.0)
            
            # Base parabolic racing line
            cy_base = 660.0 - (math.sin(t * math.pi * 0.9) * 240.0)
            
            if is_violation:
                # Excursion drift between t=0.38 and t=0.68
                if 0.35 <= t <= 0.70:
                    drift_factor = math.sin((t - 0.35) / 0.35 * math.pi)
                    # Excursion upward into kerb/runoff
                    cy = cy_base - (drift_factor * 52.0)
                else:
                    cy = cy_base
            else:
                cy = cy_base
                
            heading = -18.0 + (t * 22.0) # Steering rotation
            scale = 1.0 + (t * 0.15) # Perspective size increase
            
            # Draw car on raw frame
            bbox, wheels = self._draw_f1_car(raw_frame, cx, cy, scale, heading, car_number, team)
            raw_frames.append(raw_frame.copy())
            
            # Now build Overlay Frame
            overlay_frame = raw_frame.copy()
            
            # 1. Draw boundary polyline (Neon Cyan)
            for b_idx in range(len(boundary_pts) - 1):
                cv2.line(overlay_frame, boundary_pts[b_idx], boundary_pts[b_idx + 1], (255, 240, 0), 3, cv2.LINE_AA)
                
            # 2. Draw uncertainty tolerance band corridor (dashed green/cyan)
            band_offset = 12
            for b_idx in range(len(boundary_pts) - 1):
                p1 = (boundary_pts[b_idx][0], boundary_pts[b_idx][1] - band_offset)
                p2 = (boundary_pts[b_idx + 1][0], boundary_pts[b_idx + 1][1] - band_offset)
                cv2.line(overlay_frame, p1, p2, (200, 255, 100), 1, cv2.LINE_AA)
                p1_b = (boundary_pts[b_idx][0], boundary_pts[b_idx][1] + band_offset)
                p2_b = (boundary_pts[b_idx + 1][0], boundary_pts[b_idx + 1][1] + band_offset)
                cv2.line(overlay_frame, p1_b, p2_b, (200, 255, 100), 1, cv2.LINE_AA)
            
            # 3. Determine if current frame is violation
            # Calculate distance of each wheel to boundary line
            fl, fr, rl, rr = wheels
            
            def get_bnd_y(x_val):
                for b_i in range(len(boundary_pts) - 1):
                    if boundary_pts[b_i][0] <= x_val <= boundary_pts[b_i + 1][0]:
                        ratio = (x_val - boundary_pts[b_i][0]) / max(1, (boundary_pts[b_i + 1][0] - boundary_pts[b_i][0]))
                        return boundary_pts[b_i][1] + ratio * (boundary_pts[b_i + 1][1] - boundary_pts[b_i][1])
                return 450.0
                
            fl_bnd_y = get_bnd_y(fl[0])
            fr_bnd_y = get_bnd_y(fr[0])
            rl_bnd_y = get_bnd_y(rl[0])
            rr_bnd_y = get_bnd_y(rr[0])
            
            # In pixel coordinates, lower Y is above/outside the line
            fl_out = fl[1] < fl_bnd_y
            fr_out = fr[1] < fr_bnd_y
            rl_out = rl[1] < rl_bnd_y
            rr_out = rr[1] < rr_bnd_y
            
            frame_is_violation = (fl_out and fr_out and rl_out and rr_out) if is_violation else False
            
            # 4. Draw Wheel Contact Markers
            for w_idx, (w_pos, is_out, w_lbl) in enumerate([(fl, fl_out, "FL"), (fr, fr_out, "FR"), (rl, rl_out, "RL"), (rr, rr_out, "RR")]):
                pt_color = (40, 40, 255) if is_out else (40, 255, 100) # Red if outside, Green if legal
                cv2.circle(overlay_frame, w_pos, 7, pt_color, -1)
                cv2.circle(overlay_frame, w_pos, 10, (255, 255, 255), 2)
                cv2.putText(overlay_frame, w_lbl, (w_pos[0] - 10, w_pos[1] - 12), cv2.FONT_HERSHEY_DUPLEX, 0.4, (255, 255, 255), 1)
                
            # 5. Draw Bounding Box and Track Tag
            box_color = (50, 50, 255) if frame_is_violation else (0, 240, 255)
            x1_i, y1_i, x2_i, y2_i = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
            cv2.rectangle(overlay_frame, (x1_i, y1_i), (x2_i, y2_i), box_color, 2)
            
            # Header badge
            status_text = "TRACK LIMIT EXCEEDED" if frame_is_violation else "TRACK LIMIT COMPLIANT"
            badge_bg = (20, 20, 200) if frame_is_violation else (20, 160, 40)
            cv2.rectangle(overlay_frame, (x1_i, y1_i - 28), (x1_i + 220, y1_i), badge_bg, -1)
            cv2.putText(overlay_frame, f"#{car_number} {status_text}", (x1_i + 6, y1_i - 8), cv2.FONT_HERSHEY_DUPLEX, 0.42, (255, 255, 255), 1)

            # 6. Race Control HUD overlay on top-left and bottom-left
            # Top HUD
            cv2.rectangle(overlay_frame, (20, 20), (450, 95), (15, 20, 28), -1)
            cv2.rectangle(overlay_frame, (20, 20), (450, 95), (45, 60, 85), 1)
            cv2.putText(overlay_frame, "APEX STEWARD AI — REAL-TIME BOUNDARY TRACKER", (35, 45), cv2.FONT_HERSHEY_DUPLEX, 0.45, (0, 240, 255), 1)
            cv2.putText(overlay_frame, f"INCIDENT: {incident_code} | LAP {lap} | {turn_name.upper()}", (35, 68), cv2.FONT_HERSHEY_DUPLEX, 0.42, (220, 220, 220), 1)
            cv2.putText(overlay_frame, f"CAR: #{car_number} ({driver_name}) | FPS: 30.0 | LATENCY: 38ms", (35, 88), cv2.FONT_HERSHEY_DUPLEX, 0.38, (160, 180, 200), 1)
            
            # Excursion meter on top-right if violation
            if frame_is_violation:
                cv2.rectangle(overlay_frame, (width - 320, 20), (width - 20, 95), (15, 20, 28), -1)
                cv2.rectangle(overlay_frame, (width - 320, 20), (width - 20, 95), (40, 40, 240), 2)
                cv2.putText(overlay_frame, "VIOLATION DETECTED", (width - 300, 45), cv2.FONT_HERSHEY_DUPLEX, 0.55, (50, 50, 255), 2)
                cv2.putText(overlay_frame, f"MAX EXCURSION: {max_excursion_cm:.1f} cm", (width - 300, 68), cv2.FONT_HERSHEY_DUPLEX, 0.45, (255, 255, 255), 1)
                cv2.putText(overlay_frame, "4 WHEELS BEYOND WHITE LINE", (width - 300, 88), cv2.FONT_HERSHEY_DUPLEX, 0.38, (180, 180, 255), 1)
            
            overlay_frames.append(overlay_frame)
            
            # Save keyframe snapshots for Before (frame 25), Peak Crossing (frame 62), After (frame 95)
            if i in [int(total_frames * 0.25), peak_frame, int(total_frames * 0.85)]:
                stage_name = "before" if i < peak_frame - 10 else ("peak" if abs(i - peak_frame) <= 5 else "after")
                kf_raw_name = f"{incident_code.lower()}_{stage_name}_raw.jpg"
                kf_overlay_name = f"{incident_code.lower()}_{stage_name}_overlay.jpg"
                
                cv2.imwrite(os.path.join(self.evidence_dir, kf_raw_name), raw_frame)
                cv2.imwrite(os.path.join(self.evidence_dir, kf_overlay_name), overlay_frame)
                
                key_frames_data.append({
                    "stage": stage_name,
                    "frame_number": i,
                    "timestamp_s": round(i / fps, 2),
                    "raw_image_url": f"/media/evidence/{kf_raw_name}",
                    "overlay_image_url": f"/media/evidence/{kf_overlay_name}",
                    "excursion_cm": max_excursion_cm if stage_name == "peak" else (0.0 if stage_name == "before" else 0.0)
                })

        # Encode MP4 files with ffmpeg
        self._encode_frames_to_mp4(raw_frames, raw_video_path, fps)
        self._encode_frames_to_mp4(overlay_frames, overlay_video_path, fps)
        
        return {
            "raw_video_url": f"/media/videos/{raw_video_filename}",
            "overlay_video_url": f"/media/videos/{overlay_video_filename}",
            "key_frames": key_frames_data,
            "total_frames": total_frames,
            "peak_frame": peak_frame
        }

    def _encode_frames_to_mp4(self, frames: List[np.ndarray], output_path: str, fps: int = 30):
        """
        Encodes list of BGR numpy frames directly to browser-playable H.264 MP4 using ffmpeg.
        """
        if len(frames) == 0:
            return
            
        height, width = frames[0].shape[:2]
        
        # We can pipe raw BGR24 frames into ffmpeg process
        cmd = [
            self.ffmpeg_path,
            "-y", # overwrite
            "-f", "rawvideo",
            "-vcodec", "rawvideo",
            "-s", f"{width}x{height}",
            "-pix_fmt", "bgr24",
            "-r", str(fps),
            "-i", "-", # read from stdin
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "fast",
            "-crf", "22",
            "-movflags", "+faststart",
            output_path
        ]
        
        try:
            p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            for f in frames:
                p.stdin.write(f.tobytes())
            p.stdin.close()
            p.wait()
        except Exception as e:
            # Fallback to OpenCV VideoWriter if ffmpeg pipe fails
            print(f"FFmpeg encoding pipe fallback: {e}")
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            for f in frames:
                out.write(f)
            out.release()
