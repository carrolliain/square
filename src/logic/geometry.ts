import type { Point } from '../types';

export function isSameCell(a: Point | null | undefined, b: Point | null | undefined): boolean {
  return !!a && !!b && a.x === b.x && a.y === b.y;
}

export function isInsideRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number) {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}

export function isOrthAdjacent(x1: number, y1: number, x2: number, y2: number) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;
}

export function rectsOverlapWithGap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
  gap: number
): boolean {
  return (ax - gap) < (bx + bw) && (ax + aw) > (bx - gap) && (ay - gap) < (by + bh) && (ay + ah) > (by - gap);
}

export function isAdjToAny(x: number, y: number, points: Array<Point | null | undefined>): boolean {
  for (const p of points) {
    if (p && isOrthAdjacent(x, y, p.x, p.y)) return true;
  }
  return false;
}


