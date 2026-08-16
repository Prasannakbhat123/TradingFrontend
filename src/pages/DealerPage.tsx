import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowUpRight,
  CheckCircle2,
  Package,
  Play,
  Server,
  Truck,
} from 'lucide-react';
import { api } from '../lib/api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MotionItem, MotionList, easeOut } from '../components/motion';

type Allocation = {
  _id: string;
  gpuType: string;
  gpuModel?: string;
  quantity: number;
  region: string;
  status: 'allocated' | 'provisioning' | 'delivered' | 'exception' | 'settled' | string;
  pricePerGpuHour: number;
  durationHours?: number;
  providerName?: string;
  deliveredQuantity?: number;
  exceptionNote?: string;
  createdAt?: string;
};

type InventoryItem = {
  _id: string;
  gpuType: string;
  gpuModel?: string;
  quantity: number;
  availableQuantity: number;
  region: string;
  pricePerGpuHour: number;
  topology?: string;
  interconnect?: string;
};

type ConfirmState = {
  id: string;
  action: 'provisioning' | 'delivered' | 'close';
  label: string;
  title: string;
  description: string;
  tone?: 'default' | 'danger' | 'warn';
} | null;

const GPU_OPTIONS = ['H100 SXM', 'H200', 'A100', 'B200'] as const;
const REGION_OPTIONS = ['US-EAST', 'US-WEST', 'EU-WEST', 'APAC'] as const;

const STATUS_META: Record<
  string,
  { label: string; hint: string; className: string }
> = {
  allocated: {
    label: 'Allocated',
    hint: 'Buyer fill — start provisioning (this is not a listing)',
    className: 'dealer-status-allocated',
  },
  provisioning: {
    label: 'Provisioning',
    hint: 'Capacity being spun up',
    className: 'dealer-status-provisioning',
  },
  delivered: {
    label: 'Delivered',
    hint: 'Ready to settle',
    className: 'dealer-status-delivered',
  },
  exception: {
    label: 'Exception',
    hint: 'Needs review before settle',
    className: 'dealer-status-exception',
  },
  settled: {
    label: 'Settled',
    hint: 'Closed out',
    className: 'dealer-status-settled',
  },
};

const FLOW = ['allocated', 'provisioning', 'delivered', 'settled'] as const;

function statusIndex(status: string): number {
  if (status === 'exception') return 2;
  const i = FLOW.indexOf(status as (typeof FLOW)[number]);
  return i < 0 ? 0 : i;
}

function formatNotional(a: Allocation): string {
  const hours = a.durationHours || 168;
  const n = a.pricePerGpuHour * a.quantity * hours;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function DealerPage() {
  const [form, setForm] = useState({
    gpuType: 'H100 SXM',
    gpuModel: 'H100 SXM 80GB',
    quantity: 8,
    region: 'US-EAST',
    pricePerGpuHour: 2.4,
    topology: '8x NVLink',
    interconnect: 'NVLink',
  });
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [listings, setListings] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [filter, setFilter] = useState<'all' | 'actionable' | 'done'>('all');

  async function load() {
    const r = await api<{ allocations: Allocation[] }>('/v1/settlement');
    setAllocations(r.allocations);
  }

  async function loadListings() {
    const r = await api<{ items: InventoryItem[] }>('/v1/dealer/inventory');
    setListings(r.items);
  }

  useEffect(() => {
    void Promise.all([load(), loadListings()])
      .catch((e) => toast.error('Failed to load dealer desk', { description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = { allocated: 0, provisioning: 0, delivered: 0, settled: 0, exception: 0 };
    for (const a of allocations) {
      if (a.status in c) c[a.status as keyof typeof c] += 1;
    }
    return c;
  }, [allocations]);

  const visible = useMemo(() => {
    if (filter === 'actionable') {
      return allocations.filter((a) =>
        ['allocated', 'provisioning', 'delivered', 'exception'].includes(a.status)
      );
    }
    if (filter === 'done') return allocations.filter((a) => a.status === 'settled');
    return allocations;
  }, [allocations, filter]);

  async function addInventory(e: FormEvent) {
    e.preventDefault();
    const toastId = toast.loading('Publishing inventory…');
    try {
      await api('/v1/dealer/inventory', { method: 'POST', json: form });
      toast.success('Inventory listed', {
        id: toastId,
        description: `${form.quantity}× ${form.gpuType} · ${form.region} @ $${form.pricePerGpuHour}/hr — shown under Listed inventory, not Allocations`,
      });
      await loadListings();
    } catch (err) {
      toast.error('Could not publish inventory', {
        id: toastId,
        description: err instanceof Error ? err.message : 'Request failed',
      });
    }
  }

  function askUpdate(a: Allocation, action: 'provisioning' | 'delivered' | 'close') {
    if (action === 'provisioning') {
      setConfirm({
        id: a._id,
        action,
        label: 'Start provisioning',
        title: 'Start provisioning?',
        description: `Move ${a.quantity}× ${a.gpuType} in ${a.region} from Allocated → Provisioning. Buyers will see this as Out for signing on Pipeline.`,
        tone: 'default',
      });
      return;
    }
    if (action === 'delivered') {
      setConfirm({
        id: a._id,
        action,
        label: 'Confirm delivery',
        title: 'Confirm delivery?',
        description: `Mark ${a.quantity}× ${a.gpuType} as delivered. Current status: ${a.status}. This advances the deal to Signed.`,
        tone: 'warn',
      });
      return;
    }
    setConfirm({
      id: a._id,
      action,
      label: 'Close settlement',
      title: 'Close settlement?',
      description: `Settle notional ~${formatNotional(a)} for this allocation and mark it Complete on Pipeline.`,
      tone: 'default',
    });
  }

  async function runConfirm() {
    if (!confirm) return;
    const { id, action } = confirm;
    setBusyId(id);
    const toastId = toast.loading(
      action === 'provisioning'
        ? 'Starting provisioning…'
        : action === 'delivered'
          ? 'Confirming delivery…'
          : 'Closing settlement…'
    );
    try {
      if (action === 'close') {
        await api(`/v1/settlement/${id}/close`, { method: 'POST', json: {} });
        toast.success('Settlement closed', {
          id: toastId,
          description: 'Allocation is now settled.',
        });
      } else {
        const r = await api<{ allocation: Allocation }>(`/v1/settlement/${id}/provisioning`, {
          method: 'POST',
          json: { status: action },
        });
        const next = r.allocation.status;
        toast.success(
          action === 'provisioning' ? 'Provisioning started' : 'Delivery confirmed',
          {
            id: toastId,
            description: `Status is now “${STATUS_META[next]?.label || next}”.`,
          }
        );
      }
      await load();
      setConfirm(null);
    } catch (err) {
      toast.error('Action failed', {
        id: toastId,
        description: err instanceof Error ? err.message : 'Request failed',
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <MotionList className="space-y-6 w-full">
      <MotionItem className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="ticker mb-2 flex items-center gap-1.5">
            <Server size={12} strokeWidth={1.5} /> Southbound
          </div>
          <h1 className="font-display text-[36px] text-[var(--color-text)] tracking-tight leading-none">
            Dealer Desk
          </h1>
          <p className="text-[14px] text-[var(--color-muted)] mt-3 max-w-xl leading-relaxed">
            Publish inventory and advance allocations: Allocated → Provisioning → Delivered → Settled.
          </p>
        </div>
        <Link to="/pipeline" className="lattice-btn lattice-btn-ghost text-[13px]">
          Pipeline <ArrowUpRight size={14} strokeWidth={1.5} />
        </Link>
      </MotionItem>

      <MotionItem>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(
            [
              ['allocated', counts.allocated, Package],
              ['provisioning', counts.provisioning, Play],
              ['delivered', counts.delivered, Truck],
              ['settled', counts.settled, CheckCircle2],
            ] as const
          ).map(([key, count, Icon], i) => (
            <motion.div
              key={key}
              className="overview-stat-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.05, duration: 0.35, ease: easeOut }}
            >
              <div className="flex items-center justify-between">
                <Icon size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                <span className={`dealer-status-pill ${STATUS_META[key].className}`}>
                  {STATUS_META[key].label}
                </span>
              </div>
              <div className="font-mono text-[26px] text-[var(--color-text)] mt-3">{count}</div>
            </motion.div>
          ))}
        </div>
      </MotionItem>

      <div className="grid xl:grid-cols-[380px_1fr] gap-5 items-start">
        <MotionItem>
          <form onSubmit={addInventory} className="lattice-panel rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-line)]">
              <div className="text-[14px] font-semibold text-[var(--color-text)]">Publish inventory</div>
              <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
                Listed capacity can be routed into buyer RFQs
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)] mb-2">
                  GPU type
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {GPU_OPTIONS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`rfq-chip ${form.gpuType === g ? 'rfq-chip-active' : ''}`}
                      onClick={() =>
                        setForm({
                          ...form,
                          gpuType: g,
                          gpuModel: g.includes('H100')
                            ? 'H100 SXM 80GB'
                            : g.includes('A100')
                              ? 'A100 80GB'
                              : `${g} SXM`,
                        })
                      }
                    >
                      {g.replace(' SXM', '')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)] mb-2">
                  Region
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {REGION_OPTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`rfq-chip ${form.region === r ? 'rfq-chip-active' : ''}`}
                      onClick={() => setForm({ ...form, region: r })}
                    >
                      {r}
                    </button>
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
                    $/GPU-hr
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className="lattice-input mt-1.5 rounded-lg"
                    value={form.pricePerGpuHour}
                    onChange={(e) => setForm({ ...form, pricePerGpuHour: Number(e.target.value) })}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm block">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Topology
                  </span>
                  <input
                    className="lattice-input mt-1.5 rounded-lg"
                    value={form.topology}
                    onChange={(e) => setForm({ ...form, topology: e.target.value })}
                  />
                </label>
                <label className="text-sm block">
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Interconnect
                  </span>
                  <input
                    className="lattice-input mt-1.5 rounded-lg"
                    value={form.interconnect}
                    onChange={(e) => setForm({ ...form, interconnect: e.target.value })}
                  />
                </label>
              </div>

              <motion.button
                type="submit"
                className="lattice-btn lattice-btn-primary w-full justify-between py-3"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                Publish inventory <ArrowUpRight size={15} strokeWidth={1.5} />
              </motion.button>
            </div>
          </form>

          <div className="lattice-panel rounded-xl mt-4 overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--color-line)]">
              <div className="text-[13px] font-semibold text-[var(--color-text)]">Listed inventory</div>
              <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
                Capacity on the book for RFQs — not a fill until a buyer accepts
              </div>
            </div>
            <div className="divide-y divide-[var(--color-line)]">
              {listings.map((item) => (
                <div key={item._id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[12px] text-[var(--color-text)] truncate">
                      {item.gpuType} × {item.availableQuantity}
                      {item.availableQuantity !== item.quantity ? ` / ${item.quantity}` : ''}
                    </div>
                    <div className="text-[10px] text-[var(--color-muted)] mt-0.5">
                      {item.region} · ${item.pricePerGpuHour.toFixed(2)}/hr
                      {item.topology ? ` · ${item.topology}` : ''}
                    </div>
                  </div>
                  <span className="dealer-status-pill dealer-status-allocated shrink-0">Listed</span>
                </div>
              ))}
              {!listings.length && !loading && (
                <div className="px-5 py-6 text-center text-[12px] text-[var(--color-muted)]">
                  No listings yet — publish inventory above
                </div>
              )}
            </div>
          </div>
        </MotionItem>

        <MotionItem>
          <div className="lattice-panel rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-line)] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-semibold text-[var(--color-text)]">Allocations</h2>
                <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                  Sold fills after a buyer accepts a quote — not published listings
                </p>
              </div>
              <div className="flex gap-1 p-1 rounded-full border border-[var(--color-line)]">
                {(
                  [
                    ['all', 'All'],
                    ['actionable', 'Actionable'],
                    ['done', 'Settled'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={`px-3 py-1 text-[11px] rounded-full font-mono transition-colors ${
                      filter === id
                        ? 'bg-[var(--lattice-btn-primary-bg)] text-[var(--lattice-btn-primary-text)]'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 space-y-3">
              {loading && (
                <div className="py-12 text-center text-[13px] text-[var(--color-muted)]">
                  Loading allocations…
                </div>
              )}

              {!loading &&
                visible.map((a, i) => {
                  const meta = STATUS_META[a.status] || {
                    label: a.status,
                    hint: '',
                    className: 'dealer-status-allocated',
                  };
                  const step = statusIndex(a.status);
                  return (
                    <motion.article
                      key={a._id}
                      className="dealer-alloc-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.3, ease: easeOut }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-[14px] font-medium text-[var(--color-text)]">
                              {a.gpuType}
                              {a.gpuModel ? ` · ${a.gpuModel}` : ''}
                            </h3>
                            <span className={`dealer-status-pill ${meta.className}`}>{meta.label}</span>
                            <span className="pipeline-badge pipeline-badge-sell">FILL</span>
                          </div>
                          <div className="mt-1.5 font-mono text-[11px] text-[var(--color-muted)]">
                            {a.quantity} GPU · {a.region} · ${a.pricePerGpuHour.toFixed(2)}/hr ·{' '}
                            {formatNotional(a)}
                          </div>
                          <div className="text-[11px] text-[var(--color-muted)] mt-1">{meta.hint}</div>
                          {a.exceptionNote && (
                            <div className="text-[11px] text-[var(--color-warn)] mt-1">{a.exceptionNote}</div>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-[var(--color-muted)] shrink-0">
                          …{a._id.slice(-6)}
                        </div>
                      </div>

                      <div className="mt-4 dealer-flow">
                        {FLOW.map((s, idx) => (
                          <div key={s} className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`dealer-flow-dot ${
                                idx < step
                                  ? 'done'
                                  : idx === step
                                    ? 'current'
                                    : ''
                              }`}
                            />
                            <span
                              className={`text-[10px] font-mono uppercase tracking-wide truncate ${
                                idx === step ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]'
                              }`}
                            >
                              {STATUS_META[s].label}
                            </span>
                            {idx < FLOW.length - 1 && <span className="dealer-flow-line" />}
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--color-line)] flex flex-wrap gap-2 justify-end">
                        {a.status === 'allocated' && (
                          <button
                            type="button"
                            className="lattice-btn lattice-btn-ghost text-xs"
                            disabled={busyId === a._id}
                            onClick={() => askUpdate(a, 'provisioning')}
                          >
                            <Play size={12} strokeWidth={1.5} /> Start provisioning
                          </button>
                        )}
                        {(a.status === 'allocated' || a.status === 'provisioning') && (
                          <button
                            type="button"
                            className="lattice-btn lattice-btn-primary text-xs"
                            disabled={busyId === a._id}
                            onClick={() => askUpdate(a, 'delivered')}
                          >
                            <Truck size={12} strokeWidth={1.5} /> Confirm delivery
                          </button>
                        )}
                        {(a.status === 'delivered' || a.status === 'exception') && (
                          <button
                            type="button"
                            className="lattice-btn lattice-btn-primary text-xs"
                            disabled={busyId === a._id}
                            onClick={() => askUpdate(a, 'close')}
                          >
                            <CheckCircle2 size={12} strokeWidth={1.5} /> Close settlement
                          </button>
                        )}
                        {a.status === 'settled' && (
                          <span className="text-[11px] text-[var(--color-muted)] self-center">
                            No further actions
                          </span>
                        )}
                        {a.status === 'provisioning' && (
                          <span className="text-[11px] text-[var(--color-muted)] self-center mr-auto">
                            Already provisioning — confirm delivery when ready
                          </span>
                        )}
                      </div>
                    </motion.article>
                  );
                })}

              {!loading && !visible.length && (
                <div className="py-14 text-center">
                  <Package size={22} strokeWidth={1.25} className="mx-auto text-[var(--color-muted)] mb-3" />
                  <div className="text-[14px] text-[var(--color-soft)]">No allocations here</div>
                  <p className="text-[12px] text-[var(--color-muted)] mt-1">
                    Fills from buyer RFQs will show up when your inventory is selected.
                  </p>
                </div>
              )}
            </div>
          </div>
        </MotionItem>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title || ''}
        description={confirm?.description || ''}
        confirmLabel={confirm?.label}
        tone={confirm?.tone}
        busy={!!busyId}
        onCancel={() => !busyId && setConfirm(null)}
        onConfirm={() => void runConfirm()}
      />
    </MotionList>
  );
}
