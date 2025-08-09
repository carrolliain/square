import type { GameState, Point } from '../types';
import { DIRS, pickNextRoamDirection } from './enemyAI';
import { canStep } from './enemyAI';

export function enemy1Tick(st: GameState): { pos: Point; dir: 'up'|'right'|'down'|'left'; target: Point | null; stepBudget: number; visited: number[][] } {
  const cur = st.enemy!;
  let dir = (st.enemyDir ?? pickNextRoamDirection(st));
  let target = st.enemyTarget ?? null;
  let stepBudget = (st.enemyStepBudget ?? 0);
  const visited = st.enemyVisited ? st.enemyVisited.map(row => row.slice()) : Array.from({ length: st.gridSize }, () => Array(st.gridSize).fill(0));

  // LOS check in facing dir
  if (!target) {
    const [dx, dy] = DIRS[dir];
    const player = st.player;
    const aligned = (dx !== 0 ? player.y === cur.y && Math.sign(player.x - cur.x) === dx : player.x === cur.x && Math.sign(player.y - cur.y) === dy);
    if (aligned) {
      let cx = cur.x + dx, cy = cur.y + dy; let clear = true;
      while (clear && !(cx === player.x && cy === player.y)) {
        if (!canStep(st, cx - dx, cy - dy, cx, cy)) { clear = false; break; }
        cx += dx; cy += dy;
      }
      if (clear) target = { x: player.x, y: player.y };
    }
  }

  if (target) {
    const [dx, dy] = DIRS[dir];
    const nx = cur.x + dx, ny = cur.y + dy;
    if (canStep(st, cur.x, cur.y, nx, ny)) {
      const reached = nx === target.x && ny === target.y;
      visited[ny][nx]++;
      return { pos: { x: nx, y: ny }, dir, target: reached ? null : target, stepBudget, visited } as any;
    }
    target = null;
  }

  // Roam step
  {
    const [dx, dy] = DIRS[dir];
    const nx = cur.x + dx, ny = cur.y + dy;
    if (canStep(st, cur.x, cur.y, nx, ny)) {
      stepBudget = stepBudget > 0 ? stepBudget - 1 : 0;
      visited[ny][nx]++;
      if (stepBudget === 0) {
        dir = pickNextRoamDirection(st, dir);
        stepBudget = 2 + Math.floor(Math.random() * 4);
      }
      return { pos: { x: nx, y: ny }, dir, target, stepBudget, visited } as any;
    }
  }
  // Pick a new direction and try once
  dir = pickNextRoamDirection(st, dir);
  {
    const [dx, dy] = DIRS[dir];
    const nx = cur.x + dx, ny = cur.y + dy;
    if (canStep(st, cur.x, cur.y, nx, ny)) {
      stepBudget = 2 + Math.floor(Math.random() * 4);
      visited[ny][nx]++;
      return { pos: { x: nx, y: ny }, dir, target, stepBudget, visited } as any;
    }
  }
  return { pos: cur, dir, target, stepBudget, visited } as any;
}
export function enemy1bTick(st: GameState): { pos: Point; dir: 'up'|'right'|'down'|'left'; target: Point | null; stepBudget: number; visited: number[][] } {
  // Mirror enemy1 behavior but operate on enemy1b state fields
  const cur = (st as any).enemy1b as Point;
  let dir = ((st as any).enemy1bDir ?? pickNextRoamDirection({ ...st, enemy: cur } as GameState)) as 'up'|'right'|'down'|'left';
  let target = ((st as any).enemy1bTarget ?? null) as Point | null;
  let stepBudget = ((st as any).enemy1bStepBudget ?? 0) as number;
  const visited = (st as any).enemy1bVisited ? (st as any).enemy1bVisited.map((r: number[]) => r.slice()) : Array.from({ length: st.gridSize }, () => Array(st.gridSize).fill(0));

  // LOS check
  if (!target) {
    const [dx, dy] = DIRS[dir];
    const player = st.player;
    const aligned = (dx !== 0 ? player.y === cur.y && Math.sign(player.x - cur.x) === dx : player.x === cur.x && Math.sign(player.y - cur.y) === dy);
    if (aligned) {
      let cx = cur.x + dx, cy = cur.y + dy; let clear = true;
      while (clear && !(cx === player.x && cy === player.y)) {
        if (!canStep(st, cx - dx, cy - dy, cx, cy)) { clear = false; break; }
        cx += dx; cy += dy;
      }
      if (clear) target = { x: player.x, y: player.y };
    }
  }

  if (target) {
    const [dx, dy] = DIRS[dir];
    const nx = cur.x + dx, ny = cur.y + dy;
    if (canStep(st, cur.x, cur.y, nx, ny)) {
      const reached = nx === target.x && ny === target.y;
      visited[ny][nx]++;
      return { pos: { x: nx, y: ny }, dir, target: reached ? null : target, stepBudget, visited } as any;
    }
    target = null;
  }

  // Roam step
  {
    const [dx, dy] = DIRS[dir];
    const nx = cur.x + dx, ny = cur.y + dy;
    if (canStep(st, cur.x, cur.y, nx, ny)) {
      stepBudget = stepBudget > 0 ? stepBudget - 1 : 0;
      visited[ny][nx]++;
      if (stepBudget === 0) {
        dir = pickNextRoamDirection({ ...st, enemy: cur } as GameState, dir) as 'up'|'right'|'down'|'left';
        stepBudget = 2 + Math.floor(Math.random() * 4);
      }
      return { pos: { x: nx, y: ny }, dir, target, stepBudget, visited } as any;
    }
  }
  // Pick a new direction and try once
  dir = pickNextRoamDirection({ ...st, enemy: cur } as GameState, dir) as 'up'|'right'|'down'|'left';
  {
    const [dx, dy] = DIRS[dir];
    const nx = cur.x + dx, ny = cur.y + dy;
    if (canStep(st, cur.x, cur.y, nx, ny)) {
      stepBudget = 2 + Math.floor(Math.random() * 4);
      visited[ny][nx]++;
      return { pos: { x: nx, y: ny }, dir, target, stepBudget, visited } as any;
    }
  }
  return { pos: cur, dir, target, stepBudget, visited } as any;
}

// type helper removed; explicit union used in signature


