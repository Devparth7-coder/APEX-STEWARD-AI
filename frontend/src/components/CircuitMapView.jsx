import React, { useState } from 'react';
import { 
  MapPin, 
  AlertTriangle, 
  ShieldAlert, 
  Wind, 
  Thermometer, 
  Droplets, 
  Navigation,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export default function CircuitMapView({ 
  circuit, 
  incidents = [], 
  onSelectIncident, 
  onOpenStewardModal 
}) {
  const [selectedCircuit, setSelectedCircuit] = useState('red_bull_ring');
  const [hoveredTurn, setHoveredTurn] = useState(null);

  const circuits = {
    red_bull_ring: {
      name: 'Red Bull Ring (Spielberg)',
      country: 'Austria',
      length: '4.318 km',
      turns: [
        { id: 1, name: 'T1 - Niki Lauda Kurve', x: 180, y: 310, speed: '160 km/h', gear: 3, risk: 'Low', incidents: 0 },
        { id: 3, name: 'T3 - Remus', x: 380, y: 150, speed: '75 km/h', gear: 2, risk: 'Medium', incidents: 0 },
        { id: 4, name: 'T4 - Rauch', x: 550, y: 140, speed: '120 km/h', gear: 3, risk: 'Medium', incidents: 0 },
        { id: 6, name: 'T6 - Pirelli', x: 740, y: 220, speed: '190 km/h', gear: 5, risk: 'Low', incidents: 0 },
        { id: 9, name: 'T9 - Jochen Rindt Kurve', x: 720, y: 520, speed: '245 km/h', gear: 6, risk: 'CRITICAL HOTSPOT', incidents: 3, incidentCodes: ['INC-027', 'INC-025', 'INC-024'] },
        { id: 10, name: 'T10 - Red Bull Mobile', x: 520, y: 540, speed: '260 km/h', gear: 7, risk: 'HIGH HOTSPOT', incidents: 2, incidentCodes: ['INC-026', 'INC-023'] },
      ]
    },
    monza: {
      name: 'Autodromo Nazionale Monza',
      country: 'Italy',
      length: '5.793 km',
      turns: [
        { id: 1, name: 'T1 - Variante del Rettifilo', x: 160, y: 240, speed: '80 km/h', gear: 2, risk: 'High', incidents: 1 },
        { id: 4, name: 'T4 - Variante della Roggia', x: 540, y: 170, speed: '110 km/h', gear: 3, risk: 'Medium', incidents: 0 },
        { id: 8, name: 'T8 - Variante Ascari', x: 860, y: 270, speed: '210 km/h', gear: 5, risk: 'High', incidents: 1 },
        { id: 11, name: 'T11 - Parabolica (Alboreto)', x: 710, y: 510, speed: '270 km/h', gear: 7, risk: 'CRITICAL HOTSPOT', incidents: 4, incidentCodes: ['INC-027'] },
      ]
    }
  };

  const currentTrack = circuits[selectedCircuit];

  return (
    <div className="space-y-4">
      {/* Circuit Header */}
      <div className="bg-[#0b0f19] p-4 rounded-2xl border border-[#1e293b] flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-mono font-bold text-white uppercase tracking-wider">
              CIRCUIT INTELLIGENCE & TRACK LIMIT HOTSPOTS
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              {currentTrack.name} | {currentTrack.length} | 3 TIMING SECTORS
            </p>
          </div>
        </div>

        {/* Circuit Select & Live Track Weather */}
        <div className="flex items-center space-x-4">
          {/* Weather Mini Bar */}
          <div className="flex items-center space-x-3 bg-[#07090e] px-3 py-1.5 rounded-xl border border-[#1e293b] text-xs font-mono text-gray-300">
            <div className="flex items-center space-x-1 text-red-400">
              <Thermometer className="w-3.5 h-3.5" />
              <span>TRACK: 44.2°C</span>
            </div>
            <span className="text-gray-600">|</span>
            <div className="flex items-center space-x-1 text-cyan-400">
              <Wind className="w-3.5 h-3.5" />
              <span>AIR: 26.8°C</span>
            </div>
            <span className="text-gray-600">|</span>
            <div className="flex items-center space-x-1 text-blue-400">
              <Droplets className="w-3.5 h-3.5" />
              <span>HUMID: 38%</span>
            </div>
          </div>

          {/* Circuit Switcher */}
          <div className="flex space-x-1 bg-[#07090e] p-1 rounded-xl border border-[#1e293b] text-xs font-mono">
            <button
              onClick={() => setSelectedCircuit('red_bull_ring')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                selectedCircuit === 'red_bull_ring' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Red Bull Ring
            </button>
            <button
              onClick={() => setSelectedCircuit('monza')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                selectedCircuit === 'monza' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Monza
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: SVG Circuit View + Turn Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SVG Circuit Canvas (8 cols) */}
        <div className="lg:col-span-8 bg-[#0b0f19] rounded-2xl border border-[#1e293b] p-4 flex flex-col relative shadow-xl overflow-hidden min-h-[480px]">
          <div className="flex justify-between items-center text-xs font-mono pb-2 border-b border-[#182030]">
            <span className="text-cyan-400 font-bold">INTERACTIVE CIRCUIT LAYOUT & INCIDENT PINS</span>
            <span className="text-gray-400 text-[10px]">CLICK PIN TO OPEN INCIDENT REPLAY</span>
          </div>

          {/* SVG Map Container */}
          <div className="flex-1 relative flex items-center justify-center p-4">
            <svg viewBox="0 0 1000 650" className="w-full h-full max-h-[420px] drop-shadow-2xl">
              <defs>
                <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Background Circuit Line (Glow) */}
              <path
                d={selectedCircuit === 'red_bull_ring'
                  ? "M 180 320 C 180 200, 320 150, 400 150 C 500 150, 600 130, 680 160 C 780 200, 840 280, 820 420 C 800 520, 700 550, 620 540 C 520 530, 360 520, 240 480 Z"
                  : "M 160 260 L 520 180 L 840 240 C 900 320, 920 440, 840 500 L 680 520 L 220 480 Z"
                }
                fill="none"
                stroke="#00f0ff"
                strokeWidth="18"
                strokeOpacity="0.15"
              />

              {/* Main Asphalt Path */}
              <path
                d={selectedCircuit === 'red_bull_ring'
                  ? "M 180 320 C 180 200, 320 150, 400 150 C 500 150, 600 130, 680 160 C 780 200, 840 280, 820 420 C 800 520, 700 550, 620 540 C 520 530, 360 520, 240 480 Z"
                  : "M 160 260 L 520 180 L 840 240 C 900 320, 920 440, 840 500 L 680 520 L 220 480 Z"
                }
                fill="none"
                stroke="#1e293b"
                strokeWidth="12"
              />

              {/* Racing Line */}
              <path
                d={selectedCircuit === 'red_bull_ring'
                  ? "M 180 320 C 180 200, 320 150, 400 150 C 500 150, 600 130, 680 160 C 780 200, 840 280, 820 420 C 800 520, 700 550, 620 540 C 520 530, 360 520, 240 480 Z"
                  : "M 160 260 L 520 180 L 840 240 C 900 320, 920 440, 840 500 L 680 520 L 220 480 Z"
                }
                fill="none"
                stroke="url(#trackGrad)"
                strokeWidth="4"
                strokeDasharray="8 4"
              />

              {/* Turn Markers & Incident Hotspot Pins */}
              {currentTrack.turns.map((turn) => {
                const isHotspot = turn.incidents > 0;
                return (
                  <g 
                    key={turn.id} 
                    className="cursor-pointer transform transition hover:scale-125"
                    onClick={() => {
                      if (turn.incidentCodes && turn.incidentCodes.length > 0) {
                        const inc = incidents.find(i => i.incident_code === turn.incidentCodes[0]);
                        if (inc) onSelectIncident(inc);
                      }
                    }}
                    onMouseEnter={() => setHoveredTurn(turn)}
                    onMouseLeave={() => setHoveredTurn(null)}
                  >
                    {/* Hotspot Radar Pulse */}
                    {isHotspot && (
                      <circle
                        cx={turn.x}
                        cy={turn.y}
                        r="24"
                        fill="rgba(255, 51, 102, 0.2)"
                        className="animate-ping"
                      />
                    )}

                    {/* Outer Circle */}
                    <circle
                      cx={turn.x}
                      cy={turn.y}
                      r={isHotspot ? "15" : "11"}
                      fill={isHotspot ? "#ff3366" : "#0f172a"}
                      stroke={isHotspot ? "#ffffff" : "#00f0ff"}
                      strokeWidth="2.5"
                    />

                    {/* Turn Number Text */}
                    <text
                      x={turn.x}
                      y={turn.y + 4}
                      fill="#ffffff"
                      fontSize={isHotspot ? "11" : "9"}
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {turn.id}
                    </text>

                    {/* Hotspot badge pill */}
                    {isHotspot && (
                      <g transform={`translate(${turn.x - 28}, ${turn.y - 28})`}>
                        <rect width="56" height="16" rx="8" fill="#07090e" stroke="#ff3366" strokeWidth="1" />
                        <text x="28" y="11" fill="#ff3366" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                          {turn.incidents} ALERTS
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Live Car Position Indicator (#44 Hamilton leading into Turn 9) */}
              <g transform="translate(690, 500)">
                <circle r="9" fill="#00f0ff" stroke="#ffffff" strokeWidth="2" className="animate-pulse" />
                <text x="0" y="3" fill="#000000" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  44
                </text>
              </g>

              {/* Sector Markers */}
              <text x="280" y="110" fill="#64748b" fontSize="12" fontWeight="bold" fontFamily="monospace">SECTOR 1</text>
              <text x="820" y="240" fill="#64748b" fontSize="12" fontWeight="bold" fontFamily="monospace">SECTOR 2</text>
              <text x="460" y="580" fill="#00f0ff" fontSize="12" fontWeight="bold" fontFamily="monospace">SECTOR 3 (HOTSPOT ZONE)</text>
            </svg>
          </div>

          {/* Hovered Turn Details Footer */}
          {hoveredTurn && (
            <div className="absolute bottom-4 left-4 right-4 bg-[#07090e]/90 border border-cyan-500/40 rounded-xl p-3 flex items-center justify-between backdrop-blur-md text-xs font-mono">
              <div className="flex items-center space-x-3">
                <span className="text-cyan-400 font-bold text-sm">{hoveredTurn.name}</span>
                <span className="text-gray-400">APEX SPEED: <strong className="text-white">{hoveredTurn.speed}</strong></span>
                <span className="text-gray-400">GEAR: <strong className="text-yellow-400">G{hoveredTurn.gear}</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">RISK LEVEL:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${
                  hoveredTurn.risk.includes('CRITICAL') ? 'bg-red-950 text-red-400 border border-red-500/40' : 'bg-gray-800 text-gray-300'
                }`}>
                  {hoveredTurn.risk}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Turn Hotspots List (4 cols) */}
        <div className="lg:col-span-4 bg-[#0b0f19] rounded-2xl border border-[#1e293b] p-4 flex flex-col shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#182030]">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                TURN VIOLATION RANKING
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">LIVE GP DATA</span>
          </div>

          <div className="space-y-3 overflow-y-auto flex-1 pr-1">
            {currentTrack.turns.map((t) => {
              const isTurnHotspot = t.incidents > 0;
              return (
                <div
                  key={t.id}
                  className={`p-3 rounded-xl border transition ${
                    isTurnHotspot
                      ? 'bg-gradient-to-r from-[#181124] to-[#0f1424] border-red-500/40 shadow-sm'
                      : 'bg-[#07090e] border-[#1e293b]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold text-white">{t.name}</span>
                    {isTurnHotspot ? (
                      <span className="bg-red-950 text-red-300 border border-red-500/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        {t.incidents} VIOLATIONS
                      </span>
                    ) : (
                      <span className="text-gray-500 text-[10px] font-mono">0 VIOLATIONS</span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-gray-400 mb-2">
                    <div>SPEED: <strong className="text-gray-200">{t.speed}</strong></div>
                    <div>GEAR: <strong className="text-cyan-400">G{t.gear}</strong></div>
                    <div>RISK: <strong className={t.risk.includes('CRITICAL') ? 'text-red-400' : 'text-gray-300'}>{t.risk.split(' ')[0]}</strong></div>
                  </div>

                  {isTurnHotspot && t.incidentCodes && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-800">
                      {t.incidentCodes.map((code) => (
                        <button
                          key={code}
                          onClick={() => {
                            const inc = incidents.find(i => i.incident_code === code);
                            if (inc) onOpenStewardModal(inc);
                          }}
                          className="bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold transition flex items-center space-x-1"
                        >
                          <span>{code}</span>
                          <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
