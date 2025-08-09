import type { Point } from '../types';
import { isBlocked } from './blocked';

export function bfsReachableOpenCells(
  gridSize: number,
  blocked: Point[],
  exclude: (x: number, y: number) => boolean
): Point[] {
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


