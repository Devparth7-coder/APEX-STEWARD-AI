import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Maximize2, 
  Layers, 
  Camera, 
  Gauge, 
  RotateCcw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

export default function VideoWorkspace({ 
  incident, 
  onSelectIncident, 
  onOpenStewardModal 
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [viewMode, setViewMode] = useState('overlay'); // 'overlay' or 'raw'
  const [selectedCam, setSelectedCam] = useState('cam_01');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(3.6);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  
  // Layer visibility toggles
  const [showBoundary, setShowBoundary] = useState(true);
  const [showTyres, setShowTyres] = useState(true);
  const [showUncertainty, setShowUncertainty] = useState(true);
  const [showHud, setShowHud] = useState(true);

  const activeVideoSrc = viewMode === 'overlay' 
    ? (incident?.replay_video_url || '/media/videos/inc-027_overlay.mp4')
    : (incident?.replay_video_url?.replace('_overlay', '_raw') || '/media/videos/inc-027_raw.mp4');

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, activeVideoSrc]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const stepFrame = (frames) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    // 30 fps -> 1 frame = 0.0333s
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + (frames * (1 / 30))));
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 3.6);
    }
  };

  const jumpToStage = (stageRatio) => {
    if (videoRef.current) {
      videoRef.current.currentTime = duration * stageRatio;
    }
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
            CAR: <strong className="text-white">#{incident?.car_number || '44'} ({incident?.driver_name || 'Hamilton'})</strong>
          </span>
          <span className="text-xs font-mono text-yellow-400 bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-500/30">
            {incident?.turn_name || 'Turn 9 (Jochen Rindt)'}
          </span>
        </div>

        {/* Multi-angle camera switcher & Overlay Toggle */}
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="bg-[#07090e] p-1 rounded-lg border border-[#1e293b] flex space-x-1 text-xs">
            <button
              onClick={() => setViewMode('overlay')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                viewMode === 'overlay' ? 'bg-cyan-600 text-white font-bold shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              AI Vision Overlay
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                viewMode === 'raw' ? 'bg-gray-700 text-white font-bold shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Raw Video Feed
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

      {/* Main Video Screen Container */}
      <div className="relative flex-1 bg-black rounded-xl overflow-hidden border border-[#1e293b] flex items-center justify-center group min-h-[360px]">
        {/* Video element */}
        <div 
          className="relative w-full h-full flex items-center justify-center transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <video
            ref={videoRef}
            src={activeVideoSrc}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            loop
            playsInline
            muted
          />
        </div>

        {/* Live Excursion Tag Overlaid on Top Right */}
        {incident?.status === 'REVIEW_REQUIRED' && (
          <div className="absolute top-3 right-3 bg-red-950/90 border border-red-500/80 px-3 py-1.5 rounded-lg text-xs font-mono shadow-xl backdrop-blur-md">
            <div className="flex items-center space-x-2 text-red-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
              <span>EXCURSION: {incident.max_excursion_cm} CM</span>
            </div>
            <div className="text-[10px] text-gray-300">4 Wheels Beyond White Line</div>
          </div>
        )}

        {/* Floating Fast Action Overlay when Paused */}
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

        {/* Corner HUD Overlay */}
        <div className="absolute bottom-3 left-3 bg-[#07090e]/80 border border-[#1e293b] rounded-lg px-3 py-1.5 text-[11px] font-mono text-gray-300 backdrop-blur-md flex items-center space-x-3">
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
            max={duration || 3.6}
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
