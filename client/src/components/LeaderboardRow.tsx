import React from 'react';
import type { LeaderboardEntry } from '../services/api';
import { useCountUp } from '../hooks/useCountUp';

interface Props {
  entry: LeaderboardEntry;
  currentUserId: string;
  maxScore: number;
}

export function LeaderboardRow({ entry, currentUserId, maxScore }: Props) {
  const isMe = entry.userId === currentUserId;
  const animatedScore = useCountUp(entry.score, 1000);

  // Compute progress bar width relative to max score
  const progressPercent = maxScore > 0 ? (entry.score / maxScore) * 100 : 0;

  // Determine borders and colors for Top 3
  let rankColorClass = 'text-slate-300';
  let rankBorderColor = 'border-white/10';
  let bgClass = 'bg-[#0f172a]/80';
  let medalIcon = null;

  if (entry.rank === 1) {
    rankColorClass = 'text-yellow-400';
    rankBorderColor = 'border-yellow-500';
    bgClass = 'bg-gradient-to-r from-yellow-900/40 to-[#0f172a]/80 border border-yellow-600/50';
    medalIcon = '🥇';
  } else if (entry.rank === 2) {
    rankColorClass = 'text-slate-200';
    rankBorderColor = 'border-slate-300';
    bgClass = 'bg-gradient-to-r from-slate-600/40 to-[#0f172a]/80 border border-slate-400/50';
    medalIcon = '🥈';
  } else if (entry.rank === 3) {
    rankColorClass = 'text-orange-400';
    rankBorderColor = 'border-orange-600';
    bgClass = 'bg-gradient-to-r from-orange-900/40 to-[#0f172a]/80 border border-orange-600/50';
    medalIcon = '🥉';
  }

  const customStyle = (isMe && entry.rank > 3) ? { background: 'rgba(255,165,0,0.15)' } : {};

  return (
    <div 
      className={`flex items-center p-2 rounded-lg gap-3 font-['Orbitron'] ${!isMe || entry.rank <= 3 ? bgClass : ''} shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
      style={customStyle}
    >
      
      {/* RANK */}
      <div className={`w-10 text-center font-bold text-sm ${rankColorClass}`}>
        [{entry.rank}]
      </div>

      {/* AVATAR */}
      <div className={`p-0.5 rounded border-2 ${rankBorderColor} bg-[#1e3a8a]`}>
        <img 
          src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${entry.username}`} 
          alt="Avatar" 
          className="w-8 h-8 rounded-sm bg-black/40"
        />
      </div>

      {/* NAME */}
      <div className={`flex-1 font-bold text-sm truncate ${isMe ? 'text-[#f97316]' : 'text-slate-200'}`}>
        {entry.username} {isMe && <span className="ml-2 text-[10px] bg-[#f97316]/20 border border-[#f97316] px-1 rounded text-[#f97316]">YOU</span>}
      </div>

      {/* SCORE AND PROGRESS */}
      <div className="flex flex-col items-end justify-center w-32">
        <div className="flex items-center gap-1 text-white font-bold text-sm">
          {Math.floor(animatedScore).toLocaleString()}
          <span className="flex items-center justify-center w-5 h-5 ml-1">
            {medalIcon || (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#38bdf8]">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
              </svg>
            )}
          </span>
        </div>
        <div className="w-full h-1.5 bg-black/50 mt-1 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#38bdf8] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%`, boxShadow: '0 0 5px #38bdf8' }}
          />
        </div>
        {entry.rewardAmount !== undefined && (
          <div className="text-[11px] font-bold text-yellow-400 mt-1">
            💰 {entry.rewardAmount.toLocaleString()}
          </div>
        )}
      </div>

    </div>
  );
}
