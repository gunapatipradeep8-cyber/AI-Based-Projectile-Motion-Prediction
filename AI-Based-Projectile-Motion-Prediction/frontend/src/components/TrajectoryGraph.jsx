import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  Play,
  Pause,
  RotateCcw,
  Activity,
  LineChart,
  Gauge,
  Zap,
  Clock,
  ArrowUpRight,
  Compass,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TrajectoryGraph({ results, livePhysics }) {
  const [activeTab, setActiveTab] = useState('canvas'); // 'canvas' | 'trajectory' | 'height' | 'velocity' | 'energy'
  const [velocitySubTab, setVelocitySubTab] = useState('all'); // 'all' | 'vx' | 'vy'
  const [energySubTab, setEnergySubTab] = useState('all'); // 'all' | 'ke' | 'pe'

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentProgress, setCurrentProgress] = useState(0);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const progressRef = useRef(0);
  const isPlayingRef = useRef(false);

  // Sync state with ref for animation loop
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Extract theoretical physics: prefer live physics from sliders, or fallback to API results
  const theoretical = livePhysics || results?.theoretical_physics || null;
  const mlDistance = results?.ml_prediction?.predicted_distance ?? null;
  const trajectoryPoints = theoretical?.trajectory ?? [];

  // When physical parameters change, update animation bounds smoothly
  useEffect(() => {
    if (!isPlaying) {
      // Keep progress clamped if parameters change while paused
      if (progressRef.current > 1) {
        progressRef.current = 1;
        setCurrentProgress(1);
      }
    }
  }, [theoretical, isPlaying]);

  // ── HTML5 Canvas 2D Trajectory Simulation & Animation ───────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeTab !== 'canvas') return;

    cancelAnimationFrame(animFrameRef.current);
    const ctx = canvas.getContext('2d');

    const handleResize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = 380;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    if (!theoretical || trajectoryPoints.length < 2) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Adjust sliders above to preview live trajectory', canvas.width / 2, canvas.height / 2);
      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animFrameRef.current);
      };
    }

    const flightTime = Math.max(0.05, theoretical.flight_time || 1.0);
    let lastTimestamp = null;

    const draw = (now) => {
      if (!lastTimestamp) lastTimestamp = now;
      const dt = Math.min((now - lastTimestamp) / 1000, 0.05);
      lastTimestamp = now;

      if (isPlayingRef.current) {
        progressRef.current += (dt * playbackSpeed) / flightTime;
        if (progressRef.current >= 1) {
          progressRef.current = 1;
          setIsPlaying(false);
        }
        setCurrentProgress(progressRef.current);
      }

      const w = canvas.width;
      const h = canvas.height;
      const pad = { left: 70, right: 70, top: 50, bottom: 60 };
      const plotW = Math.max(10, w - pad.left - pad.right);
      const plotH = Math.max(10, h - pad.top - pad.bottom);

      // Dynamically auto-scale axes to accommodate range, max height, and ML landing
      const maxX = Math.max(
        (theoretical.theoretical_range || 1) * 1.15,
        (mlDistance || 0) * 1.15,
        5
      );
      const maxY = Math.max(
        (theoretical.max_height || 1) * 1.3,
        (theoretical.launch_height || 0) + 2,
        3
      );

      const sx = (x) => pad.left + (x / maxX) * plotW;
      const sy = (y) => h - pad.bottom - (y / maxY) * plotH;

      ctx.clearRect(0, 0, w, h);

      // ── Grid Lines ──
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;

      // X-axis ticks
      const xStep = Math.max(1, Math.round(maxX / 6));
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      for (let i = 0; i <= maxX; i += xStep) {
        const _sx = sx(i);
        ctx.beginPath();
        ctx.moveTo(_sx, pad.top);
        ctx.lineTo(_sx, sy(0));
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillText(`${i}m`, _sx, sy(0) + 18);
      }

      // Y-axis ticks
      const yStep = Math.max(1, Math.round(maxY / 4));
      for (let j = 0; j <= maxY; j += yStep) {
        const _sy = sy(j);
        ctx.beginPath();
        ctx.moveTo(pad.left, _sy);
        ctx.lineTo(w - pad.right, _sy);
        ctx.stroke();

        ctx.textAlign = 'right';
        ctx.fillText(`${j}m`, pad.left - 10, _sy + 3);
      }

      // ── Ground Line ──
      ctx.beginPath();
      ctx.moveTo(pad.left - 15, sy(0));
      ctx.lineTo(w - pad.right + 25, sy(0));
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // ── Vertical Launch Axis ──
      ctx.beginPath();
      ctx.moveTo(sx(0), pad.top - 10);
      ctx.lineTo(sx(0), sy(0) + 10);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Horizontal Distance (x) [meters]', w / 2, h - 8);

      ctx.save();
      ctx.translate(18, h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Height (y) [meters]', 0, 0);
      ctx.restore();

      // ── Launch Angle Arc at (0, h0) ──
      const h0 = theoretical.launch_height || 0;
      const angleDeg = theoretical.launch_angle_deg || 0;
      const angleRad = (angleDeg * Math.PI) / 180;
      const arcRadius = 28;

      ctx.beginPath();
      ctx.arc(sx(0), sy(h0), arcRadius, 0, -angleRad, true);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Angle label
      const labelAngle = -angleRad / 2;
      const arcLabelX = sx(0) + (arcRadius + 14) * Math.cos(labelAngle);
      const arcLabelY = sy(h0) + (arcRadius + 14) * Math.sin(labelAngle);
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`θ=${angleDeg}°`, arcLabelX, arcLabelY);

      // ── Initial Launch Velocity Vector ──
      const v0 = Math.sqrt(
        (theoretical.initial_vx || 0) ** 2 + (theoretical.initial_vy || 0) ** 2
      );
      const vVectorScale = Math.min(3.0, (plotW / maxX) * 0.4);
      const arrowStartX = sx(0);
      const arrowStartY = sy(h0);
      const arrowEndX = arrowStartX + (theoretical.initial_vx || 0) * vVectorScale;
      const arrowEndY = arrowStartY - (theoretical.initial_vy || 0) * vVectorScale;

      ctx.beginPath();
      ctx.moveTo(arrowStartX, arrowStartY);
      ctx.lineTo(arrowEndX, arrowEndY);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Arrow head
      const arrowAngle = Math.atan2(arrowEndY - arrowStartY, arrowEndX - arrowStartX);
      const headLen = 8;
      ctx.beginPath();
      ctx.moveTo(arrowEndX, arrowEndY);
      ctx.lineTo(
        arrowEndX - headLen * Math.cos(arrowAngle - Math.PI / 6),
        arrowEndY - headLen * Math.sin(arrowAngle - Math.PI / 6)
      );
      ctx.lineTo(
        arrowEndX - headLen * Math.cos(arrowAngle + Math.PI / 6),
        arrowEndY - headLen * Math.sin(arrowAngle + Math.PI / 6)
      );
      ctx.fillStyle = '#f43f5e';
      ctx.fill();

      // v0 label
      ctx.fillStyle = '#f43f5e';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`v₀=${v0.toFixed(1)}m/s`, arrowEndX + 4, arrowEndY - 4);

      // ── Full Parabolic Trajectory Curve (Cyan Dashed Glow) ──
      if (trajectoryPoints.length > 1) {
        ctx.beginPath();
        trajectoryPoints.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(sx(pt.x), sy(pt.y));
          else ctx.lineTo(sx(pt.x), sy(pt.y));
        });
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 5]);
        ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.setLineDash([]);
      }

      // ── Launch Origin Point Marker ──
      ctx.beginPath();
      ctx.arc(sx(0), sy(h0), 5, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Launch (h₀=${h0}m)`, sx(0) - 10, sy(h0) + 3);

      // ── Peak Height Marker & Dashed Vertical Drop ──
      const peakX = (theoretical.initial_vx || 0) * (theoretical.time_to_peak || 0);
      const peakY = theoretical.max_height || 0;
      if (peakY > 0) {
        ctx.beginPath();
        ctx.moveTo(sx(peakX), sy(0));
        ctx.lineTo(sx(peakX), sy(peakY));
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(sx(peakX), sy(peakY), 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#c084fc';
        ctx.fill();

        ctx.fillStyle = '#c084fc';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`H_max: ${peakY.toFixed(2)}m`, sx(peakX), sy(peakY) - 10);
      }

      // ── Theoretical Landing Position Marker ──
      const theoRange = theoretical.theoretical_range || 0;
      ctx.beginPath();
      ctx.arc(sx(theoRange), sy(0), 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Theory Range: ${theoRange.toFixed(2)}m`, sx(theoRange), sy(0) + 32);

      // ── AI Model Prediction Landing Marker (if available) ──
      if (mlDistance !== null) {
        const mlX = sx(mlDistance);
        ctx.beginPath();
        ctx.arc(mlX, sy(0), 7, 0, Math.PI * 2);
        ctx.fillStyle = '#34d399';
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`AI Model: ${mlDistance.toFixed(2)}m`, mlX, sy(0) - 14);
      }

      // ── Animated Projectile Ball with Live Velocity Vector ──
      if (trajectoryPoints.length > 1) {
        const currentIdx = Math.min(
          Math.floor(progressRef.current * (trajectoryPoints.length - 1)),
          trajectoryPoints.length - 1
        );
        const curPt = trajectoryPoints[currentIdx];
        const projX = sx(curPt.x);
        const projY = sy(curPt.y);

        // Instantaneous velocity vector arrow attached to ball
        const vScale = 1.2;
        const curArrowEndX = projX + curPt.vx * vScale;
        const curArrowEndY = projY - curPt.vy * vScale;

        ctx.beginPath();
        ctx.moveTo(projX, projY);
        ctx.lineTo(curArrowEndX, curArrowEndY);
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Projectile Glowing Sphere (Basketball styling)
        ctx.beginPath();
        ctx.arc(projX, projY, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = '#f97316';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Floating dynamic readout tag
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
          `x=${curPt.x.toFixed(1)}m, y=${curPt.y.toFixed(1)}m, |v|=${curPt.speed.toFixed(1)}m/s`,
          projX + 14,
          projY - 6
        );

        // Bottom progress bar
        const barY = h - 10;
        const barL = pad.left;
        const barW = plotW;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(barL, barY - 2, barW, 4);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(barL, barY - 2, barW * progressRef.current, 4);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeTab, playbackSpeed, theoretical, mlDistance, trajectoryPoints]);

  // ── Chart.js Configurations for Live Graphs ─────────────────────────────────
  const xLabels = useMemo(() => trajectoryPoints.map((p) => p.x.toFixed(1)), [trajectoryPoints]);
  const tLabels = useMemo(() => trajectoryPoints.map((p) => p.time.toFixed(2)), [trajectoryPoints]);

  // 1. Trajectory Graph: X vs Y
  const trajectoryChartData = useMemo(
    () => ({
      labels: xLabels,
      datasets: [
        {
          label: 'Height y(x) [meters]',
          data: trajectoryPoints.map((p) => p.y),
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.12)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
      ],
    }),
    [xLabels, trajectoryPoints]
  );

  // 2. Height vs Time
  const heightTimeData = useMemo(
    () => ({
      labels: tLabels,
      datasets: [
        {
          label: 'Height y(t) [meters]',
          data: trajectoryPoints.map((p) => p.y),
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.15)',
          fill: true,
          tension: 0.25,
          pointRadius: 0,
        },
      ],
    }),
    [tLabels, trajectoryPoints]
  );

  // 3 & 4. Velocity vs Time (with combined, Vx, Vy sub-options)
  const velocityData = useMemo(() => {
    const allDatasets = [
      {
        label: 'Total Speed |v| (m/s)',
        data: trajectoryPoints.map((p) => p.speed),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        tension: 0.2,
        pointRadius: 0,
      },
      {
        label: 'Horizontal Velocity Vx (m/s)',
        data: trajectoryPoints.map((p) => p.vx),
        borderColor: '#06b6d4',
        borderDash: [4, 4],
        tension: 0,
        pointRadius: 0,
      },
      {
        label: 'Vertical Velocity Vy (m/s)',
        data: trajectoryPoints.map((p) => p.vy),
        borderColor: '#ec4899',
        borderDash: [5, 5],
        tension: 0.2,
        pointRadius: 0,
      },
    ];

    if (velocitySubTab === 'vx') return { labels: tLabels, datasets: [allDatasets[1]] };
    if (velocitySubTab === 'vy') return { labels: tLabels, datasets: [allDatasets[2]] };
    return { labels: tLabels, datasets: allDatasets };
  }, [tLabels, trajectoryPoints, velocitySubTab]);

  // 5 & 6. Energy vs Time (with combined, KE, PE sub-options)
  const energyData = useMemo(() => {
    const allDatasets = [
      {
        label: 'Kinetic Energy KE(t) [J]',
        data: trajectoryPoints.map((p) => p.kinetic_energy),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        fill: energySubTab === 'ke',
        tension: 0.2,
        pointRadius: 0,
      },
      {
        label: 'Potential Energy PE(t) [J]',
        data: trajectoryPoints.map((p) => p.potential_energy),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: energySubTab === 'pe',
        tension: 0.2,
        pointRadius: 0,
      },
      {
        label: 'Total Mechanical Energy E_tot [J]',
        data: trajectoryPoints.map((p) => p.total_energy),
        borderColor: '#fbbf24',
        borderDash: [3, 3],
        tension: 0,
        pointRadius: 0,
      },
    ];

    if (energySubTab === 'ke') return { labels: tLabels, datasets: [allDatasets[0]] };
    if (energySubTab === 'pe') return { labels: tLabels, datasets: [allDatasets[1]] };
    return { labels: tLabels, datasets: allDatasets };
  }, [tLabels, trajectoryPoints, energySubTab]);

  const baseChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { family: 'monospace', size: 11 } },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#38bdf8',
          bodyColor: '#f1f5f9',
          borderColor: 'rgba(56, 189, 248, 0.3)',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b', font: { family: 'monospace', size: 10 }, maxTicksLimit: 12 },
          title: {
            display: true,
            text: activeTab === 'trajectory' ? 'Horizontal Distance (m)' : 'Time (seconds)',
            color: '#94a3b8',
            font: { family: 'monospace', size: 11 },
          },
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b', font: { family: 'monospace', size: 10 } },
          title: {
            display: true,
            text:
              activeTab === 'trajectory' || activeTab === 'height'
                ? 'Height (meters)'
                : activeTab === 'velocity'
                ? 'Velocity (m/s)'
                : 'Energy (Joules)',
            color: '#94a3b8',
            font: { family: 'monospace', size: 11 },
          },
        },
      },
    }),
    [activeTab]
  );

  const TABS = [
    { id: 'canvas', icon: Activity, label: '2D Trajectory Animation' },
    { id: 'trajectory', icon: LineChart, label: 'Trajectory (Y vs X)' },
    { id: 'height', icon: ArrowUpRight, label: 'Height vs Time' },
    { id: 'velocity', icon: Gauge, label: 'Velocity vs Time' },
    { id: 'energy', icon: Zap, label: 'Energy vs Time' },
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
      {/* ── Tab Navigation & Animation Controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 flex-wrap">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Animation Controls (Active on 2D Animation tab) */}
        {activeTab === 'canvas' && (
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={() => {
                if (progressRef.current >= 1) {
                  progressRef.current = 0;
                  setCurrentProgress(0);
                }
                setIsPlaying((p) => !p);
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-cyan-400" />
              ) : (
                <Play className="w-4 h-4 fill-slate-200" />
              )}
            </button>

            {/* Restart */}
            <button
              onClick={() => {
                progressRef.current = 0;
                setCurrentProgress(0);
                setIsPlaying(false);
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Reset Animation to Launch"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Speed Multipliers */}
            <div className="flex items-center gap-1 text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              {[0.25, 0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    playbackSpeed === s
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Live progress percentage */}
            <span className="text-xs font-mono text-slate-500 hidden sm:inline">
              {(currentProgress * 100).toFixed(0)}%
            </span>
          </div>
        )}

        {/* Sub-tabs for Velocity */}
        {activeTab === 'velocity' && (
          <div className="flex items-center gap-1 text-xs font-mono bg-slate-900 p-1 rounded-lg border border-slate-800">
            {[
              { id: 'all', label: 'All (|v|, Vx, Vy)' },
              { id: 'vx', label: 'Vx Only (m/s)' },
              { id: 'vy', label: 'Vy Only (m/s)' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setVelocitySubTab(st.id)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  velocitySubTab === st.id ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        )}

        {/* Sub-tabs for Energy */}
        {activeTab === 'energy' && (
          <div className="flex items-center gap-1 text-xs font-mono bg-slate-900 p-1 rounded-lg border border-slate-800">
            {[
              { id: 'all', label: 'All (KE, PE, Total)' },
              { id: 'ke', label: 'Kinetic Energy (J)' },
              { id: 'pe', label: 'Potential Energy (J)' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setEnergySubTab(st.id)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  energySubTab === st.id ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Main Display Viewport ── */}
      <div className="relative min-h-[380px] flex items-stretch bg-slate-950/70 rounded-xl overflow-hidden border border-slate-900">
        {activeTab === 'canvas' && (
          <canvas ref={canvasRef} className="w-full block" style={{ height: '380px' }} />
        )}

        {activeTab === 'trajectory' && (
          <div className="w-full h-[360px] p-4">
            <Line data={trajectoryChartData} options={baseChartOptions} key="chart-traj" />
          </div>
        )}

        {activeTab === 'height' && (
          <div className="w-full h-[360px] p-4">
            <Line data={heightTimeData} options={baseChartOptions} key="chart-height" />
          </div>
        )}

        {activeTab === 'velocity' && (
          <div className="w-full h-[360px] p-4">
            <Line data={velocityData} options={baseChartOptions} key={`chart-vel-${velocitySubTab}`} />
          </div>
        )}

        {activeTab === 'energy' && (
          <div className="w-full h-[360px] p-4">
            <Line data={energyData} options={baseChartOptions} key={`chart-eng-${energySubTab}`} />
          </div>
        )}
      </div>

      {/* ── Live Physics Summary Bar / Legend ── */}
      {theoretical && (
        <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/70 gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50"></span>
              <span>Theory Range: <strong className="text-white">{theoretical.theoretical_range} m</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
              <span>Max Height: <strong className="text-white">{theoretical.max_height} m</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Flight Time: <strong className="text-white">{theoretical.flight_time} s</strong></span>
            </div>
            {mlDistance !== null && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>AI Predicted Landing: <strong className="text-emerald-300">{mlDistance} m</strong></span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            {mlDistance !== null ? (
              <span className="text-emerald-400">Dual Mode: Live Theory + Machine Learning</span>
            ) : (
              <span className="text-cyan-400">⚡ Live Physics Preview (Vacuum Kinematics)</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
