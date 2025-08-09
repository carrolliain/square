import type { GameState } from '../types';
import { mappings } from './controls';

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
    enemy: null as any,
    initialKey: null as any,
    initialPortalAKey: null as any,
  } as GameState;
}


