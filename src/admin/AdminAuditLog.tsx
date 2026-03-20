import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const ACTION_TYPES = [
  '',
  'create',
  'update',
  'delete',
  'login',
  'export',
  'promote',
  'role_change',
];

const ENTITY_TYPES = [
  '',
  'design',
  'program',
  'template',
  'user',
  'compliance',
];

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-500/15 text-emerald-400',
  update: 'bg-sky-500/15 text-sky-400',
  delete: 'bg-red-500/15 text-red-400',
  login: 'bg-slate-700 text-slate-300',
  export: 'bg-violet-500/15 text-violet-400',
  promote: 'bg-amber-500/15 text-amber-400',
  role_change: 'bg-amber-500/15 text-amber-400',
};

export default function AdminAuditLog() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const limit = 50;

  const fetchAudit = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(actionFilter && { action: actionFilter }),
      ...(entityTypeFilter && { entityType: entityTypeFilter }),
    });
    apiFetch<AuditResponse>(`/admin/audit?${params}`)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load audit log'))
      .finally(() => setLoading(false));
  }, [page, actionFilter, entityTypeFilter]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-red-400">
        <p className="font-medium">Failed to load audit log</p>
        <p className="text-sm mt-1 text-red-400/70">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-100 mb-6">Audit Log</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="">All Actions</option>
          {ACTION_TYPES.filter(Boolean).map((a) => (
            <option key={a} value={a}>
              {a.charAt(0).toUpperCase() + a.slice(1).replace('_', ' ')}
            </option>
          ))}
        </select>
        <select
          value={entityTypeFilter}
          onChange={(e) => {
            setEntityTypeFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="">All Entity Types</option>
          {ENTITY_TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Feed */}
      <div className="space-y-1">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 animate-pulse"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-48 bg-slate-800 rounded" />
                <div className="h-2.5 w-32 bg-slate-800 rounded" />
              </div>
              <div className="h-2.5 w-20 bg-slate-800 rounded" />
            </div>
          ))
        ) : data?.entries.length ? (
          data.entries.map((entry) => (
            <AuditRow key={entry.id} entry={entry} />
          ))
        ) : (
          <div className="text-center py-16 text-slate-500 text-sm">
            No audit entries found
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-500">
            Page {data.page} of {data.totalPages} ({data.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const actionStyle =
    ACTION_COLORS[entry.action] || 'bg-slate-700 text-slate-300';

  const timeAgo = formatTimeAgo(entry.createdAt);

  return (
    <div className="flex items-start gap-3 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 hover:border-slate-700 transition-colors">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0 flex items-center justify-center overflow-hidden">
        {entry.avatarUrl ? (
          <img
            src={entry.avatarUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold text-slate-500">
            {(entry.userName || entry.userEmail || '?')
              .charAt(0)
              .toUpperCase()}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-200">
            {entry.userName || entry.userEmail}
          </span>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${actionStyle}`}
          >
            {entry.action.replace('_', ' ')}
          </span>
          <span className="text-[10px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
            {entry.entityType}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5 truncate">
          {entry.description}
        </p>
      </div>

      {/* Timestamp */}
      <span
        className="text-[10px] text-slate-600 shrink-0 mt-0.5"
        title={new Date(entry.createdAt).toLocaleString()}
      >
        {timeAgo}
      </span>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
