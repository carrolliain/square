import type { GameState, Point, AreaRect } from './types';
import { isInsideRect, isOrthAdjacent, isBlocked } from './gameLogic';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function pointKey(p: Point) { return `${p.x},${p.y}`; }

function distinctNonNull(points: Array<Point | null | undefined>): boolean {
  const seen = new Set<string>();
  for (const p of points) {
    if (!p) continue;
    const k = pointKey(p);
    if (seen.has(k)) return false;
    seen.add(k);
  }
  return true;
}

// adjacency checks are handled explicitly via forbidAdjPairs for clarity

function withinBounds(p: Point, grid: number): boolean {
  return p.x >= 0 && p.x < grid && p.y >= 0 && p.y < grid;
}

function rectsDoNotOverlap(rects: AreaRect[]): boolean {
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      if (overlap) return false;
    }
  }
  return true;
}

export function validateLevel(st: GameState): ValidationResult {
  const errors: string[] = [];

  // Bounds
  const points: Array<Point | null | undefined> = [st.player, st.hole, st.key, st.portalEntry, st.portalExit, st.portalAEntry, st.portalAExit, st.portalBEntry, st.portalBExit, st.portalAKey, (st as any).portalKey];
  for (const p of points) {
    if (!p) continue;
    if (!withinBounds(p, st.gridSize)) errors.push('point-out-of-bounds');
  }

  // Distinct cells for all entities
  if (!distinctNonNull(points)) errors.push('overlap-entities');

  // Coordinate-index uniqueness map (e.g., A1, E6) — enforce unique grid reference for ALL assets
  const ref = (p: Point) => {
    // Convert x to letters, y to 1-indexed numbers
    const x = p.x; let s = '';
    let n = x + 1;
    while (n > 0) { const rem = (n - 1) % 26; s = String.fromCharCode(65 + rem) + s; n = Math.floor((n - 1) / 26); }
    return `${s}${p.y + 1}`;
  };
  const seenRef = new Map<string, number>();
  for (const p of points) {
    if (!p) continue;
    const r = ref(p);
    const count = (seenRef.get(r) ?? 0) + 1;
    seenRef.set(r, count);
  }
  for (const [k, count] of seenRef.entries()) {
    if (count > 1) errors.push(`duplicate-grid-ref:${k}`);
  }

  // Blocked checks
  for (const p of [st.portalEntry, st.portalExit, st.portalAEntry, st.portalAExit, st.portalBEntry, st.portalBExit, st.key, st.portalAKey]) {
    if (!p) continue;
    if (isBlocked(p.x, p.y, st.blockedTiles)) errors.push('entity-on-blocked');
  }

  // Adjacent relationship rules (only the pairs we explicitly forbid)
  const forbidAdjPairs: Array<[Point | null | undefined, Point | null | undefined, string]> = [
    [st.portalEntry, st.portalExit, 'entry-adj-exit'],
    [st.hole, st.portalExit, 'door-adj-exit'],
    [st.hole, st.key, 'door-adj-key'],
    [st.portalAKey, st.portalBExit, 'bluekey-adj-orange-exit'],
    [st.portalAKey, st.portalAExit, 'bluekey-adj-blue-exit'],
    [st.portalEntry, st.hole, 'entry-adj-door'],
  ];
  for (const [a, b, code] of forbidAdjPairs) {
    if (!a || !b) continue;
    if (isOrthAdjacent(a.x, a.y, b.x, b.y)) errors.push(code);
  }

  // Islands 11+
  if (st.level >= 11) {
    const rects = st.islandRects ?? [];
    if (rects.length === 0) errors.push('missing-islands');
    if (!rectsDoNotOverlap(rects)) errors.push('overlapping-islands');
    // exit/door must be inside an island (for 11–15: single island)
    if (st.level < 16) {
      if (!isInsideRect(st.hole.x, st.hole.y, rects[0].x, rects[0].y, rects[0].w, rects[0].h)) errors.push('door-not-in-island');
      if (st.portalExit && !isInsideRect(st.portalExit.x, st.portalExit.y, rects[0].x, rects[0].y, rects[0].w, rects[0].h)) errors.push('exit-not-in-island');
      // entry must be outside island and reachable
      if (st.portalEntry && isInsideRect(st.portalEntry.x, st.portalEntry.y, rects[0].x, rects[0].y, rects[0].w, rects[0].h)) errors.push('entry-inside-island');
    } else {
      // 16+: A is key island, B is door island (we store [B, A])
      if (rects.length < 2) errors.push('two-islands-required');
      const B = rects[0], A = rects[1];
      if (!isInsideRect(st.hole.x, st.hole.y, B.x, B.y, B.w, B.h)) errors.push('door-not-in-B');
      if (st.portalAExit && !isInsideRect(st.portalAExit.x, st.portalAExit.y, B.x, B.y, B.w, B.h)) errors.push('blue-exit-not-in-B');
      if (st.portalBExit && !isInsideRect(st.portalBExit.x, st.portalBExit.y, A.x, A.y, A.w, A.h)) errors.push('orange-exit-not-in-A');
      if (st.portalAKey && !isInsideRect(st.portalAKey.x, st.portalAKey.y, A.x, A.y, A.w, A.h)) errors.push('blue-key-not-in-A');
    }
  }

  return { ok: errors.length === 0, errors };
}


