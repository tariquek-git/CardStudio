import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import StatCard from './components/StatCard';

interface AdminStats {
  totalUsers: number;
  totalDesigns: number;
  totalPrograms: number;
  avgComplianceScore: number;
  designsThisWeek: number;
  activeUsers7d: number;
  topNetworks: { network: string; count: number }[];
  topMaterials: { material: string; count: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<AdminStats>('/admin/stats')
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load stats');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-red-400">
        <p className="font-medium">Failed to load dashboard</p>
        <p className="text-sm mt-1 text-red-400/70">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-100 mb-6">Dashboard</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="Total Users"
          value={loading ? '...' : stats?.totalUsers ?? 0}
          color="sky"
        />
        <StatCard
          label="Total Designs"
          value={loading ? '...' : stats?.totalDesigns ?? 0}
          color="emerald"
        />
        <StatCard
          label="Total Programs"
          value={loading ? '...' : stats?.totalPrograms ?? 0}
          color="violet"
        />
        <StatCard
          label="Avg Compliance"
          value={
            loading
              ? '...'
              : `${Math.round(stats?.avgComplianceScore ?? 0)}%`
          }
          color="amber"
        />
        <StatCard
          label="Designs This Week"
          value={loading ? '...' : stats?.designsThisWeek ?? 0}
          color="sky"
        />
        <StatCard
          label="Active Users (7d)"
          value={loading ? '...' : stats?.activeUsers7d ?? 0}
          color="emerald"
        />
      </div>

      {/* Bottom lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Networks */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Top Networks
          </h3>
          {loading ? (
            <SkeletonList />
          ) : stats?.topNetworks?.length ? (
            <ul className="space-y-2.5">
              {stats.topNetworks.map((n) => (
                <li
                  key={n.network}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-slate-300">{n.network}</span>
                  <span className="text-xs font-medium text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                    {n.count}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No data yet</p>
          )}
        </div>

        {/* Top Materials */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Top Materials
          </h3>
          {loading ? (
            <SkeletonList />
          ) : stats?.topMaterials?.length ? (
            <ul className="space-y-2.5">
              {stats.topMaterials.map((m) => (
                <li
                  key={m.material}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-slate-300">{m.material}</span>
                  <span className="text-xs font-medium text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                    {m.count}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="h-3.5 w-24 bg-slate-800 rounded animate-pulse" />
          <div className="h-5 w-10 bg-slate-800 rounded-full animate-pulse" />
        </div>
      ))}
    </div>
  );
}
