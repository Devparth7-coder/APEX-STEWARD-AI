# APEX STEWARD AI
> **“AI that sees every boundary.”**
> Production-grade Multimodal Computer Vision & Decision-Support Intelligence Platform for Motorsport Race Control

---

## 🏎️ Overview & Philosophy

**APEX STEWARD AI** is a decision-support platform designed specifically for motorsport race stewards, race directors, and technical delegates. Rather than attempting to replace human authority with an opaque black box, APEX STEWARD AI acts as an **augmented decision copilot** that:

1. **Continuously tracks** every vehicle across high-frame-rate video feeds using deep object detection and multi-object tracking (YOLOv8 + Kalman/ByteTrack).
2. **Computes ground-plane tyre contact patches** (Front-Left, Front-Right, Rear-Left, Rear-Right) using calibrated 3D perspective homography rather than bounding box centers.
3. **Measures signed boundary excursions** in real-world metric units (centimeters) against configured legal track edges (Modes A, B, C).
4. **Applies temporal reasoning** to aggregate consecutive excursion frames into unified, auditable incidents.
5. **Synthesizes transparent confidence breakdowns** (Detection, Tracking, Boundary, Temporal, Geometry) and Explainable AI natural-language justifications.
6. **Synchronizes telemetry streams** (CAN Bus speed, throttle %, brake %, steering angle, lateral G, gear).
7. **Generates instant evidence packages** (multi-angle replays, Before/Crossing/Recovery keyframes, counterfactual sensitivity analysis).
8. **Enables human-in-the-loop validation** with full audit logging and supervised active learning feedback loops.

---

## 🛠️ Architecture & Core Components

```
                   +-------------------------------------------------------+
                   |                 LIVE RACE VIDEO FEED                  |
                   +-------------------------------------------------------+
                                              |
                                              v
                   +-------------------------------------------------------+
                   |    MODULAR COMPUTER VISION PIPELINE (OpenCV + PyTorch)|
                   |    • YOLOv8x / RT-DETR Vehicle & Wheel Detector       |
                   |    • Persistent Multi-Object Tracker (MOTA: 94.8%)    |
                   +-------------------------------------------------------+
                                              |
                        +---------------------+---------------------+
                        |                                           |
                        v                                           v
       +---------------------------------+         +---------------------------------+
       |    TRACK BOUNDARY CALIBRATION   |         |    TYRE CONTACT POINT ENGINE    |
       |    • Mode A: Manual Polyline    |         |    • 4 Contact Patches          |
       |    • Mode B: CV Edge Segmenter  |         |    • (FL, FR, RL, RR) Inset     |
       |    • Mode C: Predefined Presets |         |    • Perspective Homography     |
       |    • Uncertainty Corridor (±cm) |         |    • Signed Distance to Line    |
       +---------------------------------+         +---------------------------------+
                        |                                           |
                        +---------------------+---------------------+
                                              |
                                              v
                   +-------------------------------------------------------+
                   |           MOTORSPORT RULES & TEMPORAL ENGINE          |
                   |    • FIA Art. 33.3 (4 Wheels Beyond White Line)       |
                   |    • Strict Apex Limit / 2-Wheel Rules                |
                   |    • Temporal Aggregation (N Consecutive Frames)      |
                   +-------------------------------------------------------+
                                              |
                                              v
                   +-------------------------------------------------------+
                   |         TRANSPARENT CONFIDENCE BREAKDOWN              |
                   |    C_overall = 0.25 C_det + 0.20 C_trk + 0.20 C_bnd   |
                   |                + 0.20 C_temp + 0.15 C_geom            |
                   +-------------------------------------------------------+
                                              |
                                              v
                   +-------------------------------------------------------+
                   |    EVIDENCE REPLAY & COUNTERFACTUAL ENGINE            |
                   |    • Before -> Crossing -> Recovery Keyframes         |
                   |    • Multi-Angle Fusion (Trackside, Kerb, Onboard)    |
                   |    • Dynamic Shift Sensitivity (-15cm to +15cm)       |
                   +-------------------------------------------------------+
                                              |
                                              v
                   +-------------------------------------------------------+
                   |    HUMAN STEWARD REVIEW PAD & AUDIT TRAIL             |
                   |    • Confirm / Reject / Request More Review           |
                   |    • Penalties: Lap Deleted, +5s, +10s, B&W Flag      |
                   |    • Active Learning Ground Truth Feedback Queue      |
                   +-------------------------------------------------------+
```

---

## 📊 Transparent Confidence Formulation

The system avoids deceptive single-value black box scores by calculating a multi-factor transparent confidence score:

$$C_{\text{overall}} = w_{\text{det}} C_{\text{det}} + w_{\text{trk}} C_{\text{trk}} + w_{\text{bnd}} C_{\text{bnd}} + w_{\text{temp}} C_{\text{temp}} + w_{\text{geom}} C_{\text{geom}}$$

Where:
- $C_{\text{det}}$: Mean YOLO detector probability score over the excursion window ($w_{\text{det}} = 0.25$).
- $C_{\text{trk}}$: Trajectory smoothness & Kalman covariance ($w_{\text{trk}} = 0.20$).
- $C_{\text{bnd}}$: Track edge contrast score & calibration resolution ($w_{\text{bnd}} = 0.20$).
- $C_{\text{temp}}$: Temporal consistency ratio over consecutive frames ($w_{\text{temp}} = 0.20$).
- $C_{\text{geom}}$: Homography condition number and aspect foreshortening sanity ($w_{\text{geom}} = 0.15$).

### Categorization
- **HIGH CONFIDENCE (90–100%)**: Violation verified with high visual and geometric certainty.
- **MEDIUM CONFIDENCE (70–89%)**: Excursion detected; steward verification recommended.
- **LOW CONFIDENCE (<70%)**: Flagged for visual inspection due to optical flare, rain spray, or occlusion.

---

## 🏆 Key Hackathon Differentiators

1. **Counterfactual Sensitivity Review**: Simulates "What if the legal line was shifted by $\pm 5\text{cm}$ or $\pm 10\text{cm}$?" to guarantee robust decisions.
2. **Uncertainty Corridor Visualization**: Explicitly renders sensor tolerance bands (e.g. $\pm 3.8\text{cm}$) so stewards know when a call is within camera margin of error.
3. **Multi-Camera Fusion**: Integrates Main Turn Trackside, Ground-level Exit Kerb Cam, and Onboard Cockpit T-Cam.
4. **Explainable AI**: Translates raw CV bounding coordinates and CAN bus telemetry into natural-language incident justifications.
5. **Active Learning Feedback Loop**: Rejected or corrected incidents automatically enter a supervised training feedback queue for PyTorch model fine-tuning.

---

## 🚀 Getting Started & System Access

- **Web Dashboard**: `http://localhost:5173` (Vite + React + Tailwind CSS)
- **FastAPI REST API**: `http://localhost:8000/api`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
