import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';

interface Design {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  userName: string;
  userEmail: string;
  network: string;
  complianceScore: number | null;
  isTemplate: boolean;
  createdAt: string;
}

interface DesignsResponse {
  designs: Design[];
  total: number;
  page: number;
  totalPages: number;
}

const NETWORKS = ['', 'visa', 'mastercard', 'amex', 'discover', 'unionpay'];

export default function AdminDesigns() {
  const [data, setData] = useState<DesignsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [network, setNetwork] = useState('');
  const [isTemplate, setIsTemplate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 24;

  const fetchDesigns = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(network && { network }),
      ...(isTemplate && { isTemplate }),
    });
    apiFetch<DesignsResponse>(`/admin/designs?${params}`)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load designs'))
      .finally(() => setLoading(false));
  }, [page, search, network, isTemplate]);

  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handlePromoteToTemplate = async (designId: string) => {
    try {
      await apiFetch(`/admin/designs/${designId}/template`, {
        method: 'PATCH',
        body: JSON.stringify({ isTemplate: true }),
      });
      fetchDesigns();
    } catch {
      // silent
    }
  };

  const handleDelete = async (designId: string) => {
    if (!confirm('Delete this design? This cannot be undone.')) return;
    try {
      await apiFetch(`/admin/designs/${designId}`, { method: 'DELETE' });
      fetchDesigns();
    } catch {
      // silent
    }
  };

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-red-400">
        <p className="font-medium">Failed to load designs</p>
        <p className="text-sm mt-1 text-red-400/70">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-100 mb-6">Designs</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search designs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 w-56"
          />
          <button
            type="submit"
            className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            Search
          </button>
        </form>
        <select
          value={network}
          onChange={(e) => {
            setNetwork(e.target.value);
            setPage(1);
          }}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="">All Networks</option>
          {NETWORKS.filter(Boolean).map((n) => (
            <option key={n} value={n}>
              {n.charAt(0).toUpperCase() + n.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={isTemplate}
          onChange={(e) => {
            setIsTemplate(e.target.value);
            setPage(1);
          }}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="">All Types</option>
          <option value="true">Templates Only</option>
          <option value="false">Non-Templates</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-pulse"
            >
              <div className="aspect-[85.6/54] bg-slate-800" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-20 bg-slate-800 rounded" />
                <div className="h-2.5 w-16 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : data?.designs.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {data.designs.map((design) => (
            <DesignCard
              key={design.id}
              design={design}
              onPromote={() => handlePromoteToTemplate(design.id)}
              onDelete={() => handleDelete(design.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500">
          <p className="text-sm">No designs found</p>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
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

function DesignCard({
  design,
  onPromote,
  onDelete,
}: {
  design: Design;
  onPromote: () => void;
  onDelete: () => void;
}) {
  const scoreColor =
    design.complianceScore == null
      ? 'text-slate-600'
      : design.complianceScore >= 80
        ? 'text-emerald-400'
        : design.complianceScore >= 50
          ? 'text-amber-400'
          : 'text-red-400';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group hover:border-slate-700 transition-colors">
      {/* Thumbnail */}
      <div className="aspect-[85.6/54] bg-slate-800 relative">
        {design.thumbnailUrl ? (
          <img
            src={design.thumbnailUrl}
            alt={design.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
              />
            </svg>
          </div>
        )}
        {design.isTemplate && (
          <span className="absolute top-1.5 right-1.5 bg-violet-500/90 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
            Template
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-medium text-slate-200 truncate">
          {design.name}
        </p>
        <p className="text-[11px] text-slate-500 truncate mt-0.5">
          {design.userName || design.userEmail}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-slate-600">
            {new Date(design.createdAt).toLocaleDateString()}
          </span>
          {design.complianceScore != null && (
            <span className={`text-[10px] font-semibold ${scoreColor}`}>
              {Math.round(design.complianceScore)}%
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!design.isTemplate && (
            <button
              onClick={onPromote}
              className="flex-1 text-[10px] font-medium py-1 rounded bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-colors"
            >
              Promote
            </button>
          )}
          <button
            onClick={onDelete}
            className="flex-1 text-[10px] font-medium py-1 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
