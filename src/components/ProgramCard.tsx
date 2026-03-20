import { useState } from 'react';
import type { CardProgram, SavedDesign } from '../types';
import { networkNames } from '../data';

export default function ProgramCard({
  program,
  designs,
  isDark,
  onClick,
  onDelete,
  onDuplicate,
  onRename,
}: {
  program: CardProgram;
  designs: SavedDesign[];
  isDark: boolean;
  onClick: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRename: (name: string) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(program.name);

  const cardBg = isDark ? 'bg-slate-800/60 border-slate-700/40' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-200' : 'text-slate-800';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';

  // Resolve tier thumbnails from designs
  const tierThumbs = program.tiers.slice(0, 4).map(tier => {
    const design = designs.find(d => d.id === tier.cardConfigId);
    return { id: tier.id, name: tier.name, thumbnail: design?.thumbnail ?? null };
  });

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== program.name) {
      onRename(trimmed);
    }
    setIsRenaming(false);
  };

  return (
    <div
      onClick={isRenaming ? undefined : onClick}
      className={`group relative rounded-xl border overflow-hidden text-left transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer ${cardBg}`}
    >
      {/* Action buttons (top-right, visible on hover) */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); setIsRenaming(true); setRenameValue(program.name); }}
          title="Rename"
          className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDuplicate(); }}
          title="Duplicate"
          className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          title="Delete"
          className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Fanned tier thumbnails */}
      <div className={`relative h-28 flex items-center justify-center overflow-hidden ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
        {tierThumbs.length === 0 ? (
          <svg width="24" height="24" viewBox="0 0 18 18" fill="none" className={textMuted}>
            <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="4" y="7" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.4" />
          </svg>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            {tierThumbs.map((t, i) => {
              const total = tierThumbs.length;
              const offset = (i - (total - 1) / 2) * 24;
              const rotation = (i - (total - 1) / 2) * 6;
              return (
                <div
                  key={t.id}
                  className="absolute rounded-lg overflow-hidden border shadow-sm"
                  style={{
                    width: 80,
                    height: 50,
                    transform: `translateX(${offset}px) rotate(${rotation}deg)`,
                    zIndex: i + 1,
                    borderColor: isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,1)',
                  }}
                >
                  {t.thumbnail ? (
                    <img src={t.thumbnail} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className={textMuted}>
                        <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-3">
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setIsRenaming(false); }}
            onClick={e => e.stopPropagation()}
            className={`w-full text-xs font-semibold px-1.5 py-0.5 rounded border outline-none ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
          />
        ) : (
          <p className={`text-xs font-semibold truncate ${textPrimary}`}>{program.name}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
            {program.tiers.length} tier{program.tiers.length !== 1 ? 's' : ''}
          </span>
          <span className={`text-[10px] ${textSecondary}`}>
            {networkNames[program.network] || program.network}
          </span>
        </div>
      </div>
    </div>
  );
}
