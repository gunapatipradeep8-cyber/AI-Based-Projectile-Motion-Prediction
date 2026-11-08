import React, { useState, useEffect, useCallback, useId } from 'react';
import { predictDistance } from '../services/api';
import {
  PLANETS,
  PRESETS,
  CONSTRAINTS,
  DEFAULT_PARAMS,
  computeDerivedEnergies,
  calculateTheoreticalTrajectory,
} from '../services/physics';
import {
  Play,
  Sparkles,
  RefreshCw,
  RotateCcw,
  Sliders,
  Zap,
  AlertCircle,
  CheckCircle2,
  Info,
  Globe2,
} from 'lucide-react';

export default function ProjectileSimulator({
  onSimulationSuccess,
  onLivePhysicsChange,
  onResetSimulation,
  isSimulating,
  setIsSimulating,
}) {
  // Primary physical parameters
  const [mass, setMass] = useState(DEFAULT_PARAMS.mass);
  const [velocity, setVelocity] = useState(DEFAULT_PARAMS.velocity);
  const [height, setHeight] = useState(DEFAULT_PARAMS.height);
  const [gravity, setGravity] = useState(DEFAULT_PARAMS.gravity);
  const [angle, setAngle] = useState(DEFAULT_PARAMS.angle);

  // Energy & Force features (Auto-computed from fundamental mechanics or manual override)
  const [autoSync, setAutoSync] = useState(true);
  const [energies, setEnergies] = useState(() =>
    computeDerivedEnergies(DEFAULT_PARAMS.mass, DEFAULT_PARAMS.velocity, DEFAULT_PARAMS.height, DEFAULT_PARAMS.gravity)
  );

  const [activePlanet, setActivePlanet] = useState('earth');
  const [activePreset, setActivePreset] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [lastSuccess, setLastSuccess] = useState(false);

  // ── Emit real-time live physics calculation on any parameter change ─────────
  const updateLivePhysics = useCallback(
    (m, v, h, g, a, currentEnergies) => {
      const theoretical = calculateTheoreticalTrajectory({
        mass: m,
        velocity: v,
        height: h,
        gravity: g,
        angle: a,
      });

      if (onLivePhysicsChange) {
        onLivePhysicsChange({
          theoretical,
          params: { mass: m, velocity: v, height: h, gravity: g, angle: a },
          energies: currentEnergies || computeDerivedEnergies(m, v, h, g),
        });
      }
    },
    [onLivePhysicsChange]
  );

  // Initial mount: push default physics
  useEffect(() => {
    updateLivePhysics(mass, velocity, height, gravity, angle, energies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update energies & live physics when base kinematics parameters change
  useEffect(() => {
    let nextEnergies = energies;
    if (autoSync) {
      nextEnergies = computeDerivedEnergies(mass, velocity, height, gravity);
      setEnergies(nextEnergies);
    }
    updateLivePhysics(mass, velocity, height, gravity, angle, nextEnergies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mass, velocity, height, gravity, angle, autoSync]);

  // Determine active planet preset from gravity value
  useEffect(() => {
    const matched = PLANETS.find((p) => Math.abs(p.gravity - gravity) < 0.05);
    setActivePlanet(matched ? matched.id : null);
  }, [gravity]);

  // ── Apply planet preset ─────────────────────────────────────────────────────
  const selectPlanet = (planet) => {
    setGravity(planet.gravity);
    setActivePlanet(planet.id);
    setFieldErrors((prev) => ({ ...prev, gravity: undefined }));
  };

  // ── Apply quick preset scenario ─────────────────────────────────────────────
  const applyPreset = (preset) => {
    setActivePreset(preset.name);
    const { values } = preset;
    setMass(values.mass);
    setVelocity(values.velocity);
    setHeight(values.height);
    setGravity(values.gravity);
    setAngle(values.launch_angle);
    setAutoSync(true);
    setFieldErrors({});
    setApiError('');
    setLastSuccess(false);

    const newEnergies = computeDerivedEnergies(values.mass, values.velocity, values.height, values.gravity);
    setEnergies(newEnergies);
    updateLivePhysics(values.mass, values.velocity, values.height, values.gravity, values.launch_angle, newEnergies);
  };

  // ── Reset to standard defaults ──────────────────────────────────────────────
  const handleReset = () => {
    setMass(DEFAULT_PARAMS.mass);
    setVelocity(DEFAULT_PARAMS.velocity);
    setHeight(DEFAULT_PARAMS.height);
    setGravity(DEFAULT_PARAMS.gravity);
    setAngle(DEFAULT_PARAMS.angle);
    setAutoSync(true);
    setActivePlanet('earth');
    setActivePreset(null);
    setFieldErrors({});
    setApiError('');
    setLastSuccess(false);

    const defaultEnergies = computeDerivedEnergies(
      DEFAULT_PARAMS.mass,
      DEFAULT_PARAMS.velocity,
      DEFAULT_PARAMS.height,
      DEFAULT_PARAMS.gravity
    );
    setEnergies(defaultEnergies);
    updateLivePhysics(
      DEFAULT_PARAMS.mass,
      DEFAULT_PARAMS.velocity,
      DEFAULT_PARAMS.height,
      DEFAULT_PARAMS.gravity,
      DEFAULT_PARAMS.angle,
      defaultEnergies
    );

    if (onResetSimulation) onResetSimulation();
  };

  // ── Form validation ─────────────────────────────────────────────────────────
  const validateInputs = () => {
    const errors = {};
    const m = parseFloat(mass);
    const v = parseFloat(velocity);
    const h = parseFloat(height);
    const g = parseFloat(gravity);
    const a = parseFloat(angle);

    if (isNaN(m) || m < CONSTRAINTS.mass.min || m > CONSTRAINTS.mass.max) {
      errors.mass = `Mass must be between ${CONSTRAINTS.mass.min} and ${CONSTRAINTS.mass.max} kg`;
    }
    if (isNaN(v) || v < CONSTRAINTS.velocity.min || v > CONSTRAINTS.velocity.max) {
      errors.velocity = `Velocity must be between ${CONSTRAINTS.velocity.min} and ${CONSTRAINTS.velocity.max} m/s`;
    }
    if (isNaN(h) || h < CONSTRAINTS.height.min || h > CONSTRAINTS.height.max) {
      errors.height = `Height must be between ${CONSTRAINTS.height.min} and ${CONSTRAINTS.height.max} m`;
    }
    if (isNaN(g) || g < CONSTRAINTS.gravity.min || g > CONSTRAINTS.gravity.max) {
      errors.gravity = `Gravity must be between ${CONSTRAINTS.gravity.min} and ${CONSTRAINTS.gravity.max} m/s²`;
    }
    if (isNaN(a) || a < CONSTRAINTS.angle.min || a > CONSTRAINTS.angle.max) {
      errors.angle = `Launch angle must be between ${CONSTRAINTS.angle.min}° and ${CONSTRAINTS.angle.max}°`;
    }

    return errors;
  };

  // ── Run AI Prediction using the trained Random Forest model ────────────────
  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    setApiError('');
    setLastSuccess(false);

    const errors = validateInputs();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSimulating(true);

    try {
      const derived = autoSync
        ? computeDerivedEnergies(mass, velocity, height, gravity)
        : energies;

      const payload = {
        mass: parseFloat(mass),
        velocity: parseFloat(velocity),
        height: parseFloat(height),
        gravity: parseFloat(gravity),
        force: derived.force,
        kinetic_energy: derived.kinetic_energy,
        potential_energy: derived.potential_energy,
        total_energy: derived.total_energy,
        work_done: derived.work_done,
        launch_angle: parseFloat(angle),
        save_to_history: true,
      };

      const result = await predictDistance(payload);

      if (result && result.success) {
        setLastSuccess(true);
        if (onSimulationSuccess) onSimulationSuccess(result);
      } else {
        setApiError('Unexpected response from prediction service.');
      }
    } catch (err) {
      console.error('[Simulator] Prediction error:', err);
      const detail =
        err.response?.data?.detail ||
        err.message ||
        'Could not contact the backend. Ensure FastAPI is running on port 8000.';
      setApiError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setIsSimulating(false);
    }
  };

  // ── Interactive Synchronized Slider & Numeric Input Component ──────────────
  const InteractiveSlider = ({
    constraint,
    value,
    onChange,
    error,
    accentClass = 'accent-cyan-400',
    badgeText,
    extraContent,
  }) => {
    const inputId = useId();

    const handleNumberChange = (e) => {
      const raw = e.target.value;
      if (raw === '') {
        onChange('');
        return;
      }
      const val = parseFloat(raw);
      if (!isNaN(val)) {
        onChange(val);
      }
    };

    const handleNumberBlur = () => {
      let val = parseFloat(value);
      if (isNaN(val)) val = constraint.min;
      if (val < constraint.min) val = constraint.min;
      if (val > constraint.max) val = constraint.max;
      onChange(parseFloat(val.toFixed(constraint.decimals)));
    };

    return (
      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between">
        <div>
          {/* Top Row: Label and Editable Number Input */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <label htmlFor={inputId} className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <span>{constraint.label}</span>
            </label>

            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/50 transition-all">
              <input
                id={inputId}
                type="number"
                min={constraint.min}
                max={constraint.max}
                step={constraint.step}
                value={value}
                onChange={handleNumberChange}
                onBlur={handleNumberBlur}
                className="w-20 bg-transparent text-right font-mono text-xs font-bold text-cyan-300 focus:outline-none"
                aria-label={constraint.label}
              />
              <span className="text-[11px] font-mono text-slate-400 font-medium">{constraint.unit}</span>
            </div>
          </div>

          {/* Slider element */}
          <div className="relative py-1">
            <input
              type="range"
              min={constraint.min}
              max={constraint.max}
              step={constraint.step}
              value={typeof value === 'number' ? value : constraint.min}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              className={`w-full ${accentClass} h-2 bg-slate-800 rounded-lg cursor-pointer transition-all focus:outline-none`}
              aria-label={`${constraint.label} slider`}
            />
          </div>

          {/* Min / Max Range Markers */}
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1">
            <span>Min: {constraint.min} {constraint.unit}</span>
            {badgeText && <span className="text-slate-400 font-normal">{badgeText}</span>}
            <span>Max: {constraint.max} {constraint.unit}</span>
          </div>
        </div>

        {/* Optional Extra Content (e.g. planet buttons or educational notes) */}
        {extraContent && <div className="mt-2.5 pt-2.5 border-t border-slate-800/60">{extraContent}</div>}

        {/* Validation error */}
        {error && (
          <p className="text-[10px] text-red-400 flex items-center gap-1 mt-1.5">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-cyan-400" />
            Simulation Parameters & Physical Sliders
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Move any slider or enter numbers manually to update the live physics trajectory, velocity vectors, and graphs instantly.
          </p>
        </div>

        {/* Auto-Compute Energy Toggle */}
        <button
          type="button"
          onClick={() => setAutoSync(!autoSync)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${
            autoSync
              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title="Toggle automatic calculation of kinetic, potential, and total energy from mass, velocity & height"
        >
          <Zap className={`w-3.5 h-3.5 ${autoSync ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
          <span>Auto-Compute Energy: <strong>{autoSync ? 'ON' : 'MANUAL'}</strong></span>
        </button>
      </div>

      {/* ── Quick Preset Scenarios ── */}
      <div>
        <label className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-2 font-medium">
          Quick Preset Scenarios
        </label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESETS.map((p, idx) => {
            const isSelected = activePreset === p.name;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                disabled={isSimulating}
                className={`text-left p-3 rounded-xl transition-all duration-300 group disabled:opacity-50 ${
                  isSelected
                    ? 'bg-slate-950 border border-cyan-400/80 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30'
                    : 'bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                <div
                  className={`text-xs font-semibold transition-colors ${
                    isSelected ? 'text-cyan-300 font-bold' : 'text-slate-200 group-hover:text-cyan-300'
                  }`}
                >
                  {p.name}
                </div>
                <div
                  className={`text-[10px] truncate mt-0.5 transition-colors ${
                    isSelected ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {p.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Form with Sliders & Controls ── */}
      <form onSubmit={handlePredict} noValidate className="space-y-6">
        {/* Section 1: Core Kinematics Parameters */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              1. Core Kinematics Parameters
            </h3>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              Adjust sliders or type directly in number inputs
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Projectile Mass */}
            <InteractiveSlider
              constraint={CONSTRAINTS.mass}
              value={mass}
              onChange={setMass}
              error={fieldErrors.mass}
              badgeText={`Ball: ${(mass * 1000).toFixed(0)}g`}
              extraContent={
                <div className="flex items-start gap-1.5 text-[10px] text-slate-400 leading-snug">
                  <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Galileo's Invariance:</strong> In a vacuum ($F=ma=mg$), mass scales energy and force ($F=mg$), but ideal trajectory is invariant with mass.
                  </span>
                </div>
              }
            />

            {/* 2. Launch Velocity */}
            <InteractiveSlider
              constraint={CONSTRAINTS.velocity}
              value={velocity}
              onChange={setVelocity}
              error={fieldErrors.velocity}
              badgeText={`Speed: ${(velocity * 3.6).toFixed(1)} km/h`}
              extraContent={
                <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
                  <span>Horizontal Vx: {(velocity * Math.cos((angle * Math.PI) / 180)).toFixed(1)} m/s</span>
                  <span>Vertical Vy: {(velocity * Math.sin((angle * Math.PI) / 180)).toFixed(1)} m/s</span>
                </div>
              }
            />

            {/* 3. Release Height */}
            <InteractiveSlider
              constraint={CONSTRAINTS.height}
              value={height}
              onChange={setHeight}
              error={fieldErrors.height}
              badgeText={height === 0 ? 'Ground release' : `Elevated: +${height}m`}
              extraContent={
                <div className="text-[10px] text-slate-400 font-mono">
                  {height === 0
                    ? 'Flat ground launch (h₀ = 0m)'
                    : `Release elevation adds potential energy and extends flight time.`}
                </div>
              }
            />

            {/* 4. Launch Angle */}
            <InteractiveSlider
              constraint={CONSTRAINTS.angle}
              value={angle}
              onChange={setAngle}
              error={fieldErrors.angle}
              accentClass="accent-purple-400"
              badgeText={angle === 45 ? 'Optimal (flat)' : angle === 0 ? 'Horizontal' : angle === 90 ? 'Vertical' : `${angle}°`}
              extraContent={
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>0° Horizontal</span>
                  <span className="text-purple-300 font-semibold">45° Peak Range</span>
                  <span>90° Vertical</span>
                </div>
              }
            />

            {/* 5. Gravitational Acceleration (with Planet Selection Buttons) */}
            <div className="md:col-span-2 lg:col-span-2">
              <InteractiveSlider
                constraint={CONSTRAINTS.gravity}
                value={gravity}
                onChange={setGravity}
                error={fieldErrors.gravity}
                badgeText={`Environment: ${
                  activePlanet ? activePlanet.toUpperCase() : 'Custom Gravity'
                }`}
                extraContent={
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Globe2 className="w-3 h-3 text-cyan-400" />
                        Planetary Gravity Environments:
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {PLANETS.map((planet) => {
                        const isSelected = activePlanet === planet.id;
                        return (
                          <button
                            key={planet.id}
                            type="button"
                            onClick={() => selectPlanet(planet)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                              isSelected
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm shadow-cyan-500/20 font-bold'
                                : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span>{planet.icon}</span>
                              <span>{planet.name}</span>
                            </span>
                            <span className="text-[10px] opacity-80">{planet.gravity}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </div>

        {/* Section 2: Energy & Force Model Features (ML Inputs) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              2. Energy & Force Model Features (Scikit-Learn Random Forest Inputs)
            </h3>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3" />
              {autoSync ? 'Live calculated from mass & velocity' : 'Manual feature override active'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { key: 'force', label: 'Force (F = m·g)', unit: 'N', formula: 'Weight force' },
              { key: 'kinetic_energy', label: 'Kinetic Energy (KE)', unit: 'J', formula: '½ · m · v₀²' },
              { key: 'potential_energy', label: 'Potential Energy (PE)', unit: 'J', formula: 'm · g · h₀' },
              { key: 'total_energy', label: 'Total Energy (E_tot)', unit: 'J', formula: 'KE + PE' },
              { key: 'work_done', label: 'Work Done (W)', unit: 'J', formula: 'Acceleration work' },
            ].map(({ key, label, unit, formula }) => (
              <div key={key} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <label className="text-[11px] text-slate-300 block font-medium truncate mb-0.5">
                    {label}
                  </label>
                  <span className="text-[9px] text-slate-500 font-mono block mb-1.5">{formula}</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-800">
                  <input
                    type="number"
                    step="any"
                    disabled={autoSync}
                    value={energies[key] ?? 0}
                    onChange={(e) =>
                      setEnergies((prev) => ({
                        ...prev,
                        [key]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-transparent text-right font-mono text-xs font-bold text-indigo-300 focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API Error Notification */}
        {apiError && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <div>
              <strong>Simulation Error:</strong> {apiError}
              <p className="mt-0.5 text-red-300/80 text-[11px]">
                Verify that the FastAPI backend server is active at <code>http://127.0.0.1:8000</code>.
              </p>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {lastSuccess && !apiError && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              Prediction executed successfully! Trajectory comparison & AI results are displayed below.
            </span>
          </div>
        )}

        {/* Action Buttons: Reset & Predict */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              Original Model: <strong>RandomForestRegressor (projectile_model.pkl)</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Reset Button */}
            <button
              type="button"
              onClick={handleReset}
              disabled={isSimulating}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-slate-300 bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50"
              title="Reset all sliders and calculations to standard defaults"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Defaults</span>
            </button>

            {/* Predict Button */}
            <button
              type="submit"
              disabled={isSimulating}
              className="flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-400 hover:from-cyan-300 hover:to-purple-300 shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Running Random Forest Prediction...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Predict Projectile Distance</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
