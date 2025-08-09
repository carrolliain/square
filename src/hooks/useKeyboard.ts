import { useEffect } from 'react';
import type { ControlKey } from '../types';

export function useKeyboard(onKey: (key: ControlKey) => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key as ControlKey;
      if (k === 'ArrowUp' || k === 'ArrowRight' || k === 'ArrowDown' || k === 'ArrowLeft') {
        e.preventDefault();
        onKey(k);
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        const input = window.prompt('Start at level:', '1');
        const num = input ? parseInt(input, 10) : NaN;
        if (Number.isFinite(num) && num >= 1) {
          // consumer should handle setting level externally
          const ev = new CustomEvent('set-level', { detail: { level: num } });
          window.dispatchEvent(ev);
        }
      }
    };
    window.addEventListener('keydown', handler, { passive: false } as any);
    return () => window.removeEventListener('keydown', handler as any);
  }, [onKey]);
}


