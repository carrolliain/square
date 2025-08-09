// no-op

interface HUDProps {
  level: number;
  gateActive: boolean;
  hasKey: boolean;
}

export function HUD({ level, gateActive, hasKey }: HUDProps) {
  const lockStatus = gateActive ? (hasKey ? ' 🔑' : ' 🔒') : '';
  return (
    <div style={{ width: '100%', maxWidth: 520, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', boxSizing: 'border-box' }}>
      <span style={{ opacity: 0.9 }}>{`Level ${level}${lockStatus}`}</span>
    </div>
  );
}


