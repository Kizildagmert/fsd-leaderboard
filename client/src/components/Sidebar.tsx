import React, { useState } from 'react';

interface Props {
  onSimulate: () => void;
  onHardReset: () => void;
  onLogout: () => void;
  simOn: boolean;
  simCountdown: number | null;
  currentWeek?: number;
}

const JellyfishSVG = ({ className = "" }) => (
  <svg viewBox="0 0 100 150" className={`text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] fill-current ${className}`}>
    <path d="M 50 20 C 20 20, 10 50, 10 70 Q 15 65 20 70 Q 25 65 30 70 Q 35 65 40 70 Q 45 65 50 70 Q 55 65 60 70 Q 65 65 70 70 Q 75 65 80 70 Q 85 65 90 70 C 90 50, 80 20, 50 20 Z" opacity="0.8" />
    <path className="tentacle t1" d="M 20 70 Q 25 100 20 130" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    <path className="tentacle t2" d="M 35 70 Q 40 110 35 140" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    <path className="tentacle t3" d="M 50 70 Q 45 120 50 150" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
    <path className="tentacle t4" d="M 65 70 Q 70 110 65 140" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    <path className="tentacle t5" d="M 80 70 Q 75 100 80 130" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
  </svg>
);

export function Sidebar({ onSimulate, onHardReset, onLogout, simOn, simCountdown, currentWeek = 1 }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [metrics, setMetrics] = useState({
    bufferQueue: 0,
    redisLatency: '1.2',
    apiThroughput: 12
  });

  React.useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { getLiveMetrics } = await import('../services/api');
        const data = await getLiveMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className={`${isCollapsed ? 'w-20' : 'w-64'} h-full bg-[#0f172a]/95 backdrop-blur-md border-r border-[#38bdf8]/30 flex flex-col items-center py-6 shadow-[5px_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 relative z-50`}
    >
      {/* JELLYFISH ANIMATION BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        <div className="jellyfish-container jf-main">
          <JellyfishSVG className="w-16 h-24" />
        </div>
        <div className="jellyfish-container jf-small-1">
          <JellyfishSVG className="w-10 h-16" />
        </div>
        <div className="jellyfish-container jf-small-2">
          <JellyfishSVG className="w-8 h-12 text-sky-300" />
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-6 bg-[#0f172a] border border-[#38bdf8] text-[#38bdf8] w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-[#38bdf8]/20 hover:scale-110 transition-all shadow-[0_0_10px_rgba(56,189,248,0.3)] z-50"
      >
        {isCollapsed ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m13 17 5-5-5-5M6 17l5-5-5-5"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/></svg>
        )}
      </button>
      
      {/* GAME TITLE */}
      <div className={`mb-8 flex flex-col items-center justify-center transition-all ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'} z-10`}>
        <h1 className="text-2xl font-black text-[#e0f2fe] font-['Orbitron'] tracking-widest text-center" style={{ textShadow: '0 0 15px rgba(56,189,248,0.8)' }}>
          NEON
          <br/>
          NEXUS
        </h1>
        <div className="w-12 h-1 mt-2 bg-gradient-to-r from-transparent via-[#f97316] to-transparent shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
      </div>

      {!isCollapsed && (
        <div className="w-full px-6 flex flex-col gap-6 font-['Orbitron'] fade-in">
          
          {/* USER PROFILE */}
          <div className="flex flex-col items-center gap-3 p-4 bg-black/30 border border-sky-500/20 rounded-xl shadow-[inset_0_0_20px_rgba(56,189,248,0.05)]">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-[#38bdf8] bg-[#0284c7]/20 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(56,189,248,0.5)]">
                <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=DemoPlayer" alt="DemoPlayer" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#39ff14] border-2 border-[#0f172a] rounded-full animate-pulse shadow-[0_0_10px_rgba(57,255,20,0.8)]" title="Online"></div>
            </div>
            <div className="text-center">
              <div className="text-[#e0f2fe] font-bold text-sm tracking-wider">DemoPlayer</div>
              <div className="text-[#38bdf8] text-[9px] tracking-[0.2em] mt-1 bg-[#38bdf8]/10 px-2 py-0.5 rounded border border-[#38bdf8]/30">ACTIVE PILOT</div>
            </div>
          </div>

          {/* SIMULATION CONTROLS */}
          <div className="flex flex-col gap-2">
            <div className="text-[10px] text-slate-400 tracking-widest font-bold pl-1">SIMULATION</div>
            <button 
              onClick={onSimulate}
              className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold py-3 rounded-lg border border-sky-300 shadow-[0_0_15px_rgba(14,165,233,0.6)] transition-all group text-xs tracking-wider"
            >
              {simOn ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-pulse">⏳</span> {simCountdown}s
                </span>
              ) : (
                'START SIMULATION'
              )}
            </button>
          </div>

        </div>
      )}

      {isCollapsed && (
        <div className="w-full px-2 flex flex-col gap-4 mt-4 items-center">
          <div className="w-3 h-3 rounded-full bg-[#39ff14] animate-pulse shadow-[0_0_8px_rgba(57,255,20,0.8)] cursor-help" title="Server Online"></div>
          <button 
            onClick={onSimulate}
            className={`w-10 h-10 rounded-lg border shadow-lg flex items-center justify-center transition-all ${simOn ? 'bg-sky-500 border-sky-300 text-white' : 'bg-blue-900/50 border-blue-500 text-blue-400 hover:bg-blue-800'}`}
            title="Toggle Simulation"
          >
            {simOn ? <span className="animate-spin text-xs">⏳</span> : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
          </button>
        </div>
      )}

      <div className={`mt-auto w-full flex flex-col gap-4 ${isCollapsed ? 'px-2 items-center' : 'px-4'} relative z-10`}>
        {!isCollapsed && (
          <div className="flex flex-col gap-4 p-5 bg-[#0f172a]/95 border border-[#38bdf8]/30 rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.1),inset_0_0_20px_rgba(56,189,248,0.05)] mb-2 font-['Orbitron'] fade-in relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#39ff14]/50 to-transparent"></div>
            <div className="text-[11px] text-slate-300 tracking-[0.2em] font-bold border-b border-[#38bdf8]/20 pb-3 mb-1 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#39ff14" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              SYSTEM STATUS
            </div>
            
            <div className="flex flex-col gap-3 px-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">System</span>
                <span className="text-[#39ff14] flex items-center gap-1.5 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse shadow-[0_0_5px_#39ff14]"></span> ONLINE</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Redis</span>
                <span className="text-[#39ff14] flex items-center gap-1.5 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse shadow-[0_0_5px_#39ff14]" style={{animationDelay: '100ms'}}></span> ONLINE</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">PostgreSQL</span>
                <span className="text-[#39ff14] flex items-center gap-1.5 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse shadow-[0_0_5px_#39ff14]" style={{animationDelay: '200ms'}}></span> ONLINE</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">MongoDB</span>
                <span className="text-[#39ff14] flex items-center gap-1.5 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse shadow-[0_0_5px_#39ff14]" style={{animationDelay: '300ms'}}></span> ONLINE</span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-[#38bdf8]/10 flex flex-col gap-3 px-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Total Players</span>
                <span className="text-[#38bdf8] font-black tracking-wider">100,000</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Current Week</span>
                <span className="text-[#f97316] font-black tracking-wider shadow-sm">W{currentWeek}</span>
              </div>
            </div>
          </div>
        )}

        {!isCollapsed && (
          <>
            {/* LIVE METRICS */}
            <div className="flex flex-col gap-4 p-5 bg-[#0f172a]/95 border border-[#f97316]/30 rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.1),inset_0_0_20px_rgba(249,115,22,0.05)] mb-2 font-['Orbitron'] fade-in relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#f97316]/50 to-transparent"></div>
              <div className="text-[11px] text-slate-300 tracking-[0.2em] font-bold border-b border-[#f97316]/20 pb-3 mb-1 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                LIVE METRICS
              </div>
              <div className="flex flex-col gap-3 px-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Buffer Queue</span>
                  <span className="text-[#f97316] font-bold font-['Space_Mono']">{metrics.bufferQueue.toLocaleString()} req</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Redis Latency</span>
                  <span className={`${parseFloat(metrics.redisLatency) > 2.0 ? 'text-red-400' : 'text-[#f97316]'} font-bold font-['Space_Mono']`}>{metrics.redisLatency}ms</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">API Throughput</span>
                  <span className="text-[#f97316] font-bold font-['Space_Mono']">~{metrics.apiThroughput.toLocaleString()} r/s</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 tracking-widest font-bold pl-1 font-['Orbitron']">ADMINISTRATION</div>
          </>
        )}
        
        <button 
          onClick={onHardReset}
          className={`${isCollapsed ? 'w-10 h-10 p-0 text-lg' : 'w-full py-2 text-[11px]'} bg-red-900/40 hover:bg-red-800/60 border border-red-500 text-red-200 font-bold rounded-lg shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-colors flex items-center justify-center font-['Orbitron']`}
          title="Hard Reset (DB)"
        >
          {isCollapsed ? '⚠️' : 'HARD RESET (DB)'}
        </button>
        
        <button 
          onClick={onLogout}
          className={`${isCollapsed ? 'w-10 h-10 p-0' : 'w-full py-2 text-[11px]'} text-[#94a3b8] hover:text-white border border-[#334155] hover:border-[#94a3b8] rounded-lg transition-colors flex items-center justify-center font-['Orbitron'] mb-4`}
          title="Logout"
        >
          {isCollapsed ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg> : 'LOGOUT'}
        </button>
      </div>

      <style>{`
        .fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        
        .jellyfish-container {
          position: absolute;
          bottom: -150px;
        }

        .jf-main {
          animation: floatUp 15s infinite ease-in-out;
          left: 50%;
          margin-left: -32px;
        }
        
        .jf-small-1 {
          animation: floatUpSmall1 18s infinite ease-in-out 3s;
          left: 15%;
          opacity: 0;
        }

        .jf-small-2 {
          animation: floatUpSmall2 22s infinite ease-in-out 7s;
          right: 10%;
          opacity: 0;
        }

        @keyframes floatUp {
          0% {
            transform: translateY(150px) translateX(0px) scale(0.8);
            opacity: 0;
          }
          10% { opacity: 0.8; }
          50% {
            transform: translateY(-40vh) translateX(20px) scale(1);
          }
          90% { opacity: 0.8; }
          100% {
            transform: translateY(-110vh) translateX(-20px) scale(1.1);
            opacity: 0;
          }
        }

        @keyframes floatUpSmall1 {
          0% { transform: translateY(150px) translateX(-10px) scale(0.6); opacity: 0; }
          10% { opacity: 0.5; }
          50% { transform: translateY(-50vh) translateX(15px) scale(0.7); }
          90% { opacity: 0.5; }
          100% { transform: translateY(-110vh) translateX(0px) scale(0.6); opacity: 0; }
        }

        @keyframes floatUpSmall2 {
          0% { transform: translateY(150px) translateX(15px) scale(0.5); opacity: 0; }
          10% { opacity: 0.4; }
          50% { transform: translateY(-45vh) translateX(-15px) scale(0.55); }
          90% { opacity: 0.4; }
          100% { transform: translateY(-110vh) translateX(25px) scale(0.5); opacity: 0; }
        }

        .tentacle {
          animation: wave 3s infinite ease-in-out alternate;
          transform-origin: top;
        }
        .t1 { animation-delay: 0.0s; }
        .t2 { animation-delay: 0.4s; }
        .t3 { animation-delay: 0.8s; }
        .t4 { animation-delay: 0.2s; }
        .t5 { animation-delay: 0.6s; }

        @keyframes wave {
          0% { transform: skewX(-5deg); }
          100% { transform: skewX(5deg); }
        }
      `}</style>
    </div>
  );
}
