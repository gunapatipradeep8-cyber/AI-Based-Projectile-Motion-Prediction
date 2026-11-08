import React from 'react';
import { Target, Compass, Clock, ArrowUp, Sparkles, HelpCircle, CheckCircle2, Zap } from 'lucide-react';

export default function PredictionResults({ results, livePhysics, onAskTutor }) {
  // If no ML prediction has been performed yet, show the Live Physics Preview cards
  if (!results || !results.success) {
    const theo = livePhysics || {};
    const range = theo.theoretical_range ?? 0;
    const rangeFt = (range * 3.28084).toFixed(2);

    return (
      <div className="space-y-4 animate-fadeIn">
        {/* Live Physics Preview Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 via-sky-950/30 to-slate-900/90 p-6 sm:p-7 border border-cyan-500/30 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 mb-2.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Physics Preview &bull; Newtonian Vacuum Kinematics</span>
              </div>
              <h3 className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                Calculated Theoretical Range (R)
              </h3>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-300 to-white font-mono">
                  {range}
                </span>
                <span className="text-xl font-bold text-cyan-400">meters</span>
                <span className="text-xs font-mono text-slate-400">({rangeFt} ft)</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 max-w-lg">
                Recalculated dynamically as you move the sliders. Click{' '}
                <strong className="text-slate-200">"Predict Projectile Distance"</strong> above to run your trained
                Random Forest ML model.
              </p>
            </div>

            {/* Quick Kinematics Summary */}
            <div className="glass-panel p-4 rounded-xl border border-slate-700/70 min-w-[210px] space-y-2">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Kinematics Overview
              </div>
              <div className="text-xs text-slate-300 font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Height:</span>
                  <span className="text-white font-bold">{theo.max_height ?? '0.0'} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Flight Time:</span>
                  <span className="text-white font-bold">{theo.flight_time ?? '0.0'} s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Energy:</span>
                  <span className="text-indigo-300 font-bold">{theo.total_energy ?? '0.0'} J</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Max Height (H_max)</span>
              <ArrowUp className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-white">
              {theo.max_height ?? '0.0'} <span className="text-xs text-slate-400 font-normal">m</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Time to peak: {theo.time_to_peak ?? '0.0'}s
            </span>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Flight Time (t_flight)</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-white">
              {theo.flight_time ?? '0.0'} <span className="text-xs text-slate-400 font-normal">s</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Total air travel duration
            </span>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Horizontal Velocity (Vx)</span>
              <Compass className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-white">
              {theo.initial_vx ?? '0.0'} <span className="text-xs text-slate-400 font-normal">m/s</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Constant horizontal motion (ax = 0)
            </span>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Initial Vertical (v0y)</span>
              <Compass className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-white">
              {theo.initial_vy ?? '0.0'} <span className="text-xs text-slate-400 font-normal">m/s</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              Decelerates by gravity g
            </span>
          </div>
        </div>
      </div>
    );
  }

  // When ML prediction results are present:
  const ml = results.ml_prediction || {};
  const theo = livePhysics || results.theoretical_physics || {};
  const comp = results.comparison || {};

  const mlDistanceM = ml.predicted_distance ?? 0;
  const mlDistanceFt = (mlDistanceM * 3.28084).toFixed(2);
  const theoRangeM = theo.theoretical_range ?? results.theoretical_physics?.theoretical_range ?? 0;
  const differenceM = Math.abs(mlDistanceM - theoRangeM).toFixed(3);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner: Primary ML Target Output */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-sky-950/40 to-purple-950/40 p-6 sm:p-8 border border-cyan-500/30 shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Target className="w-36 h-36 text-cyan-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Machine Learning Output &bull; {ml.model_name || 'RandomForestRegressor'}</span>
            </div>
            <h3 className="text-sm uppercase tracking-wider text-slate-400 font-medium">
              Predicted Projectile Distance
            </h3>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-300 to-white font-mono">
                {mlDistanceM}
              </span>
              <span className="text-2xl font-bold text-cyan-400">meters</span>
              <span className="text-sm font-mono text-slate-400">({mlDistanceFt} ft)</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 max-w-lg">
              Predicted directly by the trained 100-tree Random Forest model using the 9 physical & energy features.
            </p>
          </div>

          {/* Quick Comparison Card */}
          <div className="glass-panel p-4 rounded-xl border border-slate-700/80 min-w-[220px]">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Theoretical Ideal Range
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {theoRangeM} <span className="text-xs text-slate-400 font-normal">m</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Difference:</span>
              <span className="font-mono text-purple-300 font-bold">&Delta; {differenceM} m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Theoretical Kinematics Breakdown Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Maximum Height */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Max Height (H_max)</span>
            <ArrowUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {theo.max_height ?? '0.0'} <span className="text-xs text-slate-400 font-normal">m</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Time to peak: {theo.time_to_peak ?? '0.0'}s
          </span>
        </div>

        {/* Flight Time */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Flight Time (t_flight)</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {theo.flight_time ?? '0.0'} <span className="text-xs text-slate-400 font-normal">s</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Total air travel duration
          </span>
        </div>

        {/* Horizontal Velocity */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Horizontal Velocity (Vx)</span>
            <Compass className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {theo.initial_vx ?? '0.0'} <span className="text-xs text-slate-400 font-normal">m/s</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Constant without drag (ax = 0)
          </span>
        </div>

        {/* Initial Vertical Velocity */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Vertical Velocity (v0y)</span>
            <Compass className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {theo.initial_vy ?? '0.0'} <span className="text-xs text-slate-400 font-normal">m/s</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Decelerates by gravity g
          </span>
        </div>
      </div>

      {/* Physics Insight & Comparison Explainer */}
      <div className="glass-panel p-4 sm:p-5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <strong>Physics Insight:</strong>{' '}
            {comp.note ||
              'The machine learning model captures physical energy and empirical drag dynamics, while the theoretical calculation assumes an ideal zero-drag vacuum environment.'}
          </div>
        </div>

        {onAskTutor && (
          <button
            type="button"
            onClick={() =>
              onAskTutor(
                `Explain my prediction results: The ML model predicted ${mlDistanceM}m while theoretical range is ${theoRangeM}m.`
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-300 bg-purple-950/60 border border-purple-500/30 hover:bg-purple-900/50 transition-all flex-shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
            <span>Ask AI Tutor to Explain</span>
          </button>
        )}
      </div>
    </div>
  );
}
