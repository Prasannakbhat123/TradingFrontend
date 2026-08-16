import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Gavel,
  Layers,
  MapPin,
  Radio,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { MotionItem, MotionList, easeOut } from '../components/motion';

type Quote = {
  _id: string;
  providerName: string;
  gpuType: string;
  gpuModel: string;
  quantity: number;
  region: string;
  topology: string;
  interconnect: string;
  pricePerGpuHour: number;
  effectiveTotalCost: number;
  rankScore?: number;
  expiresAt: string;
  status?: 'open' | 'accepted' | 'expired' | 'withdrawn';
  incompleteFields?: string[];
};

type Refs = {
  ornn?: { pricePerGpuHour?: number; instrumentKey?: string } | null;
  gpucloudprices?: { pricePerGpuHour?: number; instrumentKey?: string } | null;
};

type PastRfq = {
  _id: string;
  gpuType: string;
  quantity: number;
  region: string;
  durationHours: number;
  status: string;
  maxPricePerGpuHour?: number;
  createdAt: string;
  quoteCount?: number;
};

const GPU_OPTIONS = ['H100 SXM', 'H200', 'A100', 'B200'] as const;
const REGION_OPTIONS = ['US-EAST', 'US-WEST', 'EU-WEST', 'APAC'] as const;
const DURATION_PRESETS = [
  { label: '1 wk', hours: 168 },
  { label: '1 mo', hours: 720 },
  { label: '3 mo', hours: 2160 },
  { label: '12 mo', hours: 8760 },
] as const;

function formatTotal(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function durationLabel(hours: number): string {
  if (hours >= 720) return `${Math.round(hours / 720)} mo`;
  if (hours >= 168) return `${Math.round(hours / 168)} wk`;
  return `${hours}h`;
}

function rfqHasQuotes(r: PastRfq) {
  return (r.quoteCount || 0) > 0 || r.status === 'quoted' || r.status === 'accepted';
}

function pickQuoted(
  list: PastRfq[],
  opts?: { gpuType?: string; region?: string; loose?: boolean }
): PastRfq | undefined {
  const gpuType = opts?.gpuType;
  const region = opts?.region;
  const loose = opts?.loose !== false;
  return (
    list.find(
      (r) =>
        rfqHasQuotes(r) &&
        (!gpuType || r.gpuType === gpuType) &&
        (!region || r.region === region)
    ) ||
    list.find((r) => rfqHasQuotes(r) && (!gpuType || r.gpuType === gpuType)) ||
    (loose ? list.find((r) => rfqHasQuotes(r)) : undefined)
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rfq-chip ${active ? 'rfq-chip-active' : ''}`}
    >
      {children}
    </button>
  );
}

export function RfqPage() {
  const [form, setForm] = useState({
    gpuType: 'H100 SXM',
    quantity: 8,
    region: 'US-EAST',
    durationHours: 168,
    maxPricePerGpuHour: 5,
    allOrNone: false,
    manualApproval: false,
  });
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [refs, setRefs] = useState<Refs>({});
  const [rfqId, setRfqId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [acceptedId, setAcceptedId] = useState<string | null>(null);
  const [past, setPast] = useState<PastRfq[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const pastAllRef = useRef<PastRfq[]>([]);

  async function refreshPast() {
    const r = await api<{ rfqs: PastRfq[] }>('/v1/rfq');
    pastAllRef.current = r.rfqs;
    setPast(r.rfqs.slice(0, 8));
    return r.rfqs;
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await refreshPast();
        if (cancelled) return;
        let withQuotes = pickQuoted(list);
        if (!withQuotes) {
          for (const item of list.slice(0, 10)) {
            if (cancelled) return;
            const detail = await api<{ quotes: Quote[] }>(`/v1/rfq/${item._id}`);
            if (detail.quotes.length) {
              withQuotes = item;
              break;
            }
          }
        }
        if (withQuotes) await loadPast(withQuotes._id, { silent: true, list, syncForm: false });
        else setQuotesLoading(false);
      } catch (err) {
        if (!cancelled) {
          setQuotesLoading(false);
          toast.error('Failed to load RFQs', {
            description: err instanceof Error ? err.message : 'Request failed',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notionalCap = useMemo(
    () => form.maxPricePerGpuHour * form.quantity * form.durationHours,
    [form]
  );

  const bestQuote = quotes[0];
  const filledQuoteId = quotes.find((q) => q.status === 'accepted')?._id ?? acceptedId;
  const rfqFilled = !!filledQuoteId;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAcceptedId(null);
    const toastId = toast.loading('Routing to dealers…');
    try {
      const r = await api<{
        rfq: { _id: string };
        quotes: Quote[];
        references: Refs;
      }>('/v1/rfq', {
        method: 'POST',
        json: {
          ...form,
          startDate: new Date().toISOString(),
          instructions: {
            bestPrice: true,
            allOrNone: form.allOrNone,
            manualApproval: form.manualApproval,
          },
        },
      });
      setRfqId(r.rfq._id);
      setQuotes(r.quotes);
      setRefs(r.references || {});
      await refreshPast().catch(() => undefined);
      const spec = `${form.gpuType} × ${form.quantity} · ${form.region}`;
      if (r.quotes.length) {
        const best = r.quotes[0]?.pricePerGpuHour;
        toast.success(
          `${r.quotes.length} ranked quote${r.quotes.length === 1 ? '' : 's'} returned`,
          {
            id: toastId,
            description: best != null ? `${spec} · best $${best.toFixed(2)}/hr` : spec,
          }
        );
      } else {
        toast.warning('No eligible inventory', {
          id: toastId,
          description: `RFQ is open for ${spec} — no dealer quotes matched this spec.`,
        });
      }
    } catch (err) {
      toast.error('RFQ failed', {
        id: toastId,
        description: err instanceof Error ? err.message : 'Request failed',
      });
    } finally {
      setBusy(false);
    }
  }

  async function accept(quoteId: string) {
    setBusy(true);
    const toastId = toast.loading(
      form.manualApproval ? 'Sending for approval…' : 'Accepting quote…'
    );
    try {
      await api('/v1/orders', {
        method: 'POST',
        json: { quoteId, manualApproval: form.manualApproval },
      });
      setAcceptedId(quoteId);
      setQuotes((prev) =>
        prev.map((q) => ({
          ...q,
          status:
            q._id === quoteId ? 'accepted' : q.status === 'open' || !q.status ? 'withdrawn' : q.status,
        }))
      );
      setPast((prev) =>
        prev.map((r) => (r._id === rfqId ? { ...r, status: 'accepted' } : r))
      );
      toast.success(
        form.manualApproval ? 'Sent for approval' : 'Order filled',
        {
          id: toastId,
          description: form.manualApproval
            ? 'Risk / buyer must approve before capacity is allocated'
            : 'Capacity allocated — see Orders and Portfolio',
        }
      );
    } catch (err) {
      toast.error('Accept failed', {
        id: toastId,
        description: err instanceof Error ? err.message : 'Request failed',
      });
    } finally {
      setBusy(false);
    }
  }

  async function loadPast(
    id: string,
    opts?: { silent?: boolean; list?: PastRfq[]; syncForm?: boolean }
  ) {
    const syncForm = opts?.syncForm !== false;
    setQuotesLoading(true);
    try {
      const r = await api<{ rfq: PastRfq; quotes: Quote[] }>(`/v1/rfq/${id}`);
      let quotes = r.quotes;
      let rfq = r.rfq;
      const pool = opts?.list?.length ? opts.list : pastAllRef.current;

      if (!quotes.length && syncForm) {
        const fallback =
          pool.find((x) => x._id !== id && x.gpuType === r.rfq.gpuType && rfqHasQuotes(x)) ||
          pool.find((x) => x._id !== id && rfqHasQuotes(x));
        if (fallback) {
          const extra = await api<{ rfq: PastRfq; quotes: Quote[] }>(`/v1/rfq/${fallback._id}`);
          quotes = extra.quotes;
          rfq = extra.rfq;
        }
      }

      setRfqId(rfq._id);
      setQuotes(quotes);
      setAcceptedId(quotes.find((q) => q.status === 'accepted')?._id ?? null);
      if (syncForm) {
        setForm((f) => ({
          ...f,
          gpuType: rfq.gpuType,
          quantity: rfq.quantity,
          region: rfq.region,
          durationHours: rfq.durationHours,
          maxPricePerGpuHour: rfq.maxPricePerGpuHour ?? f.maxPricePerGpuHour,
        }));
      }
      if (!opts?.silent) {
        const usedFallback = !r.quotes.length && quotes.length;
        if (usedFallback) {
          toast.info(`Showing latest ${rfq.gpuType} quotes`, {
            description: `That RFQ had none · ${quotes.length} quote${quotes.length === 1 ? '' : 's'} from a later request`,
          });
        } else if (quotes.length) {
          toast.success(`Loaded ${quotes.length} quote${quotes.length === 1 ? '' : 's'}`, {
            description: `${rfq.gpuType} × ${rfq.quantity} · ${rfq.region}`,
          });
        } else {
          toast.warning('No quotes on this RFQ', {
            description: 'Request new quotes from the form, or pick a quoted RFQ',
          });
        }
      }
    } catch (err) {
      toast.error('Failed to load RFQ', {
        description: err instanceof Error ? err.message : 'Request failed',
      });
    } finally {
      setQuotesLoading(false);
    }
  }

  return (
    <MotionList className="space-y-6 w-full">
      <MotionItem className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="ticker mb-2 flex items-center gap-1.5">
            <Gavel size={12} strokeWidth={1.5} /> RFQ routing
          </div>
          <h1 className="font-display text-[36px] text-[var(--color-text)] tracking-tight leading-none">
            RFQ Desk
          </h1>
          <p className="text-[14px] text-[var(--color-muted)] mt-3 max-w-xl leading-relaxed">
            Normalize demand, rank eligible supplier quotes, and compare against Ornn / cloud indices
            before you lift.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/pipeline" className="lattice-btn lattice-btn-ghost text-[13px]">
            Pipeline <ArrowUpRight size={14} strokeWidth={1.5} />
          </Link>
          <Link to="/market-data" className="lattice-btn lattice-btn-ghost text-[13px]">
            GPU Index <ArrowUpRight size={14} strokeWidth={1.5} />
          </Link>
        </div>
      </MotionItem>

      <div className="grid xl:grid-cols-[400px_1fr] gap-5 items-start">
        {/* Composer */}
        <MotionItem>
          <form onSubmit={submit} className="lattice-panel rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-line)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg border border-[var(--color-line)] bg-[var(--lattice-hover)] flex items-center justify-center">
                  <Sparkles size={14} strokeWidth={1.5} className="text-[var(--color-accent-warm)]" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--color-text)]">New RFQ</div>
                  <div className="text-[11px] text-[var(--color-muted)]">Broadcast to approved dealers</div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)] mb-2">
                  GPU type
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {GPU_OPTIONS.map((g) => (
                    <Chip
                      key={g}
                      active={form.gpuType === g}
                      onClick={() => setForm({ ...form, gpuType: g })}
                    >
                      {g.replace(' SXM', '')}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)] mb-2">
                  Region
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {REGION_OPTIONS.map((r) => (
                    <Chip
                      key={r}
                      active={form.region === r}
                      onClick={() => setForm({ ...form, region: r })}
                    >
                      {r}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm block">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Quantity
                  </span>
                  <input
                    type="number"
                    min={1}
                    className="lattice-input mt-1.5 rounded-lg"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                  />
                </label>
                <label className="text-sm block">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Max $/GPU-hr
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className="lattice-input mt-1.5 rounded-lg"
                    value={form.maxPricePerGpuHour}
                    onChange={(e) =>
                      setForm({ ...form, maxPricePerGpuHour: Number(e.target.value) })
                    }
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Duration
                  </span>
                  <span className="font-mono text-[11px] text-[var(--color-muted)]">
                    {form.durationHours}h · {durationLabel(form.durationHours)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {DURATION_PRESETS.map((d) => (
                    <Chip
                      key={d.hours}
                      active={form.durationHours === d.hours}
                      onClick={() => setForm({ ...form, durationHours: d.hours })}
                    >
                      {d.label}
                    </Chip>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  className="lattice-input rounded-lg"
                  value={form.durationHours}
                  onChange={(e) => setForm({ ...form, durationHours: Number(e.target.value) })}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`rfq-toggle ${form.allOrNone ? 'rfq-toggle-on' : ''}`}
                  onClick={() => setForm({ ...form, allOrNone: !form.allOrNone })}
                >
                  All-or-none
                </button>
                <button
                  type="button"
                  className={`rfq-toggle ${form.manualApproval ? 'rfq-toggle-on' : ''}`}
                  onClick={() => setForm({ ...form, manualApproval: !form.manualApproval })}
                >
                  Manual approval
                </button>
              </div>

              <div className="rounded-xl border border-[var(--color-line)] bg-[var(--lattice-hover)] px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Max notional
                  </div>
                  <div className="font-mono text-[18px] text-[var(--color-text)] mt-0.5">
                    {formatTotal(notionalCap)}
                  </div>
                </div>
                <div className="text-right text-[11px] text-[var(--color-muted)] font-mono leading-relaxed">
                  {form.quantity} × ${form.maxPricePerGpuHour}
                  <br />× {form.durationHours}h
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={busy}
                className="lattice-btn lattice-btn-primary w-full justify-between py-3"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <span>{busy ? 'Routing to dealers…' : 'Request quotes'}</span>
                <ArrowUpRight size={16} strokeWidth={1.5} />
              </motion.button>
            </div>
          </form>

          {past.length > 0 && (
            <div className="lattice-panel rounded-xl mt-4 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center gap-2">
                <Clock3 size={13} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                <span className="text-[13px] font-medium text-[var(--color-soft)]">Recent RFQs</span>
              </div>
              <div className="divide-y divide-[var(--color-line)]">
                {past.map((r) => (
                  <button
                    key={r._id}
                    type="button"
                    onClick={() => void loadPast(r._id, { list: pastAllRef.current })}
                    className={`w-full text-left px-4 py-3 hover:bg-[var(--lattice-hover)] transition-colors flex items-center justify-between gap-3 ${
                      rfqId === r._id ? 'bg-[var(--lattice-hover)]' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[12px] text-[var(--color-text)] truncate">
                        {r.gpuType} × {r.quantity}
                      </div>
                      <div className="text-[10px] text-[var(--color-muted)] mt-0.5">
                        {r.region} · {durationLabel(r.durationHours)} ·{' '}
                        {new Date(r.createdAt).toLocaleDateString()}
                        {(r.quoteCount || 0) > 0
                          ? ` · ${r.quoteCount} quotes`
                          : rfqHasQuotes(r)
                            ? ' · quoted'
                            : ''}
                      </div>
                    </div>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border shrink-0 ${
                        r.status === 'quoted' || r.status === 'accepted'
                          ? 'text-[var(--color-live)] border-[rgba(33,217,0,0.3)]'
                          : 'text-[var(--color-muted)] border-[var(--color-line)]'
                      }`}
                    >
                      {r.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </MotionItem>

        {/* Results */}
        <div className="space-y-4 min-w-0">
          <MotionItem>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="overview-stat-card">
                <div className="flex items-center gap-2 text-[var(--color-muted)]">
                  <Radio size={14} strokeWidth={1.5} className="text-[var(--color-live)]" />
                  <span className="text-[10px] uppercase tracking-[0.12em]">Ornn OCPI</span>
                </div>
                <div className="font-mono text-[22px] mt-3 text-[var(--color-text)]">
                  {refs.ornn?.pricePerGpuHour != null
                    ? `$${refs.ornn.pricePerGpuHour.toFixed(2)}`
                    : '—'}
                </div>
                <div className="text-[11px] text-[var(--color-muted)] mt-1">Index $/GPU-hr</div>
              </div>
              <div className="overview-stat-card">
                <div className="flex items-center gap-2 text-[var(--color-muted)]">
                  <Layers size={14} strokeWidth={1.5} className="text-[#6eb5ff]" />
                  <span className="text-[10px] uppercase tracking-[0.12em]">Cloud min</span>
                </div>
                <div className="font-mono text-[22px] mt-3 text-[var(--color-text)]">
                  {refs.gpucloudprices?.pricePerGpuHour != null
                    ? `$${refs.gpucloudprices.pricePerGpuHour.toFixed(2)}`
                    : '—'}
                </div>
                <div className="text-[11px] text-[var(--color-muted)] mt-1">Multi-cloud board</div>
              </div>
              <div className="overview-stat-card">
                <div className="flex items-center gap-2 text-[var(--color-muted)]">
                  <Gavel size={14} strokeWidth={1.5} className="text-[var(--color-accent-warm)]" />
                  <span className="text-[10px] uppercase tracking-[0.12em]">This RFQ</span>
                </div>
                <div className="font-mono text-[22px] mt-3 text-[var(--color-text)]">
                  {quotes.length || '—'}
                </div>
                <div className="text-[11px] text-[var(--color-muted)] mt-1 truncate">
                  {rfqId ? `ID …${rfqId.slice(-6)}` : 'Awaiting request'}
                </div>
              </div>
            </div>
          </MotionItem>

          <MotionItem>
            <div className="lattice-panel rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-line)] flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-[14px] font-semibold text-[var(--color-text)]">Ranked quotes</h2>
                  <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                    {quotesLoading
                      ? 'Loading quotes…'
                      : rfqFilled
                        ? 'Quote accepted · order is on the blotter'
                        : 'Last request or Recent RFQ · Request quotes to refresh'}
                  </p>
                </div>
                {rfqFilled ? (
                  <Link to="/orders" className="font-mono text-[12px] text-[var(--color-live)]">
                    Filled · view order
                  </Link>
                ) : bestQuote ? (
                  <div className="font-mono text-[12px] text-[var(--color-live)]">
                    Best ${bestQuote.pricePerGpuHour.toFixed(2)}/hr
                  </div>
                ) : null}
              </div>

              <div className="p-4 space-y-3">
                <AnimatePresence mode="popLayout">
                  {quotes.map((q, i) => {
                    const ornn = refs.ornn?.pricePerGpuHour;
                    const spread = ornn != null ? q.pricePerGpuHour - ornn : null;
                    const isBest = i === 0;
                    const isAccepted = q.status === 'accepted' || q._id === filledQuoteId;
                    const canAccept = !rfqFilled && (q.status === 'open' || !q.status);
                    return (
                      <motion.article
                        key={q._id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ delay: i * 0.04, duration: 0.35, ease: easeOut }}
                        className={`rfq-quote-card ${isBest ? 'rfq-quote-best' : ''} ${
                          isAccepted ? 'rfq-quote-accepted' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[12px] shrink-0 border ${
                                isBest
                                  ? 'bg-[rgba(33,217,0,0.1)] border-[rgba(33,217,0,0.35)] text-[var(--color-live)]'
                                  : 'bg-[var(--lattice-hover)] border-[var(--color-line)] text-[var(--color-muted)]'
                              }`}
                            >
                              #{i + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-[14px] font-medium text-[var(--color-text)] truncate">
                                  {q.providerName}
                                </h3>
                                {isBest && (
                                  <span className="pipeline-badge pipeline-badge-buy">BEST</span>
                                )}
                                {isAccepted && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--color-live)]">
                                    <CheckCircle2 size={11} /> ACCEPTED
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 font-mono text-[11px] text-[var(--color-muted)] flex flex-wrap gap-x-3 gap-y-1">
                                <span>{q.gpuModel}</span>
                                <span className="inline-flex items-center gap-1">
                                  <MapPin size={10} /> {q.region}
                                </span>
                                <span>
                                  {q.quantity} GPU · {q.topology} · {q.interconnect}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-mono text-[20px] font-medium text-[var(--color-text)] leading-none">
                              ${q.pricePerGpuHour.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-[var(--color-muted)] mt-1">/GPU-hr</div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[var(--color-line)] flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-4 text-[12px]">
                            <div>
                              <span className="text-[var(--color-muted)]">Total </span>
                              <span className="font-mono text-[var(--color-soft)]">
                                {formatTotal(q.effectiveTotalCost)}
                              </span>
                            </div>
                            <div className="inline-flex items-center gap-1">
                              <span className="text-[var(--color-muted)]">vs Ornn </span>
                              {spread == null ? (
                                <span className="font-mono text-[var(--color-muted)]">—</span>
                              ) : (
                                <span
                                  className={`font-mono inline-flex items-center gap-0.5 ${
                                    spread <= 0
                                      ? 'text-[var(--color-live)]'
                                      : 'text-[var(--color-danger)]'
                                  }`}
                                >
                                  {spread <= 0 ? (
                                    <TrendingDown size={12} />
                                  ) : (
                                    <TrendingUp size={12} />
                                  )}
                                  {spread >= 0 ? '+' : ''}
                                  {spread.toFixed(2)}
                                </span>
                              )}
                            </div>
                            {q.rankScore != null && (
                              <div>
                                <span className="text-[var(--color-muted)]">Score </span>
                                <span className="font-mono text-[var(--color-soft)]">
                                  {q.rankScore.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>

                          {isAccepted ? (
                            <Link
                              to="/orders"
                              className="lattice-btn text-xs py-2 inline-flex items-center gap-1.5"
                            >
                              <CheckCircle2 size={12} /> View order
                            </Link>
                          ) : (
                            <motion.button
                              type="button"
                              disabled={busy || !canAccept}
                              onClick={() => void accept(q._id)}
                              className="lattice-btn lattice-btn-primary text-xs py-2"
                              whileHover={{ scale: canAccept ? 1.03 : 1 }}
                              whileTap={{ scale: canAccept ? 0.97 : 1 }}
                            >
                              {rfqFilled ? 'Unavailable' : 'Accept quote'}
                            </motion.button>
                          )}
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>

                {!quotes.length && quotesLoading && (
                  <div className="py-16 text-center text-[13px] text-[var(--color-muted)]">
                    Loading ranked quotes…
                  </div>
                )}

                {!quotes.length && !quotesLoading && (
                  <div className="py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl border border-[var(--color-line)] bg-[var(--lattice-hover)] flex items-center justify-center mx-auto mb-4">
                      <Gavel size={20} strokeWidth={1.25} className="text-[var(--color-muted)]" />
                    </div>
                    <div className="text-[14px] text-[var(--color-soft)]">No quotes yet</div>
                    <p className="text-[12px] text-[var(--color-muted)] mt-1.5 max-w-sm mx-auto">
                      No dealer quotes on this RFQ yet. Request quotes on the left, or pick a quoted RFQ from Recent.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </MotionItem>
        </div>
      </div>
    </MotionList>
  );
}
