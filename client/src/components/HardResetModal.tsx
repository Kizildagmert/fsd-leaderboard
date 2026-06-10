import React from 'react';

interface Props {
  isOpen: boolean;
  isResetting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function HardResetModal({ isOpen, isResetting, onConfirm, onCancel }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div 
        className="w-full max-w-md bg-[#0f172a] border-2 border-red-500 rounded-xl p-8 flex flex-col items-center relative"
        style={{ boxShadow: '0 0 40px rgba(239,68,68,0.4), inset 0 0 20px rgba(239,68,68,0.1)' }}
      >
        <div className="w-20 h-20 mb-6 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-900/30 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
          <span className="text-4xl">⚠️</span>
        </div>

        <h2 className="text-red-500 font-bold text-2xl mb-4 tracking-widest text-center" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          HARD RESET
        </h2>

        {!isResetting ? (
          <>
            <p className="text-red-200 text-center mb-8 font-medium">
              TÜM veritabanı silinecek ve 1. Haftaya dönülecektir. Bu işlem geri alınamaz. Emin misiniz?
            </p>

            <div className="flex gap-4 w-full">
              <button 
                onClick={onCancel}
                className="flex-1 py-3 text-[#94a3b8] hover:text-white border border-[#334155] hover:border-[#94a3b8] rounded font-bold transition-colors"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                HAYIR, İPTAL
              </button>
              <button 
                onClick={onConfirm}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow-[0_0_15px_rgba(239,68,68,0.6)] transition-all"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                EVET, SIFIRLA
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-6 w-full">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-red-400 font-bold animate-pulse text-center tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              VERİTABANI SIFIRLANIYOR...<br/>
              <span className="text-sm font-normal opacity-70 mt-2 inline-block">100.000 kullanıcı yükleniyor, lütfen bekleyin.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
