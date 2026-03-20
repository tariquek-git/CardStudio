import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';

interface ProgramTier {
  id: string;
  name: string;
  level: number;
  material: string;
}

interface Program {
  id: string;
  name: string;
  userName: string;
  userEmail: string;
  network: string;
  tiers: ProgramTier[];
  createdAt: string;
}

interface ProgramsResponse {
  programs: Program[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminPrograms() {
  const [data, setData] = useState<ProgramsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<ProgramsResponse>(`/admin/programs?page=${page}&limit=20`)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load programs'))
      .finally(() => setLoading(false));
  }, [page]);

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-red-400">
        <p className="font-medium">Failed to load programs</p>
        <p className="text-sm mt-1 text-red-400/70">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-100 mb-6">Programs</h2>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Program Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                User
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Network
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tiers
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-800/50">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 w-20 bg-slate-800 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.programs.length ? (
              data.programs.map((program) => (
                <ProgramRow
                  key={program.id}
                  program={program}
                  expanded={expandedId === program.id}
                  onToggle={() =>
                    setExpandedId(
                      expandedId === program.id ? null : program.id,
                    )
                  }
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-12 text-slate-500 text-sm"
                >
                  No programs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

function ProgramRow({
  program,
  expanded,
  onToggle,
}: {
  program: Program;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className={`w-3.5 h-3.5 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="text-slate-200 font-medium">{program.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-slate-400">
          {program.userName || program.userEmail}
        </td>
        <td className="px-4 py-3">
          <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            {program.network}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-400">{program.tiers.length}</td>
        <td className="px-4 py-3 text-slate-500 text-xs">
          {new Date(program.createdAt).toLocaleDateString()}
        </td>
      </tr>
      {expanded && program.tiers.length > 0 && (
        <tr className="border-b border-slate-800/50">
          <td colSpan={5} className="px-4 py-3 bg-slate-950/50">
            <div className="ml-8 space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Tier Details
              </p>
              {program.tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex items-center gap-4 text-sm text-slate-400 bg-slate-900 rounded-lg px-3 py-2"
                >
                  <span className="text-slate-500 text-xs w-8">
                    Lv.{tier.level}
                  </span>
                  <span className="text-slate-300 font-medium">
                    {tier.name}
                  </span>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                    {tier.material}
                  </span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
