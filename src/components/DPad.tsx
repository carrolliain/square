import React from 'react';
import type { ControlKey } from '../types';

interface DPadProps {
  onPress: (key: ControlKey) => void;
  uiSize?: number;
}

export function DPad({ onPress, uiSize = 88 }: DPadProps) {
  const btnStyle: React.CSSProperties = {
    position: 'absolute', width: uiSize, height: uiSize,
    background: '#3b4151', border: '2px solid #9aa4ff', borderRadius: 14,
    display: 'grid', placeItems: 'center', fontSize: 22, userSelect: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.35)'
  };

  const wrap: React.CSSProperties = {
    position: 'relative', width: uiSize * 3, height: uiSize * 3, margin: '6px 0 14px'
  };

  return (
    <div style={wrap}>
      <button aria-label="Up" style={{ ...btnStyle, left: uiSize, top: 0 }} onPointerDown={(e) => { e.preventDefault(); onPress('ArrowUp'); }}>▲</button>
      <button aria-label="Left" style={{ ...btnStyle, left: 0, top: uiSize }} onPointerDown={(e) => { e.preventDefault(); onPress('ArrowLeft'); }}>◀</button>
      <button aria-label="Right" style={{ ...btnStyle, left: uiSize * 2, top: uiSize }} onPointerDown={(e) => { e.preventDefault(); onPress('ArrowRight'); }}>▶</button>
      <button aria-label="Down" style={{ ...btnStyle, left: uiSize, top: uiSize * 2 }} onPointerDown={(e) => { e.preventDefault(); onPress('ArrowDown'); }}>▼</button>
    </div>
  );
}


