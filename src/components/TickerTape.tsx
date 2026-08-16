const TICKS = [
  { s: 'ORNN-H100', p: '2.48', up: true },
  { s: 'CIBLKWUS', p: '2.71', up: true },
  { s: 'A100-RT', p: '1.36', up: false },
  { s: 'B200-SX', p: '4.18', up: true },
  { s: 'KALSHI', p: '0.62', up: true },
  { s: 'FEDFUNDS', p: '4.33', up: false },
  { s: 'H200-OCPI', p: '3.09', up: true },
  { s: 'VAST-H100', p: '2.21', up: false },
];

export function TickerTape() {
  const row = (prefix: string) => (
    <div className="ticker-track-inner">
      {TICKS.map((t) => (
        <span key={`${prefix}-${t.s}`} className="ticker-item">
          <span className={t.up ? 'ticker-up' : 'ticker-down'}>{t.up ? '▲' : '▼'}</span>
          <span className="ticker-sym">{t.s}</span>
          <span className="ticker-px">${t.p}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="ticker-tape">
      <span className="ticker-label">Live compute prices</span>
      <div className="ticker-track">
        {row('a')}
        {row('b')}
      </div>
    </div>
  );
}
