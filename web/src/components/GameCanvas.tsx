import { useEffect, useMemo, useRef } from 'react';
import type { GameState } from '../types';

interface GameCanvasProps {
  state: GameState;
  onResizeCell: (cellPx: number) => void;
}

// Generate crisp placeholder sprites on an offscreen canvas to ensure visibility on dark background
function createSprite(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = true;
  draw(g, size);
  return c;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function GameCanvas({ state, onResizeCell }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);

  const sprites = useMemo(() => {
    const S = 128; // base sprite size
    const portalAColor = '#64b5f6';
    const portalBColor = '#ff9800';
    const player = createSprite(S, (g, s) => {
      g.clearRect(0, 0, s, s);
      // outline
      roundRect(g, 8, 8, s - 16, s - 16, 18);
      g.fillStyle = '#66e0ff';
      g.fill();
      g.lineWidth = 8;
      g.strokeStyle = '#ffffff';
      g.stroke();
    });

    const door = createSprite(S, (g, s) => {
      g.clearRect(0, 0, s, s);
      roundRect(g, 12, 12, s - 24, s - 24, 10);
      g.fillStyle = '#6d4c41';
      g.fill();
      g.lineWidth = 8;
      g.strokeStyle = '#3e2723';
      g.stroke();
      g.beginPath();
      g.fillStyle = '#ffd54a';
      g.arc(s * 0.72, s * 0.6, Math.max(5, s * 0.06), 0, Math.PI * 2);
      g.fill();
    });

    const lock = createSprite(S, (g, s) => {
      g.clearRect(0, 0, s, s);
      // body
      roundRect(g, s * 0.2, s * 0.45, s * 0.6, s * 0.4, 10);
      g.fillStyle = '#3b4151';
      g.fill();
      g.lineWidth = 8;
      g.strokeStyle = '#9aa4ff';
      g.stroke();
      // shackle
      g.beginPath();
      g.moveTo(s * 0.25, s * 0.45);
      g.quadraticCurveTo(s * 0.5, s * 0.18, s * 0.75, s * 0.45);
      g.stroke();
    });

    const key = createSprite(S, (g, s) => {
      g.clearRect(0, 0, s, s);
      g.lineWidth = 10;
      g.strokeStyle = '#b9922c';
      g.fillStyle = '#ffd54a';
      // ring
      g.beginPath();
      g.arc(s * 0.3, s * 0.45, s * 0.14, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      // stem
      g.beginPath();
      g.moveTo(s * 0.44, s * 0.45);
      g.lineTo(s * 0.82, s * 0.45);
      g.stroke();
      // teeth
      g.beginPath();
      g.moveTo(s * 0.68, s * 0.45);
      g.lineTo(s * 0.68, s * 0.6);
      g.moveTo(s * 0.78, s * 0.45);
      g.lineTo(s * 0.78, s * 0.55);
      g.stroke();
    });

    // small key badge to draw inside player when carrying (door key)
    const keyBadge = createSprite(S, (g, s) => {
      g.clearRect(0, 0, s, s);
      g.lineWidth = 8;
      g.strokeStyle = '#b9922c';
      g.fillStyle = '#ffd54a';
      g.beginPath();
      g.arc(s * 0.70, s * 0.28, s * 0.10, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(s * 0.78, s * 0.30);
      g.lineTo(s * 0.90, s * 0.30);
      g.stroke();
      g.beginPath();
      g.moveTo(s * 0.86, s * 0.30);
      g.lineTo(s * 0.86, s * 0.38);
      g.stroke();
    });

    const portalEntry = createSprite(S, (g, s) => {
      g.clearRect(0, 0, s, s);
      // outer ring
      g.beginPath();
      g.strokeStyle = portalAColor;
      g.lineWidth = 12;
      g.arc(s / 2, s / 2, s * 0.36, 0, Math.PI * 2);
      g.stroke();
      // swirl
      g.beginPath();
      g.lineWidth = 8;
      g.moveTo(s * 0.2, s * 0.5);
      g.quadraticCurveTo(s * 0.5, s * 0.1, s * 0.8, s * 0.5);
      g.quadraticCurveTo(s * 0.5, s * 0.85, s * 0.3, s * 0.7);
      g.stroke();
    });

    const portalExit = createSprite(S, (g, s) => {
      g.clearRect(0, 0, s, s);
      // glow pad
      const grad = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
      grad.addColorStop(0, 'rgba(100,181,246,0.8)');
      grad.addColorStop(1, 'rgba(100,181,246,0.2)');
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
      // arrow
      g.beginPath();
      g.strokeStyle = portalAColor;
      g.lineWidth = 9;
      g.moveTo(s * 0.25, s * 0.65);
      g.lineTo(s * 0.5, s * 0.35);
      g.lineTo(s * 0.75, s * 0.65);
      g.stroke();
    });

    // Portal pair B (orange)
    const portalBEntry = createSprite(S, (g, s) => {
      g.clearRect(0, 0, s, s);
      g.beginPath();
      g.strokeStyle = portalBColor;
      g.lineWidth = 12;
      g.arc(s / 2, s / 2, s * 0.36, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.lineWidth = 8;
      g.moveTo(s * 0.2, s * 0.5);
      g.quadraticCurveTo(s * 0.5, s * 0.1, s * 0.8, s * 0.5);
      g.quadraticCurveTo(s * 0.5, s * 0.85, s * 0.3, s * 0.7);
      g.stroke();
    });

    const portalBExit = createSprite(S, (g, s) => {
      g.clearRect(0, 0, s, s);
      const grad = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
      grad.addColorStop(0, 'rgba(255,152,0,0.8)');
      grad.addColorStop(1, 'rgba(255,152,0,0.2)');
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
      g.beginPath();
      g.strokeStyle = portalBColor;
      g.lineWidth = 9;
      g.moveTo(s * 0.25, s * 0.65);
      g.lineTo(s * 0.5, s * 0.35);
      g.lineTo(s * 0.75, s * 0.65);
      g.stroke();
    });

    const voidTile = createSprite(S, (g, s) => {
      g.clearRect(0, 0, s, s);
      const grad = g.createRadialGradient(s/2, s/2, 2, s/2, s/2, s/1.2);
      grad.addColorStop(0, '#0b0f16');
      grad.addColorStop(1, '#0a0d12');
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
    });

    // obstruction/block tile (distinct color)
    const blockTile = createSprite(S, (g, s) => {
      g.clearRect(0, 0, s, s);
      const grad = g.createLinearGradient(0, 0, s, s);
      grad.addColorStop(0, '#7c3aed');
      grad.addColorStop(1, '#5b21b6');
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
      g.strokeStyle = 'rgba(255,255,255,0.65)';
      g.lineWidth = Math.max(4, s * 0.06);
      g.beginPath();
      g.moveTo(s * 0.18, s * 0.18);
      g.lineTo(s * 0.82, s * 0.82);
      g.moveTo(s * 0.82, s * 0.18);
      g.lineTo(s * 0.18, s * 0.82);
      g.stroke();
    });

    // portal A key (blue) icon
    const portalAKey = createSprite(S, (g, s) => {
      g.clearRect(0, 0, s, s);
      g.lineWidth = 10;
      g.strokeStyle = '#1976d2';
      g.fillStyle = '#64b5f6';
      g.beginPath();
      g.arc(s * 0.3, s * 0.45, s * 0.14, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(s * 0.44, s * 0.45);
      g.lineTo(s * 0.82, s * 0.45);
      g.stroke();
      g.beginPath();
      g.moveTo(s * 0.68, s * 0.45);
      g.lineTo(s * 0.68, s * 0.6);
      g.moveTo(s * 0.78, s * 0.45);
      g.lineTo(s * 0.78, s * 0.55);
      g.stroke();
    });

    // enemy sprite
    const enemy = createSprite(S, (g, s) => {
      g.clearRect(0, 0, s, s);
      g.beginPath();
      g.arc(s / 2, s / 2, s * 0.32, 0, Math.PI * 2);
      g.fillStyle = '#ef5350';
      g.fill();
      g.lineWidth = 8;
      g.strokeStyle = '#b71c1c';
      g.stroke();
      // facing arrow overlay
      g.beginPath();
      g.fillStyle = '#ffffff';
      const aw = s * 0.12, al = s * 0.22;
      // draw UP arrow by default centered; rotation will be applied when drawing
      g.moveTo(s/2, s/2 - al);
      g.lineTo(s/2 - aw, s/2);
      g.lineTo(s/2 + aw, s/2);
      g.closePath();
      g.fill();
    });

    return { player, door, key, keyBadge, portalAKey, lock, portalEntry, portalExit, portalBEntry, portalBExit, voidTile, blockTile, enemy };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext('2d');
    if (!context) return;
    ctx.current = context as any;

    const onResize = () => {
      const margin = 24;
      const w = window.innerWidth - margin * 2;
      const h = window.innerHeight - 220;
      const side = Math.max(240, Math.min(w, h));
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.style.width = side + 'px';
      canvas.style.height = side + 'px';
      canvas.width = Math.floor(side * dpr);
      canvas.height = Math.floor(side * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cell = Math.floor(side / state.gridSize);
      onResizeCell(cell);
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, [onResizeCell, state.gridSize]);

  useEffect(() => {
    const c = ctx.current;
    if (!c) return;
    const { gridSize, cellSizePx } = state;

    // clear
    c.clearRect(0, 0, (c.canvas as HTMLCanvasElement).width, (c.canvas as HTMLCanvasElement).height);

    // grid
    c.strokeStyle = '#4a5161';
    c.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      c.beginPath(); c.moveTo(i * cellSizePx, 0); c.lineTo(i * cellSizePx, gridSize * cellSizePx); c.stroke();
      c.beginPath(); c.moveTo(0, i * cellSizePx); c.lineTo(gridSize * cellSizePx, i * cellSizePx); c.stroke();
    }
    // axis labels: columns A.. and rows 1..
    const toLetters = (n: number) => {
      let s = '';
      n += 1; // 1-indexed
      while (n > 0) {
        const rem = (n - 1) % 26;
        s = String.fromCharCode(65 + rem) + s;
        n = Math.floor((n - 1) / 26);
      }
      return s;
    };
    c.save();
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.font = `${Math.max(10, Math.floor(cellSizePx * 0.28))}px system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    // Top row: column letters
    for (let x = 0; x < gridSize; x++) {
      c.fillText(toLetters(x), x * cellSizePx + cellSizePx / 2, cellSizePx * 0.18);
    }
    // Left column: row numbers
    for (let y = 0; y < gridSize; y++) {
      c.fillText(String(y + 1), cellSizePx * 0.18, y * cellSizePx + cellSizePx / 2);
    }
    c.restore();
    // main walkable area border (outer edge only)
    c.save();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.strokeRect(0, 0, gridSize * cellSizePx, gridSize * cellSizePx);
    c.restore();
    // draw separate borders for each island only (no enclosing parent border besides main)
    if ((state as any).islandRects && (state as any).islandRects.length) {
      c.save();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 3;
      for (const r of (state as any).islandRects) {
        c.strokeRect(r.x * cellSizePx, r.y * cellSizePx, r.w * cellSizePx, r.h * cellSizePx);
      }
      c.restore();
    }

    const drawImg = (img: CanvasImageSource, gx: number, gy: number) => {
      c.drawImage(img as any, gx * cellSizePx, gy * cellSizePx, cellSizePx, cellSizePx);
    };

    // draw obstruction blocks distinctly (mainland obstacles)
    if (state.blockedTiles && state.blockedTiles.length) {
      for (const t of state.blockedTiles as any[]) {
        // only draw blocks that are not inside islands; island borders are drawn separately
        let inside = false;
        if ((state as any).islandRects) {
          for (const r of (state as any).islandRects) {
            if (t.x >= r.x && t.x < r.x + r.w && t.y >= r.y && t.y < r.y + r.h) { inside = true; break; }
          }
        }
        if (!inside) drawImg(sprites.blockTile, t.x, t.y);
      }
    }

    // hole + door overlay
    drawImg(sprites.door, state.hole.x, state.hole.y);
    if (state.gateActive && !state.hasKey) drawImg(sprites.lock, state.hole.x, state.hole.y);

    // key (door)
    if (state.key) drawImg(sprites.key, state.key.x, state.key.y);
    // portal A key on Island A (level 16+)
    if (state.portalAKey) drawImg(sprites.portalAKey, state.portalAKey.x, state.portalAKey.y);

    // portals 11–15
    if (state.portalEntry) drawImg(sprites.portalEntry, state.portalEntry.x, state.portalEntry.y);
    if (state.portalExit) drawImg(sprites.portalExit, state.portalExit.x, state.portalExit.y);
    // portals 16+
    if (state.portalAEntry) {
      drawImg(sprites.portalEntry, state.portalAEntry.x, state.portalAEntry.y);
      // show a simple lock badge over blue portal entry while locked (level 16+)
      const locked = (state as any).portalALocked && !(state as any).hasPortalAKey;
      if (locked) {
        // draw a small lock glyph
        c.save();
        c.fillStyle = 'rgba(0,0,0,0.6)';
        const x = state.portalAEntry.x * cellSizePx + cellSizePx * 0.6;
        const y = state.portalAEntry.y * cellSizePx + cellSizePx * 0.1;
        const w = cellSizePx * 0.28;
        const h = cellSizePx * 0.2;
        c.fillRect(x, y + h * 0.4, w, h);
        c.strokeStyle = '#9aa4ff';
        c.lineWidth = Math.max(2, cellSizePx * 0.04);
        c.strokeRect(x, y + h * 0.4, w, h);
        c.beginPath();
        c.moveTo(x + w * 0.2, y + h * 0.4);
        c.quadraticCurveTo(x + w * 0.5, y - h * 0.4, x + w * 0.8, y + h * 0.4);
        c.stroke();
        c.restore();
      }
    }
    if (state.portalAExit) drawImg(sprites.portalExit, state.portalAExit.x, state.portalAExit.y);
    if (state.portalBEntry) drawImg(sprites.portalBEntry, state.portalBEntry.x, state.portalBEntry.y);
    if (state.portalBExit) drawImg(sprites.portalBExit, state.portalBExit.x, state.portalBExit.y);

    // player
    drawImg(sprites.player, state.player.x, state.player.y);
    if (state.hasKey) {
      // overlay small key badge at top-right corner inside the player's tile
      drawImg(sprites.keyBadge, state.player.x, state.player.y);
    }
    // show a small blue key badge when portal A key collected (level 16+)
    if ((state as any).hasPortalAKey) {
      drawImg(sprites.portalAKey, state.player.x, state.player.y);
    }

    // enemy
    if ((state as any).enemy) {
      const e = (state as any).enemy;
      const dir = (state as any).enemyDir as ('up'|'right'|'down'|'left') | undefined;
      const angle = dir === 'up' ? 0 : dir === 'right' ? Math.PI/2 : dir === 'down' ? Math.PI : dir === 'left' ? -Math.PI/2 : 0;
      c.save();
      c.translate((e.x + 0.5) * cellSizePx, (e.y + 0.5) * cellSizePx);
      c.rotate(angle);
      c.drawImage(sprites.enemy as any, -cellSizePx/2, -cellSizePx/2, cellSizePx, cellSizePx);
      c.restore();
    }
  }, [state, sprites]);

  return <canvas ref={canvasRef} aria-label="Game canvas" style={{ background: '#2a2f3a', border: '0', borderRadius: 12, touchAction: 'none' }} />;
}


