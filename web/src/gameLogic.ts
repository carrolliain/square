import type { ControlKey, ControlMapping, GameState, Point } from './types';
import { validateLevel } from './rules';

export const mappings: ControlMapping[] = [
  { ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowLeft: [-1, 0] },
  { ArrowUp: [1, 0], ArrowRight: [0, 1], ArrowDown: [-1, 0], ArrowLeft: [0, -1] },
  { ArrowUp: [0, 1], ArrowRight: [-1, 0], ArrowDown: [0, -1], ArrowLeft: [1, 0] },
  { ArrowUp: [-1, 0], ArrowRight: [0, -1], ArrowDown: [1, 0], ArrowLeft: [0, 1] },
];

export const mappingNames = ['Normal', '↻ 90°', '↻ 180°', '↻ 270°'];

export function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

export function isSameCell(a: Point | null | undefined, b: Point | null | undefined): boolean {
  return !!a && !!b && a.x === b.x && a.y === b.y;
}

export function isInsideRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number) {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}

export function isOrthAdjacent(x1: number, y1: number, x2: number, y2: number) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;
}

function isAdjToAny(x: number, y: number, points: Array<Point | null | undefined>): boolean {
  for (const p of points) {
    if (p && isOrthAdjacent(x, y, p.x, p.y)) return true;
  }
  return false;
}

// kept for reference; gap-aware variant used below

function rectsOverlapWithGap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number, gap: number): boolean {
  // Treat rectangles as expanded by `gap` outward; if expanded rects overlap, then real rects are within `gap` cells
  return (ax - gap) < (bx + bw) && (ax + aw) > (bx - gap) && (ay - gap) < (by + bh) && (ay + ah) > (by - gap);
}

// reserved helper for future overlap checks (currently unused)

export function isBlocked(x: number, y: number, blockedTiles: Point[]): boolean {
  for (let i = 0; i < blockedTiles.length; i++) {
    const t = blockedTiles[i];
    if (t.x === x && t.y === y) return true;
  }
  return false;
}

function cellKey(x: number, y: number): string { return `${x},${y}`; }

function bfsReachableOpenCells(gridSize: number, blocked: Point[], exclude: (x: number, y: number) => boolean): Point[] {
  const visited: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
  const isBlockedCell = (x: number, y: number) => isBlocked(x, y, blocked) || exclude(x, y);
  const q: Point[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return;
    if (visited[y][x]) return;
    if (isBlockedCell(x, y)) return;
    visited[y][x] = true;
    q.push({ x, y });
  };
  // start at (0,0)
  push(0, 0);
  for (let i = 0; i < q.length; i++) {
    const { x, y } = q[i];
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  return q;
}

export function createInitialState(): GameState {
  return {
    gridSize: 8,
    cellSizePx: 50,
    level: 1,
    player: { x: 0, y: 0 },
    hole: { x: 7, y: 7 },
    hasKey: false,
    key: null,
    gateActive: false,
    portalEntry: null,
    portalExit: null,
    portalAEntry: null,
    portalAExit: null,
    portalALocked: false,
    portalAKey: null,
    hasPortalAKey: false,
    portalBEntry: null,
    portalBExit: null,
    portalBLocked: false,
    portalKey: null,
    usedPortal: false,
    blockedTiles: [],
    currentMapping: mappings[0],
  };
}

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
  let st: GameState = { ...prev };
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
  st.islandRects = [];
  st.usedPortal = false;

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
  }

  if (level >= 11 && level < 16) {
    let guard = 0;
    // Build a rectangular island (smaller 4x4) surrounded by a one-tile gap ring
    const islandW = Math.min(4, st.gridSize - 2);
    const islandH = Math.min(4, st.gridSize - 2);
    let ix = 0, iy = 0;
    // choose island position so the surrounding water ring doesn't cover the start (0,0)
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

    // Door inside inner area, ensure at least one orthogonally adjacent open tile
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

    // Exit portal inside inner area distinct from door, and not orth-adjacent to door
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

    // No blocked ring; player can walk up to the border, but crossing into island is handled in tryMove
    st.blockedTiles = [];
    st.islandRects = [{ x: ix, y: iy, w: islandW, h: islandH }];

    // Place entry on mainland on a reachable open cell (never water), not adjacent to exit
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

    // Key on mainland if gate is active (levels >= 6)
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
      st.key = k ?? { x: 1, y: st.gridSize - 2 };
      reserve(st.key.x, st.key.y);
    }
  }

  // Levels 16+: Two portal pairs, two islands
  if (level >= 16) {
    let guard = 0;
    // Parameters
    const islandW = Math.min(4, st.gridSize - 2);
    const islandH = Math.min(4, st.gridSize - 2);

    // Island A (intermediate) and Island B (final with door)
    // Place Island B first near far corner; Island A elsewhere but not overlapping B
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

    // Place islands side-by-side with at least one full tile gap between their rectangles; never overlapping
    const B = placeIsland(); // Island B has the door
    // Clamp B to safe range
    B.ix = Math.min(Math.max(1, B.ix), st.gridSize - islandW - 1);
    B.iy = Math.min(Math.max(1, B.iy), st.gridSize - islandH - 1);
    // Try to place A to the right of B; if not possible, to the left; ensure no overlap with guard
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
      // Final fallback: align A vertically offset from B
      A.ix = B.ix; A.iy = Math.min(st.gridSize - islandH - 1, B.iy + islandH + 2);
      if (rectsOverlapWithGap(A.ix, A.iy, islandW, islandH, B.ix, B.iy, islandW, islandH, 1)) {
        A.iy = Math.max(1, B.iy - islandH - 2);
      }
    }

    // No blocked rings; border crossing prevention handled in tryMove
    st.blockedTiles = [];
    st.islandRects = [
      { x: B.ix, y: B.iy, w: islandW, h: islandH },
      { x: A.ix, y: A.iy, w: islandW, h: islandH },
    ];

    const innerB = { xMin: B.ix + 1, xMax: B.ix + islandW - 2, yMin: B.iy + 1, yMax: B.iy + islandH - 2 };
    const innerA = { xMin: A.ix + 1, xMax: A.ix + islandW - 2, yMin: A.iy + 1, yMax: A.iy + islandH - 2 };

    // Place Door on Island B
    guard = 0;
    do {
      st.hole = {
        x: innerB.xMin + randomInt(innerB.xMax - innerB.xMin + 1),
        y: innerB.yMin + randomInt(innerB.yMax - innerB.yMin + 1),
      };
      guard++;
    } while (isTaken(st.hole.x, st.hole.y, st, { ignoreHole: true }) && guard < 200);
    reserve(st.hole.x, st.hole.y);

    // Portal A (blue): mainland locked entry -> Island B exit (two-way)
    // Exit on Island B (blue portal always goes to door island)
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
    // Entry on mainland (locked until portal A key collected) — ensure reachable
    {
      const reachableA = bfsReachableOpenCells(st.gridSize, st.blockedTiles, (x, y) =>
        isInsideRect(x, y, A.ix, A.iy, islandW, islandH) || isInsideRect(x, y, B.ix, B.iy, islandW, islandH)
      );
      const cands = reachableA.filter((p) => free(p.x, p.y) && !isTaken(p.x, p.y, st, {}) && !isAdjToAny(p.x, p.y, [st.key]));
      st.portalAEntry = cands.length ? cands[randomInt(cands.length)] : { x: 1, y: 1 };
    }
    st.portalALocked = true as any;
    reserve(st.portalAEntry.x, st.portalAEntry.y);

    // Place blue key (portalAKey) on Island A — required to use blue portal
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

    // Portal B (orange): mainland entry -> Island A exit (two-way), unlocked (used to reach blue key island)
    st.portalBLocked = false;
    // Exit on Island A (not on blue key)
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
    // Entry on mainland — ensure reachable
    {
      const reachableB = bfsReachableOpenCells(st.gridSize, st.blockedTiles, (x, y) =>
        isInsideRect(x, y, A.ix, A.iy, islandW, islandH) || isInsideRect(x, y, B.ix, B.iy, islandW, islandH)
      );
      const candsB = reachableB.filter((p) => free(p.x, p.y) && !isTaken(p.x, p.y, st, {}) && !isAdjToAny(p.x, p.y, [st.key]));
      st.portalBEntry = candsB.length ? candsB[randomInt(candsB.length)] : { x: st.gridSize - 2, y: 1 };
    }
    reserve(st.portalBEntry.x, st.portalBEntry.y);

    // Place Door Key on Island B (not on door or exits)
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
      // deterministic fallback scan inside innerB
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
        // last resort place near center of B island
        st.key = { x: Math.min(innerB.xMax, Math.max(innerB.xMin, B.ix + Math.floor(islandW/2))), y: Math.min(innerB.yMax, Math.max(innerB.yMin, B.iy + Math.floor(islandH/2))) };
      }
    }
    reserve(st.key.x, st.key.y);
  }

  // From level 8 onward, place walk-blocking obstructions on the mainland (never inside islands)
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

    const targets: Point[] = [];
    // Connectivity targets depending on level
    if (level < 11) {
      // Always ensure door reachable; and if key exists ensure reachable
      targets.push(st.hole);
      if (st.gateActive && st.key) targets.push(st.key);
    } else if (level < 16) {
      if (st.portalEntry) targets.push(st.portalEntry);
    } else {
      if (st.portalBEntry) targets.push(st.portalBEntry);
      if (st.portalAEntry) targets.push(st.portalAEntry);
    }

    // BFS helper honoring current blockedTiles
    const reachableFromStart = (tx: number, ty: number): boolean => {
      const visited: boolean[][] = Array.from({ length: st.gridSize }, () => Array(st.gridSize).fill(false));
      const q: Point[] = [];
      const push = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= st.gridSize || y >= st.gridSize) return;
        if (visited[y][x]) return;
        if (isBlocked(x, y, st.blockedTiles)) return;
        // Don't allow BFS to enter islands (mainland connectivity only)
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
      // Don't place over entities
      if (isTaken(x, y, st, {})) continue;

      // Tentatively place
      st.blockedTiles.push({ x, y });
      // Check connectivity from start to all targets that lie on mainland
      let ok = true;
      for (const t of targets) {
        if (!t) continue;
        // Ensure target is on mainland
        if (isInsideAnyIsland(t.x, t.y)) continue;
        if (!reachableFromStart(t.x, t.y)) { ok = false; break; }
      }
      // Ensure the player still has at least one move from start if no targets
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
        // revert
        st.blockedTiles.pop();
        continue;
      }
      placed++;
    }
  }

  // Control mapping randomization
  if (st.level === 1) {
    st.currentMapping = mappings[0];
  } else {
    let nextMap = mappings[randomInt(mappings.length)];
    if (nextMap === st.currentMapping) {
      nextMap = mappings[(mappings.indexOf(nextMap) + 1) % mappings.length];
    }
    st.currentMapping = nextMap;
  }

  // Validate and retry if needed to enforce rules (avoid recursion by skipping validation on reroll)
  if (!internal?.skipValidate) {
    let attempts = 0;
    while (attempts < 80) {
      // belt & braces: quick duplicate check prior to full validate
      const pts: Point[] = [];
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
  // Level 11+: cannot cross island borders by walking (neither into nor out of an island).
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
      return prev; // block any walking transition across an island border
    }
    // Also block walking directly from one island to a different island
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

  // Collect portal A key (for level 16+)
  if (portalAKey && cx === portalAKey.x && cy === portalAKey.y) {
    portalAKey = null;
    (prev as any).hasPortalAKey = true;
  }

  // Two-way portals: stepping on either end teleports onto the other end's tile (no adjacent drop)
  const attemptPortalTeleport = () => {
    // Level 11–15 pair
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
      if (p.locked) return { cx, cy, usedPortal }; // cannot use locked portal
      const dest = onA ? p.b : p.a;
      // Teleport directly onto the destination portal tile
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


