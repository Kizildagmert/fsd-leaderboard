import React from 'react';
import { useNextMonday } from '../hooks/useNextMonday';
import { useCountUp } from '../hooks/useCountUp';

interface Props {
  prizePool: number;
  simulatedTimeElapsed: number;
  currentWeek: number;
  activeTab: 'current' | 'previous';
  onTabChange: (tab: 'current' | 'previous') => void;
  simOn: boolean;
  isCalculating?: boolean;
}

export function TopStatsBar({ prizePool, simulatedTimeElapsed, currentWeek, activeTab, onTabChange, simOn, isCalculating = false }: Props) {
  const timeLeft = useNextMonday(simulatedTimeElapsed, simOn);
  const animatedPrizePool = useCountUp(prizePool, 1000);

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-between px-6 py-3 mb-4 gap-4" style={{ fontFamily: "'Orbitron', sans-serif" }}>
      
      {/* LEFT TAB: PREVIOUS WEEK & TOP 100 PLAYERS */}
      <div className="flex gap-2">
        {currentWeek > 1 && (
          <button 
            onClick={() => onTabChange('previous')}
            className={`px-4 py-2 rounded-t-lg rounded-b-sm border-t-2 border-x-2 border-b-4 text-white font-bold text-sm tracking-wide transition-all ${
              activeTab === 'previous'
                ? 'border-[#0284c7] border-b-[#0ea5e9] shadow-[0_-2px_10px_rgba(2,132,199,0.5),inset_0_2px_10px_rgba(255,255,255,0.2)]'
                : 'border-[#1e293b] border-b-[#334155] opacity-50 hover:opacity-100 hover:border-[#0284c7]/50'
            }`}
            style={activeTab === 'previous' ? { background: 'linear-gradient(to bottom, rgba(2, 132, 199, 0.4), rgba(2, 132, 199, 0.1))' } : { background: 'rgba(30, 41, 59, 0.3)' }}
          >
            PREVIOUS WEEK
          </button>
        )}
        <button 
          onClick={() => onTabChange('current')}
          className={`px-4 py-2 rounded-t-lg rounded-b-sm border-t-2 border-x-2 border-b-4 text-white font-bold text-sm tracking-wide transition-all ${
            activeTab === 'current'
              ? 'border-[#0284c7] border-b-[#0ea5e9] shadow-[0_-2px_10px_rgba(2,132,199,0.5),inset_0_2px_10px_rgba(255,255,255,0.2)]'
              : 'border-[#1e293b] border-b-[#334155] opacity-50 hover:opacity-100 hover:border-[#0284c7]/50'
          }`}
          style={activeTab === 'current' ? { background: 'linear-gradient(to bottom, rgba(2, 132, 199, 0.4), rgba(2, 132, 199, 0.1))' } : { background: 'rgba(30, 41, 59, 0.3)' }}
        >
          TOP 100 PLAYERS
        </button>
      </div>

      {/* MIDDLE: WEEKLY COUNTDOWN */}
      <div className="flex items-center gap-3">
        <span className="text-[#38bdf8] text-xs font-bold tracking-widest">WEEKLY COUNTDOWN</span>
        <div className="flex items-center gap-2">
          {isCalculating ? (
            <div className="bg-[#38bdf8]/20 border border-[#38bdf8] px-3 py-1 rounded text-[#38bdf8] font-bold text-sm flex items-center gap-2 animate-pulse">
              <div className="w-4 h-4 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin"></div>
              CALCULATING...
            </div>
          ) : (
            <>
              <span className="text-white text-[10px] tracking-wide mt-1">NEXT RESET:</span>
              <span className="text-white font-bold text-lg" style={{ transition: 'all 0.5s ease' }}>
                {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
              </span>
              <span className="text-2xl ml-1 animate-pulse">⏳</span>
            </>
          )}
        </div>
      </div>

      {/* RIGHT: PRIZE POOL */}
      <div className="flex items-center gap-3">
        <span className="text-[#38bdf8] text-xs font-bold tracking-widest">WEEKLY PRICE POOL:</span>
        <div className="flex items-center gap-2 text-[#fbbf24] font-bold text-xl drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
          {Math.floor(animatedPrizePool).toLocaleString()}
          <span className="text-2xl ml-1 drop-shadow-none">🪙</span>
        </div>
      </div>

    </div>
  );
}
