import React from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero.jsx';
import {
  Activity,
  BookOpen,
  Cpu,
  Target,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Dna,
  Layers,
  Compass,
} from 'lucide-react';

export default function Home() {
  const objectives = [
    {
      title: 'Real-World Kinematic Modeling',
      desc: 'Bridge theoretical parabolic equations with real-world empirical resistance using machine learning regression on basketball trajectory data.',
      icon: Target,
      color: 'text-cyan-400',
    },
    {
      title: 'Ensemble Learning Architecture',
      desc: 'Leverage 100 Scikit-Learn Decision Trees in an optimized Random Forest Regressor trained on 9 physical energy and dynamic parameters.',
      icon: Cpu,
      color: 'text-sky-400',
    },
    {
      title: 'Dual Comparison Engine',
      desc: 'Simultaneously compute pure Newtonian theoretical range and machine learning predicted distance to analyze real-world deviations.',
      icon: Layers,
      color: 'text-purple-400',
    },
    {
      title: 'AI-Powered Interactive Tutoring',
      desc: 'Interactive physics doubt clarification, step-by-step mathematical derivations, and contextual explanations powered by AI.',
      icon: Sparkles,
      color: 'text-emerald-400',
    },
  ];

  const applications = [
    {
      title: 'Sports Science & Basketball',
      desc: 'Trajectory optimization for basketball shooting arcs, release elevations, and entry angles to maximize shot success probabilities.',
      tag: 'Biomechanics',
    },
    {
      title: 'Ballistics & Defense Engineering',
      desc: 'Accurate estimation of projectile impact distances, kinetic energy transfer, and gravitational arc adjustments.',
      tag: 'Aerospace & Defense',
    },
    {
      title: 'Astrophysics & Space Science',
      desc: 'Simulating gravitational accelerations on other celestial bodies such as the Moon (1.62 m/s²) and Mars (3.72 m/s²).',
      tag: 'Planetary Science',
    },
    {
      title: 'Interactive STEM Education',
      desc: 'College-level laboratory demonstrations allowing students to visualize independent velocity vectors, peak heights, and energy conservation.',
      tag: 'Higher Education',
    },
  ];

  return (
    <div className="space-y-16 pb-12">
      {/* Animated Landing Hero */}
      <Hero />

      {/* Project Objectives Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 mb-3">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Academic Physics Research</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Core Project Objectives
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base">
            Designed for physics students and educators to explore how modern AI models learn physical laws from empirical kinematics datasets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {objectives.map((obj, i) => {
            const Icon = obj.icon;
            return (
              <div
                key={i}
                className="glass-card p-6 rounded-2xl flex flex-col justify-between hover:-translate-y-1 transition-all duration-300"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-5">
                    <Icon className={`w-6 h-6 ${obj.color}`} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{obj.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{obj.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How Machine Learning Works in Projectile Prediction */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-slate-800/90 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-purple-950/60 border border-purple-500/30 text-purple-300 mb-4">
                <Dna className="w-3.5 h-3.5 text-purple-400" />
                <span>Model Intelligence</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Why Use AI When Classical Formulas Exist?
              </h2>
              <div className="mt-4 space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>
                  Classical theoretical projectile formulas such as <code className="text-cyan-300 font-mono">R = (v² sin 2θ) / g</code> assume ideal laboratory conditions: perfect point-masses in zero-drag vacuums on flat ground.
                </p>
                <p>
                  In real-world environments like athletic basketball launches, projectiles experience air resistance, rotational spin Magnus forces, release elevation offsets, and energy dissipation.
                </p>
                <p>
                  Our trained <strong className="text-white">Random Forest Regressor</strong> learns the complex nonlinear mapping from mass, release speed, launch height, and total mechanical work done directly to actual landing distance.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/simulator"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 shadow-md shadow-cyan-500/20"
                >
                  <Activity className="w-4 h-4 text-slate-950" />
                  <span>Try Interactive Simulator</span>
                </Link>
                <Link
                  to="/about"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800"
                >
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>Inspect Model Weights</span>
                </Link>
              </div>
            </div>

            {/* Feature Matrix Card */}
            <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-sm font-mono uppercase tracking-wider text-cyan-400 font-bold border-b border-slate-800 pb-2">
                9 Trained Physical Features
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
                  <div className="text-slate-400">1. Mass (m)</div>
                  <div className="text-white font-bold mt-1">Kilograms [kg]</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
                  <div className="text-slate-400">2. Velocity (v)</div>
                  <div className="text-white font-bold mt-1">Meters/sec [m/s]</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
                  <div className="text-slate-400">3. Height (h)</div>
                  <div className="text-white font-bold mt-1">Release Height [m]</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
                  <div className="text-slate-400">4. Gravity (g)</div>
                  <div className="text-white font-bold mt-1">Acceleration [m/s²]</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
                  <div className="text-slate-400">5. Force (F)</div>
                  <div className="text-white font-bold mt-1">Newtons [N]</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
                  <div className="text-slate-400">6. Kinetic Energy</div>
                  <div className="text-white font-bold mt-1">0.5 m v² [Joules]</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
                  <div className="text-slate-400">7. Potential Energy</div>
                  <div className="text-white font-bold mt-1">m g h [Joules]</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
                  <div className="text-slate-400">8. Total Energy</div>
                  <div className="text-white font-bold mt-1">KE + PE [Joules]</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 col-span-2">
                  <div className="text-slate-400">9. Work Done (W)</div>
                  <div className="text-white font-bold mt-1">Mechanical Work Done [Joules]</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real-World Applications */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Real-World Applications</h2>
          <p className="mt-2 text-slate-400 text-sm">Where physics kinematics and machine learning converge</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {applications.map((app, i) => (
            <div key={i} className="glass-card p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-sky-950 text-cyan-300 border border-sky-800/60 inline-block mb-3">
                  {app.tag}
                </span>
                <h3 className="text-base font-bold text-white mb-2">{app.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{app.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-sky-900/60 via-purple-900/50 to-slate-900/80 p-8 sm:p-12 border border-slate-700/80 text-center relative overflow-hidden">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to Run Your First Projectile Prediction?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8">
            Access the full scientific dashboard, tweak launch velocity and elevation, view live 2D parabolic animations, and export your simulation history to CSV and PDF.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/simulator"
              className="px-8 py-3.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 shadow-xl shadow-cyan-500/25 transition-all text-sm sm:text-base flex items-center gap-2"
            >
              <Activity className="w-5 h-5 text-slate-950" />
              <span>Launch Simulator</span>
            </Link>
            <Link
              to="/learn"
              className="px-8 py-3.5 rounded-xl font-medium text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700 transition-all text-sm sm:text-base flex items-center gap-2"
            >
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <span>Read Physics Curriculum</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
