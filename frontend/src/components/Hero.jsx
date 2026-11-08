import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Sparkles, Target, Zap, Activity } from 'lucide-react';

export default function Hero() {
  const canvasRef = useRef(null);

  // Animated background projectile particles & trajectory
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particle arc physics simulation for background
    const arcs = Array.from({ length: 6 }, (_, i) => ({
      v0: 45 + i * 8,
      angle: (35 + i * 6) * (Math.PI / 180),
      t: Math.random() * 2,
      speed: 0.015 + i * 0.003,
      color: ['#38bdf8', '#818cf8', '#a855f7', '#06b6d4', '#ec4899', '#3b82f6'][i % 6],
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const originX = w * 0.08;
      const originY = h * 0.85;

      // Draw faint ground line
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(w, originY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();

      arcs.forEach((arc) => {
        arc.t += arc.speed;
        const g = 9.8;
        const scaleX = w / 280;
        const scaleY = h / 200;

        // Draw parabolic trail
        ctx.beginPath();
        const maxT = (2 * arc.v0 * Math.sin(arc.angle)) / g;
        for (let t = 0; t <= maxT; t += 0.08) {
          const x = originX + arc.v0 * Math.cos(arc.angle) * t * scaleX;
          const y = originY - (arc.v0 * Math.sin(arc.angle) * t - 0.5 * g * t * t) * scaleY;
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = arc.color;
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Current projectile point
        const currT = arc.t % maxT;
        const px = originX + arc.v0 * Math.cos(arc.angle) * currT * scaleX;
        const py = originY - (arc.v0 * Math.sin(arc.angle) * currT - 0.5 * g * currT * currT) * scaleY;

        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = arc.color;
        ctx.shadowColor = arc.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
      {/* Background Trajectory Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-0"
      />

      {/* Decorative gradient glow spheres */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Academic Project Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium bg-slate-900/90 border border-slate-700/80 text-cyan-300 shadow-inner mb-6">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>College Physics AI Project &bull; Machine Learning Prediction System</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-tight sm:leading-none">
          AI-Based Projectile Motion{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-400">
            Prediction & Simulator
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Bridge theoretical Newtonian kinematics with empirical machine learning. 
          Powered by a pre-trained <span className="text-cyan-400 font-semibold">100-Tree Random Forest Regressor</span> trained 
          on physical dynamics, kinetic force, and energy conservation.
        </p>

        {/* Call-to-Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/simulator"
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 hover:from-cyan-300 hover:to-indigo-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all text-sm sm:text-base"
          >
            <Activity className="w-5 h-5 text-slate-950" />
            <span>Launch Simulation</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>

          <a
            href="#ai-assistant-preview"
            onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('open-ai-tutor'));
            }}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-slate-200 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700 hover:border-slate-600 shadow-md transition-all text-sm sm:text-base cursor-pointer"
          >
            <Bot className="w-5 h-5 text-purple-400" />
            <span>Explore AI Physics Tutor</span>
          </a>
        </div>

        {/* Scientific Highlights / Spec Cards */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="glass-card p-4 rounded-xl text-center">
            <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">9</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Physical Features</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Mass, v, h, g, Force, Energies</div>
          </div>
          <div className="glass-card p-4 rounded-xl text-center">
            <div className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">100</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Random Forest Trees</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Ensemble Regressor</div>
          </div>
          <div className="glass-card p-4 rounded-xl text-center">
            <div className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">1 Target</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Horizontal Distance</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Predicted in Meters (m)</div>
          </div>
          <div className="glass-card p-4 rounded-xl text-center">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">&lt; 5 ms</div>
            <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Inference Latency</div>
            <div className="text-[10px] text-slate-500 mt-0.5">FastAPI & NumPy Engine</div>
          </div>
        </div>
      </div>
    </div>
  );
}
