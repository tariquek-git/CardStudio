import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';

interface ComplianceStats {
  averageScore: number;
  totalDesigns: number;
  distribution: {
    low: number; // 0-50
    medium: number; // 50-80
    high: number; // 80-100
  };
  errorDesigns: ComplianceDesign[];
  warningDesigns: ComplianceDesign[];
}

interface ComplianceDesign {
  id: string;
  name: string;
  userName: string;
  score: number;
  topIssues: string[];
}

export default function AdminCompliance() {
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<ComplianceStats>('/admin/compliance')
      .then(setStats)
      .catch((err) =>
        setError(err.message || 'Failed to load compliance data'),
      )
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-red-400">
        <p className="font-medium">Failed to load compliance data</p>
        <p className="text-sm mt-1 text-red-400/70">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-slate-100 mb-6">
          Compliance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse"
            >
              <div className="h-3 w-20 bg-slate-800 rounded mb-3" />
              <div className="h-8 w-16 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse"
            >
              <div className="h-3 w-32 bg-slate-800 rounded mb-4" />
              <div className="space-y-2">
                <div className="h-10 bg-slate-800 rounded" />
                <div className="h-10 bg-slate-800 rounded" />
                <div className="h-10 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const total = stats.distribution.low + stats.distribution.medium + stats.distribution.high;
  const pctLow = total > 0 ? (stats.distribution.low / total) * 100 : 0;
  const pctMed = total > 0 ? (stats.distribution.medium / total) * 100 : 0;
  const pctHigh = total > 0 ? (stats.distribution.high / total) * 100 : 0;

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-100 mb-6">Compliance</h2>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Average Score
          </p>
          <p className="text-3xl font-bold text-slate-100 mt-2">
            {Math.round(stats.averageScore)}
            <span className="text-lg text-slate-500">%</span>
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Designs Scored
          </p>
          <p className="text-3xl font-bold text-slate-100 mt-2">
            {stats.totalDesigns}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Score Distribution
          </p>
          {/* Distribution bars */}
          <div className="space-y-2">
            <DistributionBar
              label="80-100"
              count={stats.distribution.high}
              pct={pctHigh}
              color="bg-emerald-500"
            />
            <DistributionBar
              label="50-80"
              count={stats.distribution.medium}
              pct={pctMed}
              color="bg-amber-500"
            />
            <DistributionBar
              label="0-50"
              count={stats.distribution.low}
              pct={pctLow}
              color="bg-red-500"
            />
          </div>
        </div>
      </div>

      {/* Design lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Errors */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-red-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Designs with Errors (score &lt; 50)
          </h3>
          {stats.errorDesigns.length > 0 ? (
            <ul className="space-y-2">
              {stats.errorDesigns.map((d) => (
                <ComplianceDesignRow key={d.id} design={d} severity="error" />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No designs with errors</p>
          )}
        </div>

        {/* Warnings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-amber-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Designs with Warnings (50-80)
          </h3>
          {stats.warningDesigns.length > 0 ? (
            <ul className="space-y-2">
              {stats.warningDesigns.map((d) => (
                <ComplianceDesignRow
                  key={d.id}
                  design={d}
                  severity="warning"
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              No designs with warnings
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DistributionBar({
  label,
  count,
  pct,
  color,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-10 text-right font-mono">
        {label}
      </span>
      <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-500 w-8 font-mono">
        {count}
      </span>
    </div>
  );
}

function ComplianceDesignRow({
  design,
  severity,
}: {
  design: ComplianceDesign;
  severity: 'error' | 'warning';
}) {
  const scoreColor =
    severity === 'error' ? 'text-red-400' : 'text-amber-400';
  return (
    <li className="bg-slate-950 rounded-lg px-3 py-2.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-200">{design.name}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {design.userName}
          </p>
        </div>
        <span className={`text-sm font-bold ${scoreColor}`}>
          {Math.round(design.score)}%
        </span>
      </div>
      {design.topIssues.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {design.topIssues.map((issue, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500"
            >
              {issue}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}
