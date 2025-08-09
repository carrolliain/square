import type { ControlKey, GameState, Point } from '../types';
import { isInsideRect } from './geometry';
import { isBlocked } from './blocked';
import { nextLevel } from './level';

export function tryMove(prev: GameState, keyName: ControlKey): GameState {
  const mapping = prev.currentMapping;
  const delta = mapping[keyName];
  if (!delta) return prev;
  const [dx, dy] = delta;

  let nx = prev.player.x + dx;
  let ny = prev.player.y + dy;
  if (nx < 0 || nx >= prev.gridSize || ny < 0 || ny >= prev.gridSize) return prev;
  if (isBlocked(nx, ny, prev.blockedTiles)) return prev;
  if ((nx === prev.hole.x && ny === prev.hole.y) && ((prev.gateActive && !prev.hasKey) || (prev.level >= 11 && !prev.usedPortal))) {
    return prev;
  }
  if (prev.level >= 11 && prev.islandRects && prev.islandRects.length) {
    const isInsideAny = (x: number, y: number) => {
      for (const r of prev.islandRects!) {
        if (isInsideRect(x, y, r.x, r.y, r.w, r.h)) return true;
      }
      return false;
    };
    const islandIndexAt = (x: number, y: number): number => {
      for (let i = 0; i < (prev.islandRects?.length || 0); i++) {
        const r = prev.islandRects![i];
        if (isInsideRect(x, y, r.x, r.y, r.w, r.h)) return i;
      }
      return -1;
    };
    const curInside = isInsideAny(prev.player.x, prev.player.y);
    const nextInside = isInsideAny(nx, ny);
    if (curInside !== nextInside) {
      return prev;
    }
    if (curInside && nextInside) {
      const curIdx = islandIndexAt(prev.player.x, prev.player.y);
      const nextIdx = islandIndexAt(nx, ny);
      if (curIdx !== nextIdx) return prev;
    }
  }

  let cx = nx;
  let cy = ny;
  let hasKey = prev.hasKey;
  let gateActive = prev.gateActive;
  let key: Point | null = prev.key;
  let portalAKey = prev.portalAKey ?? null;
  let usedPortal = prev.usedPortal;

  if (key && cx === key.x && cy === key.y) {
    hasKey = true;
    key = null;
    gateActive = false;
  }

  if (portalAKey && cx === portalAKey.x && cy === portalAKey.y) {
    portalAKey = null;
    (prev as any).hasPortalAKey = true;
  }

  const attemptPortalTeleport = () => {
    const aLocked = prev.level >= 16 ? prev.portalALocked && !(prev as any).hasPortalAKey : false;
    const pairs: Array<{ a: Point | null | undefined; b: Point | null | undefined; locked?: boolean }> = [
      { a: prev.portalEntry, b: prev.portalExit },
      { a: prev.portalAEntry!, b: prev.portalAExit!, locked: aLocked },
      { a: prev.portalBEntry!, b: prev.portalBExit!, locked: prev.portalBLocked },
    ];
    for (const p of pairs) {
      if (!p.a || !p.b) continue;
      const onA = cx === p.a.x && cy === p.a.y;
      const onB = cx === p.b.x && cy === p.b.y;
      if (!onA && !onB) continue;
      if (p.locked) return { cx, cy, usedPortal };
      const dest = onA ? p.b : p.a;
      usedPortal = true;
      return { cx: dest.x, cy: dest.y, usedPortal };
    }
    return { cx, cy, usedPortal };
  };

  ({ cx, cy, usedPortal } = attemptPortalTeleport());

  const updated: GameState = {
    ...prev,
    player: { x: cx, y: cy },
    hasKey,
    key,
    portalAKey,
    gateActive,
    usedPortal,
  };

  if (updated.player.x === updated.hole.x && updated.player.y === updated.hole.y) {
    return nextLevel(updated);
  }
  return updated;
}


