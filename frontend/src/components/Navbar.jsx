import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { checkApiHealth, checkModelStatus } from '../services/api';
import { Activity, BookOpen, Cpu, Home, Menu, X, Orbit } from 'lucide-react';

export default function Navbar() {
  const [modelReady, setModelReady] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let retryTimer = null;

    const verifyStatus = async () => {
      try {
        const res = await checkApiHealth();
        if (isMounted) {
          const isOnline = Boolean(res && (res.status === 'online' || res.model_loaded !== undefined || res.service));
          setModelReady(isOnline);
        }
      } catch (err) {
        try {
          const fallback = await checkModelStatus();
          if (isMounted) {
            setModelReady(Boolean(fallback?.model_loaded));
          }
        } catch (_) {
          if (isMounted) {
            setModelReady(false);
            // Auto-retry in 5 seconds (ideal for Render free-tier cold-start wakeups)
            retryTimer = setTimeout(verifyStatus, 5000);
          }
        }
      }
    };

    verifyStatus();
    // Periodic health poll every 30 seconds
    const interval = setInterval(verifyStatus, 30000);

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Simulator', path: '/simulator', icon: Activity },
    { name: 'Learn Physics', path: '/learn', icon: BookOpen },
    { name: 'About Model', path: '/about', icon: Cpu },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform duration-300">
              <Orbit className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block">
                PROJECTILE<span className="text-cyan-400">.AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-widest block -mt-1 uppercase">
                Physics Kinematics Lab
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-sky-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Status Badge & CTA */}
          <div className="hidden lg:flex items-center gap-4">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border ${
                modelReady === true
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                  : modelReady === false
                  ? 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  modelReady === true
                    ? 'bg-emerald-400 animate-pulse'
                    : modelReady === false
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-slate-500 animate-pulse'
                }`}
              ></span>
              {modelReady === true
                ? 'Backend Active'
                : modelReady === false
                ? 'Backend Offline (Retrying...)'
                : 'Connecting...'}
            </div>

            <Link
              to="/simulator"
              className="px-4 py-2 text-sm font-semibold text-slate-900 bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 rounded-lg shadow-md shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              Launch Simulator
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu modal */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-b border-slate-800 px-4 pt-2 pb-4 space-y-2 animate-fadeIn">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium ${
                    isActive
                      ? 'bg-sky-500/10 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            );
          })}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">Backend Status:</span>
              <span className={modelReady === true ? 'text-emerald-400 font-semibold' : modelReady === false ? 'text-amber-400' : 'text-slate-400'}>
                {modelReady === true ? '● Active' : modelReady === false ? '○ Offline (Retrying...)' : '○ Connecting...'}
              </span>
            </div>
            <Link
              to="/simulator"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center py-2.5 text-sm font-semibold text-slate-900 bg-gradient-to-r from-cyan-400 to-sky-400 rounded-lg shadow-md"
            >
              Launch Simulator
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
