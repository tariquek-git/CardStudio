import { useRef, useEffect, useState, useMemo } from 'react';
import { useCardConfig } from '../context';
import { drawCardFront, drawCardBack, ensureLogosLoaded } from '../canvas';
import { validateCompliance } from '../compliance';
import type { CardConfig, SavedDesign } from '../types';

function CardPreviewCanvas({ config, face }: { config: CardConfig; face: 'front' | 'back' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ensureLogosLoaded(config.issuerLogo, config.cardArt, config.coBrandLogo, config.backQrUrl).then(() => {
      if (face === 'front') drawCardFront(canvas, config);
      else drawCardBack(canvas, config);
    });
  }, [config, face]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg shadow-lg"
      style={{ aspectRatio: '1.586' }}
    />
  );
}

function CompareCard({ config, label, isDark }: { config: CardConfig; label: string; isDark: boolean }) {
  const [face, setFace] = useState<'front' | 'back'>('front');
  const compliance = useMemo(() => validateCompliance(config), [config]);

  const scoreColor = compliance.score >= 80 ? 'text-emerald-400' : compliance.score >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className={`flex-1 min-w-[220px] max-w-[400px] rounded-xl p-3 ${
      isDark ? 'bg-slate-800/40 border border-slate-700/40' : 'bg-white border border-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
          {label}
        </h3>
        <button
          onClick={() => setFace(f => f === 'front' ? 'back' : 'front')}
          className={`text-xs px-2 py-0.5 rounded-md ${
            isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          {face === 'front' ? 'Flip' : 'Front'}
        </button>
      </div>

      <CardPreviewCanvas config={config} face={face} />

      {/* Specs */}
      <div className={`mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <div>Network: <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{config.network.toUpperCase()}</span></div>
        <div>Type: <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{config.cardType}</span></div>
        <div>Material: <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{config.material}</span></div>
        <div>Country: <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{config.issuingCountry}</span></div>
        <div>Chip: <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{config.chipStyle}</span></div>
        <div>NFC: <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{config.contactless ? 'Yes' : 'No'}</span></div>
      </div>

      {/* Compliance Score */}
      <div className={`mt-2 pt-2 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-100'} flex items-center gap-2`}>
        <span className={`text-sm font-bold ${scoreColor}`}>{compliance.score}</span>
        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          compliance · {compliance.errors.length}E {compliance.warnings.length}W
        </span>
      </div>
    </div>
  );
}

export default function ComparisonView() {
  const { config, designs } = useCardConfig();
  const isDark = config.darkMode;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const compareConfigs: { config: CardConfig; label: string }[] = [
    { config, label: 'Current Design' },
    ...selectedIds
      .map(id => designs.find(d => d.id === id))
      .filter((d): d is SavedDesign => !!d)
      .map(d => ({ config: d.config, label: d.name })),
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-auto p-6" style={{ background: isDark ? '#1a1a1a' : '#e8ecf1' }}>
      {/* Design selector */}
      {designs.length > 0 && (
        <div className={`mb-4 p-3 rounded-xl ${isDark ? 'bg-slate-800/60 border border-slate-700/40' : 'bg-white border border-slate-200'}`}>
          <p className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Compare with saved designs (select up to 2):
          </p>
          <div className="flex flex-wrap gap-2">
            {designs.map(d => {
              const active = selectedIds.includes(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    if (active) {
                      setSelectedIds(ids => ids.filter(i => i !== d.id));
                    } else if (selectedIds.length < 2) {
                      setSelectedIds(ids => [...ids, d.id]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : isDark
                        ? 'bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:border-slate-500'
                        : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-300'
                  } ${!active && selectedIds.length >= 2 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  disabled={!active && selectedIds.length >= 2}
                >
                  {d.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Cards comparison */}
      <div className="flex-1 flex gap-4 justify-center items-start flex-wrap">
        {compareConfigs.map((cc, i) => (
          <CompareCard key={i} config={cc.config} label={cc.label} isDark={isDark} />
        ))}
      </div>

      {designs.length === 0 && (
        <div className={`text-center py-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <p className="text-sm font-medium">Save some designs first</p>
          <p className="text-xs mt-1">Use &quot;Save Current Design&quot; in the left panel to create designs you can compare</p>
        </div>
      )}
    </div>
  );
}
