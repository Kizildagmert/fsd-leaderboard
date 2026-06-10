import { useState, useEffect, useRef } from 'react';

export function useCountUp(targetValue: number, duration: number = 1000): number {
  const [currentValue, setCurrentValue] = useState(targetValue);
  const targetValueRef = useRef(targetValue);
  const startValueRef = useRef(targetValue);

  useEffect(() => {
    // If the target hasn't changed, don't run a new animation
    if (targetValue === targetValueRef.current) {
      return;
    }
    
    // Update the ref immediately to avoid stale state if animation is cancelled
    targetValueRef.current = targetValue;
    // Save the starting value for the animation
    startValueRef.current = currentValue;

    const startValue = startValueRef.current;
    const endValue = targetValue;
    const startTime = performance.now();

    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      
      // Easing function (easeOutExpo)
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const nextValue = startValue + (endValue - startValue) * easeOut;
      setCurrentValue(nextValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCurrentValue(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [targetValue, duration]); // REMOVED currentValue to prevent re-running and cancelling the animation

  return currentValue;
}
