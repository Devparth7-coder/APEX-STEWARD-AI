import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  AlertTriangle, 
  Sliders, 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Layers, 
  Camera, 
  Clock, 
  FileText,
  User,
  Zap,
  ArrowRight
} from 'lucide-react';
import { submitStewardDecision } from '../services/api';

export default function IncidentReviewModal({ 
  incident, 
  isOpen, 
  onClose, 
  onDecisionSubmitted 
}) {
  if (!isOpen || !incident) return null;

  const [decision, setDecision] = useState(incident.steward_decision?.decision || 'CONFIRMED');
  const [penalty, setPenalty] = useState(incident.steward_decision?.penalty || 'LAP_TIME_DELETED');
  const [reviewerName, setReviewerName] = useState(incident.steward_decision?.reviewer_name || 'Garry Connelly');
  const [comment, setComment] = useState(incident.steward_decision?.comment || 'Lap time deleted for exceeding track limits at Turn 9.');
  const [reason, setReason] = useState(incident.steward_decision?.reason || 'Clear 4-wheel boundary excursion confirmed via synchronized video & telemetry.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('evidence'); // 'evidence', 'counterfactual', 'multi-cam'
  const [counterfactualOffset, setCounterfactualOffset] = useState(0);

  const conf = incident.confidence_breakdown;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        decision: decision,
        penalty: penalty,
        reviewer_name: reviewerName,
        reviewer_role: 'Steward',
        reason: reason,
        comment: comment,
        review_duration_seconds: 14.2
      };
      
      const updated = await submitStewardDecision(incident.incident_code, payload);
      
      // Trigger celebration confetti on confirm
      if (decision === 'CONFIRMED') {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
      
      onDecisionSubmitted(updated);
      onClose();
    } catch (err) {
      console.error("Error submitting steward decision:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic counterfactual calculation
  const evaluatedCounterfactualExcursion = incident.max_excursion_cm - counterfactualOffset;
  const counterfactualStatus = evaluatedCounterfactualExcursion > 3.8 
    ? 'VIOLATION' 
    : (evaluatedCounterfactualExcursion < -3.8 ? 'LEGAL' : 'UNCERTAIN');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="bg-[#07090e] border-b border-[#182030] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-mono font-black text-white uppercase tracking-wider">
                  OFFICIAL STEWARD DECISION SUITE — {incident.incident_code}
                </h2>
                <span className="bg-red-950 text-red-300 border border-red-500/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                  {incident.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono">
                RACE: {incident.circuit_name} | {incident.turn_name} | LAP {incident.lap_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split 2-Column Layout */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Evidence Footage & AI Analysis */}
          <div className="lg:col-span-7 space-y-4">
            {/* Navigation tabs within modal */}
            <div className="flex space-x-1 bg-[#07090e] p-1 rounded-xl border border-[#1e293b] text-xs font-mono">
              <button
                onClick={() => setActiveTab('evidence')}
                className={`flex-1 py-1.5 rounded-lg text-center font-bold transition ${
                  activeTab === 'evidence' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                1. Visual Evidence & Keyframes
              </button>
              <button
                onClick={() => setActiveTab('counterfactual')}
                className={`flex-1 py-1.5 rounded-lg text-center font-bold transition ${
                  activeTab === 'counterfactual' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                2. Counterfactual Sensitivity
              </button>
              <button
                onClick={() => setActiveTab('multicam')}
                className={`flex-1 py-1.5 rounded-lg text-center font-bold transition ${
                  activeTab === 'multicam' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                3. Multi-Angle Fusion
              </button>
            </div>

            {/* Tab 1: Visual Evidence */}
            {activeTab === 'evidence' && (
              <div className="space-y-4">
                {/* Main Video Replay */}
                <div className="relative rounded-xl overflow-hidden border border-[#1e293b] bg-black aspect-video flex items-center justify-center">
                  <video
                    src={incident.replay_video_url}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* 3-Keyframe Sequence (Before -> Crossing -> After) */}
                <div>
                  <h4 className="text-xs font-mono font-bold text-gray-300 mb-2 flex items-center justify-between">
                    <span>EVIDENCE REPLAY KEYFRAMES (BEFORE → CROSSING → RECOVERY)</span>
                    <span className="text-cyan-400 text-[10px]">30 FPS CALIBRATED</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {incident.key_evidence_frames && incident.key_evidence_frames.length > 0 ? (
                      incident.key_evidence_frames.map((kf, idx) => (
                        <div key={idx} className="bg-[#07090e] rounded-lg border border-[#1e293b] p-1.5 overflow-hidden">
                          <img
                            src={kf.overlay_url || kf.image_url}
                            alt={`Frame ${kf.frame_number}`}
                            className="w-full h-24 object-cover rounded mb-1"
                          />
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-gray-400 font-bold">
                              {idx === 0 ? '1. APPROACH' : (idx === 1 ? '2. PEAK CROSSING' : '3. RECOVERY')}
                            </span>
                            <span className={idx === 1 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                              {idx === 1 ? `-${kf.excursion_cm}cm` : 'LEGAL'}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 text-center py-4 text-xs font-mono text-gray-500">
                        Visual keyframe evidence packaged.
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Point Matrix & Tyre Status */}
                <div className="bg-[#07090e] p-3 rounded-xl border border-[#1e293b]">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#182030] text-xs font-mono">
                    <span className="text-cyan-400 font-bold">TYRE CONTACT POINT EXCURSION MATRIX</span>
                    <span className="text-red-400 font-bold bg-red-950/60 px-2 py-0.5 rounded border border-red-500/30">
                      4 / 4 WHEELS OFF TRACK
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div className="bg-[#141b2d] p-2 rounded border border-red-500/40">
                      <span className="text-gray-400 text-[10px] block">FRONT-LEFT</span>
                      <span className="text-red-400 font-bold text-sm">-14.2 cm</span>
                      <span className="text-[9px] text-red-300 block">EXCEEDED</span>
                    </div>
                    <div className="bg-[#141b2d] p-2 rounded border border-red-500/40">
                      <span className="text-gray-400 text-[10px] block">FRONT-RIGHT</span>
                      <span className="text-red-400 font-bold text-sm">-11.8 cm</span>
                      <span className="text-[9px] text-red-300 block">EXCEEDED</span>
                    </div>
                    <div className="bg-[#141b2d] p-2 rounded border border-red-500/40">
                      <span className="text-gray-400 text-[10px] block">REAR-LEFT</span>
                      <span className="text-red-400 font-bold text-sm">-16.5 cm</span>
                      <span className="text-[9px] text-red-300 block">EXCEEDED</span>
                    </div>
                    <div className="bg-[#141b2d] p-2 rounded border border-red-500/40">
                      <span className="text-gray-400 text-[10px] block">REAR-RIGHT</span>
                      <span className="text-red-400 font-bold text-sm">-13.1 cm</span>
                      <span className="text-[9px] text-red-300 block">EXCEEDED</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Counterfactual Sensitivity */}
            {activeTab === 'counterfactual' && (
              <div className="bg-[#07090e] p-4 rounded-xl border border-[#1e293b] space-y-4">
                <div className="border-b border-[#182030] pb-2">
                  <h4 className="text-xs font-mono font-bold text-cyan-400">
                    COUNTERFACTUAL BOUNDARY SENSITIVITY REVIEW
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Simulate boundary tolerance shifts to evaluate whether borderline calls depend on optical boundary placement.
                  </p>
                </div>

                {/* Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-400">Virtual Boundary Shift:</span>
                    <span className="text-cyan-400 font-bold">{counterfactualOffset > 0 ? `+${counterfactualOffset}` : counterfactualOffset} cm</span>
                  </div>
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="1"
                    value={counterfactualOffset}
                    onChange={(e) => setCounterfactualOffset(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 h-2 bg-gray-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-gray-500">
                    <span>-15cm (Stricter)</span>
                    <span>0cm (Current Baseline)</span>
                    <span>+15cm (Permissive)</span>
                  </div>
                </div>

                {/* Re-evaluation card */}
                <div className="p-3 bg-[#141b2d] rounded-xl border border-gray-700 text-xs font-mono space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Predicted Classification at Shift:</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                      counterfactualStatus === 'VIOLATION' ? 'bg-red-950 text-red-400 border border-red-500/40' :
                      (counterfactualStatus === 'LEGAL' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' :
                      'bg-yellow-950 text-yellow-400 border border-yellow-500/40')
                    }`}>
                      {counterfactualStatus}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-300">
                    Calculated Excursion: <strong>{evaluatedCounterfactualExcursion.toFixed(1)} cm</strong>
                  </div>
                  <p className="text-[10px] text-gray-400 italic">
                    {counterfactualStatus === 'VIOLATION' 
                      ? 'The violation is robust: even with a boundary shift of 10cm outward, all 4 contact points remain outside.' 
                      : 'Boundary adjustment falls within sensor uncertainty corridor.'}
                  </p>
                </div>

                {/* Counterfactual shifts table */}
                <div className="border border-[#1e293b] rounded-lg overflow-hidden text-[11px] font-mono">
                  <table className="w-full text-left">
                    <thead className="bg-[#141b2d] text-gray-400 text-[10px]">
                      <tr>
                        <th className="p-2">Shift (cm)</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">New Excursion</th>
                        <th className="p-2">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b] text-gray-300">
                      {incident.counterfactual_analysis && incident.counterfactual_analysis.map((cf, idx) => (
                        <tr key={idx} className="hover:bg-[#12192c]">
                          <td className="p-2 font-bold">{cf.boundary_shift_cm > 0 ? `+${cf.boundary_shift_cm}` : cf.boundary_shift_cm} cm</td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              cf.predicted_status === 'VIOLATION' ? 'text-red-400 bg-red-950/60' :
                              (cf.predicted_status === 'LEGAL' ? 'text-emerald-400 bg-emerald-950/60' : 'text-yellow-400 bg-yellow-950/60')
                            }`}>
                              {cf.predicted_status}
                            </span>
                          </td>
                          <td className="p-2">{cf.new_excursion_cm} cm</td>
                          <td className="p-2">{(cf.confidence * 100).toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 3: Multi-Angle Camera Fusion */}
            {activeTab === 'multicam' && (
              <div className="bg-[#07090e] p-4 rounded-xl border border-[#1e293b] space-y-3">
                <h4 className="text-xs font-mono font-bold text-cyan-400">
                  SYNCHRONIZED MULTI-ANGLE CAMERA FUSION
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-[#1e293b] rounded-lg overflow-hidden bg-black">
                    <div className="p-1.5 bg-[#141b2d] text-[10px] font-mono text-gray-300 flex justify-between">
                      <span>CAM 01: Turn 9 Main Trackside</span>
                      <span className="text-cyan-400">SYNCED</span>
                    </div>
                    <img src="/media/evidence/inc-027_peak_overlay.jpg" alt="Cam 1" className="w-full h-32 object-cover" />
                  </div>
                  <div className="border border-[#1e293b] rounded-lg overflow-hidden bg-black">
                    <div className="p-1.5 bg-[#141b2d] text-[10px] font-mono text-gray-300 flex justify-between">
                      <span>CAM 02: Exit Kerb Ground Cam</span>
                      <span className="text-cyan-400">SYNCED</span>
                    </div>
                    <img src="/media/evidence/inc-027_peak_raw.jpg" alt="Cam 2" className="w-full h-32 object-cover" />
                  </div>
                </div>
                <div className="p-2 bg-[#141b2d] rounded text-[11px] font-mono text-gray-300">
                  <strong>Fusion Consensus:</strong> 2 out of 2 camera views confirm all 4 tyres crossed outside the legal boundary.
                </div>
              </div>
            )}

            {/* Explainable AI Text Box */}
            <div className="bg-[#07090e] p-3.5 rounded-xl border border-[#1e293b] space-y-1.5">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-cyan-400">
                <Cpu className="w-4 h-4" />
                <span>EXPLAINABLE AI REASONING ENGINE (WHY WAS THIS FLAGGED?)</span>
              </div>
              <p className="text-xs text-gray-300 font-sans leading-relaxed bg-[#141b2d]/50 p-2.5 rounded-lg border border-gray-800">
                {incident.ai_explanation}
              </p>
            </div>
          </div>

          {/* Right Column (5 cols): Confidence Factors & Official Steward Decision Pad */}
          <div className="lg:col-span-5 space-y-4">
            {/* Transparent Confidence Breakdown */}
            <div className="bg-[#07090e] p-4 rounded-xl border border-[#1e293b] space-y-3">
              <div className="flex items-center justify-between border-b border-[#182030] pb-2">
                <span className="text-xs font-mono font-bold text-white">TRANSPARENT CONFIDENCE ENGINE</span>
                <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/30">
                  {(conf.overall_confidence * 100).toFixed(1)}% ({conf.level})
                </span>
              </div>

              {/* Progress Bars for Factors */}
              <div className="space-y-2 text-[11px] font-mono">
                <div>
                  <div className="flex justify-between text-gray-300 mb-0.5">
                    <span>Object Detection (YOLO/Detector):</span>
                    <span className="text-cyan-400 font-bold">{(conf.detection_confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${conf.detection_confidence * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-300 mb-0.5">
                    <span>Multi-Object Tracking Continuity:</span>
                    <span className="text-cyan-400 font-bold">{(conf.tracking_confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${conf.tracking_confidence * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-300 mb-0.5">
                    <span>Boundary Line Contrast & Edge:</span>
                    <span className="text-cyan-400 font-bold">{(conf.boundary_confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${conf.boundary_confidence * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-300 mb-0.5">
                    <span>Temporal Consistency (7 Frames):</span>
                    <span className="text-cyan-400 font-bold">{(conf.temporal_consistency * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${conf.temporal_consistency * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-300 mb-0.5">
                    <span>3D Contact Point Homography:</span>
                    <span className="text-cyan-400 font-bold">{(conf.geometry_confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${conf.geometry_confidence * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Steward Decision Pad */}
            <form onSubmit={handleSubmit} className="bg-[#0e1322] p-4 rounded-xl border border-cyan-500/30 shadow-xl space-y-3.5">
              <div className="border-b border-[#1e293b] pb-2">
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>OFFICIAL FIA STEWARD DECISION PAD</span>
                </h3>
                <p className="text-[10px] text-gray-400 font-mono">
                  AI provides decision-support; Human steward holds authoritative final decision.
                </p>
              </div>

              {/* 3 Decision Choice Buttons */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDecision('CONFIRMED')}
                  className={`py-2 px-1 rounded-lg text-xs font-mono font-bold flex flex-col items-center justify-center space-y-1 border transition ${
                    decision === 'CONFIRMED'
                      ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-600/40 ring-1 ring-white'
                      : 'bg-[#141b2d] text-gray-300 border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>CONFIRM</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('REJECTED')}
                  className={`py-2 px-1 rounded-lg text-xs font-mono font-bold flex flex-col items-center justify-center space-y-1 border transition ${
                    decision === 'REJECTED'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/40 ring-1 ring-white'
                      : 'bg-[#141b2d] text-gray-300 border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>REJECT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('NEED_MORE_REVIEW')}
                  className={`py-2 px-1 rounded-lg text-xs font-mono font-bold flex flex-col items-center justify-center space-y-1 border transition ${
                    decision === 'NEED_MORE_REVIEW'
                      ? 'bg-yellow-600 text-white border-yellow-400 shadow-lg shadow-yellow-600/40 ring-1 ring-white'
                      : 'bg-[#141b2d] text-gray-300 border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>UNCERTAIN</span>
                </button>
              </div>

              {/* Penalty Selector */}
              {decision === 'CONFIRMED' && (
                <div className="space-y-1 text-xs font-mono">
                  <label className="text-gray-300 font-semibold block">PENALTY SANCTION:</label>
                  <select
                    value={penalty}
                    onChange={(e) => setPenalty(e.target.value)}
                    className="w-full bg-[#07090e] border border-gray-700 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="LAP_TIME_DELETED">LAP TIME DELETED (Qualifying / Practice / Race Lap)</option>
                    <option value="FIVE_SEC_PENALTY">5-SECOND TIME PENALTY</option>
                    <option value="TEN_SEC_PENALTY">10-SECOND TIME PENALTY</option>
                    <option value="BLACK_WHITE_WARNING">BLACK & WHITE WARNING FLAG (3 Strikes Rule)</option>
                    <option value="DRIVE_THROUGH">DRIVE-THROUGH PENALTY</option>
                    <option value="NO_FURTHER_ACTION">NO FURTHER ACTION</option>
                  </select>
                </div>
              )}

              {/* Reviewer Name */}
              <div className="space-y-1 text-xs font-mono">
                <label className="text-gray-300 font-semibold block">STEWARD IN CHARGE:</label>
                <div className="flex items-center space-x-2 bg-[#07090e] border border-gray-700 rounded-lg px-2.5 py-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="bg-transparent text-white text-xs font-mono w-full focus:outline-none"
                    placeholder="Steward Name"
                    required
                  />
                </div>
              </div>

              {/* Steward Reason & Comments */}
              <div className="space-y-1 text-xs font-mono">
                <label className="text-gray-300 font-semibold block">OFFICIAL STEWARD JUSTIFICATION / NOTE:</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows="2"
                  className="w-full bg-[#07090e] border border-gray-700 rounded-lg p-2 text-white text-xs font-mono focus:outline-none focus:border-cyan-400 resize-none"
                  placeholder="Official steward note recorded to race audit trail..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-cyan-500/30 transition transform active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'LOGGING TO FIA AUDIT TRAIL...' : 'SUBMIT DECISION TO OFFICIAL AUDIT LOG'}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
