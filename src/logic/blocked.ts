import type { Point } from '../types';

export function isBlocked(x: number, y: number, blockedTiles: Point[]): boolean {
  for (let i = 0; i < blockedTiles.length; i++) {
    const t = blockedTiles[i];
    if (t.x === x && t.y === y) return true;
  }
  return false;
}


