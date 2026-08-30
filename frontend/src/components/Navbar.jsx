import React from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Map, 
  Sliders, 
  BarChart3, 
  Cpu, 
  PlaySquare, 
  Flag, 
  UserCheck,
  Radio,
  Zap
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  currentRole, 
  setCurrentRole, 
  metrics, 
  session, 
  onTriggerDemo 
}) {
  const navItems = [
    { id: 'race-control', label: 'Race Control', icon: Activity },
    { id: 'incident-review', label: 'Steward Review', icon: ShieldAlert, badge: 'INC-027' },
    { id: 'circuit-map', label: 'Circuit & Telemetry', icon: Map },
    { id: 'calibration', label: 'Boundary Studio', icon: Sliders },
    { id: 'analytics', label: 'Analytics & Audit', icon: BarChart3 },
    { id: 'models', label: 'AI Benchmarks & AL', icon: Cpu },
    { id: 'demo', label: 'Scenario Lab', icon: PlaySquare },
  ];

  const roles = ['Steward (G. Connelly)', 'Race Director', 'Race Engineer', 'Technical Delegate'];

  return (
    <header className="bg-[#0b0f19] border-b border-[#1e293b] sticky top-0 z-50 shadow-2xl">
      {/* Top Status Ticker */}
      <div className="bg-[#07090e] border-b border-[#182030] px-4 py-1.5 flex flex-wrap items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-cyan-400">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span className="font-semibold tracking-wider">FIA RACE CONTROL FEED</span>
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center space-x-1.5 text-gray-300">
            <span className="text-gray-400">SESSION:</span>
            <span className="font-bold text-white">{session?.name || 'FORMULA 1 GROSSER PREIS VON ÖSTERREICH 2026'}</span>
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-gray-400">LAP:</span>
            <span className="text-yellow-400 font-bold">{session?.current_lap || 38} / {session?.total_laps || 71}</span>
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center space-x-1.5 bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-bold tracking-wider">GREEN FLAG / TRACK CLEAR</span>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-gray-400">
          <div className="flex items-center space-x-3">
            <span>FPS: <strong className="text-cyan-400">{metrics?.fps?.toFixed(1) || '29.4'}</strong></span>
            <span>LATENCY: <strong className="text-emerald-400">{metrics?.processing_latency_ms?.toFixed(1) || '38.2'} ms</strong></span>
            <span>TRACKS: <strong className="text-yellow-400">{metrics?.active_tracks_count || 18}</strong></span>
            <span>INCIDENTS: <strong className="text-red-400 font-bold">{metrics?.incidents_detected_count || 5}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 bg-[#141b2d] px-2 py-0.5 rounded text-gray-300 border border-gray-700">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <select 
              value={currentRole} 
              onChange={(e) => setCurrentRole(e.target.value)}
              className="bg-transparent text-xs text-cyan-300 font-sans focus:outline-none cursor-pointer"
            >
              {roles.map(r => <option key={r} value={r} className="bg-[#0e131f] text-white">{r}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('race-control')}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/40">
            <Flag className="w-5 h-5 text-white transform -rotate-12" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-wider text-white font-mono">
                APEX <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">STEWARD AI</span>
              </span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded font-mono border border-cyan-500/30">
                DECISION SUPPORT
              </span>
            </div>
            <p className="text-[11px] text-gray-400 tracking-wide font-medium">“AI that sees every boundary.”</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-[#07090e]/80 p-1 rounded-xl border border-[#1e293b]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 relative ${
                  isActive 
                    ? 'bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-950/50' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#141b2d]/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="bg-red-500/90 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full animate-pulse shadow-sm shadow-red-500/50">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Demo CTA */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onTriggerDemo}
            className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-lg shadow-red-600/30 border border-red-400/30 transition-all transform active:scale-95"
            title="Trigger Turn 9 Incident #027 (#44 Hamilton)"
          >
            <Zap className="w-3.5 h-3.5 animate-bounce" />
            <span>PLAY DEMO SCENARIO (#44 T9)</span>
          </button>
        </div>
      </div>
    </header>
  );
}
