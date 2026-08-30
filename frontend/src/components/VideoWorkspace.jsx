import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Layers, 
  Camera, 
  Gauge, 
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Film
} from 'lucide-react';

export default function VideoWorkspace({ 
  incident, 
  onSelectIncident, 
  onOpenStewardModal 
}) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const animFrameIdRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [viewMode, setViewMode] = useState('overlay'); // 'overlay' or 'raw'
  const [renderEngine, setRenderEngine] = useState('canvas'); // 'canvas' (guaranteed 60fps) or 'video' (MP4 file)
  const [selectedCam, setSelectedCam] = useState('cam_01');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(3.6);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  const carNumber = incident?.car_number || '44';
  const isViolation = incident?.status === 'REVIEW_REQUIRED' || incident?.status === 'CONFIRMED' || incident?.max_excursion_cm > 5;
  const maxExcursion = incident?.max_excursion_cm || 14.2;

  // Active video source with fallback
  const activeVideoSrc = viewMode === 'overlay'
    ? (incident?.replay_video_url || '/media/videos/inc-027_overlay.mp4')
    : (incident?.replay_video_url?.replace('_overlay', '_raw') || '/media/videos/inc-027_raw.mp4');

  const posterSrc = viewMode === 'overlay'
    ? (incident?.key_evidence_frames?.[1]?.overlay_url || '/media/evidence/inc-027_peak_overlay.jpg')
    : (incident?.key_evidence_frames?.[1]?.image_url || '/media/evidence/inc-027_peak_raw.jpg');

  // Draw scene on canvas based on current time
  const drawFrame = useCallback((ctx, timeVal) => {
    if (!ctx) return;
    const width = 1280;
    const height = 720;
    const t = (timeVal % duration) / duration; // 0.0 to 1.0

    // 1. Background / Gravel Runoff (Upper area)
    ctx.fillStyle = '#3a4435'; // Grass / gravel runoff
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#4a5364'; // Gravel trap upper half
    ctx.fillRect(0, 0, width, height * 0.45);

    // Gravel texture speckles
    ctx.fillStyle = '#333c48';
    for (let i = 0; i < 40; i++) {
      const gx = (i * 37) % width;
      const gy = (i * 19) % (height * 0.42);
      ctx.fillRect(gx, gy, 4, 3);
    }

    // 2. Main Racing Asphalt Surface (Bottom polygon)
    ctx.fillStyle = '#22262c';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.78);
    ctx.lineTo(width * 0.3, height * 0.68);
    ctx.lineTo(width * 0.55, height * 0.60);
    ctx.lineTo(width * 0.78, height * 0.54);
    ctx.lineTo(width, height * 0.51);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Asphalt grain lines
    ctx.strokeStyle = '#2b3038';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, height * 0.8 + i * 20);
      ctx.lineTo(width, height * 0.55 + i * 20);
      ctx.stroke();
    }

    // 3. Red & White Rumble Kerb (Teeth along boundary)
    const kerbPoints = [
      { x: 0, y: height * 0.78 },
      { x: width * 0.3, y: height * 0.68 },
      { x: width * 0.55, y: height * 0.60 },
      { x: width * 0.78, y: height * 0.54 },
      { x: width, y: height * 0.51 }
    ];

    const numTeeth = 32;
    for (let i = 0; i < numTeeth; i++) {
      const r0 = i / numTeeth;
      const r1 = (i + 1) / numTeeth;

      const getKerbPt = (r) => {
        const idx = Math.min(kerbPoints.length - 2, Math.floor(r * (kerbPoints.length - 1)));
        const sub = (r * (kerbPoints.length - 1)) - idx;
        const p1 = kerbPoints[idx];
        const p2 = kerbPoints[idx + 1];
        return {
          x: p1.x + sub * (p2.x - p1.x),
          y: p1.y + sub * (p2.y - p1.y)
        };
      };

      const p0 = getKerbPt(r0);
      const p1 = getKerbPt(r1);
      const kw = 30;

      ctx.fillStyle = i % 2 === 0 ? '#dc2626' : '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p1.x, p1.y - kw);
      ctx.lineTo(p0.x, p0.y - kw);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 4. Legal Track Boundary White Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    kerbPoints.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // 5. Distance marker board (50m marker)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(width * 0.86, height * 0.35, 70, 50);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.strokeRect(width * 0.86, height * 0.35, 70, 50);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('50', width * 0.88, height * 0.40);

    // 6. Calculate Vehicle Physics Position
    const carX = 100 + t * 1080;
    const baseCarY = 650 - Math.sin(t * Math.PI * 0.9) * 230;

    // Boundary Y at carX
    let boundaryYAtCar = height * 0.60;
    for (let i = 0; i < kerbPoints.length - 1; i++) {
      if (carX >= kerbPoints[i].x && carX <= kerbPoints[i + 1].x) {
        const ratio = (carX - kerbPoints[i].x) / (kerbPoints[i + 1].x - kerbPoints[i].x);
        boundaryYAtCar = kerbPoints[i].y + ratio * (kerbPoints[i + 1].y - kerbPoints[i].y);
        break;
      }
    }

    // If violation scenario, car drifts up past boundary around t=0.35 to 0.70
    let carY = baseCarY;
    let frameExcursion = false;
    if (isViolation && t >= 0.35 && t <= 0.70) {
      const drift = Math.sin((t - 0.35) / 0.35 * Math.PI) * 48;
      carY = baseCarY - drift;
      if (carY - 15 < boundaryYAtCar) {
        frameExcursion = true;
      }
    }

    const headingDeg = -16 + t * 20;
    const rad = (headingDeg * Math.PI) / 180;
    const carW = 110;
    const carH = 46;

    // Livery colors
    const livery = {
      '44': { body: '#d4d4d8', accent: '#00f0ff', halo: '#18181b', name: 'HAM' },
      '1': { body: '#1e293b', accent: '#ef4444', halo: '#fbbf24', name: 'VER' },
      '16': { body: '#dc2626', accent: '#ffffff', halo: '#18181b', name: 'LEC' },
      '4': { body: '#f97316', accent: '#00f0ff', halo: '#18181b', name: 'NOR' }
    }[carNumber] || { body: '#64748b', accent: '#00f0ff', halo: '#18181b', name: carNumber };

    // Draw Sparks if peak violation
    if (frameExcursion && Math.abs(t - 0.52) < 0.12) {
      ctx.fillStyle = '#ffaa00';
      for (let s = 0; s < 12; s++) {
        const sx = carX - 50 + (s * 7) % 30 + (Math.random() - 0.5) * 15;
        const sy = carY + 15 + Math.random() * 10;
        ctx.beginPath();
        ctx.arc(sx, sy, 2 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 7. Draw Race Car (Chassis & Tyres)
    ctx.save();
    ctx.translate(carX, carY);
    ctx.rotate(rad);

    // 4 Wheels
    const flPos = { x: carW * 0.36, y: -carH * 0.46 };
    const frPos = { x: carW * 0.36, y: carH * 0.46 };
    const rlPos = { x: -carW * 0.36, y: -carH * 0.46 };
    const rrPos = { x: -carW * 0.36, y: carH * 0.46 };

    [flPos, frPos, rlPos, rrPos].forEach((w) => {
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.ellipse(w.x, w.y, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#eab308'; // Yellow Pirelli decal
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Body Chassis
    ctx.fillStyle = livery.body;
    ctx.beginPath();
    ctx.moveTo(carW * 0.48, 0); // Nose tip
    ctx.lineTo(carW * 0.38, -carH * 0.24);
    ctx.lineTo(carW * 0.12, -carH * 0.36);
    ctx.lineTo(-carW * 0.35, -carH * 0.32);
    ctx.lineTo(-carW * 0.48, -carH * 0.40);
    ctx.lineTo(-carW * 0.48, carH * 0.40);
    ctx.lineTo(-carW * 0.35, carH * 0.32);
    ctx.lineTo(carW * 0.12, carH * 0.36);
    ctx.lineTo(carW * 0.38, carH * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Accent livery stripe
    ctx.fillStyle = livery.accent;
    ctx.beginPath();
    ctx.moveTo(carW * 0.30, 0);
    ctx.lineTo(carW * 0.10, -carH * 0.15);
    ctx.lineTo(-carW * 0.25, -carH * 0.10);
    ctx.lineTo(-carW * 0.25, carH * 0.10);
    ctx.lineTo(carW * 0.10, carH * 0.15);
    ctx.closePath();
    ctx.fill();

    // Front wing
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(carW * 0.42, -carH * 0.46, 8, carH * 0.92);

    // Rear wing
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-carW * 0.48, -carH * 0.45, 8, carH * 0.90);

    // Cockpit & Driver Helmet
    ctx.fillStyle = livery.halo;
    ctx.beginPath();
    ctx.ellipse(carW * 0.05, 0, carW * 0.14, carH * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(carW * 0.02, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // Car Number on Nose
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(carNumber, carW * 0.18, 4);

    ctx.restore();

    // 8. Overlays: Boundary, Uncertainty, Contact Points, Bounding Box & HUD
    if (viewMode === 'overlay') {
      // Draw Neon Cyan Boundary Polyline
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      kerbPoints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // Uncertainty Corridor (Dashed Green Lines)
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);

      [-14, 14].forEach((offset) => {
        ctx.beginPath();
        kerbPoints.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y + offset);
          else ctx.lineTo(pt.x, pt.y + offset);
        });
        ctx.stroke();
      });
      ctx.setLineDash([]); // Reset line dash

      // Absolute World Coordinates of 4 Wheels
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);
      const getWheelWorld = (w) => ({
        x: carX + w.x * cosA - w.y * sinA,
        y: carY + w.x * sinA + w.y * cosA
      });

      const worldWheels = [
        { name: 'FL', pt: getWheelWorld(flPos) },
        { name: 'FR', pt: getWheelWorld(frPos) },
        { name: 'RL', pt: getWheelWorld(rlPos) },
        { name: 'RR', pt: getWheelWorld(rrPos) }
      ];

      // Draw 4 Contact Patch Markers
      worldWheels.forEach((w) => {
        const isOut = frameExcursion;
        ctx.fillStyle = isOut ? '#ff3366' : '#00ff88';
        ctx.beginPath();
        ctx.arc(w.pt.x, w.pt.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(w.name, w.pt.x - 8, w.pt.y - 12);
      });

      // Bounding Box
      const bboxX1 = carX - carW * 0.55;
      const bboxY1 = carY - carH * 0.55;
      const bboxW = carW * 1.1;
      const bboxH = carH * 1.1;

      ctx.strokeStyle = frameExcursion ? '#ff3366' : '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(bboxX1, bboxY1, bboxW, bboxH);

      // Track ID & Status Tag
      ctx.fillStyle = frameExcursion ? 'rgba(220, 38, 38, 0.9)' : 'rgba(14, 116, 144, 0.9)';
      ctx.fillRect(bboxX1, bboxY1 - 24, 210, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`#${carNumber} ${frameExcursion ? 'TRACK LIMIT EXCEEDED' : 'LIMIT COMPLIANT'}`, bboxX1 + 6, bboxY1 - 7);

      // Top Left Race Control HUD Box
      ctx.fillStyle = 'rgba(7, 9, 14, 0.85)';
      ctx.fillRect(20, 20, 420, 80);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, 420, 80);

      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('APEX STEWARD AI — REAL-TIME BOUNDARY TRACKER', 35, 42);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px monospace';
      ctx.fillText(`INCIDENT: ${incident?.incident_code || 'INC-027'} | LAP 37 | TURN 9 (JOCHEN RINDT)`, 35, 62);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText(`CAR: #${carNumber} (${incident?.driver_name || 'Hamilton'}) | FPS: 30.0 | LATENCY: 38ms`, 35, 82);

      // Top Right Alert Banner if Violation
      if (frameExcursion) {
        ctx.fillStyle = 'rgba(153, 27, 27, 0.92)';
        ctx.fillRect(width - 320, 20, 300, 80);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(width - 320, 20, 300, 80);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('VIOLATION DETECTED', width - 300, 44);

        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`MAX EXCURSION: ${maxExcursion.toFixed(1)} CM`, width - 300, 64);

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px monospace';
        ctx.fillText('4 WHEELS BEYOND WHITE LINE', width - 300, 82);
      }
    }
  }, [incident, carNumber, isViolation, maxExcursion, viewMode, duration]);

  // Animation loop for 60fps canvas playback
  useEffect(() => {
    let lastTimestamp = performance.now();

    const renderLoop = (timestamp) => {
      const delta = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + delta * playbackRate;
          return next >= duration ? 0 : next;
        });
      }

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        drawFrame(ctx, currentTime);
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPlaying, playbackRate, currentTime, duration, drawFrame]);

  // Synchronize with HTML5 Video element if video mode is used
  useEffect(() => {
    if (renderEngine === 'video' && videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [renderEngine, isPlaying, playbackRate]);

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const stepFrame = (frames) => {
    setIsPlaying(false);
    setCurrentTime((prev) => {
      const next = prev + frames * (1 / 30);
      return Math.max(0, Math.min(duration, next));
    });
  };

  const jumpToStage = (stageRatio) => {
    setCurrentTime(duration * stageRatio);
  };

  return (
    <div className="bg-[#0b0f19] rounded-2xl border border-[#1e293b] p-4 flex flex-col h-full shadow-2xl relative overflow-hidden">
      {/* Top Video Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-2 border-b border-[#182030] gap-2">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
              LIVE EVIDENCE WORKSPACE
            </span>
          </div>
          <span className="text-gray-600">|</span>
          <span className="text-xs font-mono text-gray-300">
            INCIDENT: <strong className="text-cyan-400 font-bold">{incident?.incident_code || 'INC-027'}</strong>
          </span>
          <span className="text-xs font-mono text-gray-400">
            CAR: <strong className="text-white">#{carNumber} ({incident?.driver_name || 'Hamilton'})</strong>
          </span>
          <span className="text-xs font-mono text-yellow-400 bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-500/30">
            {incident?.turn_name || 'Turn 9 (Jochen Rindt)'}
          </span>
        </div>

        {/* Multi-angle Camera & Overlay Controls */}
        <div className="flex items-center space-x-2">
          {/* Overlay vs Raw Toggle */}
          <div className="bg-[#07090e] p-1 rounded-lg border border-[#1e293b] flex space-x-1 text-xs font-mono">
            <button
              onClick={() => setViewMode('overlay')}
              className={`px-2.5 py-1 rounded font-bold transition ${
                viewMode === 'overlay' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              AI Vision Overlay
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2.5 py-1 rounded font-bold transition ${
                viewMode === 'raw' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Raw Video Feed
            </button>
          </div>

          {/* Engine Selector (Canvas Engine vs MP4) */}
          <div className="bg-[#07090e] p-1 rounded-lg border border-[#1e293b] flex space-x-1 text-xs font-mono">
            <button
              onClick={() => setRenderEngine('canvas')}
              className={`px-2 py-1 rounded font-bold flex items-center space-x-1 transition ${
                renderEngine === 'canvas' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Interactive 60fps Real-Time Canvas Engine"
            >
              <Sparkles className="w-3 h-3" />
              <span>Canvas 60FPS</span>
            </button>
            <button
              onClick={() => setRenderEngine('video')}
              className={`px-2 py-1 rounded font-bold flex items-center space-x-1 transition ${
                renderEngine === 'video' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Direct H.264 MP4 Video Player"
            >
              <Film className="w-3 h-3" />
              <span>MP4 Replay</span>
            </button>
          </div>

          {/* Camera angles */}
          <div className="flex space-x-1 bg-[#07090e] p-1 rounded-lg border border-[#1e293b]">
            {['cam_01', 'cam_02', 'cam_03'].map((cam, idx) => (
              <button
                key={cam}
                onClick={() => setSelectedCam(cam)}
                className={`px-2 py-1 rounded text-xs font-mono font-bold flex items-center space-x-1 transition ${
                  selectedCam === cam ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Camera className="w-3 h-3" />
                <span>CAM 0{idx + 1}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Video/Canvas Screen Container */}
      <div className="relative flex-1 bg-black rounded-xl overflow-hidden border border-[#1e293b] flex items-center justify-center group min-h-[380px]">
        {/* Render Canvas Engine (High-Performance 60fps vector physics rendering) */}
        {renderEngine === 'canvas' ? (
          <div 
            className="relative w-full h-full flex items-center justify-center transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          /* Render MP4 Video Player with Poster */
          <div 
            className="relative w-full h-full flex items-center justify-center transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <video
              ref={videoRef}
              src={activeVideoSrc}
              poster={posterSrc}
              className="w-full h-full object-contain"
              onTimeUpdate={() => {
                if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
              }}
              loop
              playsInline
              muted
              autoPlay
            />
          </div>
        )}

        {/* Live Excursion Badge Overlaid on Top Right */}
        {incident?.status === 'REVIEW_REQUIRED' && (
          <div className="absolute top-3 right-3 bg-red-950/90 border border-red-500/80 px-3 py-1.5 rounded-lg text-xs font-mono shadow-xl backdrop-blur-md">
            <div className="flex items-center space-x-2 text-red-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
              <span>EXCURSION: {maxExcursion} CM</span>
            </div>
            <div className="text-[10px] text-gray-300">4 Wheels Beyond White Line</div>
          </div>
        )}

        {/* Floating Play Button Overlay when Paused */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/30 pointer-events-none flex items-center justify-center">
            <button 
              onClick={togglePlay} 
              className="pointer-events-auto w-16 h-16 rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-white flex items-center justify-center shadow-2xl shadow-cyan-500/50 transform hover:scale-110 transition active:scale-95"
            >
              <Play className="w-8 h-8 ml-1" />
            </button>
          </div>
        )}

        {/* Bottom Left HUD Stamp */}
        <div className="absolute bottom-3 left-3 bg-[#07090e]/85 border border-[#1e293b] rounded-lg px-3 py-1.5 text-[11px] font-mono text-gray-300 backdrop-blur-md flex items-center space-x-3">
          <span className="text-cyan-400">FRAME: {Math.round(currentTime * 30)} / {Math.round(duration * 30)}</span>
          <span className="text-gray-500">|</span>
          <span>TIME: {currentTime.toFixed(2)}s / {duration.toFixed(2)}s</span>
          <span className="text-gray-500">|</span>
          <span className="text-yellow-400">SPEED: 242.4 KM/H</span>
        </div>

        {/* Zoom Controls */}
        <div className="absolute top-3 left-3 flex flex-col space-y-1 bg-[#07090e]/80 border border-[#1e293b] p-1 rounded-lg backdrop-blur-md">
          <button 
            onClick={() => setZoomLevel(prev => Math.min(2.0, prev + 0.25))}
            className="p-1 text-gray-300 hover:text-cyan-400 hover:bg-white/10 rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setZoomLevel(prev => Math.max(1.0, prev - 0.25))}
            className="p-1 text-gray-300 hover:text-cyan-400 hover:bg-white/10 rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          {zoomLevel > 1.0 && (
            <button 
              onClick={() => setZoomLevel(1.0)}
              className="p-1 text-xs text-yellow-400 font-mono"
              title="Reset Zoom"
            >
              1x
            </button>
          )}
        </div>
      </div>

      {/* Scrubbing Timeline with Keyframe Markers */}
      <div className="mt-3 bg-[#07090e] p-3 rounded-xl border border-[#1e293b]">
        {/* Scrubber slider */}
        <div className="relative mb-2">
          <input
            type="range"
            min="0"
            max={duration}
            step="0.01"
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setCurrentTime(val);
              if (videoRef.current) videoRef.current.currentTime = val;
            }}
            className="w-full accent-cyan-400 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
          />

          {/* Keyframe tick marks */}
          <div className="flex justify-between text-[10px] font-mono text-gray-400 mt-1 px-1">
            <button onClick={() => jumpToStage(0.25)} className="hover:text-cyan-300 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>1. Approach (T=0.9s)</span>
            </button>
            <button onClick={() => jumpToStage(0.52)} className="hover:text-red-400 flex items-center space-x-1 font-bold text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span>2. Peak Crossing (T=1.87s)</span>
            </button>
            <button onClick={() => jumpToStage(0.85)} className="hover:text-blue-300 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              <span>3. Recovery (T=3.0s)</span>
            </button>
          </div>
        </div>

        {/* Playback Controls Row */}
        <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
          {/* Left: Transport buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => stepFrame(-1)}
              className="p-1.5 rounded bg-[#141b2d] hover:bg-[#1e293b] text-gray-300 hover:text-white transition text-xs font-mono flex items-center"
              title="Previous Frame (0.033s)"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>-1F</span>
            </button>
            <button
              onClick={togglePlay}
              className="p-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-md shadow-cyan-600/30"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button
              onClick={() => stepFrame(1)}
              className="p-1.5 rounded bg-[#141b2d] hover:bg-[#1e293b] text-gray-300 hover:text-white transition text-xs font-mono flex items-center"
              title="Next Frame (0.033s)"
            >
              <span>+1F</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Middle: Slow motion selectors */}
          <div className="flex items-center space-x-1 bg-[#141b2d] p-0.5 rounded-lg border border-gray-700 text-xs font-mono">
            <span className="text-gray-400 text-[10px] px-1.5">SPEED:</span>
            {[0.25, 0.5, 1.0].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-2 py-0.5 rounded transition ${
                  playbackRate === rate ? 'bg-cyan-500 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Right: Quick Launch Steward Investigation Modal */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenStewardModal(incident)}
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-cyan-600/30 transition transform active:scale-95"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>OPEN STEWARD REVIEW PAD</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
