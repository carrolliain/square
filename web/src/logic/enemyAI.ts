import type { GameState, Point } from '../types';
import { isInsideRect } from './geometry';
import { isBlocked } from './blocked';

// helpers previously used for advanced behaviors are intentionally removed to keep only roaming/LOS logic

function isInsideAnyIsland(st: GameState, x: number, y: number): boolean {
  const rects = st.islandRects || [];
  for (const r of rects) {
    if (isInsideRect(x, y, r.x, r.y, r.w, r.h)) return true;
  }
  return false;
}

function isAssetTile(st: GameState, x: number, y: number): boolean {
  if (st.hole && st.hole.x === x && st.hole.y === y) return true;
  if (st.key && st.key.x === x && st.key.y === y) return true;
  if (st.portalEntry && st.portalEntry.x === x && st.portalEntry.y === y) return true;
  if (st.portalExit && st.portalExit.x === x && st.portalExit.y === y) return true;
  if (st.portalAEntry && st.portalAEntry.x === x && st.portalAEntry.y === y) return true;
  if (st.portalAExit && st.portalAExit.x === x && st.portalAExit.y === y) return true;
  if (st.portalBEntry && st.portalBEntry.x === x && st.portalBEntry.y === y) return true;
  if (st.portalBExit && st.portalBExit.x === x && st.portalBExit.y === y) return true;
  if ((st as any).portalAKey && (st as any).portalAKey.x === x && (st as any).portalAKey.y === y) return true;
  if ((st as any).portalKey && (st as any).portalKey.x === x && (st as any).portalKey.y === y) return true;
  return false;
}

function canStep(st: GameState, fromX: number, fromY: number, toX: number, toY: number): boolean {
  if (toX < 0 || toY < 0 || toX >= st.gridSize || toY >= st.gridSize) return false;
  if (isBlocked(toX, toY, st.blockedTiles)) return false;
  // Enemy1 cannot step onto asset tiles; exception: player's tile is allowed to enable collision
  if (!(toX === st.player.x && toY === st.player.y) && isAssetTile(st, toX, toY)) return false;
  if (st.level >= 11 && st.islandRects && st.islandRects.length) {
    const cur = isInsideAnyIsland(st, fromX, fromY);
    const next = isInsideAnyIsland(st, toX, toY);
    if (cur !== next) return false;
    if (cur && next) {
      // prevent switching islands directly
      const islandIndexAt = (x: number, y: number): number => {
        for (let i = 0; i < (st.islandRects?.length || 0); i++) {
          const r = st.islandRects![i];
          if (isInsideRect(x, y, r.x, r.y, r.w, r.h)) return i;
        }
        return -1;
      };
      const a = islandIndexAt(fromX, fromY);
      const b = islandIndexAt(toX, toY);
      if (a !== b) return false;
    }
  }
  return true;
}

// neighbors helper no longer needed

// randomChoice removed; simple Math.random used inline

// reserved for future difficulty escalations (kept to avoid dead code removal)
// function moveGreedyChase(st: GameState): Point { return st.enemy!; }

export type Direction = 'up' | 'right' | 'down' | 'left';

const DIRS: Record<Direction, [number, number]> = {
  up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0],
};
const OPP: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export function pickNextRoamDirection(st: GameState, prev?: Direction): Direction {
  const dirs: Direction[] = ['up', 'right', 'down', 'left'];
  // Prefer directions with available step
  const cur = st.enemy!;
  let viable = dirs.filter((d) => {
    const [dx, dy] = DIRS[d];
    const nx = cur.x + dx, ny = cur.y + dy;
    return canStep(st, cur.x, cur.y, nx, ny);
  });
  // Try to avoid immediate reversal to reduce oscillation
  if (prev && viable.length > 1) {
    const notOpp = viable.filter((d) => d !== OPP[prev!]);
    if (notOpp.length) viable = notOpp;
  }
  if (viable.length === 0) viable = dirs; // fallback, though canStep should prevent this
  return viable[Math.floor(Math.random() * viable.length)] as Direction;
}

export function enemyTick(st: GameState): { pos: Point; dir: Direction; target: Point | null; stepBudget: number; visited: number[][] } {
  // If we have an active target (player was in LOS) continue advancing towards it along current dir
  const cur = st.enemy!;
  let dir = (st.enemyDir ?? pickNextRoamDirection(st));
  let target = st.enemyTarget ?? null;
  let stepBudget = (st.enemyStepBudget ?? 0);
  const visited = st.enemyVisited ? st.enemyVisited.map(row => row.slice()) : Array.from({ length: st.gridSize }, () => Array(st.gridSize).fill(0));

  // If no target, check LOS in facing direction; if player in straight line with no blocks, set target to player's position
  if (!target) {
    const [dx, dy] = DIRS[dir];
    // Must be same row or column to be in LOS of current facing dir
    const player = st.player;
    const aligned = (dx !== 0 ? player.y === cur.y && Math.sign(player.x - cur.x) === dx : player.x === cur.x && Math.sign(player.y - cur.y) === dy);
    if (aligned) {
      // Check clear path
      let cx = cur.x + dx, cy = cur.y + dy;
      let clear = true;
      while (clear && !(cx === player.x && cy === player.y)) {
        if (!canStep(st, cx - dx, cy - dy, cx, cy)) { clear = false; break; }
        cx += dx; cy += dy;
      }
      if (clear) target = { x: player.x, y: player.y };
    }
  }

  // If we have a target, step toward it along current dir; stop when reached
  if (target) {
    const [dx, dy] = DIRS[dir];
    const nx = cur.x + dx, ny = cur.y + dy;
    if (canStep(st, cur.x, cur.y, nx, ny)) {
      const reached = nx === target.x && ny === target.y;
      visited[ny][nx]++;
      return { pos: { x: nx, y: ny }, dir, target: reached ? null : target, stepBudget, visited };
    }
    // Blocked on the way to target: abandon target
    target = null;
  }

  // Roaming: move one step in current dir if possible; else pick a new dir
  {
    const [dx, dy] = DIRS[dir];
    const nx = cur.x + dx, ny = cur.y + dy;
    if (canStep(st, cur.x, cur.y, nx, ny)) {
      // Decrease step budget; when it hits 0, choose new random direction
      stepBudget = stepBudget > 0 ? stepBudget - 1 : 0;
      visited[ny][nx]++;
      if (stepBudget === 0) {
        dir = pickNextRoamDirection(st, dir);
        // Reset with a small random segment length to slowly cover board
        stepBudget = 2 + Math.floor(Math.random() * 4); // 2..5 steps
      }
      return { pos: { x: nx, y: ny }, dir, target, stepBudget, visited };
    }
  }
  // Pick a new direction and try once
  dir = pickNextRoamDirection(st, dir);
  {
    const [dx, dy] = DIRS[dir];
    const nx = cur.x + dx, ny = cur.y + dy;
    if (canStep(st, cur.x, cur.y, nx, ny)) {
      // start a new segment with budget
      stepBudget = 2 + Math.floor(Math.random() * 4);
      visited[ny][nx]++;
      return { pos: { x: nx, y: ny }, dir, target, stepBudget, visited };
    }
  }
  // Stay put if no move
  return { pos: cur, dir, target, stepBudget, visited };
}


