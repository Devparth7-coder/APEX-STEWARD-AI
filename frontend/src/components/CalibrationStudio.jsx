import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, 
  Sparkles, 
  Layers, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  Crosshair, 
  Info,
  Maximize2
} from 'lucide-react';
import { fetchCalibration, saveCalibration, autoDetectBoundary } from '../services/api';

export default function CalibrationStudio({ onCalibrationUpdated }) {
  const [circuitTurn, setCircuitTurn] = useState('red_bull_ring_turn9');
  const [mode, setMode] = useState('MANUAL_CALIBRATION'); // 'MANUAL_CALIBRATION', 'CV_EDGE_SEGMENTATION', 'CIRCUIT_PRESET'
  const [points, setPoints] = useState([
    { x: 120, y: 560 },
    { x: 380, y: 490 },
    { x: 680, y: 435 },
    { x: 960, y: 395 },
    { x: 1240, y: 370 }
  ]);
  const [uncertaintyBandCm, setUncertaintyBandCm] = useState(3.8);
  const [pixelsPerMeter, setPixelsPerMeter] = useState(52.0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);

  const canvasRef = useRef(null);

  useEffect(() => {
    loadCalibrationData(circuitTurn);
  }, [circuitTurn]);

  const loadCalibrationData = async (turnKey) => {
    try {
      const data = await fetchCalibration(turnKey);
      if (data && data.boundary_polyline) {
        setPoints(data.boundary_polyline);
        setUncertaintyBandCm(data.uncertainty_band_cm || 3.8);
        setPixelsPerMeter(data.pixels_per_meter || 52.0);
      }
    } catch (err) {
      console.error("Error fetching calibration:", err);
    }
  };

  // Draw boundary polyline and uncertainty corridor on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Draw background track placeholder
    ctx.fillStyle = '#1a1f2c';
    ctx.fillRect(0, 0, width, height);

    // Draw asphalt zone
    ctx.fillStyle = '#262a30';
    ctx.beginPath();
    ctx.moveTo(0, height);
    points.forEach((pt, i) => {
      // Scale from 1280x720 coordinates to canvas size (800x450)
      const sx = (pt.x / 1280) * width;
      const sy = (pt.y / 720) * height;
      if (i === 0) ctx.lineTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Draw red & white kerb strip above boundary
    const numTeeth = 20;
    for (let i = 0; i < numTeeth; i++) {
      const t = i / numTeeth;
      const tNext = (i + 1) / numTeeth;
      const getP = (ratio) => {
        const pIdx = Math.min(points.length - 2, Math.floor(ratio * (points.length - 1)));
        const subRatio = (ratio * (points.length - 1)) - pIdx;
        const p1 = points[pIdx];
        const p2 = points[pIdx + 1];
        const x = (p1.x + subRatio * (p2.x - p1.x)) / 1280 * width;
        const y = (p1.y + subRatio * (p2.y - p1.y)) / 720 * height;
        return { x, y };
      };

      const p0 = getP(t);
      const p1 = getP(tNext);
      const kw = 16;
      ctx.fillStyle = i % 2 === 0 ? '#dc2626' : '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p1.x, p1.y - kw);
      ctx.lineTo(p0.x, p0.y - kw);
      ctx.closePath();
      ctx.fill();
    }

    // Draw Uncertainty Corridor (Green dashed band)
    const bandPx = (uncertaintyBandCm / 100 * pixelsPerMeter) / 720 * height;
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);

    // Upper band
    ctx.beginPath();
    points.forEach((pt, i) => {
      const sx = (pt.x / 1280) * width;
      const sy = ((pt.y) / 720 * height) - bandPx;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    // Lower band
    ctx.beginPath();
    points.forEach((pt, i) => {
      const sx = (pt.x / 1280) * width;
      const sy = ((pt.y) / 720 * height) + bandPx;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    ctx.setLineDash([]); // Reset line dash

    // Draw Legal White Boundary Line (Neon Cyan Glow)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    points.forEach((pt, i) => {
      const sx = (pt.x / 1280) * width;
      const sy = (pt.y / 720) * height;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    // Draw Interactive Calibration Control Vertices
    points.forEach((pt, i) => {
      const sx = (pt.x / 1280) * width;
      const sy = (pt.y / 720) * height;

      ctx.fillStyle = selectedPointIndex === i ? '#ff3366' : '#00f0ff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Vertex Index Label
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.fillText(`P${i + 1}`, sx - 6, sy - 12);
    });
  }, [points, uncertaintyBandCm, pixelsPerMeter, selectedPointIndex]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 1280;
    const clickY = ((e.clientY - rect.top) / rect.height) * 720;

    // Check if clicked close to an existing vertex to select
    const closestIdx = points.findIndex(
      (p) => Math.hypot(p.x - clickX, p.y - clickY) < 45
    );

    if (closestIdx !== -1) {
      setSelectedPointIndex(closestIdx);
    } else if (selectedPointIndex !== null) {
      // Move selected vertex to clicked location
      const updated = [...points];
      updated[selectedPointIndex] = { x: Math.round(clickX), y: Math.round(clickY) };
      setPoints(updated);
      setSelectedPointIndex(null);
    }
  };

  const handleAutoDetectCV = async () => {
    setIsAutoDetecting(true);
    try {
      const result = await autoDetectBoundary();
      if (result && result.boundary_polyline) {
        setPoints(result.boundary_polyline);
        setMode('CV_EDGE_SEGMENTATION');
      }
    } catch (err) {
      console.error("CV auto detect failed:", err);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const calibPayload = {
        mode: mode,
        circuit_id: circuitTurn.split('_')[0],
        turn_name: circuitTurn,
        boundary_polyline: points,
        uncertainty_band_cm: uncertaintyBandCm,
        pixels_per_meter: pixelsPerMeter,
        updated_at: new Date().toISOString(),
        updated_by: 'FIA Steward Operator'
      };

      await saveCalibration(circuitTurn, calibPayload);
      setSaveSuccess(true);
      if (onCalibrationUpdated) onCalibrationUpdated();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Save calibration failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Studio Header */}
      <div className="bg-[#0b0f19] p-4 rounded-2xl border border-[#1e293b] flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-mono font-bold text-white uppercase tracking-wider">
              TRACK BOUNDARY CALIBRATION STUDIO
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Configure legal racing limits via Mode A (Manual), Mode B (CV Edge Segmentation), or Mode C (Circuit Presets).
            </p>
          </div>
        </div>

        {/* 3 Calibration Mode Switchers */}
        <div className="flex space-x-1 bg-[#07090e] p-1 rounded-xl border border-[#1e293b] text-xs font-mono">
          {[
            { id: 'MANUAL_CALIBRATION', label: 'Mode A: Manual Polyline' },
            { id: 'CV_EDGE_SEGMENTATION', label: 'Mode B: CV Auto-Detect' },
            { id: 'CIRCUIT_PRESET', label: 'Mode C: Preset Map' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id);
                if (m.id === 'CV_EDGE_SEGMENTATION') handleAutoDetectCV();
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                mode === m.id ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Interactive Canvas + Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Canvas Workspace (8 cols) */}
        <div className="lg:col-span-8 bg-[#0b0f19] rounded-2xl border border-[#1e293b] p-4 flex flex-col shadow-xl">
          <div className="flex justify-between items-center text-xs font-mono pb-2 mb-2 border-b border-[#182030]">
            <span className="text-cyan-400 font-bold">INTERACTIVE CALIBRATION FRAME (1280x720 PROJECTION)</span>
            <span className="text-gray-400 text-[10px]">
              {selectedPointIndex !== null ? `Moving Vertex P${selectedPointIndex + 1}: Click target location` : 'Click any vertex to reposition'}
            </span>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-[#1e293b] bg-black flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={800}
              height={450}
              onClick={handleCanvasClick}
              className="w-full h-auto cursor-crosshair"
            />
          </div>

          {/* Canvas Help Legend */}
          <div className="flex flex-wrap items-center justify-between mt-3 text-[11px] font-mono text-gray-400 bg-[#07090e] p-2.5 rounded-xl border border-[#1e293b]">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <span className="w-3 h-1 bg-cyan-400 inline-block"></span>
                <span>Legal Boundary Line</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-1 bg-emerald-400 border-b border-dashed inline-block"></span>
                <span>Uncertainty Corridor (±{uncertaintyBandCm}cm)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                <span>Kerb Teeth (Red/White)</span>
              </span>
            </div>
            <span className="text-cyan-400 font-bold">5-Point Homography Active</span>
          </div>
        </div>

        {/* Calibration Parameters Side Panel (4 cols) */}
        <div className="lg:col-span-4 bg-[#0b0f19] rounded-2xl border border-[#1e293b] p-4 flex flex-col justify-between shadow-xl space-y-4">
          <div className="space-y-4">
            <div className="border-b border-[#182030] pb-2">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                GEOMETRIC & OPTICAL PARAMETERS
              </h3>
            </div>

            {/* Circuit Selection */}
            <div className="space-y-1 text-xs font-mono">
              <label className="text-gray-300 font-semibold block">CIRCUIT & TURN PRESET:</label>
              <select
                value={circuitTurn}
                onChange={(e) => setCircuitTurn(e.target.value)}
                className="w-full bg-[#07090e] border border-gray-700 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="red_bull_ring_turn9">Red Bull Ring — Turn 9 (Jochen Rindt)</option>
                <option value="monza_parabolica">Monza — Turn 11 (Curva Alboreto / Parabolica)</option>
                <option value="silverstone_copse">Silverstone — Turn 9 (Copse Corner)</option>
              </select>
            </div>

            {/* CV Auto Detect Trigger */}
            <div className="bg-[#07090e] p-3 rounded-xl border border-[#1e293b] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-bold flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>OPENCV SEGMENTATION</span>
                </span>
                <span className="text-[10px] text-gray-400">HSV + CANNY</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Run automated color mask thresholding and Hough transform to find painted white line edges.
              </p>
              <button
                type="button"
                onClick={handleAutoDetectCV}
                disabled={isAutoDetecting}
                className="w-full bg-[#141b2d] hover:bg-[#1e293b] text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold py-1.5 rounded-lg transition disabled:opacity-50"
              >
                {isAutoDetecting ? 'EXTRACTING BOUNDARY EDGES...' : 'RUN CV BOUNDARY EXTRACTION'}
              </button>
            </div>

            {/* Uncertainty Band Slider */}
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-300">Camera Uncertainty Band:</span>
                <span className="text-emerald-400 font-bold">±{uncertaintyBandCm} cm</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.1"
                value={uncertaintyBandCm}
                onChange={(e) => setUncertaintyBandCm(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-gray-500 block">
                Optical sensor resolution corridor. Contacts inside corridor are labeled UNCERTAIN.
              </span>
            </div>

            {/* Pixel to Meter Homography */}
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-300">Ground Homography Scale:</span>
                <span className="text-cyan-400 font-bold">{pixelsPerMeter} px/m</span>
              </div>
              <input
                type="range"
                min="20.0"
                max="90.0"
                step="1.0"
                value={pixelsPerMeter}
                onChange={(e) => setPixelsPerMeter(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-gray-500 block">
                Metric mapping scale factor for distance to cm conversion.
              </span>
            </div>
          </div>

          {/* Action Buttons: Reset & Save */}
          <div className="space-y-2 pt-2 border-t border-[#182030]">
            {saveSuccess && (
              <div className="p-2 bg-emerald-950 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs font-mono flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Boundary calibration saved and applied to live CV pipeline!</span>
              </div>
            )}

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => loadCalibrationData(circuitTurn)}
                className="flex-1 bg-[#141b2d] hover:bg-[#1e293b] text-gray-300 text-xs font-mono font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono font-bold py-2 rounded-xl shadow-lg shadow-cyan-600/30 transition flex items-center justify-center space-x-1 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'SAVING...' : 'SAVE & APPLY CALIBRATION'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
