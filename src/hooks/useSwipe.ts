import { useRef, useCallback } from 'react';
import type { ControlKey } from '../types';

export function useSwipe(onKey: (key: ControlKey) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const SWIPE_THRESHOLD = 18;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    start.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!start.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (Math.max(adx, ady) >= SWIPE_THRESHOLD) {
      if (adx > ady) onKey(dx > 0 ? 'ArrowRight' as ControlKey : 'ArrowLeft');
      else onKey(dy > 0 ? 'ArrowDown' as ControlKey : 'ArrowUp');
    }
    start.current = null;
  }, [onKey]);

  return { onTouchStart, onTouchEnd };
}


