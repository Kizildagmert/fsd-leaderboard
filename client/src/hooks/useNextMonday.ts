import { useState, useEffect } from 'react';

export function useNextMonday(simulatedTimeElapsed: number = 0, simOn: boolean = false) {
  const [timeLeft, setTimeLeft] = useState({ days: 7, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function calculateTimeLeft() {
      // Total week time in ms: 7 days
      const totalMs = 7 * 24 * 60 * 60 * 1000;
      
      // Calculate how much time is left based solely on simulation elapsed time
      const diff = Math.max(0, totalMs - simulatedTimeElapsed);

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    }

    // Since we don't use real-time ticking anymore, we only need to update 
    // when simulatedTimeElapsed changes. It will instantly jump down 9.3 hours
    // every 5 seconds.
    setTimeLeft(calculateTimeLeft());
  }, [simulatedTimeElapsed]);

  return timeLeft;
}
