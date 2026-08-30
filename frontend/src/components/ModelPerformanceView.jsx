import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Database, 
  RefreshCw, 
  Activity, 
  GitBranch,
  FileCode,
  ShieldAlert
} from 'lucide-react';
import { fetchModelBenchmarks, fetchActiveLearningQueue, exportActiveLearningDataset } from '../services/api';

export default function ModelPerformanceView({ liveMetrics }) {
  const [benchmarks, setBenchmarks] = useState([]);
  const [alData, setAlData] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);

  useEffect(() => {
    loadModelData();
  }, []);

  const loadModelData = async () => {
    try {
      const [bm, al] = await Promise.all([
        fetchModelBenchmarks(),
        fetchActiveLearningQueue()
      ]);
      setBenchmarks(bm);
      setAlData(al);
    } catch (err) {
      console.error("Failed loading model performance data:", err);
    }
  };

  const handleExportDataset = async () => {
    setIsExporting(true);
    try {
      const res = await exportActiveLearningDataset();
      setExportMessage(res.message);
      setTimeout(() => setExportMessage(null), 4000);
    } catch (err) {
      console.error("Export dataset failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#0b0f19] p-4 rounded-2xl border border-[#1e293b] flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-mono font-bold text-white uppercase tracking-wider">
              AI MODEL BENCHMARKS & ACTIVE LEARNING PIPELINE
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Evaluated model architectures, tracking accuracy metrics, and human steward feedback dataset.
            </p>
          </div>
        </div>

        {/* Export Active Learning Dataset CTA */}
        <button
          onClick={handleExportDataset}
          disabled={isExporting}
          className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-mono font-bold shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'PACKAGING PYTORCH DATASET...' : 'EXPORT ACTIVE LEARNING DATASET'}</span>
        </button>
      </div>

      {exportMessage && (
        <div className="bg-emerald-950 border border-emerald-500/50 p-3 rounded-xl text-emerald-300 text-xs font-mono flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{exportMessage}</span>
        </div>
      )}

      {/* Model Benchmark Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {benchmarks.map((model, idx) => (
          <div key={idx} className="bg-[#0b0f19] rounded-2xl border border-[#1e293b] p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between border-b border-[#182030] pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-mono font-bold text-white">{model.model_name}</h3>
                  <span className="bg-purple-950 text-purple-300 border border-purple-500/30 text-[10px] font-mono px-2 py-0.5 rounded">
                    EVALUATED
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{model.architecture}</p>
              </div>
              <span className="text-[10px] font-mono text-gray-500 bg-[#07090e] px-2 py-1 rounded border border-gray-800">
                BENCHMARK EVAL
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#07090e] p-2.5 rounded-xl border border-[#1e293b] text-center">
                <span className="text-gray-400 text-[10px] font-mono block">DETECTION mAP@0.5</span>
                <span className="text-cyan-400 font-mono font-black text-lg">{(model.detector_map_50 * 100).toFixed(1)}%</span>
                <span className="text-[9px] font-mono text-gray-500 block">mAP50-95: {(model.detector_map_50_95 * 100).toFixed(1)}%</span>
              </div>

              <div className="bg-[#07090e] p-2.5 rounded-xl border border-[#1e293b] text-center">
                <span className="text-gray-400 text-[10px] font-mono block">TRACKING MOTA</span>
                <span className="text-emerald-400 font-mono font-black text-lg">{(model.tracking_mota * 100).toFixed(1)}%</span>
                <span className="text-[9px] font-mono text-gray-500 block">IDF1: {(model.tracking_idf1 * 100).toFixed(1)}%</span>
              </div>

              <div className="bg-[#07090e] p-2.5 rounded-xl border border-[#1e293b] text-center">
                <span className="text-gray-400 text-[10px] font-mono block">BOUNDARY IoU</span>
                <span className="text-purple-400 font-mono font-black text-lg">{(model.boundary_iou * 100).toFixed(1)}%</span>
                <span className="text-[9px] font-mono text-gray-500 block">Latency: {model.mean_latency_ms} ms</span>
              </div>
            </div>

            {/* Evaluation Dataset Metadata */}
            <div className="bg-[#07090e] p-3 rounded-xl border border-[#1e293b] text-[11px] font-mono text-gray-400 space-y-1">
              <div>DATASET: <strong className="text-gray-200">{model.benchmark_dataset}</strong></div>
              <div className="flex justify-between">
                <span>False Positive Rate: <strong className="text-emerald-400">{model.false_positive_rate_pct}%</strong></span>
                <span>False Negative Rate: <strong className="text-emerald-400">{model.false_negative_rate_pct}%</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Learning Section */}
      <div className="bg-[#0b0f19] p-5 rounded-2xl border border-[#1e293b] shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-[#182030] pb-3 gap-2">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              SUPERVISED ACTIVE LEARNING QUEUE (HUMAN-IN-THE-LOOP FEEDBACK)
            </h3>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono text-gray-300">
            <span>SUPERVISED SAMPLES: <strong className="text-cyan-400">{alData?.stats?.total_supervised_samples || 4}</strong></span>
            <span>HARD NEGATIVES: <strong className="text-red-400">{alData?.stats?.hard_negatives_identified || 2}</strong></span>
            <span>VERSION: <strong className="text-purple-400">{alData?.stats?.dataset_version || 'v1.4.2'}</strong></span>
          </div>
        </div>

        <p className="text-xs text-gray-400 font-mono">
          When race stewards reject or correct AI-flagged boundary crossings, the incidents are automatically tagged as hard negatives and packaged for PyTorch retraining.
        </p>

        {/* Feedback List */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {alData?.queue && alData.queue.length > 0 ? (
            alData.queue.map((item, idx) => (
              <div key={idx} className="bg-[#07090e] p-3 rounded-xl border border-[#1e293b] flex flex-wrap items-center justify-between text-xs font-mono gap-2">
                <div className="flex items-center space-x-3">
                  <span className="text-purple-400 font-bold">{item.feedback_id}</span>
                  <span className="text-white font-bold">#{item.car_number}</span>
                  <span className="text-gray-400">AI: {item.ai_recommendation}</span>
                  <span className="text-gray-600">→</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    item.steward_decision === 'CONFIRMED' ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'
                  }`}>
                    STEWARD: {item.steward_decision}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-gray-400">
                  <span>REVIEWER: <strong className="text-gray-200">{item.reviewer_name}</strong></span>
                  <span className="text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                    LOSS WEIGHT: {item.loss_weight}x
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500 font-mono text-xs">
              No active learning annotations yet. Review incidents to generate supervised training pairs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
