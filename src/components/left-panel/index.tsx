import { useRef, useState, useMemo, useEffect } from 'react';
import { useCardConfig } from '../../context';
import { drawCardFront, ensureLogosLoaded } from '../../canvas';
import { validateBrandGuidelines } from '../../brandRules';
import { cardTemplates, applyTemplate } from '../../templates';
import { NAV_ICONS } from './constants';
import {
  Section,
  Divider,
  SectionNav,
} from '../ui';
import { SECTIONS, getSectionModStatus, isDefaultConfig } from '../../sectionUtils';
import { getNetworkTierDefaults, getNetworkTierLabel, getCurrencyForCountry } from '../../autoDefaults';
import QuickSetupBanner, { isOnboarded } from '../QuickSetupBanner';
import CompliancePanel, { ComplianceBadge } from '../CompliancePanel';
import CardPhotoImport from '../CardPhotoImport';
import AIDesignGenerator from '../AIDesignGenerator';

import CardProgramSection from './CardProgramSection';
import BrandSection from './BrandSection';
import VisualDesignSection from './VisualDesignSection';
import CardDetailsSection from './CardDetailsSection';
import CardFeaturesSection from './CardFeaturesSection';
import CardBackSection from './CardBackSection';

export default function LeftPanel() {
  const { config, updateConfig, designs, activeDesignId, saveDesign, loadDesign, updateDesignThumbnail } = useCardConfig();
  const isDark = config.darkMode;
  const warnings = useMemo(() => validateBrandGuidelines(config), [config]);
  const sectionMods = useMemo(() => getSectionModStatus(config), [config]);
  const [activeSection, setActiveSection] = useState<string | null>('card-program');
  const [showAI, setShowAI] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-default suggestion toast
  const [suggestion, setSuggestion] = useState<{ label: string; updates: Partial<typeof config> } | null>(null);
  const prevRailTier = useRef(`${config.railId}:${config.tier}`);
  const prevCountry = useRef(config.issuingCountry);

  // Network/tier → visual suggestion
  useEffect(() => {
    const key = `${config.railId}:${config.tier}`;
    if (key === prevRailTier.current) return;
    prevRailTier.current = key;

    const defaults = getNetworkTierDefaults(config.railId, config.tier);
    if (!defaults) return;

    const label = getNetworkTierLabel(config.railId, config.tier);
    // Check if visual fields are still at defaults
    const visualUnchanged =
      config.colorMode === 'preset' &&
      config.presetColor === 'oceanGradient' &&
      config.material === 'matte';

    if (visualUnchanged) {
      // Auto-apply silently
      updateConfig(defaults);
    } else if (label) {
      // Show suggestion toast
      setSuggestion({ label, updates: defaults });
    }
  }, [config.railId, config.tier]);

  // Country → currency auto-set
  useEffect(() => {
    if (config.issuingCountry === prevCountry.current) return;
    const oldCurrency = getCurrencyForCountry(prevCountry.current);
    prevCountry.current = config.issuingCountry;

    // Only auto-set if currency is still at the previous country's default
    if (config.currency === oldCurrency || config.currency === 'USD') {
      const newCurrency = getCurrencyForCountry(config.issuingCountry);
      if (newCurrency) {
        updateConfig({ currency: newCurrency });
      }
    }
  }, [config.issuingCountry]);

  // Dismiss suggestion after timeout
  useEffect(() => {
    if (!suggestion) return;
    const t = setTimeout(() => setSuggestion(null), 8000);
    return () => clearTimeout(t);
  }, [suggestion]);

  const handleJump = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el && panelRef.current) {
      const panelTop = panelRef.current.getBoundingClientRect().top;
      const elTop = el.getBoundingClientRect().top;
      const offset = elTop - panelTop - 70; // Account for sticky headers
      panelRef.current.scrollBy({ top: offset, behavior: 'smooth' });
    }
  };

  // Track visible sections via scroll
  const handleScroll = () => {
    if (!panelRef.current) return;
    const sections = SECTIONS.map(s => ({
      id: s.id,
      el: document.getElementById(`section-${s.id}`),
    })).filter(s => s.el);

    const panelRect = panelRef.current.getBoundingClientRect();
    const midpoint = panelRect.top + panelRect.height * 0.3;

    let closest = sections[0]?.id || null;
    let minDist = Infinity;
    for (const s of sections) {
      if (!s.el) continue;
      const dist = Math.abs(s.el.getBoundingClientRect().top - midpoint);
      if (dist < minDist) {
        minDist = dist;
        closest = s.id;
      }
    }
    if (closest !== activeSection) setActiveSection(closest);
  };

  const showSetup = useMemo(() => !isOnboarded() && isDefaultConfig(config), [config]);

  const navItems = SECTIONS.map(s => ({
    id: s.id,
    label: s.label,
    icon: NAV_ICONS[s.id] || null,
    modCount: sectionMods[s.id] || 0,
  }));

  return (
    <div
      ref={panelRef}
      onScroll={handleScroll}
      className={`w-[280px] sm:w-[300px] min-w-[280px] sm:min-w-[300px] h-full overflow-y-auto ${
        isDark ? 'bg-slate-900 border-r border-slate-700/30' : 'bg-slate-50/80 border-r border-slate-200'
      }`}
    >
      {/* Panel header + Section Nav */}
      <div className={`sticky top-0 z-10 backdrop-blur-md ${
        isDark ? 'bg-slate-900/90' : 'bg-slate-50/90'
      }`}>
        <div className={`px-4 py-3 flex items-center justify-between ${isDark ? 'border-b border-slate-700/30' : 'border-b border-slate-200/80'}`}>
          <h2 className={`text-sm font-semibold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Card Configuration
          </h2>
          <button
            onClick={() => setShowAI(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
              isDark
                ? 'bg-gradient-to-r from-violet-500/20 to-sky-500/20 text-violet-300 hover:from-violet-500/30 hover:to-sky-500/30 border border-violet-500/30'
                : 'bg-gradient-to-r from-violet-50 to-sky-50 text-violet-600 hover:from-violet-100 hover:to-sky-100 border border-violet-200'
            }`}
            title="Generate design with AI"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l1.5 4.5H14l-3.5 2.8 1.2 4.2L8 9.8l-3.7 2.7 1.2-4.2L2 5.5h4.5L8 1z" fill="currentColor" />
            </svg>
            AI
          </button>
        </div>
        <SectionNav
          items={navItems}
          activeId={activeSection}
          isDark={isDark}
          onJump={handleJump}
        />
        {suggestion && (
          <div className={`mx-3 my-1.5 px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 ${
            isDark ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20' : 'bg-sky-50 text-sky-700 border border-sky-200'
          }`}>
            <span>Suggested: {suggestion.label}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => { updateConfig(suggestion.updates); setSuggestion(null); }}
                className="px-2 py-0.5 rounded-md text-xs font-medium bg-sky-500 text-white hover:bg-sky-600"
              >
                Apply
              </button>
              <button
                onClick={() => setSuggestion(null)}
                className={`px-1.5 py-0.5 rounded-md text-xs ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ QUICK SETUP ═══════════ */}
      {showSetup && <QuickSetupBanner isDark={isDark} />}

      {/* ═══════════ MY DESIGNS ═══════════ */}
      {designs.length > 0 && (
        <div className={`px-4 py-3 ${isDark ? 'border-b border-slate-700/30' : 'border-b border-slate-200/80'}`}>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {designs.slice(0, 6).map(d => (
              <button
                key={d.id}
                onClick={() => loadDesign(d.id)}
                className={`flex-shrink-0 w-16 rounded-lg overflow-hidden transition-all hover:scale-105 ${
                  d.id === activeDesignId
                    ? 'ring-2 ring-sky-400 ring-offset-1'
                    : `border ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`
                }`}
                title={d.name}
              >
                {d.thumbnail ? (
                  <img src={d.thumbnail} alt={d.name} className="w-full aspect-[1.59/1] object-cover" />
                ) : (
                  <div className={`w-full aspect-[1.59/1] ${isDark ? 'bg-slate-800' : 'bg-slate-100'} flex items-center justify-center text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    ...
                  </div>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              const design = saveDesign();
              const canvas = document.createElement('canvas');
              canvas.width = 200;
              canvas.height = 126;
              Promise.all([document.fonts.ready, ensureLogosLoaded(config.issuerLogo, config.cardArt)]).then(() => {
                drawCardFront(canvas, config);
                updateDesignThumbnail(design.id, canvas.toDataURL('image/png', 0.7));
              });
            }}
            className={`mt-2 w-full px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              isDark
                ? 'bg-slate-800/60 text-slate-300 hover:bg-slate-700 border border-slate-700/50'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm'
            }`}
          >
            + Save Current Design
          </button>
        </div>
      )}

      {/* ═══════════ TEMPLATES ═══════════ */}
      <Section title="Templates" badge={cardTemplates.length} defaultOpen={false} isDark={isDark}>
        <div className="grid grid-cols-2 gap-2">
          {cardTemplates.map(tmpl => (
            <button
              key={tmpl.id}
              onClick={() => updateConfig(applyTemplate(tmpl))}
              className={`text-left p-2.5 rounded-lg border transition-all hover:scale-[1.02] ${
                isDark
                  ? 'bg-slate-800/40 border-slate-700/40 hover:border-sky-500/40 hover:bg-slate-800/60'
                  : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-sm'
              }`}
            >
              <p className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {tmpl.name}
              </p>
              <p className={`text-xs mt-0.5 leading-tight ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {tmpl.description}
              </p>
            </button>
          ))}
        </div>
      </Section>

      <Divider isDark={isDark} />

      {/* ═══════════ SECTIONS ═══════════ */}
      <CardProgramSection isDark={isDark} warnings={warnings} sectionMods={sectionMods} />
      <BrandSection isDark={isDark} warnings={warnings} sectionMods={sectionMods} />
      <VisualDesignSection isDark={isDark} warnings={warnings} sectionMods={sectionMods} />
      <CardDetailsSection isDark={isDark} warnings={warnings} sectionMods={sectionMods} />
      <CardFeaturesSection isDark={isDark} warnings={warnings} sectionMods={sectionMods} />
      <CardBackSection isDark={isDark} warnings={warnings} sectionMods={sectionMods} />

      {/* ═══════════ COMPLIANCE CHECK ═══════════ */}
      <div id="section-compliance">
      <Section
        title="Compliance Check"
        defaultOpen={true}
        isDark={isDark}
        badge={<ComplianceBadge isDark={isDark} />}
      >
        <CompliancePanel isDark={isDark} />
      </Section>
      </div>

      <Divider isDark={isDark} />

      {/* ═══════════ EXTRACT COLORS FROM PHOTO ═══════════ */}
      <Section title="Extract Colors from Photo" defaultOpen={false} isDark={isDark}>
        <CardPhotoImport isDark={isDark} />
      </Section>

      {/* Bottom spacer */}
      <div className="h-4" />

      {/* AI Design Generator Modal */}
      <AIDesignGenerator open={showAI} onClose={() => setShowAI(false)} isDark={isDark} />
    </div>
  );
}
