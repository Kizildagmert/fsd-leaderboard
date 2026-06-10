import React from 'react';
import type { CurrentUserContext, LeaderboardEntry } from '../services/api';
import { useCountUp } from '../hooks/useCountUp';

interface Props {
  currentUser: CurrentUserContext | null;
  prizePool: number;
  username: string;
  neighbors?: LeaderboardEntry[] | null;
  entries?: LeaderboardEntry[];
  onClick?: () => void;
}

export function getOrdinalSuffix(i: number) {
  const j = i % 10;
  const k = i % 100;
  if (j === 1 && k !== 11) return i + 'st';
  if (j === 2 && k !== 12) return i + 'nd';
  if (j === 3 && k !== 13) return i + 'rd';
  return i + 'th';
}

export function CurrentUserCard({ currentUser, username, neighbors, entries, onClick }: Props) {
  if (!currentUser) return null;

  const animatedScore = useCountUp(currentUser.score, 1000);

  let nextRankText = 'N/A';
  let prevRankText = 'N/A';
  let progressPercent = 100;

  // Combine entries and neighbors to find adjacent ranks even if user is in top 100
  const allAvailableUsers = [...(entries || []), ...(neighbors || [])];
  
  const nextRankUser = allAvailableUsers.find(n => n.rank === currentUser.rank - 1);
  const prevRankUser = allAvailableUsers.find(n => n.rank === currentUser.rank + 1);

  if (nextRankUser) {
    nextRankText = getOrdinalSuffix(nextRankUser.rank);
    if (nextRankUser.score > 0) {
      progressPercent = Math.min(100, Math.max(0, (currentUser.score / nextRankUser.score) * 100));
    }
  }

  if (prevRankUser) {
    prevRankText = getOrdinalSuffix(prevRankUser.rank);
  }

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div 
      className="w-full flex flex-col xl:flex-row items-center justify-between p-4 md:p-5 gap-4 md:gap-6 rounded-xl"
      style={{ 
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '2px solid #f97316',
        boxShadow: '0 0 20px rgba(249, 115, 22, 0.2), inset 0 0 10px rgba(249, 115, 22, 0.1)',
        fontFamily: "'Orbitron', sans-serif",
      }}
    >
      {/* RANK SECTION */}
      <div className="flex flex-col items-center xl:border-r border-white/10 xl:pr-6">
        <span className="text-[10px] md:text-xs text-slate-300 tracking-widest font-bold mb-1">YOUR RANKING</span>
        <div className="text-[#f97316] font-black text-2xl md:text-3xl" style={{ textShadow: '0 0 10px rgba(249,115,22,0.5)' }}>
          [{getOrdinalSuffix(currentUser.rank)}]
        </div>
      </div>

      {/* PROFILE SECTION */}
      <div className="flex items-center gap-4 xl:border-r border-white/10 xl:pr-6">
        <div className="p-1 bg-[#1e3a8a] border-2 border-[#3b82f6] rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.3)]">
          <img 
            src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`} 
            alt="Avatar" 
            className="w-10 h-10 md:w-12 md:h-12 rounded bg-black/40"
          />
        </div>
        <div className="flex flex-col">
          <div className="text-blue-300 font-bold text-xs md:text-sm mb-1">
            <span className="text-blue-400">YOU:</span> {username}
          </div>
          <div className="text-white font-bold text-lg md:text-xl flex items-center gap-2">
            {Math.floor(animatedScore).toLocaleString()} 
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#38bdf8]">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* PROGRESS RING SECTION */}
      <div className="hidden md:flex items-center gap-4 xl:border-r border-white/10 xl:pr-6">
        <div className="relative w-14 h-14 md:w-[60px] md:h-[60px]">
          <svg width="100%" height="100%" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="30" cy="30" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            <circle 
              cx="30" cy="30" r={radius} fill="none" stroke="#38bdf8" strokeWidth="4"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-white text-xs md:text-sm font-bold">
              {currentUser.rank === 1 ? 'MAX' : `${Math.floor(progressPercent)}%`}
            </span>
          </div>
        </div>
        <div className="flex flex-col text-[9px] md:text-[10px] text-slate-400 font-['Space_Mono']">
          <span className="text-slate-300 font-bold">
            {currentUser.rank === 1 ? 'TOP RANK' : 'TO NEXT RANK'}
          </span>
          <span>{currentUser.rank === 1 ? '(CHAMPION)' : `(${nextRankText})`}</span>
        </div>
      </div>

      {/* NODE TREE DIAGRAM SECTION */}
      <div className="hidden md:flex items-center">
        <svg width="50" height="60" className="mr-2">
          {/* Main horizontal line */}
          <line x1="0" y1="30" x2="20" y2="30" stroke="#38bdf8" strokeWidth="2" />
          {/* Node dot */}
          <circle cx="20" cy="30" r="3" fill="#38bdf8" />
          
          {/* Top branch (Hidden if 1st place) */}
          {currentUser.rank > 1 && (
            <>
              <path d="M 20 30 L 30 10 L 50 10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2 2" />
              <circle cx="50" cy="10" r="2" fill="rgba(255,255,255,0.3)" />
            </>
          )}

          {/* Middle branch (Active) */}
          <path d="M 20 30 L 50 30" fill="none" stroke="#f97316" strokeWidth="2" />
          <circle cx="50" cy="30" r="2" fill="#f97316" />

          {/* Bottom branch (Hidden if no one is below) */}
          {prevRankUser && (
            <>
              <path d="M 20 30 L 30 50 L 50 50" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2 2" />
              <circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.3)" />
            </>
          )}
        </svg>

        <div className="relative h-[60px] w-[140px] md:w-[160px] font-['Space_Mono']">
          {currentUser.rank > 1 && (
            <div className="absolute top-[2px] left-0 text-[10px] text-slate-400">
              [{nextRankText}]
            </div>
          )}
          
          <div className="absolute top-[50%] left-0 -translate-y-1/2 text-[10px] text-[#f97316] font-bold border border-[#f97316]/50 px-1.5 py-0.5 rounded bg-[#f97316]/10 whitespace-nowrap">
            [{getOrdinalSuffix(currentUser.rank)}] <span className="font-['Orbitron'] ml-1">{username}</span>
          </div>
          
          {prevRankUser && (
            <div className="absolute bottom-[2px] left-0 text-[10px] text-slate-400">
              [{prevRankText}]
            </div>
          )}
        </div>
      </div>

      {/* ACTION BUTTON */}
      <button 
        onClick={onClick}
        className="w-full xl:w-auto mt-4 xl:mt-0 py-2 md:py-3 px-4 md:px-6 rounded-lg font-bold text-[11px] md:text-xs tracking-wider transition-all"
        style={{ 
          border: '1px solid #38bdf8',
          color: '#38bdf8',
          background: 'rgba(56, 189, 248, 0.05)',
          boxShadow: '0 0 10px rgba(56, 189, 248, 0.1)'
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)';
          e.currentTarget.style.boxShadow = '0 0 15px rgba(56, 189, 248, 0.3)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = 'rgba(56, 189, 248, 0.05)';
          e.currentTarget.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.1)';
        }}
      >
        GO TO YOUR RANK
      </button>
    </div>
  );
}
