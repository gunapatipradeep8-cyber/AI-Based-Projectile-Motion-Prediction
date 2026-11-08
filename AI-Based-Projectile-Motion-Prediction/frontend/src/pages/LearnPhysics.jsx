import React, { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  Sparkles,
  Calculator,
  Compass,
  ArrowRight,
  CheckCircle2,
  Atom,
} from 'lucide-react';

export default function LearnPhysics() {
  const [openFaq, setOpenFaq] = useState(0);

  const equations = [
    {
      name: 'Horizontal Range ($R$)',
      formula: 'R = \\frac{v_0^2 \\sin(2\\theta)}{g}',
      condition: 'Level ground ($h_0 = 0$)',
      desc: 'The total horizontal distance traversed by the projectile from launch to landing at the same vertical height.',
    },
    {
      name: 'Maximum Height ($H_{max}$)',
      formula: 'H_{max} = h_0 + \\frac{v_0^2 \\sin^2\\theta}{2g}',
      condition: 'Elevation $h_0 \\ge 0$',
      desc: 'The peak vertical altitude attained when the instantaneous vertical velocity $v_y$ drops to zero.',
    },
    {
      name: 'Total Time of Flight ($t_{flight}$)',
      formula: 't_{flight} = \\frac{v_0\\sin\\theta + \\sqrt{(v_0\\sin\\theta)^2 + 2 g h_0}}{g}',
      condition: 'General formula with release elevation $h_0$',
      desc: 'The total duration the projectile remains in flight before returning to ground elevation $y = 0$.',
    },
    {
      name: 'Trajectory Curve Equation ($y(x)$)',
      formula: 'y(x) = h_0 + x\\tan\\theta - \\frac{g x^2}{2 v_0^2 \\cos^2\\theta}',
      condition: 'Cartesian coordinates',
      desc: 'The mathematical equation of the inverted parabola traced by the projectile in the vertical plane.',
    },
    {
      name: 'Kinetic Energy ($KE$)',
      formula: 'KE = \\frac{1}{2} m v^2 = \\frac{1}{2} m (v_x^2 + v_y^2)',
      condition: 'Energy conservation',
      desc: 'The energy possessed by the projectile due to its translational motion in space.',
    },
    {
      name: 'Gravitational Potential Energy ($PE$)',
      formula: 'PE = m \\cdot g \\cdot y',
      condition: 'Height $y$ above reference plane',
      desc: 'Energy stored due to altitude above the ground datum.',
    },
  ];

  const solvedExamples = [
    {
      title: 'Example 1: Basketball Free Throw Shot',
      question:
        'A basketball player releases a 0.62 kg ball from an initial height of h0 = 2.0 m with a speed of v0 = 8.5 m/s at an angle of 48°. Assuming standard gravity g = 9.8 m/s², calculate: (a) Time of flight, (b) Maximum height attained, and (c) Horizontal range.',
      steps: [
        {
          step: 'Step 1: Compute velocity components',
          math: 'v_{0x} = 8.5 \\cos(48°) = 8.5 \\times 0.6691 = 5.688\\text{ m/s}\nv_{0y} = 8.5 \\sin(48°) = 8.5 \\times 0.7431 = 6.317\\text{ m/s}',
        },
        {
          step: 'Step 2: Calculate maximum height',
          math: 'H_{max} = h_0 + \\frac{v_{0y}^2}{2g} = 2.0 + \\frac{(6.317)^2}{2 \\times 9.8} = 2.0 + \\frac{39.90}{19.6} = 2.0 + 2.036 = 4.036\\text{ meters}',
        },
        {
          step: 'Step 3: Calculate time of flight',
          math: 't = \\frac{v_{0y} + \\sqrt{v_{0y}^2 + 2 g h_0}}{g} = \\frac{6.317 + \\sqrt{39.90 + 2(9.8)(2.0)}}{9.8} = \\frac{6.317 + \\sqrt{39.90 + 39.2}}{9.8} = \\frac{6.317 + 8.894}{9.8} = 1.552\\text{ seconds}',
        },
        {
          step: 'Step 4: Calculate horizontal range',
          math: 'R = v_{0x} \\times t = 5.688 \\times 1.552 = 8.828\\text{ meters}',
        },
      ],
      result: 'Maximum Height = 4.04 m, Flight Time = 1.55 s, Range = 8.83 m',
    },
    {
      title: 'Example 2: Optimal Launch Angle from Elevation',
      question:
        'Why is the optimal launch angle for maximum range slightly less than 45° when launched from an elevated cliff or hand height (h0 > 0)?',
      steps: [
        {
          step: 'Step 1: Analyze level ground symmetry',
          math: 'For h_0 = 0, the trajectory is symmetric about the apex. Maximizing R = (v_0^2 \\sin 2\\theta) / g requires \\sin(2\\theta) = 1 \\implies \\theta = 45°.',
        },
        {
          step: 'Step 2: Analyze additional flight time with elevation',
          math: 'When h_0 > 0, the projectile spends extra time descending past the launch level toward the lower ground. A shallower angle provides greater horizontal velocity v_x to travel further during this extended downward descent.',
        },
        {
          step: 'Step 3: Mathematical optimum',
          math: '\\theta_{optimal} = \\arcsin\\left(\\frac{1}{\\sqrt{2 + \\frac{2 g h_0}{v_0^2}}}\\right) < 45°',
        },
      ],
      result: 'For typical basketball releases (h0 ≈ 2m, v0 ≈ 8m/s), theoretical maximum range occurs at approximately 42° - 44°.',
    },
  ];

  const faqs = [
    {
      q: 'Does projectile mass affect its theoretical trajectory in a vacuum?',
      a: 'No. In pure Newtonian kinematics without air resistance, gravitational acceleration (g) acts equally on all masses (F = mg, so a = F/m = g). However, in real-world sports and our machine learning model, mass directly alters kinetic energy, inertia against aerodynamic drag, and momentum.',
    },
    {
      q: 'Why does our Machine Learning model require energy features like KE, PE, and Work Done?',
      a: 'The Random Forest regressor is trained on empirical physical energy variables. Features such as Kinetic Energy (0.5 m v²) and Potential Energy (m g h) provide nonlinear representations of the projectile’s physical state that allow the ensemble trees to accurately capture drag losses and real-world distance.',
    },
    {
      q: 'What is the independence of horizontal and vertical motions?',
      a: 'Galileo’s principle of compound motion states that horizontal and vertical motions occur simultaneously and independently. The horizontal velocity remains constant (a_x = 0), while vertical velocity undergoes constant gravitational deceleration (a_y = -g).',
    },
    {
      q: 'How does gravity vary across planetary bodies?',
      a: 'On the Moon (g = 1.62 m/s²), a basketball shot travels approximately 6 times further and higher than on Earth! On Mars (g = 3.72 m/s²), the range is roughly 2.6 times greater.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-medium bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 mb-3">
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Physics Curriculum & Reference</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Physics of Projectile Motion
        </h1>
        <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
          Comprehensive reference on kinematic equations, energy conservation principles, launch angle mechanics, and empirical deviations in real-world trajectories.
        </p>
      </div>

      {/* Core Principles Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Compass className="w-5 h-5 text-cyan-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Horizontal Component ($x$-axis)</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            In standard vacuum projectile motion, no horizontal forces act on the body ($F_x = 0$), so horizontal acceleration is zero ($a_x = 0$).
          </p>
          <ul className="space-y-2 text-xs font-mono text-cyan-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <li>&bull; Horizontal Velocity: vx(t) = v0 &times; cos(&theta;) = constant</li>
            <li>&bull; Horizontal Position: x(t) = (v0 &times; cos(&theta;)) &times; t</li>
            <li>&bull; Horizontal Acceleration: ax = 0</li>
          </ul>
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
            <Atom className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Vertical Component (y-axis)</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            The object experiences a uniform downward gravitational acceleration (ay = -g). Vertical speed decreases during ascent, momentarily becomes zero at the apex, and increases during descent.
          </p>
          <ul className="space-y-2 text-xs font-mono text-purple-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <li>&bull; Vertical Velocity: vy(t) = v0 &times; sin(&theta;) - g &times; t</li>
            <li>&bull; Vertical Position: y(t) = h0 + v0 &times; sin(&theta;) &times; t - 0.5 &times; g &times; t&sup2;</li>
            <li>&bull; Vertical Acceleration: ay = -g</li>
          </ul>
        </div>
      </section>

      {/* Equations Cheat Sheet */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Key Mathematical Equations</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Fundamental kinematics and energy relationships</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equations.map((eq, idx) => (
            <div key={idx} className="glass-panel p-5 rounded-xl border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">{eq.name}</span>
                <span className="text-[10px] font-mono text-slate-500">{eq.condition}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center font-mono text-cyan-300 text-sm font-semibold">
                {eq.formula}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{eq.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Step-by-Step Solved Examples */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Solved Numerical Examples</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Step-by-step college physics calculations</p>
        </div>

        <div className="space-y-6">
          {solvedExamples.map((ex, i) => (
            <div key={i} className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-5">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">{ex.title}</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 bg-slate-900/60 p-4 rounded-xl border border-slate-800 leading-relaxed font-sans">
                <strong>Problem:</strong> {ex.question}
              </p>

              <div className="space-y-3">
                {ex.steps.map((st, sIdx) => (
                  <div key={sIdx} className="space-y-1">
                    <span className="text-xs font-bold text-slate-300">{st.step}:</span>
                    <pre className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-cyan-300 border border-slate-900 overflow-x-auto whitespace-pre-wrap">
                      {st.math}
                    </pre>
                  </div>
                ))}
              </div>

              <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs font-mono text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  <strong>Answer:</strong> {ex.result}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Kinematics and machine learning FAQs</p>
        </div>

        <div className="space-y-3 max-w-3xl mx-auto">
          {faqs.map((faq, fIdx) => (
            <div
              key={fIdx}
              className="glass-panel rounded-xl border border-slate-800 overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === fIdx ? null : fIdx)}
                className="w-full p-4 text-left flex items-center justify-between text-sm font-semibold text-slate-200 hover:text-cyan-300 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    openFaq === fIdx ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>
              {openFaq === fIdx && (
                <div className="px-4 pb-4 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
