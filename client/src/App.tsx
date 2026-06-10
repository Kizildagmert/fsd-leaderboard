import { useState, useEffect, useCallback, useRef } from 'react';
import { getLeaderboard, getPreviousLeaderboard, logout, addScore, triggerReset, simulateScores } from './services/api';
import type { LeaderboardResult } from './services/api';

import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LeaderboardList } from './components/LeaderboardList';
import { MobileSettingsModal } from './components/MobileSettingsModal';
import { TopStatsBar } from './components/TopStatsBar';
import { HardResetModal } from './components/HardResetModal';
import { Background3D } from './components/Background3D';
import './index.css';

const POLL_MS = 10_000;
const SIM_MS = 5_000;

function getUserIdFromToken(): string | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload as { userId: string }).userId ?? null;
  } catch { return null; }
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('token'));
  const [data, setData] = useState<LeaderboardResult | null>(null);
  
  const [simOn, setSimOn] = useState(false);
  const [simCountdown, setSimCountdown] = useState<number | null>(null);
  const [simulatedTimeElapsed, setSimulatedTimeElapsed] = useState<number>(0);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simRoundPromiseRef = useRef<Promise<void> | null>(null);

  const [activeTab, setActiveTab] = useState<'current' | 'previous'>('current');
  const [prevData, setPrevData] = useState<{ week: number, topHundred: LeaderboardResult['topHundred'], currentUser: CurrentUserContext | null } | null>(null);

  const [isCalculating, setIsCalculating] = useState(false);

  const currentUserId = getUserIdFromToken() ?? '';

  const fetchLeaderboard = useCallback(async () => {
    if (!isLoggedIn || isCalculating) return;
    try {
      const res = await getLeaderboard();
      setData(res);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('401') || msg.toLowerCase().includes('token')) {
        handleLogout();
      }
    }
  }, [isLoggedIn, isCalculating]);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchLeaderboard();
  }, [isLoggedIn, fetchLeaderboard]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const t = setInterval(fetchLeaderboard, POLL_MS);
    return () => clearInterval(t);
  }, [isLoggedIn, fetchLeaderboard]);

  useEffect(() => () => stopSim(), []);

  useEffect(() => {
    if (activeTab === 'previous' && !prevData) {
      import('./services/api').then(m => m.getPreviousLeaderboard()).then(setPrevData).catch(console.error);
    }
  }, [activeTab, prevData]);

  function handleLogin() { setIsLoggedIn(true); }
  function handleLogout() { logout(); window.location.reload(); }

  function stopSim() {
    if (simRef.current) { clearInterval(simRef.current); simRef.current = null; }
    setSimOn(false);
    setSimCountdown(null);
    setSimulatedTimeElapsed(0);
  }

  async function handleAddScore() {
    try {
      const { addScore } = await import('./services/api');
      await addScore(50);
      setTimeout(fetchLeaderboard, 500);
    } catch (e) {
      console.error(e);
    }
  }


  async function handleReset(skipConfirm = false) {
    if (!skipConfirm && !confirm('Haftalık sıfırlama yapılsın mı?')) return;
    stopSim();
    setIsCalculating(true);
    try {
      // 0. Wait for any currently flying simulation requests to fully resolve in the backend
      if (simRoundPromiseRef.current) {
        await simRoundPromiseRef.current;
      }

      const api = await import('./services/api');
      
      // 1. Flush any pending simulated scores left in the server buffer
      await api.flushServerBuffer();
      
      // 2. Fetch the final absolute state directly from the API to avoid closure staleness
      const finalBoard = await api.getLeaderboard();
      setData(finalBoard);
      
      // 3. Wait 3 seconds so the user can look at the final numbers
      setTimeout(async () => {
        // 4. Trigger the actual reset which saves to DB and deletes Redis keys
        await api.triggerReset();
        
        // 5. Explicitly clear the current tab's data so it's empty while the server restarts
        const dummyEntries = Array.from({ length: 100 }, (_, i) => ({
          rank: i + 1,
          userId: `reset_player_${i}`,
          username: `...`,
          score: 0
        }));
        
        setData(prev => prev ? { 
          ...prev, 
          topHundred: dummyEntries, 
          prizePool: 0, 
          currentUser: null,
          week: prev.week + 1
        } : null);
        
        // 6. Switch to previous week
        setPrevData(null); 
        setActiveTab('previous');
        setIsCalculating(false);
      }, 3000);
      
    } catch (e) {
      console.error(e);
      setIsCalculating(false);
    }
  }

  const isSimulatingRef = useRef(false);

  async function simRound() {
    if (isSimulatingRef.current || isCalculating) return;
    isSimulatingRef.current = true;
    const promise = (async () => {
      try {
        const { simulateScores } = await import('./services/api');
        await simulateScores();
        await fetchLeaderboard();
      } catch (e) {
        console.error(e);
        stopSim();
      } finally {
        isSimulatingRef.current = false;
      }
    })();
    simRoundPromiseRef.current = promise;
    await promise;
  }

  async function handleHardReset() {
    setIsHardResetting(true);
    stopSim();
    try {
      await import('./services/api').then(m => m.hardReset());
      // Wait 3 seconds for server to restart, then reload page
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (e) {
      console.error('Hard reset failed:', e);
      alert('Hard reset başarısız! Konsolu kontrol edin.');
      setIsHardResetModalOpen(false);
      setIsHardResetting(false);
    }
  }

  function handleToggleSim() {
    if (simOn) {
      stopSim();
    } else {
      setSimOn(true);
      setSimCountdown(90);
      setSimulatedTimeElapsed(0);
      
      // Backend anında Redis'e yazdığı için görsel bütünlüğü korumak adına,
      // ilk skor isteğini 5 saniye sonraya, yani setInterval içine bıraktık.

      simRef.current = setInterval(() => {
        let shouldReset = false;
        
        setSimCountdown(prev => {
          if (prev === null) return null;
          
          if (prev <= 0) {
            shouldReset = true;
            return null;
          }
          
          if (prev - 5 <= 0) {
            shouldReset = true;
            return 0; 
          }
          
          return prev - 5;
        });

        if (shouldReset) {
          handleReset(true);
        } else {
          setSimulatedTimeElapsed(time => time + 33_480_000);
          simRound(); // Her 5 saniyede bir yeni skorlar buffer'a atılır
        }
      }, SIM_MS);
    }
  }

  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [isHardResetModalOpen, setIsHardResetModalOpen] = useState(false);
  const [isHardResetting, setIsHardResetting] = useState(false);

  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;

  if (!data) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-green)' }}>
        LOADING...
      </div>
    );
  }

  return (
    <div className="app-wrapper relative min-h-screen flex">
      <Background3D />
      
      {/* MASAÜSTÜ SIDEBAR */}
      <div className="hidden md:flex relative z-30">
        <Sidebar 
          onSimulate={handleToggleSim}
          onHardReset={() => setIsHardResetModalOpen(true)}
          onLogout={handleLogout}
          simOn={simOn}
          simCountdown={simCountdown}
          currentWeek={data.week}
        />
      </div>

      {/* ANA İÇERİK */}
      <div className="main-content flex-1 flex flex-col items-center">
        
        {/* MOBİL AYARLAR BUTONU */}
        <button 
          onClick={() => setIsMobileModalOpen(true)}
          className="md:hidden absolute top-3 right-3 z-50 bg-[#0f172a] border-2 border-[#38bdf8] text-[#38bdf8] w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md shadow-[0_0_15px_rgba(56,189,248,0.5)] animate-pulse"
          aria-label="Controls Panel"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>

        <Header />
        
        <div className="w-full max-w-5xl mx-auto flex flex-col flex-1 pb-4 relative z-10">
          <TopStatsBar 
            prizePool={activeTab === 'current' ? (data.prizePool || 0) : (prevData?.prizePool || 0)} 
            simulatedTimeElapsed={simulatedTimeElapsed} 
            currentWeek={data.week}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            simOn={simOn}
            isCalculating={isCalculating}
          />
          
          {activeTab === 'current' ? (
            <LeaderboardList 
              entries={data.topHundred} 
              neighbors={data.currentUser?.neighbors || null}
              currentUser={data.currentUser}
              prizePool={data.prizePool} 
              currentUserId={currentUserId}
              currentUsername="DemoPlayer"
            />
          ) : (
            <LeaderboardList 
              entries={prevData?.topHundred || []} 
              neighbors={null}
              currentUser={prevData?.currentUser || null}
              prizePool={prevData?.prizePool || 0}
              currentUserId={currentUserId}
              currentUsername="DemoPlayer"
              isHistory={true}
            />
          )}
        </div>
      </div>

      {/* MOBİL MODAL */}
      <MobileSettingsModal 
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        onSimulate={handleToggleSim}
        onHardReset={() => setIsHardResetModalOpen(true)}
        onLogout={handleLogout}
        simOn={simOn}
        simCountdown={simCountdown}
      />

      <HardResetModal 
        isOpen={isHardResetModalOpen}
        isResetting={isHardResetting}
        onCancel={() => setIsHardResetModalOpen(false)}
        onConfirm={handleHardReset}
      />
    </div>
  );
}
