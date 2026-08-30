import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { Activity, Gauge, Disc } from 'lucide-react';

export default function TelemetryTimeline({ telemetry = [], currentTime = 1.87 }) {
  if (!telemetry || telemetry.length === 0) {
    return (
      <div className="bg-[#0b0f19] rounded-xl border border-[#1e293b] p-3 text-center text-xs text-gray-400 font-mono">
        NO TELEMETRY DATA SYNCHRONIZED
      </div>
    );
  }

  // Format data for chart
  const formattedData = telemetry.map((pt, idx) => ({
    time: (idx / 30).toFixed(2),
    speed: pt.speed_kph,
    throttle: pt.throttle_pct,
    brake: pt.brake_pct,
    steering: Math.abs(pt.steering_deg),
    latG: Math.abs(pt.lateral_g),
    gear: pt.gear,
  }));

  // Find active sample based on currentTime
  const activeIdx = Math.min(formattedData.length - 1, Math.max(0, Math.round(currentTime * 30)));
  const currentSample = telemetry[activeIdx] || telemetry[0];

  return (
    <div className="bg-[#0b0f19] rounded-xl border border-[#1e293b] p-3 shadow-lg">
      <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-[#182030] text-xs font-mono">
        <div className="flex items-center space-x-2 text-cyan-400 font-bold">
          <Activity className="w-4 h-4" />
          <span>SYNCHRONIZED VEHICLE TELEMETRY (CAN BUS)</span>
        </div>
        <div className="flex items-center space-x-4 text-[11px] text-gray-300">
          <span>SPEED: <strong className="text-white">{currentSample.speed_kph} KM/H</strong></span>
          <span>THROTTLE: <strong className="text-emerald-400">{currentSample.throttle_pct}%</strong></span>
          <span>BRAKE: <strong className="text-red-400">{currentSample.brake_pct}%</strong></span>
          <span>LAT G: <strong className="text-yellow-400">{Math.abs(currentSample.lateral_g)}G</strong></span>
          <span>GEAR: <strong className="text-cyan-400">{currentSample.gear}</strong></span>
        </div>
      </div>

      {/* Chart container */}
      <div className="h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
            <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
            <YAxis stroke="#475569" fontSize={9} domain={[0, 320]} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#07090e', borderColor: '#1e293b', fontSize: '11px', color: '#fff' }} 
            />
            <ReferenceLine x={currentTime.toFixed(2)} stroke="#00f0ff" strokeDasharray="3 3" label={{ value: 'T_CROSS', fill: '#00f0ff', fontSize: 9 }} />
            <Line type="monotone" dataKey="speed" stroke="#00f0ff" strokeWidth={2} dot={false} name="Speed (km/h)" />
            <Line type="monotone" dataKey="throttle" stroke="#00ff88" strokeWidth={1.5} dot={false} name="Throttle (%)" />
            <Line type="monotone" dataKey="brake" stroke="#ff3366" strokeWidth={1.5} dot={false} name="Brake (%)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between pt-1.5 text-[10px] font-mono text-gray-400">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block"></span>
            <span>Speed (km/h)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-emerald-400 inline-block"></span>
            <span>Throttle (%)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-red-400 inline-block"></span>
            <span>Brake (%)</span>
          </span>
        </div>
        <span className="text-gray-400">Sync: CAN Timestamp ±1.2ms</span>
      </div>
    </div>
  );
}
