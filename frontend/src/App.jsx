import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import RaceControlView from './components/RaceControlView';
import CircuitMapView from './components/CircuitMapView';
import CalibrationStudio from './components/CalibrationStudio';
import AnalyticsView from './components/AnalyticsView';
import ModelPerformanceView from './components/ModelPerformanceView';
import DemoScenarioRunner from './components/DemoScenarioRunner';
import IncidentReviewModal from './components/IncidentReviewModal';
import { 
  fetchCurrentRace, 
  fetchIncidents, 
  fetchLiveMetrics,
  INITIAL_INCIDENTS,
  INITIAL_SESSION
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('race-control');
  const [currentRole, setCurrentRole] = useState('Steward (G. Connelly)');
  const [session, setSession] = useState(INITIAL_SESSION);
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [selectedIncident, setSelectedIncident] = useState(INITIAL_INCIDENTS.find(i => i.incident_code === 'INC-027') || INITIAL_INCIDENTS[0]);
  const [isStewardModalOpen, setIsStewardModalOpen] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState({
    fps: 29.4,
    processing_latency_ms: 38.2,
    active_tracks_count: 18,
    incidents_detected_count: INITIAL_INCIDENTS.length,
    system_status: 'OPTIMAL / ACTIVE MONITORING'
  });

  // Load live data from API or sync state
  useEffect(() => {
    loadInitialData();

    // Polling interval for live metrics
    const interval = setInterval(async () => {
      try {
        const m = await fetchLiveMetrics();
        if (m) setLiveMetrics(m);
      } catch (e) {}
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    try {
      const [raceData, incsData, metricsData] = await Promise.all([
        fetchCurrentRace(),
        fetchIncidents(),
        fetchLiveMetrics()
      ]);
      if (raceData) setSession(raceData);
      if (Array.isArray(incsData) && incsData.length > 0) {
        setIncidents(incsData);
        if (!selectedIncident) {
          const primary = incsData.find(i => i.incident_code === 'INC-027') || incsData[0];
          setSelectedIncident(primary);
        }
      }
      if (metricsData) setLiveMetrics(metricsData);
    } catch (err) {
      console.error("Failed loading initial data:", err);
    }
  };

  const handleSelectIncident = (inc) => {
    setSelectedIncident(inc);
  };

  const handleOpenStewardModal = (inc) => {
    setSelectedIncident(inc);
    setIsStewardModalOpen(true);
  };

  const handleDecisionSubmitted = (updatedIncident) => {
    setIncidents(prev => prev.map(i => i.id === updatedIncident.id ? updatedIncident : i));
    setSelectedIncident(updatedIncident);
    fetchLiveMetrics().then(m => setLiveMetrics(m));
  };

  const handleIncidentCreated = (newInc) => {
    setIncidents(prev => [newInc, ...prev]);
    setSelectedIncident(newInc);
  };

  const handleTriggerDemoStory = () => {
    const inc027 = incidents.find(i => i.incident_code === 'INC-027') || incidents[0];
    if (inc027) {
      setSelectedIncident(inc027);
      setActiveTab('race-control');
      setIsStewardModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        metrics={liveMetrics}
        session={session}
        onTriggerDemo={handleTriggerDemoStory}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 p-4 max-w-[1720px] w-full mx-auto">
        {activeTab === 'race-control' && (
          <RaceControlView
            incidents={incidents}
            selectedIncident={selectedIncident}
            onSelectIncident={handleSelectIncident}
            onOpenStewardModal={handleOpenStewardModal}
            onTriggerDemo={handleTriggerDemoStory}
          />
        )}

        {activeTab === 'incident-review' && (
          <div className="h-full">
            {selectedIncident ? (
              <div className="bg-[#0b0f19] p-6 rounded-2xl border border-[#1e293b] shadow-2xl">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#182030]">
                  <div>
                    <h2 className="text-lg font-mono font-black text-white">
                      STEWARD INVESTIGATION DESK — {selectedIncident.incident_code}
                    </h2>
                    <p className="text-xs text-gray-400 font-mono">
                      Car #{selectedIncident.car_number} ({selectedIncident.driver_name}) | {selectedIncident.turn_name} | Lap {selectedIncident.lap_number}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsStewardModalOpen(true)}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-5 py-2 rounded-xl text-xs font-mono font-bold shadow-lg shadow-cyan-600/30 transition"
                  >
                    LAUNCH OFFICIAL DECISION PAD
                  </button>
                </div>
                {/* Embedded Review Modal Content */}
                <IncidentReviewModal
                  incident={selectedIncident}
                  isOpen={true}
                  onClose={() => setActiveTab('race-control')}
                  onDecisionSubmitted={handleDecisionSubmitted}
                />
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500 font-mono">
                No incident selected for review.
              </div>
            )}
          </div>
        )}

        {activeTab === 'circuit-map' && (
          <CircuitMapView
            circuit={session?.circuit}
            incidents={incidents}
            onSelectIncident={handleSelectIncident}
            onOpenStewardModal={handleOpenStewardModal}
          />
        )}

        {activeTab === 'calibration' && (
          <CalibrationStudio
            onCalibrationUpdated={loadInitialData}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView />
        )}

        {activeTab === 'models' && (
          <ModelPerformanceView
            liveMetrics={liveMetrics}
          />
        )}

        {activeTab === 'demo' && (
          <DemoScenarioRunner
            onIncidentCreated={handleIncidentCreated}
            onSelectIncident={handleSelectIncident}
            onOpenStewardModal={handleOpenStewardModal}
          />
        )}
      </main>

      {/* Steward Decision Modal Popup */}
      {isStewardModalOpen && (
        <IncidentReviewModal
          incident={selectedIncident}
          isOpen={isStewardModalOpen}
          onClose={() => setIsStewardModalOpen(false)}
          onDecisionSubmitted={handleDecisionSubmitted}
        />
      )}
    </div>
  );
}
