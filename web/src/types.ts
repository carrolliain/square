export type Point = { x: number; y: number };

export type ControlKey = 'ArrowUp' | 'ArrowRight' | 'ArrowDown' | 'ArrowLeft';

export type ControlMapping = Record<ControlKey, [number, number]>;

export interface AreaRect { x: number; y: number; w: number; h: number }

export interface GameState {
  gridSize: number;
  cellSizePx: number;
  level: number;
  player: Point;
  hole: Point;
  hasKey: boolean;
  key: Point | null;
  initialKey?: Point | null;
  gateActive: boolean;
  // Levels 11–15 single portal pair
  portalEntry: Point | null;
  portalExit: Point | null;
  portalLocked?: boolean;
  // Levels 16+ dual portal pairs
  portalAEntry?: Point | null;
  portalAExit?: Point | null;
  portalALocked?: boolean;
  portalAKey?: Point | null; // key to unlock portal A (blue) on mainland
  initialPortalAKey?: Point | null;
  hasPortalAKey?: boolean;
  portalBEntry?: Point | null;
  portalBExit?: Point | null;
  portalBLocked?: boolean;
  portalKey?: Point | null; // key to unlock portalB entry on mainland
  usedPortal: boolean;
  blockedTiles: Point[];
  currentMapping: ControlMapping;
  islandRects?: AreaRect[]; // rectangular islands for 11+ (and 16+: two islands)
  enemy?: Point | null;
  enemyDir?: 'up' | 'right' | 'down' | 'left';
  enemyTarget?: Point | null;
  enemyStepBudget?: number;
  enemyVisited?: number[][];
  // Second enemy (appears level >= 24)
  enemy2?: Point | null;
  enemy2Dir?: 'up' | 'right' | 'down' | 'left';
  enemy2Target?: Point | null;
  enemy2StepBudget?: number;
  enemy2Visited?: number[][];
}


