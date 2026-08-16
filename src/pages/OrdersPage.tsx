import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowUpRight,
  Ban,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Gavel,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MotionItem, MotionList, easeOut } from '../components/motion';

type Order = {
  _id: string;
  type: string;
  status: string;
  gpuType: string;
  gpuModel?: string;
  quantity: number;
  filledQuantity: number;
  region: string;
  durationHours?: number;
  maxPricePerGpuHour?: number;
  createdAt: string;
};

type Filter = 'all' | 'actionable' | 'filled' | 'closed';

type ConfirmState = {
  id: string;
  action: 'approve' | 'cancel';
  title: string;
  description: string;
  label: string;
  tone: 'default' | 'danger';
} | null;

const STATUS_META: Record<string, { label: string; hint: string; className: string }> = {
  pending_approval: {
    label: 'Pending',
    hint: 'Waiting on risk / buyer approval',
    className: 'order-status-pending',
  },
  open: {
    label: 'Open',
    hint: 'Working — not yet filled',
    className: 'order-status-open',
  },
  partially_filled: {
    label: 'Partial',
    hint: 'Fill in progress',
    className: 'order-status-partial',
  },
  filled: {
    label: 'Filled',
    hint: 'Capacity allocated to the book',
    className: 'order-status-filled',
  },
  cancelled: {
    label: 'Cancelled',
    hint: 'Withdrawn before fill',
    className: 'order-status-dead',
  },
  rejected: {
    label: 'Rejected',
    hint: 'Did not clear pre-trade',
    className: 'order-status-rejected',
  },
};

const TYPE_LABEL: Record<string, string> = {
  rfq_accept: 'RFQ accept',
  limit: 'Limit',
  manual_approval: 'Manual',
};

function durationLabel(hours?: number): string {
  if (!hours) return '—';
  if (hours >= 720) return `${Math.round(hours / 720)} mo`;
  if (hours >= 168) return `${Math.round(hours / 168)} wk`;
  return `${hours}h`;
}

function formatNotional(o: Order): string | null {
  if (o.maxPricePerGpuHour == null || !o.durationHours) return null;
  const n = o.maxPricePerGpuHour * o.quantity * o.durationHours;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function relativeTime(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function isActionable(status: string) {
  return status === 'pending_approval' || status === 'open' || status === 'partially_filled';
}

export function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const canTrade = user?.role === 'buyer' || user?.role === 'admin';
  const canApprove =
    user?.role === 'buyer' || user?.role === 'risk' || user?.role === 'admin';

  async function load() {
    const r = await api<{ orders: Order[] }>('/v1/orders');
    setOrders(r.orders);
  }

  useEffect(() => {
    void load()
      .catch((e) => toast.error('Failed to load orders', { description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = { pending: 0, open: 0, filled: 0, closed: 0, actionable: 0 };
    for (const o of orders) {
      if (o.status === 'pending_approval') c.pending += 1;
      else if (o.status === 'open' || o.status === 'partially_filled') c.open += 1;
      else if (o.status === 'filled') c.filled += 1;
      else c.closed += 1;
      if (isActionable(o.status)) c.actionable += 1;
    }
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    if (filter === 'actionable') return orders.filter((o) => isActionable(o.status));
    if (filter === 'filled') return orders.filter((o) => o.status === 'filled');
    if (filter === 'closed')
      return orders.filter((o) => o.status === 'cancelled' || o.status === 'rejected');
    return orders;
  }, [orders, filter]);

  function askApprove(o: Order) {
    setConfirm({
      id: o._id,
      action: 'approve',
      title: 'Approve order',
      description: `Fill ${o.gpuType} × ${o.quantity} in ${o.region} and allocate capacity.`,
      label: 'Approve & fill',
      tone: 'default',
    });
  }

  function askCancel(o: Order) {
    setConfirm({
      id: o._id,
      action: 'cancel',
      title: 'Cancel order',
      description: `Withdraw ${o.gpuType} × ${o.quantity} (${o._id.slice(-8)}). This cannot be undone.`,
      label: 'Cancel order',
      tone: 'danger',
    });
  }

  async function runConfirm() {
    if (!confirm) return;
    const { id, action } = confirm;
    setBusyId(id);
    const toastId = toast.loading(action === 'approve' ? 'Approving…' : 'Cancelling…');
    try {
      await api(`/v1/orders/${id}/${action}`, { method: 'POST' });
      await load();
      toast.success(action === 'approve' ? 'Order filled' : 'Order cancelled', { id: toastId });
      setConfirm(null);
    } catch (e) {
      toast.error('Action failed', {
        id: toastId,
        description: e instanceof Error ? e.message : 'Try again',
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
            <ClipboardList size={12} strokeWidth={1.5} /> OMS blotter
          </div>
          <h1 className="font-display text-[36px] text-[var(--color-text)] tracking-tight leading-none">
            Orders
          </h1>
          <p className="text-[14px] text-[var(--color-muted)] mt-3 max-w-xl leading-relaxed">
            Working orders, RFQ accepts, and fills — approve pending tickets or cancel before they
            lift.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/pipeline" className="lattice-btn lattice-btn-ghost text-[13px]">
            Pipeline <ArrowUpRight size={14} strokeWidth={1.5} />
          </Link>
          {canTrade && (
            <Link to="/rfq" className="lattice-btn lattice-btn-primary text-[13px]">
              New RFQ <Gavel size={14} strokeWidth={1.5} />
            </Link>
          )}
        </div>
      </MotionItem>

      <MotionItem>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(
            [
              ['Pending', counts.pending, Clock3, 'order-status-pending'],
              ['Open', counts.open, ClipboardList, 'order-status-open'],
              ['Filled', counts.filled, CheckCircle2, 'order-status-filled'],
              ['Closed', counts.closed, Ban, 'order-status-dead'],
            ] as const
          ).map(([label, count, Icon, pill], i) => (
            <motion.div
              key={label}
              className="overview-stat-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.05, duration: 0.35, ease: easeOut }}
            >
              <div className="flex items-center justify-between">
                <Icon size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                <span className={`dealer-status-pill ${pill}`}>{label}</span>
              </div>
              <div className="font-mono text-[26px] text-[var(--color-text)] mt-3">{count}</div>
            </motion.div>
          ))}
        </div>
      </MotionItem>

      <MotionItem>
        <div className="lattice-panel rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-line)] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--color-text)]">Blotter</h2>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                {loading
                  ? 'Loading orders…'
                  : `${visible.length} of ${orders.length} · newest first`}
              </p>
            </div>
            <div className="flex gap-1 p-1 rounded-full border border-[var(--color-line)]">
              {(
                [
                  ['all', 'All'],
                  ['actionable', `Actionable${counts.actionable ? ` ${counts.actionable}` : ''}`],
                  ['filled', 'Filled'],
                  ['closed', 'Closed'],
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
                Loading blotter…
              </div>
            )}

            {!loading &&
              visible.map((o, i) => {
                const meta = STATUS_META[o.status] || {
                  label: o.status.replace(/_/g, ' '),
                  hint: '',
                  className: 'order-status-dead',
                };
                const fillPct =
                  o.quantity > 0 ? Math.min(100, Math.round((o.filledQuantity / o.quantity) * 100)) : 0;
                const notional = formatNotional(o);
                const showApprove = o.status === 'pending_approval' && canApprove;
                const showCancel =
                  ['open', 'pending_approval'].includes(o.status) && canTrade;
                const filled = o.status === 'filled';

                return (
                  <motion.article
                    key={o._id}
                    className={`dealer-alloc-card ${filled ? 'rfq-quote-accepted' : ''}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3, ease: easeOut }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[14px] font-medium text-[var(--color-text)]">
                            {o.gpuType} × {o.quantity}
                          </h3>
                          <span className={`dealer-status-pill ${meta.className}`}>{meta.label}</span>
                          <span className="pipeline-badge pipeline-badge-buy">
                            {TYPE_LABEL[o.type] || o.type}
                          </span>
                        </div>
                        <div className="mt-1.5 font-mono text-[11px] text-[var(--color-muted)] flex flex-wrap gap-x-3 gap-y-1">
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={10} /> {o.region}
                          </span>
                          <span>{durationLabel(o.durationHours)}</span>
                          {o.maxPricePerGpuHour != null && (
                            <span>${o.maxPricePerGpuHour.toFixed(2)}/GPU-hr</span>
                          )}
                          {notional && <span>{notional} notional</span>}
                        </div>
                        <div className="text-[11px] text-[var(--color-muted)] mt-1">{meta.hint}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-[10px] text-[var(--color-muted)]">
                          …{o._id.slice(-8)}
                        </div>
                        <div
                          className="text-[10px] text-[var(--color-muted)] mt-1"
                          title={new Date(o.createdAt).toLocaleString()}
                        >
                          {relativeTime(o.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-muted)] mb-1.5">
                        <span>Fill</span>
                        <span>
                          {o.filledQuantity}/{o.quantity} GPU · {fillPct}%
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-[var(--color-line)] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            filled ? 'bg-[var(--color-live)]' : 'bg-[#6eb5ff]'
                          }`}
                          style={{ width: `${Math.max(fillPct, filled ? 100 : 0)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--color-line)] flex flex-wrap items-center gap-2 justify-end">
                      {filled && (
                        <Link
                          to="/portfolio"
                          className="text-[11px] font-mono text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors mr-auto"
                        >
                          On the book →
                        </Link>
                      )}
                      {showApprove && (
                        <button
                          type="button"
                          className="lattice-btn lattice-btn-primary text-xs"
                          disabled={busyId === o._id}
                          onClick={() => askApprove(o)}
                        >
                          <ShieldCheck size={12} strokeWidth={1.5} /> Approve
                        </button>
                      )}
                      {showCancel && (
                        <button
                          type="button"
                          className="lattice-btn lattice-btn-ghost text-xs"
                          disabled={busyId === o._id}
                          onClick={() => askCancel(o)}
                        >
                          <Ban size={12} strokeWidth={1.5} /> Cancel
                        </button>
                      )}
                      {!showApprove && !showCancel && !filled && (
                        <span className="text-[11px] text-[var(--color-muted)]">No further actions</span>
                      )}
                    </div>
                  </motion.article>
                );
              })}

            {!loading && !visible.length && (
              <div className="py-14 text-center">
                <div className="w-12 h-12 rounded-2xl border border-[var(--color-line)] bg-[var(--lattice-hover)] flex items-center justify-center mx-auto mb-4">
                  <ClipboardList size={20} strokeWidth={1.25} className="text-[var(--color-muted)]" />
                </div>
                <div className="text-[14px] text-[var(--color-soft)]">
                  {orders.length ? 'Nothing in this filter' : 'No orders yet'}
                </div>
                <p className="text-[12px] text-[var(--color-muted)] mt-1.5 max-w-sm mx-auto">
                  {canTrade
                    ? 'Accept a ranked quote on RFQ Desk to land a fill here.'
                    : 'Fills from buyer RFQs will appear on this blotter.'}
                </p>
                {canTrade && !orders.length && (
                  <Link to="/rfq" className="lattice-btn lattice-btn-primary text-xs mt-4 inline-flex">
                    Open RFQ Desk <ArrowUpRight size={13} />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </MotionItem>

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
