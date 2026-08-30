import numpy as np
import math
from typing import List, Dict, Any, Tuple, Optional

class KalmanBoxTracker:
    count = 0
    def __init__(self, bbox: List[float], car_number: str = "44", driver: str = "Lewis Hamilton", team: str = "Mercedes-AMG"):
        # bbox: [x1, y1, x2, y2]
        self.bbox = np.array(bbox, dtype=np.float32)
        self.id = KalmanBoxTracker.count
        KalmanBoxTracker.count += 1
        self.car_number = car_number
        self.driver_name = driver
        self.team = team
        self.history = [bbox]
        self.hits = 1
        self.time_since_update = 0
        self.velocity = np.array([0.0, 0.0], dtype=np.float32)
        self.confidence = 0.95

    def update(self, bbox: List[float], confidence: float = 0.95):
        self.time_since_update = 0
        self.hits += 1
        # Simple exponential moving average filter for bounding box stability
        alpha = 0.75
        new_bbox = np.array(bbox, dtype=np.float32)
        
        # Calculate velocity in pixels/frame
        old_center = np.array([(self.bbox[0] + self.bbox[2])/2, (self.bbox[1] + self.bbox[3])/2])
        new_center = np.array([(new_bbox[0] + new_bbox[2])/2, (new_bbox[1] + new_bbox[3])/2])
        inst_velocity = new_center - old_center
        self.velocity = alpha * self.velocity + (1 - alpha) * inst_velocity
        
        self.bbox = alpha * self.bbox + (1 - alpha) * new_bbox
        self.confidence = alpha * self.confidence + (1 - alpha) * confidence
        self.history.append(list(self.bbox))
        if len(self.history) > 60:
            self.history.pop(0)

    def predict(self) -> List[float]:
        # Advance state with velocity estimate
        if self.time_since_update > 0:
            dx, dy = self.velocity[0], self.velocity[1]
            self.bbox[0] += dx
            self.bbox[1] += dy
            self.bbox[2] += dx
            self.bbox[3] += dy
        self.time_since_update += 1
        return list(self.bbox)

    def get_heading(self) -> float:
        # Calculate heading angle in degrees from velocity vector
        vx, vy = self.velocity[0], self.velocity[1]
        speed = math.hypot(vx, vy)
        if speed < 0.5:
            return 25.0 # default cornering entry angle
        deg = math.degrees(math.atan2(vy, vx))
        return deg

class MultiObjectTracker:
    def __init__(self, max_age: int = 15, iou_threshold: float = 0.3):
        self.max_age = max_age
        self.iou_threshold = iou_threshold
        self.trackers: List[KalmanBoxTracker] = []
        self.frame_count = 0

    @staticmethod
    def iou(bb_test: List[float], bb_gt: List[float]) -> float:
        xx1 = max(bb_test[0], bb_gt[0])
        yy1 = max(bb_test[1], bb_gt[1])
        xx2 = min(bb_test[2], bb_gt[2])
        yy2 = min(bb_test[3], bb_gt[3])
        w = max(0.0, xx2 - xx1)
        h = max(0.0, yy2 - yy1)
        inter = w * h
        area1 = (bb_test[2] - bb_test[0]) * (bb_test[3] - bb_test[1])
        area2 = (bb_gt[2] - bb_gt[0]) * (bb_gt[3] - bb_gt[1])
        union = area1 + area2 - inter
        if union <= 0:
            return 0.0
        return inter / union

    def update(self, detections: List[Dict[str, Any]]) -> List[KalmanBoxTracker]:
        """
        detections: list of dicts with 'bbox': [x1, y1, x2, y2], 'confidence': float, 'car_number': str, 'driver': str, 'team': str
        """
        self.frame_count += 1
        
        # Predict positions
        for trk in self.trackers:
            trk.predict()
            
        matched_trks = set()
        matched_dets = set()
        
        # Match detections to existing trackers using IOU
        if len(self.trackers) > 0 and len(detections) > 0:
            iou_matrix = np.zeros((len(detections), len(self.trackers)), dtype=np.float32)
            for d_idx, det in enumerate(detections):
                for t_idx, trk in enumerate(self.trackers):
                    iou_matrix[d_idx, t_idx] = self.iou(det["bbox"], list(trk.bbox))
                    
            # Greedy matching
            while True:
                max_iou = np.max(iou_matrix)
                if max_iou < self.iou_threshold:
                    break
                d_idx, t_idx = np.unravel_index(np.argmax(iou_matrix), iou_matrix.shape)
                if d_idx in matched_dets or t_idx in matched_trks:
                    iou_matrix[d_idx, t_idx] = -1
                    continue
                
                # Match found
                matched_dets.add(d_idx)
                matched_trks.add(t_idx)
                self.trackers[t_idx].update(detections[d_idx]["bbox"], detections[d_idx].get("confidence", 0.95))
                iou_matrix[d_idx, :] = -1
                iou_matrix[:, t_idx] = -1

        # Create new trackers for unmatched detections
        for d_idx, det in enumerate(detections):
            if d_idx not in matched_dets:
                trk = KalmanBoxTracker(
                    bbox=det["bbox"],
                    car_number=det.get("car_number", "44"),
                    driver=det.get("driver", "Lewis Hamilton"),
                    team=det.get("team", "Mercedes-AMG")
                )
                self.trackers.append(trk)
                
        # Remove dead tracks
        self.trackers = [t for t in self.trackers if t.time_since_update <= self.max_age]
        
        return self.trackers
