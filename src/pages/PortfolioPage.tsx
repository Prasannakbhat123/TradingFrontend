import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

type Position = {
  _id: string;
  gpuType: string;
  gpuModel: string;
  providerName: string;
  region: string;
  quantity: number;
  pricePerGpuHour: number;
  totalCost: number;
  status: string;
  startDate: string;
  expiryDate: string;
  allocationId?: string;
};

export function PortfolioPage() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<{
    totalCost: number;
    totalQty: number;
    avgPricePerGpuHour: number;
    concentration: Record<string, number>;
  } | null>(null);
  const [alerts, setAlerts] = useState<Array<{ message: string }>>([]);
  const [filter, setFilter] = useState({ gpuType: '', region: '', provider: '' });
  const [error, setError] = useState('');

  async function load() {
    const qs = new URLSearchParams();
    if (filter.gpuType) qs.set('gpuType', filter.gpuType);
    if (filter.region) qs.set('region', filter.region);
    if (filter.provider) qs.set('provider', filter.provider);
    const r = await api<{
      positions: Position[];
      summary: typeof summary;
      alerts: Array<{ message: string }>;
    }>(`/v1/portfolio?${qs}`);
    setPositions(r.positions);
    setSummary(r.summary);
    setAlerts(r.alerts);
  }

  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);

  async function provision(allocationId: string, status: 'provisioning' | 'delivered') {
    await api(`/v1/settlement/${allocationId}/provisioning`, {
      method: 'POST',
      json: { status, deliveredQuantity: undefined },
    });
    await load();
  }

  async function settle(allocationId: string) {
    await api(`/v1/settlement/${allocationId}/close`, { method: 'POST', json: {} });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="ticker mb-2">▲ BOOK</div>
        <h1 className="text-[32px] font-bold tracking-[-0.02em]">Portfolio / Capacity Book</h1>
        <p className="text-[15px] text-[var(--color-soft)] mt-3">
          Purchased capacity, commitments, cost basis, expiry alerts.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <input
          className="lattice-input"
          placeholder="Filter GPU"
          value={filter.gpuType}
          onChange={(e) => setFilter({ ...filter, gpuType: e.target.value })}
        />
        <input
          className="lattice-input"
          placeholder="Filter region"
          value={filter.region}
          onChange={(e) => setFilter({ ...filter, region: e.target.value })}
        />
        <input
          className="lattice-input"
          placeholder="Filter provider"
          value={filter.provider}
          onChange={(e) => setFilter({ ...filter, provider: e.target.value })}
        />
        <button
          type="button"
          className="lattice-btn lattice-btn-ghost"
          onClick={() => void load().catch((e) => setError(e.message))}
        >
          Apply filters
        </button>
      </div>

      {summary && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="lattice-panel rounded-lg p-4">
            <div className="text-xs text-[var(--color-muted)] uppercase tracking-wider">Qty</div>
            <div className="text-2xl font-mono mt-1">{summary.totalQty}</div>
          </div>
          <div className="lattice-panel rounded-lg p-4">
            <div className="text-xs text-[var(--color-muted)] uppercase tracking-wider">Avg $/hr</div>
            <div className="text-2xl font-mono mt-1">${summary.avgPricePerGpuHour.toFixed(2)}</div>
          </div>
          <div className="lattice-panel rounded-lg p-4">
            <div className="text-xs text-[var(--color-muted)] uppercase tracking-wider">Total cost</div>
            <div className="text-2xl font-mono mt-1">${summary.totalCost.toLocaleString()}</div>
          </div>
        </div>
      )}

      {!!alerts.length && (
        <div className="lattice-panel rounded-lg p-4 border-[var(--color-warn)]">
          <div className="text-xs uppercase tracking-wider text-[var(--color-warn)]">Expiry alerts</div>
          <ul className="mt-2 text-sm space-y-1">
            {alerts.map((a, i) => (
              <li key={i}>{a.message}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <div className="text-sm text-[var(--color-danger)]">{error}</div>}

      <div className="lattice-panel rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-panel-2)] text-[var(--color-muted)] text-left">
            <tr>
              <th className="px-4 py-3">GPU</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">$/hr</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p._id} className="border-t border-[var(--color-line)]">
                <td className="px-4 py-3">
                  {p.gpuType}
                  <div className="text-xs text-[var(--color-muted)]">{p.gpuModel}</div>
                </td>
                <td className="px-4 py-3">{p.providerName}</td>
                <td className="px-4 py-3 font-mono">{p.region}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.status}</td>
                <td className="px-4 py-3 font-mono">{p.quantity}</td>
                <td className="px-4 py-3 font-mono">${p.pricePerGpuHour.toFixed(2)}</td>
                <td className="px-4 py-3">{p.expiryDate.slice(0, 10)}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  {user?.role === 'provider_dealer' && p.allocationId && p.status === 'allocated' && (
                    <button
                      type="button"
                      className="lattice-btn lattice-btn-ghost text-xs"
                      onClick={() => void provision(p.allocationId!, 'provisioning')}
                    >
                      Provision
                    </button>
                  )}
                  {user?.role === 'provider_dealer' && p.allocationId && (
                    <button
                      type="button"
                      className="lattice-btn lattice-btn-primary text-xs"
                      onClick={() => void provision(p.allocationId!, 'delivered')}
                    >
                      Deliver
                    </button>
                  )}
                  {p.allocationId && (p.status === 'delivered' || p.status === 'exception') && (
                    <button
                      type="button"
                      className="lattice-btn lattice-btn-ghost text-xs"
                      onClick={() => void settle(p.allocationId!)}
                    >
                      Settle
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!positions.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-muted)]">
                  No positions in the book.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
