import type { GameState, Point } from '../types';
import { randomInt } from './random';
import { isInsideRect, isOrthAdjacent, isAdjToAny, rectsOverlapWithGap, isSameCell } from './geometry';
import { isBlocked } from './blocked';
import { bfsReachableOpenCells } from './pathfinding';
import { mappings } from './controls';
import { validateLevel } from '../rules';

function cellKey(x: number, y: number): string { return `${x},${y}`; }

function isTaken(
  x: number,
  y: number,
  st: GameState,
  opts: { ignoreHole?: boolean; ignoreKey?: boolean; ignoreEntry?: boolean; ignoreExit?: boolean; ignorePortalAKey?: boolean } = {}
) {
  const { ignoreHole = false, ignoreKey = false, ignoreEntry = false, ignoreExit = false, ignorePortalAKey = false } = opts;
  if (x === 0 && y === 0) return true; // start
  if (!ignoreHole && st.hole && st.hole.x === x && st.hole.y === y) return true;
  if (!ignoreKey && st.key && st.key.x === x && st.key.y === y) return true;
  if (!ignoreEntry && st.portalEntry && st.portalEntry.x === x && st.portalEntry.y === y) return true;
  if (!ignoreExit && st.portalExit && st.portalExit.x === x && st.portalExit.y === y) return true;
  // Level 16+ elements
  if (st.portalAEntry && st.portalAEntry.x === x && st.portalAEntry.y === y) return true;
  if (st.portalAExit && st.portalAExit.x === x && st.portalAExit.y === y) return true;
  if (st.portalBEntry && st.portalBEntry.x === x && st.portalBEntry.y === y) return true;
  if (st.portalBExit && st.portalBExit.x === x && st.portalBExit.y === y) return true;
  if (!ignorePortalAKey && st.portalAKey && st.portalAKey.x === x && st.portalAKey.y === y) return true;
  if (st.portalKey && st.portalKey.x === x && st.portalKey.y === y) return true; // legacy key if any
  return false;
}

export function setupLevel(prev: GameState, internal?: { skipValidate?: boolean }): GameState {
  let st: GameState = { ...prev } as any;
  const level = st.level;

  const desiredGrid = level >= 11 ? 12 : 8;
  st.gridSize = desiredGrid;

  st.player = { x: 0, y: 0 };
  // Ensure hole isn't at start
  do {
    st.hole = { x: randomInt(st.gridSize), y: randomInt(st.gridSize) };
  } while (st.hole.x === 0 && st.hole.y === 0);

  // Reset dynamic entities
  st.key = null;
  st.portalEntry = null;
  st.portalExit = null;
  st.portalAEntry = null;
  st.portalAExit = null;
  st.portalALocked = false as any;
  st.portalAKey = null as any;
  st.portalBEntry = null;
  st.portalBExit = null;
  st.portalBLocked = false;
  st.portalKey = null;
  (st as any).hasPortalAKey = false;
  st.blockedTiles = [];
  st.islandRects = [] as any;
  st.usedPortal = false;
  (st as any).enemy = null;
  (st as any).enemyDir = 'down';
  (st as any).enemyTarget = null;
  (st as any).enemyStepBudget = 0;
  (st as any).enemyVisited = Array.from({ length: st.gridSize }, () => Array(st.gridSize).fill(0));
  (st as any).enemy1b = null;
  (st as any).enemy1bDir = 'down';
  (st as any).enemy1bTarget = null;
  (st as any).enemy1bStepBudget = 0;
  (st as any).enemy1bVisited = Array.from({ length: st.gridSize }, () => Array(st.gridSize).fill(0));
  (st as any).initialKey = null;
  (st as any).initialPortalAKey = null;

  // Occupancy matrix to prevent collisions
  const used = new Set<string>();
  const reserve = (x: number, y: number) => used.add(cellKey(x, y));
  const free = (x: number, y: number) => !used.has(cellKey(x, y));

  // Key/gate persists for all levels >= 6
  st.gateActive = level >= 6;
  st.hasKey = false;
  if (level >= 6 && level < 11) {
    let k: Point | null = null;
    let guard = 0;
    do {
      k = { x: randomInt(st.gridSize), y: randomInt(st.gridSize) };
      guard++;
    } while ((
      isTaken(k.x, k.y, st, { ignoreKey: true }) ||
      isOrthAdjacent(k.x, k.y, st.hole.x, st.hole.y)
    ) && guard < 400);
    st.key = k;
    (st as any).initialKey = k;
  }

  if (level >= 11 && level < 16) {
    let guard = 0;
    const islandW = Math.min(4, st.gridSize - 2);
    const islandH = Math.min(4, st.gridSize - 2);
    let ix = 0, iy = 0;
    do {
      ix = 1 + randomInt(st.gridSize - islandW - 1);
      iy = 1 + randomInt(st.gridSize - islandH - 1);
      guard++;
    } while ((0 >= ix - 1 && 0 <= ix + islandW && 0 >= iy - 1 && 0 <= iy + islandH) && guard < 200);
    if (guard >= 200) {
      ix = st.gridSize - islandW - 1;
      iy = st.gridSize - islandH - 1;
    }

    const innerXMin = ix + 1;
    const innerXMax = ix + islandW - 2;
    const innerYMin = iy + 1;
    const innerYMax = iy + islandH - 2;

    guard = 0;
    do {
      st.hole = {
        x: innerXMin + randomInt(innerXMax - innerXMin + 1),
        y: innerYMin + randomInt(innerYMax - innerYMin + 1),
      };
      guard++;
    } while (
      (!free(st.hole.x, st.hole.y) ||
        isTaken(st.hole.x, st.hole.y, st, { ignoreHole: true }) ||
        isAdjToAny(st.hole.x, st.hole.y, [st.key, st.portalEntry, st.portalExit])) &&
      guard < 200
    );
    reserve(st.hole.x, st.hole.y);

    guard = 0;
    do {
      st.portalExit = {
        x: innerXMin + randomInt(innerXMax - innerXMin + 1),
        y: innerYMin + randomInt(innerYMax - innerYMin + 1),
      };
      guard++;
    } while (
      (!free(st.portalExit.x, st.portalExit.y) ||
        isTaken(st.portalExit.x, st.portalExit.y, st, { ignoreExit: true }) ||
        isOrthAdjacent(st.portalExit.x, st.portalExit.y, st.hole.x, st.hole.y) ||
        isAdjToAny(st.portalExit.x, st.portalExit.y, [st.key])) &&
      guard < 200
    );
    if (guard >= 200) {
      st.portalExit = { x: st.hole.x, y: Math.min(innerYMax, st.hole.y + 1) };
    }
    reserve(st.portalExit.x, st.portalExit.y);

    st.blockedTiles = [];
    st.islandRects = [{ x: ix, y: iy, w: islandW, h: islandH }] as any;

    {
      const reachable = bfsReachableOpenCells(st.gridSize, st.blockedTiles, (x, y) =>
        isInsideRect(x, y, ix, iy, islandW, islandH)
      );
      const notAdj = reachable.filter((p) => !(
        (st.portalExit && isOrthAdjacent(p.x, p.y, st.portalExit.x, st.portalExit.y)) ||
        isOrthAdjacent(p.x, p.y, st.hole.x, st.hole.y)
      ));
      const candidates = (notAdj.length ? notAdj : reachable).filter((p) => free(p.x, p.y) && !isTaken(p.x, p.y, st, {}) && !isAdjToAny(p.x, p.y, [st.key, st.hole, st.portalExit]));
      st.portalEntry = candidates.length ? candidates[randomInt(candidates.length)] : { x: 1, y: 1 };
    }
    reserve(st.portalEntry.x, st.portalEntry.y);

    if (st.gateActive) {
      guard = 0;
      let k: Point | null = null;
      do {
        k = { x: randomInt(st.gridSize), y: randomInt(st.gridSize) };
        guard++;
      } while ((
        !free(k.x, k.y) || isTaken(k.x, k.y, st, { ignoreKey: true }) ||
        isInsideRect(k.x, k.y, ix, iy, islandW, islandH) ||
        isBlocked(k.x, k.y, st.blockedTiles) ||
        isAdjToAny(k.x, k.y, [st.portalEntry!, st.portalExit!, st.hole])
      ) && guard < 400);
      st.key = k ?? { x: 1, y: st.gridSize - 2 } as any;
      (st as any).initialKey = st.key;
      reserve(st.key.x, st.key.y);
    }
  }

  if (level >= 16) {
    let guard = 0;
    const islandW = Math.min(4, st.gridSize - 2);
    const islandH = Math.min(4, st.gridSize - 2);
    const placeIsland = () => {
      let ix = 0, iy = 0;
      guard = 0;
      do {
        ix = 1 + randomInt(st.gridSize - islandW - 1);
        iy = 1 + randomInt(st.gridSize - islandH - 1);
        guard++;
      } while ((0 >= ix - 1 && 0 <= ix + islandW && 0 >= iy - 1 && 0 <= iy + islandH) && guard < 200);
      if (guard >= 200) {
        ix = st.gridSize - islandW - 1;
        iy = st.gridSize - islandH - 1;
      }
      return { ix, iy };
    };

    const B = placeIsland();
    B.ix = Math.min(Math.max(1, B.ix), st.gridSize - islandW - 1);
    B.iy = Math.min(Math.max(1, B.iy), st.gridSize - islandH - 1);
    let tries = 0;
    let A = { ix: B.ix + islandW + 2, iy: B.iy };
    if (A.ix + islandW + 1 >= st.gridSize) {
      A = { ix: Math.max(1, B.ix - islandW - 2), iy: B.iy };
    }
    while (rectsOverlapWithGap(A.ix, A.iy, islandW, islandH, B.ix, B.iy, islandW, islandH, 1) && tries < 160) {
      const rightCandidate = { ix: B.ix + islandW + 2, iy: B.iy };
      const leftCandidate = { ix: Math.max(1, B.ix - islandW - 2), iy: B.iy };
      const candidates = [rightCandidate, leftCandidate].filter(c => c.ix >= 1 && c.ix + islandW < st.gridSize);
      const c = candidates[tries % candidates.length];
      A.ix = c.ix; A.iy = c.iy;
      tries++;
    }
    if (tries >= 160) {
      A.ix = B.ix; A.iy = Math.min(st.gridSize - islandH - 1, B.iy + islandH + 2);
      if (rectsOverlapWithGap(A.ix, A.iy, islandW, islandH, B.ix, B.iy, islandW, islandH, 1)) {
        A.iy = Math.max(1, B.iy - islandH - 2);
      }
    }

    st.blockedTiles = [];
    st.islandRects = [
      { x: B.ix, y: B.iy, w: islandW, h: islandH },
      { x: A.ix, y: A.iy, w: islandW, h: islandH },
    ] as any;

    const innerB = { xMin: B.ix + 1, xMax: B.ix + islandW - 2, yMin: B.iy + 1, yMax: B.iy + islandH - 2 };
    const innerA = { xMin: A.ix + 1, xMax: A.ix + islandW - 2, yMin: A.iy + 1, yMax: A.iy + islandH - 2 };

    guard = 0;
    do {
      st.hole = {
        x: innerB.xMin + randomInt(innerB.xMax - innerB.xMin + 1),
        y: innerB.yMin + randomInt(innerB.yMax - innerB.yMin + 1),
      };
      guard++;
    } while (isTaken(st.hole.x, st.hole.y, st, { ignoreHole: true }) && guard < 200);
    reserve(st.hole.x, st.hole.y);

    guard = 0;
    do {
      st.portalAExit = {
        x: innerB.xMin + randomInt(innerB.xMax - innerB.xMin + 1),
        y: innerB.yMin + randomInt(innerB.yMax - innerB.yMin + 1),
      };
      guard++;
    } while ((
      !free(st.portalAExit.x, st.portalAExit.y) ||
      isTaken(st.portalAExit.x, st.portalAExit.y, st, { ignoreExit: true }) ||
      isBlocked(st.portalAExit.x, st.portalAExit.y, st.blockedTiles) ||
      isAdjToAny(st.portalAExit.x, st.portalAExit.y, [st.hole, st.key, st.portalAKey!])
    ) && guard < 200);
    reserve(st.portalAExit.x, st.portalAExit.y);

    {
      const reachableA = bfsReachableOpenCells(st.gridSize, st.blockedTiles, (x, y) =>
        isInsideRect(x, y, A.ix, A.iy, islandW, islandH) || isInsideRect(x, y, B.ix, B.iy, islandW, islandH)
      );
      const cands = reachableA.filter((p) => free(p.x, p.y) && !isTaken(p.x, p.y, st, {}) && !isAdjToAny(p.x, p.y, [st.key]));
      st.portalAEntry = cands.length ? cands[randomInt(cands.length)] : { x: 1, y: 1 } as any;
    }
    st.portalALocked = true as any;
    if (st.portalAEntry) reserve(st.portalAEntry.x, st.portalAEntry.y);

    guard = 0;
    do {
      st.portalAKey = {
        x: innerA.xMin + randomInt(innerA.xMax - innerA.xMin + 1),
        y: innerA.yMin + randomInt(innerA.yMax - innerA.yMin + 1),
      };
      guard++;
    } while ((
      !free(st.portalAKey.x, st.portalAKey.y) ||
      isTaken(st.portalAKey.x, st.portalAKey.y, st, { ignorePortalAKey: true }) ||
      isSameCell(st.portalAKey, st.portalBExit) ||
      isSameCell(st.portalAKey, st.portalAExit) ||
      isSameCell(st.portalAKey, st.hole) ||
      isAdjToAny(st.portalAKey.x, st.portalAKey.y, [st.portalBExit!, st.portalAExit!, st.hole])
    ) && guard < 200);
    reserve(st.portalAKey.x, st.portalAKey.y);
    (st as any).initialPortalAKey = st.portalAKey;

    st.portalBLocked = false;
    guard = 0;
    do {
      st.portalBExit = {
        x: innerA.xMin + randomInt(innerA.xMax - innerA.xMin + 1),
        y: innerA.yMin + randomInt(innerA.yMax - innerA.yMin + 1),
      };
      guard++;
    } while ((
      !free(st.portalBExit.x, st.portalBExit.y) ||
      isTaken(st.portalBExit.x, st.portalBExit.y, st, { ignoreExit: true }) ||
      (st.portalAKey && isSameCell(st.portalBExit, st.portalAKey)) ||
      isBlocked(st.portalBExit.x, st.portalBExit.y, st.blockedTiles) ||
      isAdjToAny(st.portalBExit.x, st.portalBExit.y, [st.hole, st.key, st.portalAExit, st.portalAKey])
    ) && guard < 200);
    reserve(st.portalBExit.x, st.portalBExit.y);
    {
      const reachableB = bfsReachableOpenCells(st.gridSize, st.blockedTiles, (x, y) =>
        isInsideRect(x, y, A.ix, A.iy, islandW, islandH) || isInsideRect(x, y, B.ix, B.iy, islandW, islandH)
      );
      const candsB = reachableB.filter((p) => free(p.x, p.y) && !isTaken(p.x, p.y, st, {}) && !isAdjToAny(p.x, p.y, [st.key]));
      st.portalBEntry = candsB.length ? candsB[randomInt(candsB.length)] : { x: st.gridSize - 2, y: 1 } as any;
    }
    if (st.portalBEntry) reserve(st.portalBEntry.x, st.portalBEntry.y);

    guard = 0;
    do {
      st.key = {
        x: innerB.xMin + randomInt(innerB.xMax - innerB.xMin + 1),
        y: innerB.yMin + randomInt(innerB.yMax - innerB.yMin + 1),
      };
      guard++;
    } while (
      (isTaken(st.key.x, st.key.y, st, { ignoreKey: true }) ||
        isSameCell(st.key, st.hole) ||
        (st.portalAExit && isSameCell(st.key, st.portalAExit)) ||
        (st.portalBExit && isSameCell(st.key, st.portalBExit)) ||
        isBlocked(st.key.x, st.key.y, st.blockedTiles) ||
        isAdjToAny(st.key.x, st.key.y, [st.hole, st.portalAExit!, st.portalBExit!, st.portalAKey!])) &&
      guard < 400
    );
    if (
      guard >= 400 ||
      isTaken(st.key.x, st.key.y, st, { ignoreKey: true }) ||
      isSameCell(st.key, st.hole) ||
      (st.portalAExit && isSameCell(st.key, st.portalAExit)) ||
      (st.portalBExit && isSameCell(st.key, st.portalBExit)) ||
      isBlocked(st.key.x, st.key.y, st.blockedTiles) ||
      isAdjToAny(st.key.x, st.key.y, [st.hole, st.portalAExit!, st.portalBExit!, st.portalAKey!])
    ) {
      let placed = false;
      for (let y = innerB.yMin; y <= innerB.yMax && !placed; y++) {
        for (let x = innerB.xMin; x <= innerB.xMax && !placed; x++) {
          const ok = !isTaken(x, y, st, { ignoreKey: true }) &&
            !(x === st.hole.x && y === st.hole.y) &&
            !(st.portalAExit && x === st.portalAExit.x && y === st.portalAExit.y) &&
            !(st.portalBExit && x === st.portalBExit.x && y === st.portalBExit.y) &&
            !isBlocked(x, y, st.blockedTiles) &&
            !isAdjToAny(x, y, [st.hole, st.portalAExit!, st.portalBExit!, st.portalAKey!]);
          if (ok) { st.key = { x, y }; placed = true; }
        }
      }
      if (!placed) {
        st.key = { x: Math.min(innerB.xMax, Math.max(innerB.xMin, B.ix + Math.floor(islandW/2))), y: Math.min(innerB.yMax, Math.max(innerB.yMin, B.iy + Math.floor(islandH/2))) } as any;
      }
    }
    if (st.key) {
      reserve(st.key.x, st.key.y);
      (st as any).initialKey = st.key;
    }
  }

  // Place enemy for level 21+
  if (level >= 21) {
    const isInsideAnyIsland = (x: number, y: number): boolean => {
      const rects = st.islandRects || [];
      for (const r of rects) {
        if (isInsideRect(x, y, r.x, r.y, r.w, r.h)) return true;
      }
      return false;
    };
    // Spawn enemy only on mainland walkable tiles, not on any asset
    const reachable = bfsReachableOpenCells(st.gridSize, st.blockedTiles, (x, y) => isInsideAnyIsland(x, y));
    const isAsset = (x: number, y: number) => (
      (st.hole && st.hole.x === x && st.hole.y === y) ||
      (st.key && st.key.x === x && st.key.y === y) ||
      (st.portalEntry && st.portalEntry.x === x && st.portalEntry.y === y) ||
      (st.portalExit && st.portalExit.x === x && st.portalExit.y === y) ||
      (st.portalAEntry && st.portalAEntry.x === x && st.portalAEntry.y === y) ||
      (st.portalAExit && st.portalAExit.x === x && st.portalAExit.y === y) ||
      (st.portalBEntry && st.portalBEntry.x === x && st.portalBEntry.y === y) ||
      (st.portalBExit && st.portalBExit.x === x && st.portalBExit.y === y) ||
      ((st as any).portalAKey && (st as any).portalAKey.x === x && (st as any).portalAKey.y === y) ||
      ((st as any).portalKey && (st as any).portalKey.x === x && (st as any).portalKey.y === y)
    );
    let candidates = reachable.filter((p) => (p.x !== 0 || p.y !== 0) && !isTaken(p.x, p.y, st, {}) && !isAsset(p.x, p.y));
    if (candidates.length === 0) candidates = reachable.filter((p) => p.x !== 0 || p.y !== 0);
    let enemyPos = candidates.length ? candidates[randomInt(candidates.length)] : { x: st.gridSize - 1, y: st.gridSize - 1 } as Point;
    const passable = (p: Point) => p.x >= 0 && p.y >= 0 && p.x < st.gridSize && p.y < st.gridSize && !isBlocked(p.x, p.y, st.blockedTiles) && !isInsideAnyIsland(p.x, p.y) && !isTaken(p.x, p.y, st, {});
    if (!passable(enemyPos)) {
      const nearStart: Point[] = [ { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 } ];
      const pick = nearStart.find(passable);
      if (pick) enemyPos = pick;
    }
    (st as any).enemy = enemyPos;
    (st as any).enemyDir = 'down';
    (st as any).enemyTarget = null;
    (st as any).enemyStepBudget = 0;
    (st as any).enemyVisited = Array.from({ length: st.gridSize }, () => Array(st.gridSize).fill(0));
  }

  // Place second enemy (enemy1b) for level 24+
  if (level >= 24) {
    const isInsideAnyIsland = (x: number, y: number): boolean => {
      const rects = st.islandRects || [];
      for (const r of rects) {
        if (isInsideRect(x, y, r.x, r.y, r.w, r.h)) return true;
      }
      return false;
    };
    const reachable = bfsReachableOpenCells(st.gridSize, st.blockedTiles, (x, y) => isInsideAnyIsland(x, y));
    const isAsset = (x: number, y: number) => (
      (st.hole && st.hole.x === x && st.hole.y === y) ||
      (st.key && st.key.x === x && st.key.y === y) ||
      (st.portalEntry && st.portalEntry.x === x && st.portalEntry.y === y) ||
      (st.portalExit && st.portalExit.x === x && st.portalExit.y === y) ||
      (st.portalAEntry && st.portalAEntry.x === x && st.portalAEntry.y === y) ||
      (st.portalAExit && st.portalAExit.x === x && st.portalAExit.y === y) ||
      (st.portalBEntry && st.portalBEntry.x === x && st.portalBEntry.y === y) ||
      (st.portalBExit && st.portalBExit.x === x && st.portalBExit.y === y) ||
      ((st as any).portalAKey && (st as any).portalAKey.x === x && (st as any).portalAKey.y === y) ||
      ((st as any).portalKey && (st as any).portalKey.x === x && (st as any).portalKey.y === y)
    );
    // Avoid enemy1 cell
    let candidates = reachable.filter((p) => (p.x !== 0 || p.y !== 0) && !isTaken(p.x, p.y, st, {}) && !isAsset(p.x, p.y) && (!(st as any).enemy || p.x !== (st as any).enemy.x || p.y !== (st as any).enemy.y));
    if (candidates.length === 0) candidates = reachable.filter((p) => p.x !== 0 || p.y !== 0);
    let enemy1bPos = candidates.length ? candidates[randomInt(candidates.length)] : { x: st.gridSize - 2, y: st.gridSize - 2 } as Point;
    const passable = (p: Point) => p.x >= 0 && p.y >= 0 && p.x < st.gridSize && p.y < st.gridSize && !isBlocked(p.x, p.y, st.blockedTiles) && !isInsideAnyIsland(p.x, p.y) && !isTaken(p.x, p.y, st, {});
    if (!passable(enemy1bPos)) {
      const nearStart: Point[] = [ { x: st.gridSize - 2, y: 0 }, { x: 0, y: st.gridSize - 2 }, { x: st.gridSize - 2, y: st.gridSize - 2 } ];
      const pick = nearStart.find(passable);
      if (pick) enemy1bPos = pick;
    }
    (st as any).enemy1b = enemy1bPos;
    (st as any).enemy1bDir = 'right';
    (st as any).enemy1bTarget = null;
    (st as any).enemy1bStepBudget = 0;
    (st as any).enemy1bVisited = Array.from({ length: st.gridSize }, () => Array(st.gridSize).fill(0));
  }

  if (level >= 8) {
    const isInsideAnyIsland = (x: number, y: number): boolean => {
      const rects = st.islandRects || [];
      for (const r of rects) {
        if (isInsideRect(x, y, r.x, r.y, r.w, r.h)) return true;
      }
      return false;
    };

    const desiredCount = Math.max(2, Math.floor(2 * st.gridSize * st.gridSize * (st.gridSize === 8 ? 0.06 : 0.04)));
    let placed = 0;
    let safety = 0;

    const targets: Point[] = [] as any;
    if (level < 11) {
      targets.push(st.hole);
      if (st.gateActive && st.key) targets.push(st.key);
    } else if (level < 16) {
      if (st.portalEntry) targets.push(st.portalEntry);
    } else {
      if (st.portalBEntry) targets.push(st.portalBEntry);
      if (st.portalAEntry) targets.push(st.portalAEntry);
    }

    const reachableFromStart = (tx: number, ty: number): boolean => {
      const visited: boolean[][] = Array.from({ length: st.gridSize }, () => Array(st.gridSize).fill(false));
      const q: Point[] = [] as any;
      const push = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= st.gridSize || y >= st.gridSize) return;
        if (visited[y][x]) return;
        if (isBlocked(x, y, st.blockedTiles)) return;
        if (isInsideAnyIsland(x, y)) return;
        visited[y][x] = true;
        q.push({ x, y });
      };
      push(0, 0);
      for (let i = 0; i < q.length; i++) {
        const { x, y } = q[i];
        if (x === tx && y === ty) return true;
        push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
      }
      return false;
    };

    while (placed < desiredCount && safety < desiredCount * 50) {
      safety++;
      const x = randomInt(st.gridSize);
      const y = randomInt(st.gridSize);
      if (!free(x, y)) continue;
      if (x === 0 && y === 0) continue;
      if (isInsideAnyIsland(x, y)) continue;
      if (isTaken(x, y, st, {})) continue;

      st.blockedTiles.push({ x, y });
      let ok = true;
      for (const t of targets) {
        if (!t) continue;
        if (isInsideAnyIsland(t.x, t.y)) continue;
        if (!reachableFromStart(t.x, t.y)) { ok = false; break; }
      }
      if (ok && targets.length === 0) {
        const moves = [ [1,0], [-1,0], [0,1], [0,-1] ];
        let hasOpen = false;
        for (const [dx, dy] of moves) {
          const sx = dx, sy = dy;
          if (sx >= 0 && sy >= 0 && sx < st.gridSize && sy < st.gridSize && !isBlocked(sx, sy, st.blockedTiles)) { hasOpen = true; break; }
        }
        ok = hasOpen;
      }
      if (!ok) {
        st.blockedTiles.pop();
        continue;
      }
      placed++;
    }
  }

  if (st.level === 1) {
    st.currentMapping = mappings[0];
  } else {
    let nextMap = mappings[randomInt(mappings.length)];
    if (nextMap === st.currentMapping) {
      nextMap = mappings[(mappings.indexOf(nextMap) + 1) % mappings.length];
    }
    st.currentMapping = nextMap;
  }

  if (!internal?.skipValidate) {
    let attempts = 0;
    while (attempts < 80) {
      const pts: Point[] = [] as any;
      const add = (p?: Point | null) => { if (p) pts.push(p); };
      add(st.hole); add(st.key); add(st.portalEntry); add(st.portalExit); add(st.portalAEntry); add(st.portalAExit); add(st.portalBEntry); add(st.portalBExit); add(st.portalAKey); add(st.portalKey as any);
      const seen = new Set<string>();
      let dup = false;
      for (const p of pts) { const k = cellKey(p.x, p.y); if (seen.has(k)) { dup = true; break; } seen.add(k); }
      if (dup) { attempts++; st = setupLevel({ ...st }, { skipValidate: true }); continue; }
      const result = validateLevel(st);
      if (result.ok) break;
      attempts++;
      st = setupLevel({ ...st }, { skipValidate: true });
    }
  }
  return { ...st };
}

export function nextLevel(prev: GameState): GameState {
  return setupLevel({ ...prev, level: prev.level + 1 });
}


