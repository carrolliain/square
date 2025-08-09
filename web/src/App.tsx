import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { GameCanvas } from './components/GameCanvas';
import { DPad } from './components/DPad';
import { HUD } from './components/HUD';
import type { ControlKey, GameState } from './types';
import { createInitialState, setupLevel, tryMove } from './gameLogic';
import { enemy1Tick, enemy1bTick } from './logic/enemy1';
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

  // Enemy roaming ticker: independent of player moves
  useEffect(() => {
    let raf = 0;
    let last1 = performance.now();
    let lastB = performance.now();
    const stepMs1 = 450; // enemy1 speed
    const stepMsB = 520; // enemy1b speed
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      setState((s) => {
        if (s.level < 21) return s;
        let next: GameState = s;
        // enemy1 timer
        if (next.enemy && t - last1 >= stepMs1) {
          last1 = t;
          const e1 = enemy1Tick(next);
          next = { ...next, enemy: e1.pos, enemyDir: e1.dir as any, enemyTarget: e1.target, enemyStepBudget: e1.stepBudget, enemyVisited: e1.visited } as any;
          if (next.player.x === e1.pos.x && next.player.y === e1.pos.y) {
            const levelGateActive = next.level >= 6;
            const restoredKey = (next as any).initialKey ?? null;
            const restoredPortalAKey = (next as any).initialPortalAKey ?? null;
            next = { ...next, player: { x: 0, y: 0 }, hasKey: false, key: restoredKey, hasPortalAKey: false, portalAKey: restoredPortalAKey, gateActive: levelGateActive } as GameState;
          }
        }
        // enemy1b timer
        if (next.level >= 24 && (next as any).enemy1b && t - lastB >= stepMsB) {
          lastB = t;
          const eb = enemy1bTick(next);
          next = { ...next, enemy1b: eb.pos, enemy1bDir: eb.dir as any, enemy1bTarget: eb.target, enemy1bStepBudget: eb.stepBudget, enemy1bVisited: eb.visited } as any;
          if (next.player.x === (next as any).enemy1b.x && next.player.y === (next as any).enemy1b.y) {
            const levelGateActive = next.level >= 6;
            const restoredKey = (next as any).initialKey ?? null;
            const restoredPortalAKey = (next as any).initialPortalAKey ?? null;
            next = { ...next, player: { x: 0, y: 0 }, hasKey: false, key: restoredKey, hasPortalAKey: false, portalAKey: restoredPortalAKey, gateActive: levelGateActive } as GameState;
          }
        }
        return next;
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state.level]);

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
