import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Event = {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  actorEmail?: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

export function AuditPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void api<{ events: Event[] }>('/v1/audit')
      .then((r) => setEvents(r.events))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="ticker mb-2">▲ AUDIT</div>
        <h1 className="text-[32px] font-bold tracking-[-0.02em]">Audit trail</h1>
        <p className="text-[15px] text-[var(--color-soft)] mt-3">
          Immutable history of RFQ routing, orders, executions, and settlement events.
        </p>
      </div>
      {error && <div className="text-sm text-[var(--color-danger)]">{error}</div>}
      <div className="space-y-3">
        {events.map((e) => (
          <div key={e._id} className="lattice-panel rounded-lg p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-mono text-sm">{e.action}</div>
                <div className="text-xs text-[var(--color-muted)] mt-1">
                  {e.entityType}
                  {e.entityId ? ` · ${e.entityId}` : ''} · {e.actorEmail || 'system'}
                </div>
              </div>
              <div className="text-xs font-mono text-[var(--color-muted)]">
                {new Date(e.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
        {!events.length && (
          <div className="text-[var(--color-muted)] text-sm">No audit events yet.</div>
        )}
      </div>
    </div>
  );
}
