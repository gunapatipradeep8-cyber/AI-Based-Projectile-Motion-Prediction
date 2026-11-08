import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import AIChatbot from './components/AIChatbot.jsx';
import Home from './pages/Home.jsx';
import Simulator from './pages/Simulator.jsx';
import LearnPhysics from './pages/LearnPhysics.jsx';
import About from './pages/About.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-[#030712] text-slate-100 bg-grid-pattern selection:bg-cyan-500 selection:text-slate-950 font-sans">
        <Navbar />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/learn" element={<LearnPhysics />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>

        <Footer />

        {/* Global Floating AI Physics Tutor */}
        <AIChatbot />
      </div>
    </BrowserRouter>
  );
}
