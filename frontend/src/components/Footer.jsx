import React from 'react';
import { Link } from 'react-router-dom';
import { Orbit, Sparkles, Code2, GraduationCap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/80 text-slate-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-purple-600 flex items-center justify-center">
                <Orbit className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                PROJECTILE<span className="text-cyan-400">.AI</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              An advanced college Physics simulation platform combining Newtonian kinematic mechanics
              with Machine Learning regression to predict real-world projectile trajectory and distance.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              College Physics AI Project &bull; Department of Physics & Computer Science
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-cyan-400 transition-colors">Home Landing</Link>
              </li>
              <li>
                <Link to="/simulator" className="hover:text-cyan-400 transition-colors">Interactive Simulator</Link>
              </li>
              <li>
                <Link to="/learn" className="hover:text-cyan-400 transition-colors">Physics Curriculum</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-cyan-400 transition-colors">Model Architecture</Link>
              </li>
            </ul>
          </div>

          {/* Tech Stack */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Tech Architecture</h4>
            <ul className="space-y-2 text-xs font-mono text-slate-400">
              <li className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>FastAPI + Uvicorn (Python)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Scikit-Learn RandomForest (100 Trees)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Orbit className="w-3.5 h-3.5 text-sky-400" />
                <span>React.js + Vite + Tailwind CSS</span>
              </li>
              <li className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                <span>SQLite Simulation History</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>&copy; {new Date().getFullYear()} AI-Based Projectile Motion Prediction. Built for Academic & Research Physics.</p>
          <p className="font-mono text-slate-500">
            Pre-Trained Model: <span className="text-slate-400 font-semibold">RandomForestRegressor (9 Features)</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
