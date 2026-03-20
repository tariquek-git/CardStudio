import { useMemo, useEffect, useState } from 'react';
import { useCardConfig } from '../context';
import { validateCompliance } from '../compliance';
import { generateThumbnail } from '../thumbnailUtils';
import { networkNames } from '../data';
import ProgramCard from './ProgramCard';
import type { CardNetwork, CardProgram } from '../types';

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function mode<T>(arr: T[]): T | undefined {
  const counts = new Map<T, number>();
  let best: T | undefined;
  let bestCount = 0;
  for (const item of arr) {
    const c = (counts.get(item) || 0) + 1;
    counts.set(item, c);
    if (c > bestCount) { best = item; bestCount = c; }
  }
  return best;
}

export default function Dashboard({
  onNewDesign,
  onOpenDesign,
  onShowGallery,
  onOpenAI,
  onNewProgram,
  onOpenProgram,
}: {
  onNewDesign: () => void;
  onOpenDesign: (id: string) => void;
  onShowGallery: () => void;
  onOpenAI?: () => void;
  onNewProgram?: () => void;
  onOpenProgram?: (id: string) => void;
}) {
  const { config, designs, updateDesignThumbnail, programs, deleteProgram, duplicateProgram, renameProgram } = useCardConfig();
  const isDark = config.darkMode;

  // Generate missing thumbnails
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    for (const d of designs) {
      if (d.thumbnail || thumbs[d.id]) continue;
      generateThumbnail(d.config).then(url => {
        if (url) {
          setThumbs(prev => ({ ...prev, [d.id]: url }));
          updateDesignThumbnail(d.id, url);
        }
      });
    }
  }, [designs]);

  const recentDesigns = useMemo(
    () => [...designs].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8),
    [designs],
  );

  const stats = useMemo(() => {
    if (designs.length === 0) return null;
    const scores = designs.map(d => validateCompliance(d.config).score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const topNetwork = mode(designs.map(d => d.config.network as CardNetwork));
    const topMaterial = mode(designs.map(d => d.config.material));
    return { avgScore, topNetwork, topMaterial };
  }, [designs]);

  const cardBg = isDark ? 'bg-slate-800/60 border-slate-700/40' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-200' : 'text-slate-800';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Hero / Welcome */}
        {designs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center shadow-lg">
              <svg width="32" height="32" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="4" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5" />
                <rect x="4" y="7" width="4" height="3" rx="0.5" fill="white" opacity="0.8" />
                <line x1="10" y1="11" x2="14" y2="11" stroke="white" strokeWidth="1" opacity="0.6" />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${textPrimary}`}>Welcome to Card Studio</h2>
            <p className={`text-sm mb-8 max-w-md mx-auto ${textSecondary}`}>
              Design payment cards in 3D with live wallet mockups. See what your card program could look like before you ship it.
            </p>
            <button
              onClick={onNewDesign}
              className="px-6 py-3 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 shadow-lg hover:shadow-xl hover:shadow-[0_0_12px_rgba(14,165,233,0.3)] transition-all active:scale-[0.97]"
            >
              Create Your First Card
            </button>

            {/* Getting started tips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 max-w-2xl mx-auto">
              {[
                { icon: '1', title: 'Choose a Network', desc: 'Pick from Visa, Mastercard, Amex, and 10+ payment rails' },
                { icon: '2', title: 'Customize Design', desc: 'Set colors, materials, card art, and typography' },
                { icon: '3', title: 'Check Compliance', desc: 'Validate against US, EU, CA, and network regulations' },
              ].map(tip => (
                <div key={tip.title} className={`rounded-xl border p-5 text-left ${cardBg}`}>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400/20 to-violet-400/20 flex items-center justify-center text-sm font-bold text-sky-400 mb-3">
                    {tip.icon}
                  </div>
                  <h3 className={`text-sm font-semibold mb-1 ${textPrimary}`}>{tip.title}</h3>
                  <p className={`text-xs leading-relaxed ${textSecondary}`}>{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Quick Actions */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Card Studio</h2>
                <p className={`text-xs mt-1 ${textSecondary}`}>{designs.length} design{designs.length !== 1 ? 's' : ''} saved</p>
              </div>
              <div className="flex items-center gap-3">
                {onOpenAI && (
                  <button
                    onClick={onOpenAI}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all active:scale-[0.97] shadow-sm hover:shadow-md ${
                      isDark
                        ? 'bg-gradient-to-r from-violet-500/20 to-sky-500/20 text-violet-300 hover:from-violet-500/30 hover:to-sky-500/30 border border-violet-500/30'
                        : 'bg-gradient-to-r from-violet-50 to-sky-50 text-violet-600 hover:from-violet-100 hover:to-sky-100 border border-violet-200'
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1l1.5 4.5H14l-3.5 2.8 1.2 4.2L8 9.8l-3.7 2.7 1.2-4.2L2 5.5h4.5L8 1z" fill="currentColor" />
                    </svg>
                    Generate with AI
                  </button>
                )}
                <button
                  onClick={onNewDesign}
                  className="px-4 py-2.5 text-xs font-semibold rounded-lg text-white bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 shadow-sm hover:shadow-md hover:shadow-[0_0_12px_rgba(14,165,233,0.3)] transition-all active:scale-[0.97]"
                >
                  + New Design
                </button>
                {onNewProgram && (
                  <button
                    onClick={onNewProgram}
                    className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition-all active:scale-[0.97] shadow-sm hover:shadow-md ${
                      isDark
                        ? 'bg-slate-700/80 text-slate-200 hover:bg-slate-700 border border-slate-600/50'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    + New Program
                  </button>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                <StatCard isDark={isDark} label="Total Designs" value={String(designs.length)} />
                {programs.length > 0 && <StatCard isDark={isDark} label="Programs" value={String(programs.length)} />}
                <StatCard isDark={isDark} label="Avg Compliance" value={`${stats.avgScore}%`} color={stats.avgScore >= 80 ? 'emerald' : stats.avgScore >= 50 ? 'amber' : 'red'} />
                <StatCard isDark={isDark} label="Top Network" value={stats.topNetwork ? networkNames[stats.topNetwork] || stats.topNetwork : '—'} />
                <StatCard isDark={isDark} label="Top Material" value={stats.topMaterial ? stats.topMaterial.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim() : '—'} />
              </div>
            )}

            {/* Card Programs */}
            {programs.length > 0 && onOpenProgram && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-sm font-semibold ${textPrimary}`}>Card Programs</h3>
                  {onNewProgram && (
                    <button onClick={onNewProgram} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'text-sky-400 hover:bg-slate-800' : 'text-sky-600 hover:bg-slate-100'}`}>
                      + New Program
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {programs.map(program => (
                    <ProgramCard
                      key={program.id}
                      program={program}
                      designs={designs}
                      isDark={isDark}
                      onClick={() => onOpenProgram(program.id)}
                      onDelete={() => deleteProgram(program.id)}
                      onDuplicate={() => duplicateProgram(program.id)}
                      onRename={(name) => renameProgram(program.id, name)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Designs */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${textPrimary}`}>Recent Designs</h3>
              {designs.length > 8 && (
                <button
                  onClick={onShowGallery}
                  className={`text-xs font-medium transition-colors ${isDark ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-500'}`}
                >
                  View All ({designs.length})
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {recentDesigns.map(design => (
                <button
                  key={design.id}
                  onClick={() => onOpenDesign(design.id)}
                  className={`group rounded-xl border overflow-hidden text-left transition-all hover:-translate-y-1 hover:shadow-lg ${cardBg}`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-[1.59/1] overflow-hidden">
                    {(design.thumbnail || thumbs[design.id]) ? (
                      <img
                        src={design.thumbnail || thumbs[design.id]}
                        alt={design.name}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <svg width="24" height="24" viewBox="0 0 18 18" fill="none" className={textMuted}>
                          <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          <rect x="4" y="7" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.4" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="px-3 py-2.5">
                    <p className={`text-xs font-medium truncate ${textPrimary}`}>{design.name}</p>
                    <p className={`text-xs mt-0.5 ${textMuted}`}>{timeAgo(design.updatedAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ isDark, label, value, color }: { isDark: boolean; label: string; value: string; color?: string }) {
  const valueColor = color === 'emerald'
    ? 'text-emerald-400'
    : color === 'amber'
      ? 'text-amber-400'
      : color === 'red'
        ? 'text-red-400'
        : 'bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent';

  return (
    <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800/60 border-slate-700/40' : 'bg-white border-slate-200'}`}>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
    </div>
  );
}
