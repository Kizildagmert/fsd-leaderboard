import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import type { LeaderboardEntry, CurrentUserContext } from '../services/api';
import { CurrentUserCard, getOrdinalSuffix } from './CurrentUserCard';
import { LeaderboardRow } from './LeaderboardRow';

interface Props {
  entries: LeaderboardEntry[];
  neighbors: LeaderboardEntry[] | null;
  currentUser: CurrentUserContext | null;
  prizePool: number;
  currentUserId: string;
  isHistory?: boolean;
}

export function LeaderboardList({ entries, neighbors, currentUser, prizePool, currentUserId, isHistory = false }: Props) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const hasAutoScrolled = useRef(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isUserVisible, setIsUserVisible] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Group entries: sequential for mobile, paired (1-50, 51-100) for desktop
  const pairedEntries = useMemo(() => {
    const pairs = [];
    
    if (isMobile) {
      for (let i = 0; i < entries.length; i++) {
        pairs.push([entries[i]]);
      }
    } else {
      const half = Math.ceil(entries.length / 2);
      for (let i = 0; i < half; i++) {
        const left = entries[i];
        const right = entries[i + half];
        const pair = [left];
        if (right) pair.push(right);
        pairs.push(pair);
      }
    }
    
    // If the user is outside the Top 100, append them at the bottom
    if (!isHistory && currentUser && currentUser.rank > entries.length && neighbors && neighbors.length > 0) {
      // Add a separator row
      pairs.push([{ rank: -1, userId: 'SEPARATOR', username: '...', score: 0 } as LeaderboardEntry]);
      
      if (isMobile) {
        for (let i = 0; i < neighbors.length; i++) {
          pairs.push([neighbors[i]]);
        }
      } else {
        for (let i = 0; i < neighbors.length; i += 2) {
          const left = neighbors[i];
          const right = neighbors[i + 1];
          const pair = [left];
          if (right) pair.push(right);
          pairs.push(pair);
        }
      }
    }
    
    return pairs;
  }, [entries, currentUser, neighbors, isMobile]);

  const userPairIndex = useMemo(() => {
    return pairedEntries.findIndex(pair => pair.some(e => e.rank === currentUser?.rank));
  }, [pairedEntries, currentUser]);

  const maxScore = entries.length > 0 ? entries[0].score : 1;

  const handleScrollToMe = () => {
    if (isHistory) return;
    if (userPairIndex !== -1 && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({ index: userPairIndex, align: 'center', behavior: 'auto' });
    }
  };

  const handleRangeChanged = (range: { startIndex: number; endIndex: number }) => {
    if (userPairIndex !== -1) {
      if (userPairIndex >= range.startIndex && userPairIndex <= range.endIndex) {
        setIsUserVisible(true);
      } else {
        setIsUserVisible(false);
      }
    } else {
      setIsUserVisible(true);
    }
  };

  const currentUsername = entries.find(e => e.userId === currentUserId)?.username || 'DemoPlayer';

  return (
    <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-4 relative z-10">
      
      {/* Outer Cyan Box */}
      <div 
        className="flex-1 flex flex-col bg-[#0f172a]/60 backdrop-blur-sm border-2 border-[#38bdf8] rounded-xl overflow-hidden relative"
        style={{ boxShadow: '0 0 20px rgba(56,189,248,0.2), inset 0 0 20px rgba(56,189,248,0.1)' }}
      >
        {/* Title */}
        {isHistory ? (
          <div className="py-3 text-center border-b-2 border-[#f97316]/50 bg-[#f97316]/20 text-[#ffedd5] font-['Orbitron'] font-bold tracking-widest text-sm shadow-[0_5px_15px_rgba(249,115,22,0.3)] z-10 flex items-center justify-center gap-2">
            <span>🏁</span>
            <span>PREVIOUS WEEK FINAL RESULTS</span>
            <span>🏁</span>
          </div>
        ) : (
          <div className="py-3 text-center border-b-2 border-[#38bdf8]/50 bg-[#38bdf8]/10 text-[#e0f2fe] font-['Orbitron'] font-bold tracking-widest text-sm shadow-[0_5px_15px_rgba(0,0,0,0.3)] z-10">
            CURRENT WEEK LEADERBOARD
          </div>
        )}

        {/* VIRTUALIZED LIST */}
        <div className="flex-1 p-4">
          <Virtuoso
            ref={virtuosoRef}
            className="custom-scrollbar pr-2"
            style={{ height: '100%' }}
            data={pairedEntries}
            rangeChanged={handleRangeChanged}
            itemContent={(index: number, pair: (LeaderboardEntry | undefined)[]) => {
              if (pair[0]?.rank === -1) {
                const X = currentUser ? Math.max(0, currentUser.rank - entries.length) : 0;
                return (
                  <div style={{
                    fontSize: '11px',
                    color: '#4fc3f7',
                    textAlign: 'center',
                    padding: '16px 0',
                    letterSpacing: '2px',
                    borderTop: '1px solid rgba(79,195,247,0.2)',
                    borderBottom: '1px solid rgba(79,195,247,0.2)',
                    marginBottom: '1rem',
                    width: '100%',
                    fontFamily: "'Orbitron', sans-serif"
                  }}>
                    ════════ {X} OYUNCU DAHA ════════
                  </div>
                );
              }

              return (
                <div className="flex flex-col lg:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    {pair[0] && <LeaderboardRow entry={pair[0]} currentUserId={currentUserId} maxScore={maxScore} />}
                  </div>
                  <div className="flex-1">
                    {pair[1] && <LeaderboardRow entry={pair[1]} currentUserId={currentUserId} maxScore={maxScore} />}
                  </div>
                </div>
              );
            }}
          />
        </div>
      </div>

      {/* Floating User Card HUD */}
      <div className="relative z-20 mt-4">
        {!isHistory && (!isUserVisible || (currentUser && currentUser.rank > 20)) && currentUser && (
          <div className="animate-slide-up">
            <CurrentUserCard 
              currentUser={currentUser} 
              prizePool={prizePool} 
              username={currentUsername}
              neighbors={neighbors}
              entries={entries}
              onClick={handleScrollToMe}
            />
          </div>
        )}

        {isHistory && !entries.some(e => e.userId === currentUserId) && currentUser && (
          <div className="animate-slide-up flex flex-col md:flex-row items-center justify-center p-4 md:p-5 bg-[#0f172a]/95 backdrop-blur-md border-2 border-[#f97316] rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.2),inset_0_0_10px_rgba(249,115,22,0.1)] mt-2 font-['Orbitron']">
            
            <div className="flex flex-col items-center md:border-r border-white/10 md:pr-6 mb-4 md:mb-0">
              <span className="text-[10px] md:text-xs text-slate-300 tracking-widest font-bold mb-1">YOUR RANKING</span>
              <div className="text-[#f97316] font-black text-2xl md:text-3xl" style={{ textShadow: '0 0 10px rgba(249,115,22,0.5)' }}>
                [{getOrdinalSuffix(currentUser.rank)}]
              </div>
            </div>

            <div className="flex items-center gap-4 md:pl-6 md:border-r border-white/10 md:pr-6 mb-4 md:mb-0">
              <div className="p-1 bg-[#1e3a8a] border-2 border-[#3b82f6] rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                <img 
                  src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${currentUsername}`} 
                  alt="Avatar" 
                  className="w-10 h-10 md:w-12 md:h-12 rounded bg-black/40"
                />
              </div>
              <div className="flex flex-col">
                <div className="text-blue-300 font-bold text-xs md:text-sm mb-1">
                  <span className="text-blue-400">YOU:</span> {currentUsername}
                </div>
                <div className="text-white font-bold text-lg md:text-xl flex items-center gap-2">
                  {currentUser.score.toLocaleString()} 
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#38bdf8]">
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
                    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
                    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
                    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center md:pl-6">
              <span className="text-[10px] md:text-xs text-slate-300 tracking-widest font-bold mb-1">REWARD</span>
              <div className="text-[#fbbf24] font-black text-xl md:text-2xl" style={{ textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>
                {currentUser.rewardAmount ? Math.floor(currentUser.rewardAmount).toLocaleString() : 0} 
                <span className="text-sm ml-1">COIN</span>
              </div>
            </div>

          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); border-left: 1px solid rgba(56, 189, 248, 0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #0ea5e9, #0284c7); border-radius: 10px; border: 2px solid #0f172a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #38bdf8; }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
