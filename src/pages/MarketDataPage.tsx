import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Lock, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { MotionItem, MotionList, easeOut } from '../components/motion';

type Instrument = {
  key: string;
  label: string;
  ticker: string;
  latest: number;
  change30d: number;
  source: string;
  provider?: string;
  segment: 'hyperscaler' | 'neocloud';
  accent: string;
  asOf: string;
};

type SeriesPoint = { asOf: string; price: number };

type GpuIndexResponse = {
  range: string;
  segment: string;
  instruments: Instrument[];
  selectedKeys: string[];
  series: Record<string, SeriesPoint[]>;
  feeds: Array<{ name: string; enabled: boolean; lastError?: string; lastCount?: number }>;
};

const SEGMENTS = [
  { id: 'all', label: 'All' },
  { id: 'hyperscaler', label: 'Hyperscaler' },
  { id: 'neocloud', label: 'Neocloud' },
] as const;

const RANGES = [
  { id: '7d', label: '7D', locked: false },
  { id: '30d', label: '30D', locked: false },
  { id: '3m', label: '3M', locked: false },
  { id: '1y', label: '1Y', locked: true },
  { id: 'ytd', label: 'YTD', locked: true },
] as const;

function formatDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function shortGpu(name: string): string {
  if (/H100/i.test(name)) return 'H100';
  if (/H200/i.test(name)) return 'H200';
  if (/A100/i.test(name)) return 'A100';
  if (/B200/i.test(name)) return 'B200';
  if (/MI300/i.test(name)) return 'MI300X';
  return name.split(/[\s/_-]/)[0].slice(0, 10);
}

export function MarketDataPage() {
  const { user } = useAuth();
  const [segment, setSegment] = useState<(typeof SEGMENTS)[number]['id']>('all');
  const [range, setRange] = useState<'7d' | '30d' | '3m'>('30d');
  const [selected, setSelected] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [data, setData] = useState<GpuIndexResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(keys: string[]) {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        range,
        segment,
        ...(keys.length ? { keys: keys.join(',') } : {}),
      });
      const r = await api<GpuIndexResponse>(`/v1/market-data/gpu-index?${qs}`);
      setData(r);
      if (!initialized && r.selectedKeys.length) {
        setSelected(r.selectedKeys);
        setInitialized(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load GPU index');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, segment]);

  useEffect(() => {
    if (!initialized) return;
    void load(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.join('|')]);

  const instruments = data?.instruments ?? [];

  const chartData = useMemo(() => {
    if (!data) return [];
    const keys = selected.length ? selected : data.selectedKeys;
    const map = new Map<string, Record<string, number | string>>();

    for (const key of keys) {
      const series = data.series[key] || [];
      for (const p of series) {
        const day = p.asOf.slice(0, 10);
        const row = map.get(day) || { day, label: formatDay(p.asOf) };
        row[key] = p.price;
        map.set(day, row);
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, row]) => row);
  }, [data, selected]);

  const activeInstruments = instruments.filter((i) => selected.includes(i.key));
  const primary = activeInstruments[0] || instruments[0];

  function toggleKey(key: string) {
    setSelected((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key].slice(0, 4);
    });
  }

  async function refresh() {
    if (user?.role !== 'admin') return;
    await api('/v1/market-data/refresh', { method: 'POST' });
    await load(selected);
  }

  return (
    <MotionList className="space-y-5 w-full">
      <MotionItem className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="ticker mb-2">◉ Live price index</div>
          <h1 className="font-display text-[36px] text-[var(--color-text)] tracking-tight leading-none">GPU Index</h1>
          <p className="text-[14px] text-[var(--color-muted)] mt-3">
            Spot $/GPU-hr across Ornn, Vast, cloud boards, and Lattice tape
          </p>
        </div>
        <div className="flex items-center gap-2">
          {SEGMENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setInitialized(false);
                setSelected([]);
                setSegment(s.id);
              }}
              className={`px-3.5 py-1.5 text-[13px] rounded-full border transition-colors ${
                segment === s.id
                  ? 'border-[var(--color-line-strong)] bg-[var(--lattice-hover-strong)] text-[var(--color-text)]'
                  : 'border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-soft)]'
              }`}
            >
              {s.label}
            </button>
          ))}
          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={() => void refresh()}
              className="lattice-btn lattice-btn-ghost ml-1 text-xs"
            >
              <RefreshCw size={13} strokeWidth={1.5} /> Refresh
            </button>
          )}
        </div>
      </MotionItem>

      <MotionItem>
        <div className="gpu-index-banner">
          Showing last {range === '7d' ? '7' : range === '3m' ? '90' : '30'} days from live feeds.
          Longer history unlocks with full market-data plan.
        </div>
      </MotionItem>

      {error && <div className="text-sm text-[var(--color-danger)]">{error}</div>}

      <div className="grid lg:grid-cols-[280px_1fr] gap-4 min-h-[520px]">
        {/* Instrument picker */}
        <MotionItem>
          <div className="lattice-panel rounded-xl overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--color-soft)]">Instruments</span>
              <span className="font-mono text-[10px] text-[var(--color-muted)]">
                {instruments.length} listed
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[560px] p-2 space-y-1">
              {loading && !instruments.length && (
                <div className="text-[12px] text-[var(--color-muted)] p-4 text-center">Loading…</div>
              )}
              {!loading && !instruments.length && (
                <div className="text-[12px] text-[var(--color-muted)] p-4 text-center">
                  No GPU prices yet — wait for feeds or refresh as admin.
                </div>
              )}
              {instruments.map((inst, i) => {
                const on = selected.includes(inst.key);
                return (
                  <motion.button
                    key={inst.key}
                    type="button"
                    onClick={() => toggleKey(inst.key)}
                    className={`w-full text-left rounded-lg px-3 py-2.5 flex items-start gap-2.5 transition-colors border ${
                      on
                        ? 'bg-[var(--lattice-hover)] border-[var(--color-line-strong)]'
                        : 'border-transparent hover:bg-[var(--lattice-hover)]'
                    }`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3, ease: easeOut }}
                  >
                    <span
                      className="mt-0.5 w-1 self-stretch rounded-full shrink-0"
                      style={{ background: on ? inst.accent : 'var(--color-line-strong)' }}
                    />
                    <span
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        on ? 'border-transparent' : 'border-[var(--color-line-strong)]'
                      }`}
                      style={on ? { background: inst.accent } : undefined}
                    >
                      {on && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path
                            d="M2 5.2L4.1 7.2L8 2.8"
                            stroke="var(--lattice-btn-primary-text)"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium text-[var(--color-text)] truncate">
                          {shortGpu(inst.label || inst.key)}
                        </span>
                        <span className="font-mono text-[12px] text-[var(--color-text)] shrink-0">
                          ${inst.latest.toFixed(2)}
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-[var(--color-muted)] truncate">
                          {inst.ticker}
                        </span>
                        <span
                          className={`font-mono text-[10px] shrink-0 ${
                            inst.change30d >= 0 ? 'text-[var(--color-live)]' : 'text-[var(--color-danger)]'
                          }`}
                        >
                          {inst.change30d >= 0 ? '+' : ''}
                          {inst.change30d.toFixed(1)}%
                        </span>
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </MotionItem>

        {/* Chart panel */}
        <MotionItem>
          <div className="lattice-panel rounded-xl overflow-hidden h-full flex flex-col min-h-[520px]">
            <div className="px-5 py-4 border-b border-[var(--color-line)] flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  Price ($/hr)
                </div>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="font-mono text-[28px] font-medium text-[var(--color-text)] tracking-tight">
                    {primary ? `$${primary.latest.toFixed(2)}` : '—'}
                  </span>
                  {primary && (
                    <span className="text-[13px] text-[var(--color-muted)]">
                      {shortGpu(primary.label)} · {primary.source}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-full border border-[var(--color-line)] bg-black/20">
                {RANGES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    disabled={r.locked}
                    onClick={() => {
                      if (!r.locked) setRange(r.id as '7d' | '30d' | '3m');
                    }}
                      className={`px-3 py-1.5 text-[12px] rounded-full font-mono flex items-center gap-1 transition-colors ${
                      !r.locked && range === r.id
                        ? 'bg-[var(--lattice-btn-primary-bg)] text-[var(--lattice-btn-primary-text)]'
                        : r.locked
                          ? 'text-[var(--color-muted)] opacity-50 cursor-not-allowed'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {r.locked && <Lock size={10} strokeWidth={1.75} />}
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 px-2 py-4 min-h-[380px]">
              {chartData.length === 0 ? (
                <div className="h-full grid place-items-center text-[13px] text-[var(--color-muted)]">
                  {loading ? 'Building series…' : 'Select an instrument to chart'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minHeight={360}>
                  <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      {activeInstruments.map((inst) => (
                        <linearGradient key={inst.key} id={`fill-${inst.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={inst.accent} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={inst.accent} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid stroke="var(--lattice-chart-grid)" strokeDasharray="3 6" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: 'var(--lattice-muted)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: 'var(--lattice-muted)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                      tickFormatter={(v: number) => `$${Number(v).toFixed(2)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--lattice-tooltip-bg)',
                        border: '1px solid var(--color-line)',
                        borderRadius: 8,
                        fontFamily: 'Fragment Mono, monospace',
                        fontSize: 12,
                        color: 'var(--color-text)',
                      }}
                      formatter={(value, name) => [
                        `$${Number(value).toFixed(4)}`,
                        shortGpu(String(name)),
                      ]}
                      labelStyle={{ color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}
                    />
                    {activeInstruments.map((inst, idx) => (
                      <Area
                        key={`area-${inst.key}`}
                        type="monotone"
                        dataKey={inst.key}
                        stroke="none"
                        fill={`url(#fill-${inst.key})`}
                        fillOpacity={idx === 0 ? 1 : 0.45}
                        isAnimationActive
                      />
                    ))}
                    {activeInstruments.map((inst) => (
                      <Line
                        key={`line-${inst.key}`}
                        type="monotone"
                        dataKey={inst.key}
                        stroke={inst.accent}
                        strokeWidth={2.25}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        isAnimationActive
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {activeInstruments.length > 0 && (
              <div className="px-5 py-3 border-t border-[var(--color-line)] flex flex-wrap gap-4">
                {activeInstruments.map((inst) => (
                  <div key={inst.key} className="flex items-center gap-2 text-[12px]">
                    <span className="w-2 h-2 rounded-full" style={{ background: inst.accent }} />
                    <span className="text-[var(--color-soft)]">{shortGpu(inst.label)}</span>
                    <span className="font-mono text-[var(--color-muted)]">{inst.ticker}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </MotionItem>
      </div>

      {/* Feed strip */}
      {!!data?.feeds?.length && (
        <MotionItem>
          <div className="flex flex-wrap gap-2">
            {data.feeds.map((f) => (
              <div
                key={f.name}
                className="font-mono text-[10px] uppercase tracking-wide px-2.5 py-1.5 rounded-full border border-[var(--color-line)] text-[var(--color-muted)]"
              >
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${
                    f.lastError ? 'bg-[var(--color-danger)]' : f.enabled ? 'bg-[var(--color-live)]' : 'bg-[var(--color-line-strong)]'
                  }`}
                />
                {f.name}
                {f.enabled && !f.lastError ? ` · ${f.lastCount ?? 0}` : f.lastError ? ' · err' : ' · off'}
              </div>
            ))}
          </div>
        </MotionItem>
      )}
    </MotionList>
  );
}
