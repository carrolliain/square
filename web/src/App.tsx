import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { GameCanvas } from './components/GameCanvas';
import { DPad } from './components/DPad';
import { HUD } from './components/HUD';
import type { ControlKey, GameState } from './types';
import { createInitialState, setupLevel, tryMove } from './gameLogic';
import { useKeyboard } from './hooks/useKeyboard';
import { useSwipe } from './hooks/useSwipe';

function App() {
  const [state, setState] = useState<GameState>(() => setupLevel(createInitialState()));
  // Support ?level=N in URL like original
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('level');
    const num = raw ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(num) && num >= 1) {
      setState((s) => setupLevel({ ...s, level: num }));
    }
  }, []);

  const onKey = useCallback((k: ControlKey) => {
    setState((s) => tryMove(s, k));
    if (navigator.vibrate) navigator.vibrate(10);
  }, []);

  useKeyboard(onKey);
  const swipe = useSwipe(onKey);

  useEffect(() => {
    const onSetLevel = (e: Event) => {
      const level = (e as CustomEvent).detail?.level as number;
      if (typeof level === 'number' && level >= 1) {
        setState((s) => setupLevel({ ...s, level }));
      }
    };
    window.addEventListener('set-level', onSetLevel as any);
    return () => window.removeEventListener('set-level', onSetLevel as any);
  }, []);

  const onResizeCell = useCallback((cellPx: number) => {
    setState((s) => ({ ...s, cellSizePx: cellPx }));
  }, []);

  const wrapStyle: React.CSSProperties = useMemo(() => ({
    minHeight: '100vh', display: 'grid', gridTemplateRows: 'auto 1fr auto', background: '#181a20', color: '#fff'
  }), []);

  const mainRowStyle: React.CSSProperties = useMemo(() => ({
    width: '100%', maxWidth: 920, display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 16, padding: '10px'
  }), []);

  return (
    <div style={wrapStyle}>
      <HUD level={state.level} gateActive={state.gateActive} hasKey={state.hasKey} />
      <div style={mainRowStyle}>
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', fontSize: 14, opacity: 0.7, marginBottom: 8 }}>Swipe anywhere or use the D-pad</div>
          <div onTouchStart={swipe.onTouchStart} onTouchEnd={swipe.onTouchEnd}>
            <GameCanvas state={state} onResizeCell={onResizeCell} />
          </div>
        </div>
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <DPad onPress={onKey} />
        </div>
      </div>
    </div>
  );
}

export default App;
