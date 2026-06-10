import { useState } from 'react';

interface Props {
  onAddScore: () => void;
  onReset: () => void;
  onSimulate: () => void;
  simOn: boolean;
}

export function TestPanel({ onAddScore, onReset, onSimulate, simOn }: Props) {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <div className="test-panel" style={{ padding: '4px' }}>
        <button onClick={() => setIsOpen(true)}>Dev Modu Aç</button>
      </div>
    );
  }

  return (
    <div className="test-panel">
      <button style={{ flex: '0 0 auto' }} onClick={() => setIsOpen(false)}>
        Kapat
      </button>
      <button onClick={onAddScore} style={{ color: 'var(--primary)' }}>
        ⚡ +10k Skor
      </button>
      <button onClick={onSimulate} style={{ color: simOn ? 'var(--danger)' : 'var(--success)' }}>
        {simOn ? '⏹ Simülasyon Durdur' : '▶ Simülasyon Başlat'}
      </button>
      <button onClick={onReset} style={{ color: 'var(--danger)' }}>
        🔄 Haftayı Bitir
      </button>
    </div>
  );
}
