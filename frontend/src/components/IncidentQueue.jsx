import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight, 
  Gauge, 
  Sliders, 
  ShieldAlert,
  Car,
  Filter
} from 'lucide-react';

export default function IncidentQueue({ 
  incidents = [], 
  selectedIncident, 
  onSelectIncident, 
  onOpenStewardModal 
}) {
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filteredIncidents = incidents.filter((inc) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'REVIEW_REQUIRED') return inc.status === 'REVIEW_REQUIRED';
    if (filterStatus === 'CONFIRMED') return inc.status === 'CONFIRMED';
    if (filterStatus === 'REJECTED') return inc.status === 'REJECTED';
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'REVIEW_REQUIRED':
        return (
          <span className="flex items-center space-x-1 bg-red-950/80 text-red-300 border border-red-500/50 px-2 py-0.5 rounded text-[10px] font-mono font-bold animate-pulse shadow-sm shadow-red-950">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            <span>REVIEW REQUIRED</span>
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="flex items-center space-x-1 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>CONFIRMED</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="flex items-center space-x-1 bg-gray-800 text-gray-300 border border-gray-600 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
            <XCircle className="w-3 h-3 text-gray-400" />
            <span>REJECTED</span>
          </span>
        );
      default:
        return (
          <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-[10px] font-mono">
            {status}
          </span>
        );
    }
  };

  const getConfidenceBadge = (confidence) => {
    const score = (confidence.overall_confidence * 100).toFixed(1);
    const level = confidence.level;
    let color = 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30';
    if (level === 'MEDIUM') color = 'text-yellow-400 bg-yellow-950/50 border-yellow-500/30';
    if (level === 'LOW') color = 'text-red-400 bg-red-950/50 border-red-500/30';

    return (
      <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold flex items-center space-x-1 ${color}`}>
        <span>{score}%</span>
        <span className="text-[9px] opacity-80">({level})</span>
      </span>
    );
  };

  return (
    <div className="bg-[#0b0f19] rounded-2xl border border-[#1e293b] p-4 flex flex-col h-full shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#182030]">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            INCIDENT QUEUE ({incidents.length})
          </h2>
        </div>
        <span className="text-[10px] font-mono text-gray-400 bg-[#141b2d] px-2 py-0.5 rounded border border-gray-700">
          AUTO-RANKED BY SEVERITY
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-[#07090e] rounded-xl border border-[#1e293b] mb-3 text-[11px] font-mono font-medium">
        {[
          { id: 'ALL', label: `ALL (${incidents.length})` },
          { id: 'REVIEW_REQUIRED', label: `PENDING (${incidents.filter(i => i.status === 'REVIEW_REQUIRED').length})` },
          { id: 'CONFIRMED', label: `CONFIRMED (${incidents.filter(i => i.status === 'CONFIRMED').length})` },
          { id: 'REJECTED', label: `REJECTED (${incidents.filter(i => i.status === 'REJECTED').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`py-1.5 rounded-lg text-center transition ${
              filterStatus === tab.id
                ? 'bg-gradient-to-r from-cyan-900 to-blue-900 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-[#141b2d]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Incident Cards Scrollable List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-10 text-gray-500 font-mono text-xs">
            No incidents found in this filter category.
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const isSelected = selectedIncident?.id === inc.id;
            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#141d33] to-[#0f172a] border-cyan-500/70 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                    : 'bg-[#0e1322] border-[#1e293b] hover:border-gray-600 hover:bg-[#12192c]'
                }`}
              >
                {/* Top Row: Code, Car Badge, Status */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-black text-cyan-400">{inc.incident_code}</span>
                    <span className="bg-[#1e293b] text-white px-2 py-0.5 rounded text-xs font-mono font-bold flex items-center space-x-1">
                      <Car className="w-3 h-3 text-cyan-300" />
                      <span>#{inc.car_number}</span>
                    </span>
                    <span className="text-xs font-semibold text-gray-300 truncate max-w-[110px]">{inc.driver_name}</span>
                  </div>
                  {getStatusBadge(inc.status)}
                </div>

                {/* Mid Row: Turn, Excursion, Duration */}
                <div className="grid grid-cols-3 gap-2 bg-[#07090e]/60 p-2 rounded-lg border border-[#1e293b]/60 text-[11px] font-mono mb-2">
                  <div>
                    <span className="text-gray-500 block text-[9px]">LOCATION</span>
                    <span className="text-gray-200 font-medium truncate block">{inc.turn_name.split('(')[0]}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[9px]">EXCURSION</span>
                    <span className={`font-bold ${inc.max_excursion_cm > 5 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {inc.max_excursion_cm.toFixed(1)} cm
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[9px]">LAP / TIME</span>
                    <span className="text-gray-300">L{inc.lap_number} ({inc.duration_seconds}s)</span>
                  </div>
                </div>

                {/* Bottom Row: Confidence & Quick Review CTA */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono text-gray-400">AI CONFIDENCE:</span>
                    {getConfidenceBadge(inc.confidence_breakdown)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenStewardModal(inc);
                    }}
                    className="text-[11px] font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-0.5 hover:underline"
                  >
                    <span>REVIEW</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
