const API_BASE = '/api';

export async function fetchCurrentRace() {
  const res = await fetch(`${API_BASE}/races/current`);
  return res.json();
}

export async function fetchCircuits() {
  const res = await fetch(`${API_BASE}/circuits`);
  return res.json();
}

export async function fetchIncidents(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/incidents${query ? `?${query}` : ''}`);
  return res.json();
}

export async function fetchIncident(id) {
  const res = await fetch(`${API_BASE}/incidents/${id}`);
  return res.json();
}

export async function submitStewardDecision(incidentId, decisionData) {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(decisionData),
  });
  return res.json();
}

export async function fetchAuditTrail() {
  const res = await fetch(`${API_BASE}/audit-trail`);
  return res.json();
}

export async function fetchLiveMetrics() {
  const res = await fetch(`${API_BASE}/analyze/metrics/live`);
  return res.json();
}

export async function simulateScenario(params) {
  const formData = new FormData();
  Object.keys(params).forEach(key => formData.append(key, params[key]));
  const res = await fetch(`${API_BASE}/analyze/simulate-scenario`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function uploadVideoForAnalysis(file, carNumber, circuitTurn) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('car_number', carNumber);
  formData.append('circuit_turn', circuitTurn);
  const res = await fetch(`${API_BASE}/analyze/video-upload`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function fetchCalibration(circuitTurn) {
  const res = await fetch(`${API_BASE}/calibration/${circuitTurn}`);
  return res.json();
}

export async function saveCalibration(circuitTurn, calibration) {
  const res = await fetch(`${API_BASE}/calibration/${circuitTurn}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(calibration),
  });
  return res.json();
}

export async function autoDetectBoundary() {
  const res = await fetch(`${API_BASE}/calibration/auto-detect`, {
    method: 'POST',
  });
  return res.json();
}

export async function fetchRaceAnalytics() {
  const res = await fetch(`${API_BASE}/analytics/race`);
  return res.json();
}

export async function fetchModelBenchmarks() {
  const res = await fetch(`${API_BASE}/models/benchmarks`);
  return res.json();
}

export async function fetchActiveLearningQueue() {
  const res = await fetch(`${API_BASE}/models/active-learning`);
  return res.json();
}

export async function exportActiveLearningDataset() {
  const res = await fetch(`${API_BASE}/models/active-learning/trigger-export`, {
    method: 'POST',
  });
  return res.json();
}
