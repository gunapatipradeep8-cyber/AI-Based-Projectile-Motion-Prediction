import React, { useState, useEffect, useCallback } from 'react';
import ProjectileSimulator from '../components/ProjectileSimulator.jsx';
import PredictionResults from '../components/PredictionResults.jsx';
import TrajectoryGraph from '../components/TrajectoryGraph.jsx';
import {
  getSimulationHistory,
  deleteSimulationRecord,
  clearSimulationHistory,
} from '../services/api';
import {
  History,
  Trash2,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import jsPDF from 'jspdf';

export default function Simulator() {
  const [simulationResults, setSimulationResults] = useState(null);
  const [livePhysics, setLivePhysics] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await getSimulationHistory(20);
      setHistoryList(res.history || []);
    } catch (e) {
      console.error('Failed to load simulation history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSimulationSuccess = useCallback((data) => {
    setSimulationResults(data);
    if (data) fetchHistory();
  }, []);

  const handleLivePhysicsChange = useCallback((payload) => {
    if (payload?.theoretical) {
      setLivePhysics(payload.theoretical);
    }
  }, []);

  const handleResetSimulation = useCallback(() => {
    setSimulationResults(null);
  }, []);

  const handleDeleteHistoryItem = async (id) => {
    try {
      await deleteSimulationRecord(id);
      setHistoryList((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      console.error('Failed to delete history record:', e);
    }
  };

  const handleClearAllHistory = async () => {
    if (window.confirm('Are you sure you want to delete all saved simulation history?')) {
      try {
        await clearSimulationHistory();
        setHistoryList([]);
      } catch (e) {
        console.error('Failed to clear history:', e);
      }
    }
  };

  // Export History as CSV
  const exportToCSV = () => {
    if (historyList.length === 0) {
      alert('No simulation records available to export.');
      return;
    }
    const headers = [
      'ID',
      'Timestamp',
      'Mass(kg)',
      'Velocity(m/s)',
      'Height(m)',
      'Gravity(m/s2)',
      'Angle(deg)',
      'Force(N)',
      'KineticEnergy(J)',
      'PotentialEnergy(J)',
      'TotalEnergy(J)',
      'WorkDone(J)',
      'PredictedDistance(m)',
      'TheoreticalRange(m)',
      'MaxHeight(m)',
      'FlightTime(s)',
      'Model',
    ];

    const rows = historyList.map((r) => [
      r.id,
      r.timestamp,
      r.mass,
      r.velocity,
      r.height,
      r.gravity,
      r.launch_angle ?? 'N/A',
      r.force,
      r.kinetic_energy,
      r.potential_energy,
      r.total_energy,
      r.work_done,
      r.predicted_distance,
      r.theoretical_range ?? 'N/A',
      r.max_height ?? 'N/A',
      r.flight_time ?? 'N/A',
      r.model_name,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `projectile_simulations_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Current Simulation Report as PDF
  const exportToPDF = () => {
    const theo = simulationResults?.theoretical_physics || livePhysics;
    if (!theo) {
      alert('Simulation parameters are not ready for export.');
      return;
    }

    const doc = new jsPDF();
    const ml = simulationResults?.ml_prediction || null;

    // Header Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(56, 189, 248);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('AI-Based Projectile Motion Prediction', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(203, 213, 225);
    doc.text('College Physics Simulation Report | Academic Kinematics Laboratory', 14, 28);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

    // Section 1: ML Model Output (or preview status)
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Machine Learning Prediction Output', 14, 52);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    if (ml) {
      doc.text(`Trained Model: ${ml.model_name || 'RandomForestRegressor (100 Trees)'}`, 14, 60);
      doc.text(
        `Predicted Projectile Distance: ${ml.predicted_distance} meters (${(
          ml.predicted_distance * 3.28084
        ).toFixed(2)} ft)`,
        14,
        67
      );
    } else {
      doc.text('Trained Model: RandomForestRegressor (projectile_model.pkl)', 14, 60);
      doc.text('Predicted Distance: Not executed yet (Live Theoretical Physics Preview Mode)', 14, 67);
    }

    // Section 2: Theoretical Kinematics Calculations
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Theoretical Kinematics Calculations (Newtonian Vacuum)', 14, 82);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Theoretical Ideal Range: ${theo.theoretical_range ?? 'N/A'} m`, 14, 90);
    doc.text(`Maximum Height (H_max): ${theo.max_height ?? 'N/A'} m`, 14, 97);
    doc.text(`Flight Time (t_flight): ${theo.flight_time ?? 'N/A'} s`, 14, 104);
    doc.text(
      `Velocity Components: Vx = ${theo.initial_vx ?? 'N/A'} m/s, Vy = ${theo.initial_vy ?? 'N/A'} m/s`,
      14,
      111
    );

    if (ml) {
      const diff = Math.abs(ml.predicted_distance - (theo.theoretical_range || 0)).toFixed(3);
      doc.text(`Empirical Deviation (ML vs Theory): Δ ${diff} m`, 14, 118);
    }

    // Section 3: Physical Parameters
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Physical Feature Values (Model & Kinematics Inputs)', 14, 133);

    doc.setFontSize(10);
    doc.setFont('courier', 'normal');
    const paramEntries = [
      ['Mass (m)', `${theo.mass ?? 'N/A'} kg`],
      ['Launch Angle (θ)', `${theo.launch_angle_deg ?? 'N/A'} degrees`],
      ['Release Height (h₀)', `${theo.launch_height ?? 'N/A'} m`],
      ['Gravity (g)', `${theo.gravity ?? 'N/A'} m/s²`],
      ['Weight Force (F)', `${theo.force ?? 'N/A'} N`],
      ['Kinetic Energy (KE)', `${theo.kinetic_energy ?? 'N/A'} J`],
      ['Potential Energy (PE)', `${theo.potential_energy ?? 'N/A'} J`],
      ['Total Mechanical Energy', `${theo.total_energy ?? 'N/A'} J`],
    ];

    let yPos = 142;
    paramEntries.forEach(([label, val]) => {
      doc.text(`- ${label.padEnd(26, ' ')} : ${val}`, 18, yPos);
      yPos += 7;
    });

    // Footer note
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Note: This report compares empirical machine learning predictions with classical vacuum kinematics.',
      14,
      280
    );

    doc.save(`Projectile_Simulation_Report_${Date.now()}.pdf`);
  };

  const handleAskTutor = (promptText) => {
    window.dispatchEvent(new CustomEvent('open-ai-tutor'));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('prefill-ai-tutor', { detail: { text: promptText } }));
    }, 300);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-sky-950/60 border border-sky-500/30 text-cyan-300 mb-2">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Interactive Scientific Workspace</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Projectile Motion Simulator
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tune physical parameters, explore live Newtonian kinematics and animations, and run real-time Random Forest predictions.
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToPDF}
            disabled={!simulationResults && !livePhysics}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-40"
            title="Download current run as PDF report"
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={exportToCSV}
            disabled={historyList.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-40"
            title="Export all SQLite history as CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Simulator Controls Form with Interactive Sliders */}
      <ProjectileSimulator
        onSimulationSuccess={handleSimulationSuccess}
        onLivePhysicsChange={handleLivePhysicsChange}
        onResetSimulation={handleResetSimulation}
        isSimulating={isSimulating}
        setIsSimulating={setIsSimulating}
      />

      {/* Prediction Output & Comparison Metrics */}
      <PredictionResults
        results={simulationResults}
        livePhysics={livePhysics}
        onAskTutor={handleAskTutor}
      />

      {/* Interactive 2D Trajectory Animation & Multi-Tab Chart.js Plots */}
      <TrajectoryGraph
        results={simulationResults}
        livePhysics={livePhysics}
      />

      {/* Simulation History Table */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
              <History className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Simulation History (SQLite Database)</h3>
              <p className="text-xs text-slate-400">
                Persistent log of runs saved in <code>backend/app/database/projectile_simulations.db</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
            {historyList.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* History Table */}
        {historyList.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono">
            No simulations logged yet. Run your first prediction above to record history.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Mass (kg)</th>
                  <th className="py-3 px-3">Velocity (m/s)</th>
                  <th className="py-3 px-3">Height (m)</th>
                  <th className="py-3 px-3">Angle (°)</th>
                  <th className="py-3 px-3 text-cyan-400 font-bold">ML Predicted (m)</th>
                  <th className="py-3 px-3 text-purple-400">Theory Range (m)</th>
                  <th className="py-3 px-3">Delta (Δ)</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {historyList.map((row) => {
                  const delta =
                    row.theoretical_range !== null
                      ? Math.abs(row.predicted_distance - row.theoretical_range).toFixed(3)
                      : 'N/A';
                  return (
                    <tr key={row.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500">{row.id}</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(row.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3">{row.mass}</td>
                      <td className="py-2.5 px-3">{row.velocity}</td>
                      <td className="py-2.5 px-3">{row.height}</td>
                      <td className="py-2.5 px-3">{row.launch_angle ?? 'N/A'}</td>
                      <td className="py-2.5 px-3 font-bold text-cyan-300">{row.predicted_distance}m</td>
                      <td className="py-2.5 px-3 text-purple-300">
                        {row.theoretical_range !== null ? `${row.theoretical_range}m` : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{delta}m</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDeleteHistoryItem(row.id)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
