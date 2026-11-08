import React, { useState, useEffect } from 'react';
import { getModelInfo } from '../services/api';
import {
  Cpu,
  Database,
  Code2,
  CheckCircle,
  FileCode,
  Layers,
  Sparkles,
  Server,
  FolderTree,
} from 'lucide-react';

export default function About() {
  const [modelInfo, setModelInfo] = useState(null);

  useEffect(() => {
    getModelInfo()
      .then((data) => setModelInfo(data))
      .catch((err) => console.error('Failed to load model info:', err));
  }, []);

  const featureSpecs = [
    { name: 'mass', desc: 'Mass of projectile in kilograms (kg)', unit: 'kg', role: 'Inertia & Momentum' },
    { name: 'velocity', desc: 'Release / launch speed in meters per second (m/s)', unit: 'm/s', role: 'Kinematics' },
    { name: 'height', desc: 'Initial elevation above landing plane in meters', unit: 'm', role: 'Vertical Displacement' },
    { name: 'gravity', desc: 'Local gravitational acceleration (Earth = 9.8 m/s²)', unit: 'm/s²', role: 'Downward Deceleration' },
    { name: 'force', desc: 'Weight or applied launch force in Newtons', unit: 'N', role: 'Dynamic Force ($F = mg$)' },
    { name: 'kinetic_energy', desc: 'Translational kinetic energy ($0.5 m v²$)', unit: 'J', role: 'Motion Energy' },
    { name: 'potential_energy', desc: 'Gravitational potential energy ($m g h$)', unit: 'J', role: 'Stored Altitude Energy' },
    { name: 'total_energy', desc: 'Total mechanical energy ($KE + PE$)', unit: 'J', role: 'Energy Conservation' },
    { name: 'work_done', desc: 'Mechanical work done to accelerate the object', unit: 'J', role: 'Work-Energy Theorem' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-medium bg-purple-950/60 border border-purple-500/30 text-purple-300 mb-3">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span>Machine Learning Specifications</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          About the Machine Learning Model
        </h1>
        <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
          Detailed technical specifications of the original pre-trained Scikit-Learn Random Forest Regressor integrated into this application.
        </p>
      </div>

      {/* Model Spec Summary Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-800">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          Live Model Metadata (Loaded in Memory)
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-slate-500 block uppercase text-[10px]">Algorithm</span>
            <span className="text-base font-bold text-cyan-300 mt-1 block">
              {modelInfo?.model_type || 'RandomForestRegressor'}
            </span>
            <span className="text-slate-500 text-[10px]">Scikit-Learn Ensemble</span>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-slate-500 block uppercase text-[10px]">Decision Trees</span>
            <span className="text-base font-bold text-purple-300 mt-1 block">
              {modelInfo?.n_estimators || 100} Trees
            </span>
            <span className="text-slate-500 text-[10px]">n_estimators = 100</span>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-slate-500 block uppercase text-[10px]">Input Dimension</span>
            <span className="text-base font-bold text-sky-300 mt-1 block">
              {modelInfo?.n_features_in || 9} Features
            </span>
            <span className="text-slate-500 text-[10px]">Strict Feature Order</span>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-slate-500 block uppercase text-[10px]">Target Output</span>
            <span className="text-base font-bold text-emerald-300 mt-1 block">
              Horizontal Distance
            </span>
            <span className="text-slate-500 text-[10px]">Meters (m)</span>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 sm:col-span-2">
            <span className="text-slate-500 block uppercase text-[10px]">Model File Path</span>
            <span className="text-xs font-bold text-white mt-1 block truncate">
              backend/app/models/{modelInfo?.model_file || 'projectile_model.pkl'}
            </span>
            <span className="text-slate-500 text-[10px]">
              Size: {modelInfo?.file_size_bytes ? `${(modelInfo.file_size_bytes / 1024 / 1024).toFixed(2)} MB` : '~7.3 MB'}
            </span>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 sm:col-span-2">
            <span className="text-slate-500 block uppercase text-[10px]">Dataset Provenance</span>
            <span className="text-xs font-bold text-white mt-1 block truncate">
              basketball_projectile_motion_dataset.xlsx (800 Samples)
            </span>
            <span className="text-slate-500 text-[10px]">Physical dynamics & sports trajectory data</span>
          </div>
        </div>
      </div>

      {/* Feature Specification Table */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white">Input Feature Specification</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            The trained model strictly requires these 9 features in this exact sequence:
          </p>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Index</th>
                <th className="py-3 px-4">Feature Name</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Physical Description</th>
                <th className="py-3 px-4">Kinematic Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {featureSpecs.map((spec, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-cyan-300">{spec.name}</td>
                  <td className="py-3 px-4 text-purple-300">{spec.unit}</td>
                  <td className="py-3 px-4 text-slate-300 font-sans">{spec.desc}</td>
                  <td className="py-3 px-4 text-slate-400">{spec.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Full Architecture Workflow */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-400" />
          End-to-End System Workflow
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center font-mono">
              1
            </div>
            <h4 className="font-bold text-white text-sm">User Input</h4>
            <p className="text-slate-400 leading-relaxed">
              User enters physical quantities (mass, velocity, launch elevation, gravity) with option to auto-compute energies.
            </p>
          </div>

          <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center font-mono">
              2
            </div>
            <h4 className="font-bold text-white text-sm">FastAPI Endpoint</h4>
            <p className="text-slate-400 leading-relaxed">
              Backend validates payload via Pydantic, arranges the 9 features in order, and calculates theoretical kinematics in parallel.
            </p>
          </div>

          <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center font-mono">
              3
            </div>
            <h4 className="font-bold text-white text-sm">Random Forest Inference</h4>
            <p className="text-slate-400 leading-relaxed">
              Trained 100-tree model computes predicted distance in &lt;5ms. Result is saved to persistent SQLite database.
            </p>
          </div>

          <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center font-mono">
              4
            </div>
            <h4 className="font-bold text-white text-sm">Dashboard & Canvas</h4>
            <p className="text-slate-400 leading-relaxed">
              React updates the animated parabolic canvas, Chart.js plots, prediction delta, and exports to PDF or CSV.
            </p>
          </div>
        </div>
      </section>

      {/* Tech Stack Specs */}
      <section className="glass-card p-6 sm:p-8 rounded-2xl space-y-6">
        <h2 className="text-xl font-bold text-white">Full Technology Stack</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-cyan-400 font-bold block mb-1">Frontend</span>
            <span className="text-slate-300">React.js 18 + Vite</span>
            <span className="text-slate-500 block text-[10px] mt-0.5">Tailwind CSS 3.4</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-purple-400 font-bold block mb-1">Backend</span>
            <span className="text-slate-300">FastAPI + Uvicorn</span>
            <span className="text-slate-500 block text-[10px] mt-0.5">Python 3.12 Engine</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-sky-400 font-bold block mb-1">Machine Learning</span>
            <span className="text-slate-300">Scikit-Learn 1.6.1</span>
            <span className="text-slate-500 block text-[10px] mt-0.5">Joblib Serialization</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">Database & Export</span>
            <span className="text-slate-300">SQLite + jsPDF</span>
            <span className="text-slate-500 block text-[10px] mt-0.5">CSV History Exporter</span>
          </div>
        </div>
      </section>
    </div>
  );
}
