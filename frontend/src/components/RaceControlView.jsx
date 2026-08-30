import React from 'react';
import VideoWorkspace from './VideoWorkspace';
import IncidentQueue from './IncidentQueue';
import TelemetryTimeline from './TelemetryTimeline';
import { ShieldAlert, Activity, Radio, AlertTriangle } from 'lucide-react';

export default function RaceControlView({ 
  incidents = [], 
  selectedIncident, 
  onSelectIncident, 
  onOpenStewardModal,
  onTriggerDemo
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
      {/* Left / Center 8-Cols: Video Evidence Workspace + Synchronized Telemetry Trace */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        {/* Main Video Player */}
        <div className="flex-1 min-h-[460px]">
          <VideoWorkspace
            incident={selectedIncident}
            onSelectIncident={onSelectIncident}
            onOpenStewardModal={onOpenStewardModal}
          />
        </div>

        {/* Telemetry Timeline Component */}
        <div>
          <TelemetryTimeline
            telemetry={selectedIncident?.telemetry_samples || []}
            currentTime={1.87}
          />
        </div>
      </div>

      {/* Right 4-Cols: Incident Queue & Live Action Stream */}
      <div className="lg:col-span-4 flex flex-col min-h-[600px]">
        <IncidentQueue
          incidents={incidents}
          selectedIncident={selectedIncident}
          onSelectIncident={onSelectIncident}
          onOpenStewardModal={onOpenStewardModal}
        />
      </div>
    </div>
  );
}
