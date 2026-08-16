import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bell, Download, Ghost, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { MotionItem, MotionList } from '../components/motion';

type PipelineDeal = {
  id: string;
  codename: string;
  stage: string;
  side: 'BUY' | 'SELL';
  gpuType: string;
  gpuModel?: string;
  quantity: number;
  durationMonths: number;
  region: string;
  totalValue: number;
  pricePerGpuHour: number;
  providerName?: string;
  engagement?: string;
  assignee?: { name: string; initials: string };
  entityType: 'rfq' | 'order' | 'allocation';
};

type PipelineColumn = {
  stage: string;
  label: string;
  count: number;
  totalValue: number;
  totalLabel: string;
  deals: PipelineDeal[];
};

type PipelineResponse = {
  columns: PipelineColumn[];
  deals: PipelineDeal[];
};

function formatDealValue(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function gpuShort(gpuType: string): string {
  if (gpuType.includes('H100')) return 'H100';
  if (gpuType.includes('H200')) return 'H200';
  if (gpuType.includes('A100')) return 'A100';
  if (gpuType.includes('B200')) return 'B200';
  return gpuType.split(' ')[0];
}

function DealCard({ deal }: { deal: PipelineDeal }) {
  const nodes = Math.max(1, Math.round(deal.quantity / 8));
  const isBuy = deal.side === 'BUY';

  return (
    <MotionItem>
      <motion.article
        className="pipeline-card group cursor-default"
        whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.12)' }}
        transition={{ duration: 0.18 }}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={`pipeline-badge ${isBuy ? 'pipeline-badge-buy' : 'pipeline-badge-sell'}`}
          >
            {deal.side}
          </span>
          <div className="text-right shrink-0">
            <div className="font-mono text-[15px] font-medium text-[var(--color-text)]">
              {formatDealValue(deal.totalValue)}
            </div>
            <div className="font-mono text-[10px] text-[var(--color-muted)] mt-0.5">
              ${deal.pricePerGpuHour.toFixed(2)}/GPU-hr
            </div>
          </div>
        </div>

        <h3 className="mt-3 text-[14px] font-medium text-[var(--color-text)] tracking-tight">{deal.codename}</h3>

        <div className="mt-1.5 font-mono text-[11px] text-[var(--color-muted)] leading-relaxed">
          <span className="text-[var(--color-soft)]">@ {gpuShort(deal.gpuType)}</span>
          <br />
          {deal.quantity} GPUs · {nodes} node{nodes !== 1 ? 's' : ''} · {deal.durationMonths} mo
        </div>

        {deal.engagement && (
          <p className="mt-2.5 text-[11px] text-[var(--color-muted)]">{deal.engagement}</p>
        )}

        {deal.assignee && (
          <div className="mt-3 pt-3 border-t border-[var(--color-line)] flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#2a2a2a] border border-[var(--color-line-strong)] flex items-center justify-center text-[9px] font-mono text-[var(--color-soft)]">
              {deal.assignee.initials}
            </div>
            <span className="text-[11px] text-[var(--color-muted)]">{deal.assignee.name}</span>
          </div>
        )}
      </motion.article>
    </MotionItem>
  );
}

function EmptyColumn() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-[var(--color-muted)]">
      <Ghost size={22} strokeWidth={1.25} className="opacity-40 mb-2" />
      <span className="text-[11px]">No deals here</span>
    </div>
  );
}

export function PipelinePage() {
  const { user } = useAuth();
  const [data, setData] = useState<PipelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canCreateRfq = user?.role === 'buyer' || user?.role === 'admin';
  const isDealer = user?.role === 'provider_dealer';

  useEffect(() => {
    api<PipelineResponse>('/v1/pipeline')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load pipeline'))
      .finally(() => setLoading(false));
  }, []);

  const exportPipeline = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data.deals, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lattice-pipeline-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="text-[var(--color-muted)] text-sm py-12 text-center">Loading pipeline…</div>
    );
  }

  if (error) {
    return (
      <div className="text-[var(--color-danger)] text-sm py-12 text-center">{error}</div>
    );
  }

  return (
    <div className="-mx-8 -mt-2">
      <div className="px-8 pb-5 flex items-center justify-between border-b border-[var(--color-line)]">
        <h1 className="font-display text-[28px] text-[var(--color-text)] tracking-tight">Pipeline</h1>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={exportPipeline} className="lattice-btn lattice-btn-ghost text-[13px] py-2">
            <Download size={14} strokeWidth={1.5} />
            Export
          </button>
          {canCreateRfq && (
            <Link to="/rfq" className="lattice-btn pipeline-btn-new text-[13px] py-2">
              <Plus size={14} strokeWidth={1.5} />
              New
            </Link>
          )}
          {isDealer && (
            <Link to="/dealer" className="lattice-btn pipeline-btn-new text-[13px] py-2">
              <Plus size={14} strokeWidth={1.5} />
              Inventory
            </Link>
          )}
          <button
            type="button"
            className="relative w-9 h-9 rounded-full border border-[var(--color-line-strong)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-line-strong)] transition-colors"
            aria-label="Notifications"
          >
            <Bell size={15} strokeWidth={1.5} />
            {data && data.deals.filter((d) => d.stage === 'negotiating').length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--color-accent-warm)] text-[9px] font-mono text-[var(--color-text)] flex items-center justify-center">
                {Math.min(9, data.deals.filter((d) => d.stage === 'negotiating').length)}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max px-4 py-5 gap-0">
          {data?.columns.map((col) => (
            <div
              key={col.stage}
              className="pipeline-column w-[220px] shrink-0 px-3 border-r border-[var(--color-line)] last:border-r-0"
            >
              <div className="mb-4 px-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-mono tracking-[0.14em] text-[var(--color-muted)] uppercase">
                    {col.label}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--color-muted)]">{col.count}</span>
                </div>
                <div className="font-mono text-[13px] text-[var(--color-soft)] mt-1">
                  {col.totalLabel}
                </div>
              </div>

              <MotionList className="flex flex-col gap-2.5 min-h-[120px]">
                {col.deals.length === 0 ? (
                  <EmptyColumn />
                ) : (
                  col.deals.map((deal) => <DealCard key={`${deal.entityType}-${deal.id}`} deal={deal} />)
                )}
              </MotionList>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
