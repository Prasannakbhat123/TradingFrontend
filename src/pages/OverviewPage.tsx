import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Columns3,
  Cpu,
  DollarSign,
  Gavel,
  Layers,
  Radio,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { MotionItem, MotionList, easeOut } from '../components/motion';

type Feed = {
  name: string;
  enabled: boolean;
  lastSuccessAt?: string;
  lastError?: string;
  lastCount?: number;
};

type Position = {
  _id: string;
  gpuType: string;
  quantity: number;
  providerName: string;
  region: string;
  pricePerGpuHour: number;
  totalCost: number;
  status: string;
  expiryDate: string;
};

type PipelineColumn = {
  stage: string;
  label: string;
  count: number;
  totalLabel: string;
};

type Benchmark = {
  instrumentKey: string;
  median: number;
  latest: number;
};

type Order = {
  _id: string;
  gpuType: string;
  quantity: number;
  status: string;
  createdAt: string;
};

function AnimatedNumber({
  value,
  prefix = '',
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  decimals?: number;
}) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) =>
    decimals > 0 ? `${prefix}${v.toFixed(decimals)}` : `${prefix}${Math.round(v).toLocaleString()}`
  );
  const [text, setText] = useState(`${prefix}0`);

  useEffect(() => {
    mv.set(value || 0);
  }, [value, mv]);

  useEffect(() => {
    const unsub = display.on('change', (v) => setText(v));
    return () => unsub();
  }, [display]);

  return <span>{text}</span>;
}

function formatValue(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function gpuShort(gpuType: string): string {
  if (gpuType.includes('H100')) return 'H100';
  if (gpuType.includes('H200')) return 'H200';
  if (gpuType.includes('A100')) return 'A100';
  if (gpuType.includes('B200')) return 'B200';
  return gpuType.split(' ')[0];
}

function LivePulse() {
  return (
    <motion.span
      className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-live)]"
      animate={{ opacity: [1, 0.35, 1], scale: [1, 0.85, 1] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  delay,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: typeof Cpu;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      className="overview-stat-card relative overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: easeOut }}
      whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.14)' }}
    >
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.07] blur-2xl pointer-events-none"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between gap-3 relative">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--color-line)]"
          style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
        >
          <Icon size={15} strokeWidth={1.5} style={{ color: accent }} />
        </div>
        {sub && (
          <span className="font-mono text-[10px] text-[var(--color-muted)] tracking-wide">{sub}</span>
        )}
      </div>
      <div className="mt-4 text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">{label}</div>
      <div className="mt-1.5 text-[26px] font-semibold font-mono tracking-tight text-[var(--color-text)]">{value}</div>
    </motion.div>
  );
}

export function OverviewPage() {
  const { user } = useAuth();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [portfolio, setPortfolio] = useState<{
    summary?: {
      totalCost: number;
      totalQty: number;
      avgPricePerGpuHour: number;
      concentration?: Record<string, number>;
    };
    positions?: Position[];
    alerts?: Array<{ message: string }>;
  }>({});
  const [pipeline, setPipeline] = useState<PipelineColumn[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    void Promise.all([
      api<{ feeds: Feed[] }>('/v1/market-data/feeds').then((r) => setFeeds(r.feeds)),
      api<{
        summary: {
          totalCost: number;
          totalQty: number;
          avgPricePerGpuHour: number;
          concentration: Record<string, number>;
        };
        positions: Position[];
        alerts: Array<{ message: string }>;
      }>('/v1/portfolio').then(setPortfolio),
      api<{ columns: PipelineColumn[] }>('/v1/pipeline').then((r) => setPipeline(r.columns)),
      api<{ benchmarks: Benchmark[] }>('/v1/market-data?source=ornn').then((r) =>
        setBenchmarks(r.benchmarks.slice(0, 5))
      ),
      api<{ orders: Order[] }>('/v1/orders').then((r) => setOrders(r.orders.slice(0, 5))),
    ]).catch(() => undefined);
  }, []);

  const qty = portfolio.summary?.totalQty ?? 0;
  const avg = portfolio.summary?.avgPricePerGpuHour ?? 0;
  const total = portfolio.summary?.totalCost ?? 0;
  const activeFeeds = feeds.filter((f) => f.enabled && !f.lastError).length;
  const pipelineTotal = pipeline.reduce((s, c) => s + c.count, 0);

  const concentration = useMemo(() => {
    const entries = Object.entries(portfolio.summary?.concentration ?? {});
    const max = Math.max(1, ...entries.map(([, v]) => v));
    return entries.sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [portfolio.summary?.concentration]);

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <MotionList className="space-y-8 w-full">
      {/* Hero */}
      <MotionItem>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <LivePulse />
              <span className="ticker text-[11px]">Live compute market data</span>
              <span className="text-[var(--color-line-strong)]">·</span>
              <span className="font-mono text-[11px] text-[var(--color-muted)]">
                {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <h1 className="font-display text-[40px] text-[var(--color-text)] tracking-tight leading-[1.05]">
              Welcome, {firstName}
            </h1>
            <p className="text-[15px] text-[var(--color-muted)] mt-3 leading-relaxed max-w-xl">
              Route RFQs across normalized supplier inventory, track capacity, and overlay live Ornn /
              Kalshi / FRED / EIA signals — tools for{' '}
              <em className="text-[var(--color-soft)] not-italic font-normal">compute traders</em>.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 pt-1">
            <div className="overview-org-pill">{user?.orgName}</div>
            <div className="font-mono text-[11px] text-[var(--color-muted)] capitalize">{user?.role}</div>
          </div>
        </div>
      </MotionItem>

      {/* Stats */}
      <MotionItem>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Portfolio GPU qty"
            value={<AnimatedNumber value={qty} />}
            sub={`${portfolio.positions?.length ?? 0} positions`}
            icon={Cpu}
            accent="#21d900"
            delay={0.08}
          />
          <StatCard
            label="Avg $/GPU-hr"
            value={<AnimatedNumber value={avg} prefix="$" decimals={2} />}
            sub="weighted"
            icon={TrendingUp}
            accent="#6eb5ff"
            delay={0.14}
          />
          <StatCard
            label="Contracted value"
            value={<AnimatedNumber value={total} prefix="$" />}
            sub="notional"
            icon={DollarSign}
            accent="#e8925a"
            delay={0.2}
          />
          <StatCard
            label="Pipeline deals"
            value={<AnimatedNumber value={pipelineTotal} />}
            sub={`${activeFeeds}/${feeds.length} feeds live`}
            icon={Layers}
            accent="#c45a2c"
            delay={0.26}
          />
        </div>
      </MotionItem>

      {/* Pipeline snapshot */}
      {pipeline.length > 0 && (
        <MotionItem>
          <div className="lattice-panel rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-line)]">
              <div className="flex items-center gap-2">
                <Columns3 size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                <span className="text-[13px] font-medium text-[var(--color-soft)]">Deal pipeline</span>
              </div>
              <Link
                to="/pipeline"
                className="text-[11px] font-mono text-[var(--color-live)] hover:underline flex items-center gap-1"
              >
                Open board <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-[var(--color-line)]">
              {pipeline.map((col, i) => (
                <motion.div
                  key={col.stage}
                  className="px-4 py-4 text-center hover:bg-[var(--lattice-hover)] transition-colors"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.35, ease: easeOut }}
                >
                  <div className="font-mono text-[18px] font-medium text-[var(--color-text)]">{col.count}</div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--color-muted)] mt-1 leading-tight">
                    {col.label}
                  </div>
                  <div className="font-mono text-[10px] text-[var(--color-muted)] mt-1.5 opacity-70">
                    {col.totalLabel}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </MotionItem>
      )}

      {/* Main grid */}
      <div className="grid lg:grid-cols-12 gap-5">
        {/* Left column */}
        <div className="lg:col-span-7 space-y-5">
          {/* Live feeds */}
          <MotionItem>
            <motion.div
              className="lattice-panel rounded-xl p-5"
              whileHover={{ borderColor: 'rgba(255,255,255,0.14)' }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[rgba(33,217,0,0.08)] border border-[rgba(33,217,0,0.2)] flex items-center justify-center">
                    <Radio size={14} strokeWidth={1.5} className="text-[var(--color-live)]" />
                  </div>
                  <div>
                    <h2 className="text-[14px] font-semibold text-[var(--color-text)]">Live feeds</h2>
                    <p className="text-[11px] text-[var(--color-muted)]">{activeFeeds} sources connected</p>
                  </div>
                </div>
                <span className="ticker text-[10px] flex items-center gap-1">
                  <TrendingUp size={10} /> LATTICE
                </span>
              </div>
              <div className="space-y-1">
                {feeds.length === 0 && (
                  <div className="text-[13px] text-[var(--color-muted)] py-4 text-center">
                    Waiting for feed health…
                  </div>
                )}
                {feeds.map((f, i) => {
                  const ok = f.enabled && !f.lastError;
                  const pct = ok ? Math.min(100, ((f.lastCount ?? 0) / 30) * 100) : 0;
                  return (
                    <motion.div
                      key={f.name}
                      className="group flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-[var(--lattice-hover)] transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.04, duration: 0.35, ease: easeOut }}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          f.lastError ? 'bg-[var(--color-danger)]' : ok ? 'bg-[var(--color-live)]' : 'bg-[var(--color-line-strong)]'
                        }`}
                      />
                      <span className="font-mono uppercase text-[11px] tracking-wide text-[var(--color-soft)] w-28 shrink-0">
                        {f.name}
                      </span>
                      <div className="flex-1 h-1 rounded-full bg-[var(--color-line)] overflow-hidden hidden sm:block">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: ok ? 'var(--color-live)' : 'var(--color-line-strong)',
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.4 + i * 0.05, duration: 0.6, ease: easeOut }}
                        />
                      </div>
                      <span
                        className={`font-mono text-[11px] shrink-0 ${
                          f.lastError ? 'text-[var(--color-danger)]' : ok ? 'lattice-live' : 'text-[var(--color-muted)]'
                        }`}
                      >
                        {f.lastError ? 'error' : f.enabled ? `ok · ${f.lastCount ?? 0}` : 'off'}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </MotionItem>

          {/* Compute tape */}
          {benchmarks.length > 0 && (
            <MotionItem>
              <motion.div
                className="lattice-panel rounded-xl p-5"
                whileHover={{ borderColor: 'rgba(255,255,255,0.14)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <BarChart3 size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                    <h2 className="text-[14px] font-semibold text-[var(--color-text)]">Compute tape</h2>
                  </div>
                  <Link
                    to="/market-data"
                    className="text-[11px] font-mono text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors flex items-center gap-1"
                  >
                    Full tape <ArrowUpRight size={11} />
                  </Link>
                </div>
                <div className="divide-y divide-[var(--color-line)]">
                  {benchmarks.map((b, i) => (
                    <motion.div
                      key={b.instrumentKey}
                      className="flex items-center justify-between py-2.5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                    >
                      <span className="font-mono text-[12px] text-[var(--color-soft)]">
                        {gpuShort(b.instrumentKey)}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-[11px] text-[var(--color-muted)]">
                          med ${b.median?.toFixed(2)}
                        </span>
                        <span className="font-mono text-[13px] text-[var(--color-live)]">
                          ${b.latest?.toFixed(2)}/hr
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </MotionItem>
          )}

          {/* Recent orders */}
          {orders.length > 0 && (
            <MotionItem>
              <motion.div className="lattice-panel rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <Activity size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                    <h2 className="text-[14px] font-semibold text-[var(--color-text)]">Recent activity</h2>
                  </div>
                  <Link
                    to="/orders"
                    className="text-[11px] font-mono text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors flex items-center gap-1"
                  >
                    All orders <ArrowUpRight size={11} />
                  </Link>
                </div>
                <div className="divide-y divide-[var(--color-line)]">
                  {orders.map((o, i) => (
                    <motion.div
                      key={o._id}
                      className="flex items-center justify-between py-2.5 gap-3"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.04 }}
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-[12px] text-[var(--color-soft)] truncate">
                          {gpuShort(o.gpuType)} × {o.quantity}
                        </div>
                        <div className="text-[10px] text-[var(--color-muted)] mt-0.5">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span
                        className={`font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border shrink-0 ${
                          o.status === 'filled'
                            ? 'text-[var(--color-live)] border-[rgba(33,217,0,0.3)] bg-[rgba(33,217,0,0.06)]'
                            : 'text-[var(--color-muted)] border-[var(--color-line)] bg-[var(--lattice-hover)]'
                        }`}
                      >
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </MotionItem>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-5 space-y-5">
          {/* Quick actions */}
          <MotionItem>
            <motion.div
              className="lattice-panel rounded-xl p-5"
              whileHover={{ borderColor: 'rgba(255,255,255,0.14)' }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <Zap size={14} strokeWidth={1.5} className="text-[var(--color-accent-warm)]" />
                <h2 className="text-[14px] font-semibold text-[var(--color-text)]">Quick actions</h2>
              </div>
              <div className="flex flex-col gap-2">
                {(user?.role === 'buyer' || user?.role === 'admin') && (
                  <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.99 }}>
                    <Link to="/rfq" className="overview-action overview-action-primary group">
                      <div>
                        <div className="text-[13px] font-medium">Create RFQ</div>
                        <div className="text-[11px] opacity-50 mt-0.5">Broadcast to approved dealers</div>
                      </div>
                      <ArrowUpRight
                        size={16}
                        strokeWidth={1.5}
                        className="opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                      />
                    </Link>
                  </motion.div>
                )}
                <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.99 }}>
                  <Link to="/pipeline" className="overview-action group">
                    <div>
                      <div className="text-[13px] font-medium text-[var(--color-soft)]">Open pipeline</div>
                      <div className="text-[11px] text-[var(--color-muted)] mt-0.5">Track deals by stage</div>
                    </div>
                    <ArrowUpRight size={16} strokeWidth={1.5} className="text-[var(--color-muted)] group-hover:text-[var(--color-text)] transition-colors" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.99 }}>
                  <Link to="/market-data" className="overview-action group">
                    <div>
                      <div className="text-[13px] font-medium text-[var(--color-soft)]">Market data</div>
                      <div className="text-[11px] text-[var(--color-muted)] mt-0.5">Ornn, Kalshi, FRED overlays</div>
                    </div>
                    <ArrowUpRight size={16} strokeWidth={1.5} className="text-[var(--color-muted)] group-hover:text-[var(--color-text)] transition-colors" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.99 }}>
                  <Link to="/portfolio" className="overview-action group">
                    <div>
                      <div className="text-[13px] font-medium text-[var(--color-soft)]">Capacity book</div>
                      <div className="text-[11px] text-[var(--color-muted)] mt-0.5">{formatValue(total)} contracted</div>
                    </div>
                    <BookOpen size={16} strokeWidth={1.5} className="text-[var(--color-muted)] group-hover:text-[var(--color-text)] transition-colors" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </MotionItem>

          {/* Provider concentration */}
          {concentration.length > 0 && (
            <MotionItem>
              <motion.div className="lattice-panel rounded-xl p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <Gavel size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                  <h2 className="text-[14px] font-semibold text-[var(--color-text)]">Provider mix</h2>
                </div>
                <div className="space-y-3">
                  {concentration.map(([name, count], i) => {
                    const max = Math.max(1, ...concentration.map(([, v]) => v));
                    const pct = (count / max) * 100;
                    return (
                      <div key={name}>
                        <div className="flex justify-between text-[11px] mb-1.5">
                          <span className="text-[var(--color-soft)] truncate pr-2">{name}</span>
                          <span className="font-mono text-[var(--color-muted)] shrink-0">{count} GPU</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--color-line)] overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent-warm)] to-[var(--color-live)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.4 + i * 0.08, duration: 0.7, ease: easeOut }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </MotionItem>
          )}

          {/* Alerts */}
          {!!portfolio.alerts?.length && (
            <MotionItem>
              <motion.div className="overview-alert-panel rounded-xl p-5 border border-[rgba(240,180,41,0.25)]">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-warn)] mb-3">
                  Expiry alerts
                </div>
                <ul className="space-y-2">
                  {portfolio.alerts.slice(0, 4).map((a, i) => (
                    <li key={i} className="text-[12px] text-[var(--color-muted)] leading-relaxed flex gap-2">
                      <span className="text-[var(--color-warn)] shrink-0">▸</span>
                      {a.message}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </MotionItem>
          )}

          {/* Positions snapshot */}
          {(portfolio.positions?.length ?? 0) > 0 && (
            <MotionItem>
              <motion.div className="lattice-panel rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[14px] font-semibold text-[var(--color-text)]">Open positions</h2>
                  <Link
                    to="/portfolio"
                    className="text-[11px] font-mono text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    View all
                  </Link>
                </div>
                <div className="space-y-2">
                  {portfolio.positions!.slice(0, 3).map((p) => (
                    <div
                      key={p._id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--lattice-hover)] border border-[var(--color-line)]"
                    >
                      <div>
                        <div className="font-mono text-[12px] text-[var(--color-soft)]">
                          {gpuShort(p.gpuType)} × {p.quantity}
                        </div>
                        <div className="text-[10px] text-[var(--color-muted)] mt-0.5">{p.region}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[12px] text-[var(--color-text)]">${p.pricePerGpuHour.toFixed(2)}</div>
                        <div className="text-[10px] text-[var(--color-muted)]">/GPU-hr</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </MotionItem>
          )}
        </div>
      </div>
    </MotionList>
  );
}
