import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: () => void;
  onHardReset: () => void;
  onLogout: () => void;
  simOn: boolean;
  simCountdown: number | null;
}

export function MobileSettingsModal({ 
  isOpen, 
  onClose, 
  onSimulate, 
  onHardReset,
  onLogout, 
  simOn, 
  simCountdown 
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border-2 border-[#38bdf8] w-full max-w-sm rounded-xl overflow-hidden shadow-[0_0_20px_rgba(56,189,248,0.3)] relative">
        
        {/* Header */}
        <div className="bg-[#38bdf8]/20 p-4 border-b border-[#38bdf8]/30 flex justify-between items-center">
          <h2 className="text-[#e0f2fe] font-['Orbitron'] font-bold tracking-widest text-sm">CONTROLS</h2>
          <button onClick={onClose} className="text-[#38bdf8] hover:text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5 font-['Orbitron']">
          
          <button 
            onClick={() => { onSimulate(); onClose(); }}
            className={`w-full font-bold py-3 px-4 rounded-lg border transition-all ${
              simOn 
                ? 'bg-red-900/40 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                : 'bg-gradient-to-r from-blue-600 to-blue-400 border-blue-300 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
            }`}
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            {simOn ? (
              <div className="flex items-center justify-between w-full">
                <span>🛑 STOP SIMULATION</span>
                <span className="text-white bg-red-500 px-2 py-0.5 rounded text-sm">{simCountdown}s</span>
              </div>
            ) : (
              <span className="flex items-center justify-center gap-2">
                ▶️ START SIMULATION
              </span>
            )}
          </button>

          <div className="h-px w-full bg-slate-800 my-2"></div>

          <div className="w-full flex flex-col gap-3">
            <button 
              onClick={() => { onHardReset(); onClose(); }}
              className="w-full py-3 bg-red-900/20 hover:bg-red-800/60 border border-red-500/50 text-red-300 font-bold rounded shadow-[0_0_10px_rgba(239,68,68,0.1)] transition-colors"
              style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '13px' }}
            >
              ⚠️ HARD RESET (DB)
            </button>
            <button 
              onClick={() => { onLogout(); onClose(); }}
              className="w-full py-3 text-[#94a3b8] border border-[#334155] rounded hover:bg-[#334155]/30 transition-colors"
              style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '13px' }}
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
