/**
 * Projectile Motion Kinematics & Physics Engine
 * Real-time theoretical physics calculations matching Newtonian mechanics in vacuum.
 */

export const STANDARD_GRAVITY = 9.81;

export const PLANETS = [
  { id: 'moon', name: 'Moon', gravity: 1.62, icon: '🌕', desc: '0.17g' },
  { id: 'mars', name: 'Mars', gravity: 3.72, icon: '🪐', desc: '0.38g' },
  { id: 'earth', name: 'Earth', gravity: 9.81, icon: '🌍', desc: '1.00g' },
  { id: 'jupiter', name: 'Jupiter', gravity: 24.79, icon: '⚡', desc: '2.53g' },
];

export const PRESETS = [
  {
    name: 'Basketball Standard',
    desc: 'NBA regulation shot at ~2.1 m elevation',
    values: { mass: 0.62, velocity: 8.5, height: 2.1, gravity: 9.81, launch_angle: 48 },
  },
  {
    name: 'Long-Range Arc',
    desc: 'Deep three-point arc velocity and angle',
    values: { mass: 0.62, velocity: 14.0, height: 2.0, gravity: 9.81, launch_angle: 45 },
  },
  {
    name: 'Heavy Shot Put',
    desc: '7.26 kg metal ball, high launch force',
    values: { mass: 7.26, velocity: 13.5, height: 1.8, gravity: 9.81, launch_angle: 38 },
  },
  {
    name: 'Lunar Gravity',
    desc: 'Low gravity on the Moon (g = 1.62 m/s²)',
    values: { mass: 0.62, velocity: 10.0, height: 1.5, gravity: 1.62, launch_angle: 45 },
  },
];

export const CONSTRAINTS = {
  mass: {
    min: 0.05,
    max: 50.0,
    step: 0.01,
    decimals: 2,
    unit: 'kg',
    label: 'Projectile Mass (m)',
    symbol: 'm',
    hint: '0.05 – 50.0 kg',
  },
  velocity: {
    min: 0.1,
    max: 100.0,
    step: 0.1,
    decimals: 1,
    unit: 'm/s',
    label: 'Launch Velocity (v₀)',
    symbol: 'v₀',
    hint: '0.1 – 100.0 m/s',
  },
  height: {
    min: 0.0,
    max: 50.0,
    step: 0.1,
    decimals: 1,
    unit: 'm',
    label: 'Release Height (h₀)',
    symbol: 'h₀',
    hint: '0.0 – 50.0 m',
  },
  gravity: {
    min: 0.1,
    max: 30.0,
    step: 0.01,
    decimals: 2,
    unit: 'm/s²',
    label: 'Gravitational Acceleration (g)',
    symbol: 'g',
    hint: '0.1 – 30.0 m/s²',
  },
  angle: {
    min: 0,
    max: 90,
    step: 1,
    decimals: 0,
    unit: '°',
    label: 'Launch Angle (θ)',
    symbol: 'θ',
    hint: '0° – 90°',
  },
};

export const DEFAULT_PARAMS = {
  mass: 0.62,
  velocity: 12.5,
  height: 2.0,
  gravity: 9.81,
  angle: 45,
};

/**
 * Computes energy and force features from fundamental mechanics.
 */
export function computeDerivedEnergies(mass, velocity, height, gravity) {
  const m = Math.max(0.001, Number(mass) || 0.001);
  const v = Math.max(0.0, Number(velocity) || 0.0);
  const h = Math.max(0.0, Number(height) || 0.0);
  const g = Math.max(0.01, Number(gravity) || STANDARD_GRAVITY);

  const ke = 0.5 * m * v * v;
  const pe = m * g * h;
  const total = ke + pe;
  const force = m * g;
  const work = ke;

  return {
    force: parseFloat(force.toFixed(4)),
    kinetic_energy: parseFloat(ke.toFixed(4)),
    potential_energy: parseFloat(pe.toFixed(4)),
    total_energy: parseFloat(total.toFixed(4)),
    work_done: parseFloat(work.toFixed(4)),
  };
}

/**
 * Computes exact theoretical kinematics, trajectory coordinates, and dynamics.
 */
export function calculateTheoreticalTrajectory({
  velocity = DEFAULT_PARAMS.velocity,
  angle = DEFAULT_PARAMS.angle,
  height = DEFAULT_PARAMS.height,
  gravity = DEFAULT_PARAMS.gravity,
  mass = DEFAULT_PARAMS.mass,
  pointsCount = 80,
}) {
  const g = Math.max(0.01, Number(gravity) || STANDARD_GRAVITY);
  const v0 = Math.max(0.0, Number(velocity) || 0.0);
  const thetaDeg = Math.min(90.0, Math.max(0.0, Number(angle) || 0.0));
  const h0 = Math.max(0.0, Number(height) || 0.0);
  const m = Math.max(0.001, Number(mass) || 1.0);

  const thetaRad = (thetaDeg * Math.PI) / 180.0;
  const v0x = thetaDeg === 90 ? 0.0 : v0 * Math.cos(thetaRad);
  const v0y = thetaDeg === 0 ? 0.0 : v0 * Math.sin(thetaRad);

  // Time of flight: h0 + v0y*t - 0.5*g*t^2 = 0 => 0.5*g*t^2 - v0y*t - h0 = 0
  const discriminant = v0y * v0y + 2.0 * g * h0;
  let flightTime = 0.0;
  if (discriminant >= 0) {
    flightTime = (v0y + Math.sqrt(discriminant)) / g;
  }
  if (!isFinite(flightTime) || flightTime < 0) flightTime = 0.0;

  // Maximum height above launch and above ground
  const timeToPeak = v0y > 0 ? v0y / g : 0.0;
  const hPeakAboveLaunch = v0y > 0 ? (v0y * v0y) / (2.0 * g) : 0.0;
  const maxHeight = h0 + hPeakAboveLaunch;

  // Theoretical horizontal range
  const theoreticalRange = v0x * flightTime;

  // Energies at launch
  const energies = computeDerivedEnergies(m, v0, h0, g);

  // Discrete trajectory points for charts & canvas animation
  const trajectory = [];
  const count = Math.max(2, pointsCount);

  if (flightTime > 0) {
    const dt = flightTime / (count - 1);
    for (let i = 0; i < count; i++) {
      const t = Math.min(flightTime, i * dt);
      const x = v0x * t;
      const y = Math.max(0.0, h0 + v0y * t - 0.5 * g * t * t);
      const vx = v0x;
      const vy = v0y - g * t;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const ke = 0.5 * m * (speed * speed);
      const pe = m * g * y;
      const totalE = ke + pe;

      trajectory.push({
        time: parseFloat(t.toFixed(3)),
        x: parseFloat(x.toFixed(3)),
        y: parseFloat(y.toFixed(3)),
        vx: parseFloat(vx.toFixed(3)),
        vy: parseFloat(vy.toFixed(3)),
        speed: parseFloat(speed.toFixed(3)),
        kinetic_energy: parseFloat(ke.toFixed(3)),
        potential_energy: parseFloat(pe.toFixed(3)),
        total_energy: parseFloat(totalE.toFixed(3)),
      });
    }
  } else {
    trajectory.push({
      time: 0.0,
      x: 0.0,
      y: parseFloat(h0.toFixed(3)),
      vx: parseFloat(v0x.toFixed(3)),
      vy: parseFloat(v0y.toFixed(3)),
      speed: parseFloat(v0.toFixed(3)),
      kinetic_energy: parseFloat(energies.kinetic_energy.toFixed(3)),
      potential_energy: parseFloat(energies.potential_energy.toFixed(3)),
      total_energy: parseFloat(energies.total_energy.toFixed(3)),
    });
  }

  return {
    theoretical_range: parseFloat(theoreticalRange.toFixed(4)),
    max_height: parseFloat(maxHeight.toFixed(4)),
    flight_time: parseFloat(flightTime.toFixed(4)),
    time_to_peak: parseFloat(timeToPeak.toFixed(4)),
    initial_vx: parseFloat(v0x.toFixed(4)),
    initial_vy: parseFloat(v0y.toFixed(4)),
    launch_angle_deg: parseFloat(thetaDeg.toFixed(2)),
    launch_height: parseFloat(h0.toFixed(2)),
    gravity: parseFloat(g.toFixed(4)),
    mass: parseFloat(m.toFixed(4)),
    ...energies,
    trajectory,
  };
}

