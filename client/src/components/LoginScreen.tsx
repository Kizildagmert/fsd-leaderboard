import { useState } from 'react';
import { login } from '../services/api';
import { Background3D } from './Background3D';

interface Props {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [email, setEmail]       = useState('demo@panteon.games');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      onLogin();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      
      <Background3D />

      <div className="z-20 bg-[#0f172a]/90 backdrop-blur-md border-2 border-[#38bdf8] p-10 w-[420px] max-w-[90vw] rounded-xl shadow-[0_0_30px_rgba(56,189,248,0.3),inset_0_0_20px_rgba(56,189,248,0.1)] flex flex-col gap-6 relative">
        
        {/* Top Decorative Lines */}
        <div className="absolute top-0 left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent"></div>
        
        <div className="text-center flex flex-col items-center">
          <h1 className="text-4xl font-black text-[#e0f2fe] font-['Orbitron'] tracking-widest" style={{ textShadow: '0 0 20px rgba(56,189,248,0.8)' }}>
            NEON NEXUS
          </h1>
          <div className="w-24 h-1 mt-3 bg-gradient-to-r from-transparent via-[#f97316] to-transparent shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
          <p className="text-[#38bdf8] font-['Space_Mono'] text-xs mt-4 tracking-widest font-bold">
            [ SYSTEM LOGIN ]
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-[#38bdf8] font-['Orbitron'] text-[10px] tracking-widest font-bold ml-1">EMAIL ADDRESS</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-black/40 border border-[#1e293b] text-white p-3 rounded-lg font-['Space_Mono'] outline-none focus:border-[#38bdf8] focus:shadow-[0_0_10px_rgba(56,189,248,0.2)] transition-all"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[#38bdf8] font-['Orbitron'] text-[10px] tracking-widest font-bold ml-1">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-black/40 border border-[#1e293b] text-white p-3 rounded-lg font-['Space_Mono'] outline-none focus:border-[#38bdf8] focus:shadow-[0_0_10px_rgba(56,189,248,0.2)] transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/50 text-red-400 p-3 rounded-lg font-['Space_Mono'] text-xs flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold py-3.5 rounded-lg border border-sky-300 shadow-[0_0_15px_rgba(14,165,233,0.6)] transition-all font-['Orbitron'] tracking-widest"
          >
            {loading ? 'AUTHENTICATING...' : 'CONNECT'}
          </button>
        </form>

        <div className="mt-4 text-[#64748b] text-[10px] font-['Space_Mono'] text-center flex flex-col items-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#1e293b] to-transparent mb-4"></div>
          Demo Access: demo@panteon.games / demo123
        </div>
      </div>
    </div>
  );
}
