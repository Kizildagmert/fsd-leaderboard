import React from 'react';

export function Header() {
  return (
    <div className="flex justify-center pt-4 pb-2 w-full relative z-10">
      <div 
        className="flex flex-col items-center justify-center px-16 py-3 relative bg-[#0f172a] shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
        style={{
          borderTop: '2px solid #38bdf8',
          borderBottom: '2px solid #38bdf8',
          boxShadow: 'inset 0 0 20px rgba(56, 189, 248, 0.2), 0 0 20px rgba(56, 189, 248, 0.3)',
        }}
      >
        {/* Left Wing */}
        <div className="absolute left-[-20px] top-0 bottom-0 w-[20px] bg-[#0f172a] border-l-2 border-t-2 border-b-2 border-[#38bdf8]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 70%, 0 30%)', boxShadow: 'inset 0 0 20px rgba(56, 189, 248, 0.2)' }} />
        {/* Right Wing */}
        <div className="absolute right-[-20px] top-0 bottom-0 w-[20px] bg-[#0f172a] border-r-2 border-t-2 border-b-2 border-[#38bdf8]" style={{ clipPath: 'polygon(0 0, 0 100%, 100% 70%, 100% 30%)', boxShadow: 'inset 0 0 20px rgba(56, 189, 248, 0.2)' }} />
        
        <span className="text-[#38bdf8] font-['Orbitron'] font-bold text-sm tracking-[0.3em] mb-1">NEON NEXUS</span>
        <span className="text-white font-['Orbitron'] font-black text-2xl md:text-3xl tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">LEADERBOARD</span>
      </div>
    </div>
  );
}
