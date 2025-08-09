import type { ControlMapping } from '../types';

export const mappings: ControlMapping[] = [
  { ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowLeft: [-1, 0] },
  { ArrowUp: [1, 0], ArrowRight: [0, 1], ArrowDown: [-1, 0], ArrowLeft: [0, -1] },
  { ArrowUp: [0, 1], ArrowRight: [-1, 0], ArrowDown: [0, -1], ArrowLeft: [1, 0] },
  { ArrowUp: [-1, 0], ArrowRight: [0, -1], ArrowDown: [1, 0], ArrowLeft: [0, 1] },
];

export const mappingNames = ['Normal', '↻ 90°', '↻ 180°', '↻ 270°'];


