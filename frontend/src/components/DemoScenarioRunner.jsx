import React, { useState } from 'react';
import { 
  PlaySquare, 
  UploadCloud, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Car, 
  ArrowRight,
  ShieldCheck,
  Film
} from 'lucide-react';
import { simulateScenario, uploadVideoForAnalysis } from '../services/api';

export default function DemoScenarioRunner({ onIncidentCreated, onSelectIncident, onOpenStewardModal }) {
  const [activeScenario, setActiveScenario] = useState('hamilton_t9');
  const [isRunning, setIsRunning] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadCarNumber, setUploadCarNumber] = useState('44');

  const scenarios = [
    {
      id: 'hamilton_t9',
      title: 'Scenario 1: #44 Hamilton Turn 9 Excursion (Primary Demo)',
      driver: 'Lewis Hamilton',
      team: 'Mercedes-AMG Petronas',
      carNumber: '44',
      turn: 'Turn 9 (Jochen Rindt)',
      lap: 37,
      isViolation: true,
      maxExcursionCm: 14.2,
      desc: 'Car drifts wide onto exit rumble kerb. All 4 wheels exceed white boundary line by 14.2 cm for 7 consecutive frames.'
    },
    {
      id: 'verstappen_t10',
      title: 'Scenario 2: #1 Verstappen Turn 10 Exit Excursion',
      driver: 'Max Verstappen',
      team: 'Red Bull Racing',
      carNumber: '1',
      turn: 'Turn 10 (Red Bull Mobile)',
      lap: 42,
      isViolation: true,
      maxExcursionCm: 11.4,
      desc: 'Aggressive throttle application over Turn 10 exit. 4 wheels exceed boundary line by 11.4 cm.'
    },
    {
      id: 'norris_marginal',
      title: 'Scenario 3: #4 Norris Marginal Limit (Uncertainty Zone Case)',
      driver: 'Lando Norris',
      team: 'McLaren F1',
      carNumber: '4',
      turn: 'Turn 9 (Jochen Rindt)',
      lap: 29,
      isViolation: false,
      maxExcursionCm: 3.2,
      desc: 'Borderline line touch: 3.2cm excursion falls within ±3.8cm camera uncertainty band. Steward dismisses violation.'
    },
    {
      id: 'clean_racing',
      title: 'Scenario 4: #63 Russell Compliant Racing Line',
      driver: 'George Russell',
      team: 'Mercedes-AMG',
      carNumber: '63',
      turn: 'Turn 9 (Jochen Rindt)',
      lap: 15,
      isViolation: false,
      maxExcursionCm: 0.0,
      desc: 'Inner wheels stay strictly within the painted white line. Compliant lap time verified.'
    }
  ];

  const handleRunScenario = async (sc) => {
    setIsRunning(true);
    try {
      const payload = {
        car_number: sc.carNumber,
        driver_name: sc.driver,
        team: sc.team,
        turn_name: sc.turn,
        lap: sc.lap,
        is_violation: sc.isViolation,
        max_excursion_cm: sc.maxExcursionCm
      };

      const newInc = await simulateScenario(payload);
      if (onIncidentCreated) onIncidentCreated(newInc);
      if (onSelectIncident) onSelectIncident(newInc);
      if (sc.isViolation && onOpenStewardModal) {
        onOpenStewardModal(newInc);
      }
    } catch (err) {
      console.error("Failed running scenario:", err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setIsUploading(true);
    try {
      const result = await uploadVideoForAnalysis(uploadFile, uploadCarNumber, 'red_bull_ring_turn9');
      setUploadResult(result);
      if (result.incident) {
        if (onIncidentCreated) onIncidentCreated(result.incident);
        if (onSelectIncident) onSelectIncident(result.incident);
      }
    } catch (err) {
      console.error("Upload video analysis failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#0b0f19] p-4 rounded-2xl border border-[#1e293b] flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <PlaySquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-mono font-bold text-white uppercase tracking-wider">
              DEMO SCENARIOS & VIDEO FOOTAGE INGESTION LAB
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Execute reproducible motorsport incident simulations or upload custom race MP4 footage.
            </p>
          </div>
        </div>
      </div>

      {/* Demo Workflow Stepper Visualizer (Section 32 Story) */}
      <div className="bg-[#0b0f19] p-5 rounded-2xl border border-[#1e293b] shadow-xl">
        <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center space-x-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>END-TO-END APEX STEWARD AI PIPELINE WORKFLOW</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-center text-xs font-mono">
          <div className="bg-[#07090e] p-3 rounded-xl border border-[#1e293b]">
            <span className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 font-bold flex items-center justify-center mx-auto mb-2 text-[11px]">1</span>
            <span className="text-white font-bold block mb-1">RACE VIDEO</span>
            <span className="text-[10px] text-gray-400">1080p 30fps Live Stream</span>
          </div>

          <div className="bg-[#07090e] p-3 rounded-xl border border-[#1e293b]">
            <span className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 font-bold flex items-center justify-center mx-auto mb-2 text-[11px]">2</span>
            <span className="text-white font-bold block mb-1">DETECTION & MOT</span>
            <span className="text-[10px] text-gray-400">YOLOv8 + ByteTrack</span>
          </div>

          <div className="bg-[#07090e] p-3 rounded-xl border border-[#1e293b]">
            <span className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 font-bold flex items-center justify-center mx-auto mb-2 text-[11px]">3</span>
            <span className="text-white font-bold block mb-1">TYRE GEOMETRY</span>
            <span className="text-[10px] text-gray-400">4 Contact Points Homography</span>
          </div>

          <div className="bg-[#07090e] p-3 rounded-xl border border-[#1e293b]">
            <span className="w-6 h-6 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 font-bold flex items-center justify-center mx-auto mb-2 text-[11px]">4</span>
            <span className="text-white font-bold block mb-1">TEMPORAL RULES</span>
            <span className="text-[10px] text-gray-400">FIA Art 33.3 Aggregation</span>
          </div>

          <div className="bg-[#07090e] p-3 rounded-xl border border-red-500/40 bg-red-950/20">
            <span className="w-6 h-6 rounded-full bg-red-950 text-red-400 border border-red-500/60 font-bold flex items-center justify-center mx-auto mb-2 text-[11px]">5</span>
            <span className="text-red-400 font-bold block mb-1">INCIDENT QUEUE</span>
            <span className="text-[10px] text-gray-300">Confidence 96.8% HIGH</span>
          </div>

          <div className="bg-[#07090e] p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20">
            <span className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/60 font-bold flex items-center justify-center mx-auto mb-2 text-[11px]">6</span>
            <span className="text-emerald-400 font-bold block mb-1">STEWARD VERDICT</span>
            <span className="text-[10px] text-gray-300">Human Decision Logged</span>
          </div>
        </div>
      </div>

      {/* Grid: 4 Preset Scenarios + Custom Video Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Preset Scenarios (7 cols) */}
        <div className="lg:col-span-7 bg-[#0b0f19] p-5 rounded-2xl border border-[#1e293b] shadow-xl space-y-3">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-2">
            SELECT PRESET MOTORSPORT INCIDENT SCENARIO
          </h3>

          <div className="space-y-3">
            {scenarios.map((sc) => (
              <div
                key={sc.id}
                className="bg-[#07090e] p-4 rounded-xl border border-[#1e293b] hover:border-gray-600 transition flex flex-col justify-between space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-[#1e293b] text-white font-mono font-bold text-xs px-2 py-0.5 rounded">
                        #{sc.carNumber}
                      </span>
                      <h4 className="text-sm font-mono font-bold text-white">{sc.title}</h4>
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-1">{sc.desc}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    sc.isViolation ? 'bg-red-950 text-red-400 border border-red-500/40' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                  }`}>
                    {sc.isViolation ? 'VIOLATION' : 'COMPLIANT'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#182030]">
                  <div className="text-[11px] font-mono text-gray-400 space-x-3">
                    <span>DRIVER: <strong className="text-gray-200">{sc.driver}</strong></span>
                    <span>LAP: <strong className="text-yellow-400">{sc.lap}</strong></span>
                    <span>EXCURSION: <strong className={sc.maxExcursionCm > 5 ? 'text-red-400' : 'text-emerald-400'}>{sc.maxExcursionCm} cm</strong></span>
                  </div>

                  <button
                    onClick={() => handleRunScenario(sc)}
                    disabled={isRunning}
                    className="flex items-center space-x-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-mono font-bold px-3 py-1.5 rounded-lg shadow-md shadow-red-600/30 transition disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isRunning ? 'RUNNING...' : 'EXECUTE SCENARIO'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Video File Uploader (5 cols) */}
        <div className="lg:col-span-5 bg-[#0b0f19] p-5 rounded-2xl border border-[#1e293b] shadow-xl flex flex-col justify-between space-y-4">
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="border-b border-[#182030] pb-2">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <span>UPLOAD CUSTOM VIDEO FOOTAGE</span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Upload real race video file (MP4 / WebM / AVI) to run YOLO detection + Multi-Object Tracking.
              </p>
            </div>

            {/* Drag & Drop Box */}
            <div className="border-2 border-dashed border-[#1e293b] hover:border-cyan-500/50 rounded-xl p-6 text-center bg-[#07090e] transition flex flex-col items-center justify-center space-y-2">
              <Film className="w-8 h-8 text-cyan-400/80" />
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-mono file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-gray-500">Supported: MP4, WebM, MOV, AVI (Max 100MB)</span>
            </div>

            {/* Car Number Input */}
            <div className="space-y-1 text-xs font-mono">
              <label className="text-gray-300 font-semibold block">PRIMARY VEHICLE TARGET NUMBER:</label>
              <div className="flex items-center space-x-2 bg-[#07090e] border border-gray-700 rounded-lg px-2.5 py-1.5">
                <Car className="w-3.5 h-3.5 text-cyan-400" />
                <input
                  type="text"
                  value={uploadCarNumber}
                  onChange={(e) => setUploadCarNumber(e.target.value)}
                  className="bg-transparent text-white font-mono text-xs w-full focus:outline-none"
                  placeholder="e.g. 44"
                />
              </div>
            </div>

            {/* Process Button */}
            <button
              type="submit"
              disabled={isUploading || !uploadFile}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-cyan-600/30 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isUploading ? 'RUNNING COMPUTER VISION PIPELINE...' : 'ANALYZE UPLOADED FOOTAGE'}</span>
            </button>
          </form>

          {/* Upload Results Card */}
          {uploadResult && (
            <div className="bg-[#07090e] p-3 rounded-xl border border-cyan-500/40 text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between text-cyan-400 font-bold">
                <span>ANALYSIS COMPLETE</span>
                <span className="text-emerald-400">STATUS: {uploadResult.status}</span>
              </div>
              <div className="text-gray-300 text-[11px]">
                Frames Processed: <strong>{uploadResult.frames_analyzed}</strong> @ {uploadResult.fps} FPS ({uploadResult.resolution})
              </div>
              <div className="text-gray-300 text-[11px]">
                Violation Flagged: <strong className={uploadResult.violation_detected ? 'text-red-400' : 'text-emerald-400'}>
                  {uploadResult.violation_detected ? 'YES — INCIDENT CREATED' : 'NO — COMPLIANT'}
                </strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
