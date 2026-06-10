import React from 'react';

interface Props {
  isOpen: boolean;
}

export function CalculationModal({ isOpen }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="relative bg-[#0f172a] border-2 border-[#38bdf8] p-8 rounded-2xl shadow-[0_0_30px_rgba(56,189,248,0.3)] max-w-sm w-full mx-4 text-center overflow-hidden flex flex-col items-center">
        
        {/* Animated Cyber Grid Background */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
          style={{
            backgroundImage: `linear-gradient(rgba(56,189,248,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.2) 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
            backgroundPosition: 'center center'
          }}
        />

        <div className="relative z-10">
          <div className="w-16 h-16 border-4 border-[#38bdf8] border-t-transparent rounded-full animate-spin mx-auto mb-6 shadow-[0_0_15px_rgba(56,189,248,0.5)]"></div>
          
          <h2 className="text-2xl font-['Orbitron'] font-bold text-white mb-2 tracking-widest uppercase">
            Calculating
          </h2>
          <p className="text-[#38bdf8] font-bold text-sm tracking-widest uppercase animate-pulse">
            Distributing Weekly Rewards...
          </p>
        </div>

      </div>
    </div>
  );
}
