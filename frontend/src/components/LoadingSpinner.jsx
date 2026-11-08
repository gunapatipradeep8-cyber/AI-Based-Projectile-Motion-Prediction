import React from 'react';

export default function LoadingSpinner({ size = 'md', text = 'Processing...' }) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }[size] || 'w-8 h-8 border-3';

  return (
    <div className="flex flex-col items-center justify-center p-4 gap-3">
      <div className="relative flex items-center justify-center">
        <div className={`${sizeClasses} border-sky-500/20 border-t-cyan-400 rounded-full animate-spin`}></div>
        <div className="absolute w-2 h-2 bg-purple-400 rounded-full animate-ping"></div>
      </div>
      {text && <span className="text-xs font-mono uppercase tracking-wider text-slate-400">{text}</span>}
    </div>
  );
}
