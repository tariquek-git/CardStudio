import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useCardConfig } from '../context';
import { drawCardFront, ensureLogosLoaded } from '../canvas';
import { presetColors, stockCardArt } from '../data';
import { validateBrandGuidelines, type BrandWarning } from '../brandRules';
import { cardTemplates, applyTemplate } from '../templates';
import { getRail, isLegacyCardNetwork } from '../rails';
import RailSelector from './RailSelector';
import RailFieldEditor from './RailFieldEditor';
import CompliancePanel, { ComplianceBadge } from './CompliancePanel';
import CardPhotoImport from './CardPhotoImport';
import { COUNTRIES, CURRENCIES } from '../compliance/utils';
import {
  Section,
  SegmentedControl,
  Toggle,
  Slider,
  ColorPicker,
  OptionGrid,
  Label,
  LabeledInput,
  Input,
  Divider,
  SwatchGrid,
  Chip,
  GradientEditor as GradientEditorUI,
  Select,
  SectionNav,
  AdvancedToggle,
} from './ui';
import { SECTIONS, getSectionModStatus, isDefaultConfig } from '../sectionUtils';
import { getNetworkTierDefaults, getNetworkTierLabel, getCurrencyForCountry } from '../autoDefaults';
import QuickSetupBanner, { isOnboarded } from './QuickSetupBanner';
import type {
  CardNetwork,
  CardType,
  ChipStyle,
  CardNumberDisplay,
  CardOrientation,
  CardMaterial,
  CardArtFit,
  CardArtBlendMode,
  NumberPosition,
  BackLogo,
  IssuerType,
  SecondaryNetwork,
} from '../types';


const chipStyles: { value: ChipStyle; label: string; color: string }[] = [
  { value: 'gold', label: 'Gold', color: '#D4A847' },
  { value: 'silver', label: 'Silver', color: '#C0C0C0' },
  { value: 'black', label: 'Stealth', color: '#2a2a2a' },
  { value: 'none', label: 'None', color: 'transparent' },
];

const backLogoOptions: { value: BackLogo; label: string }[] = [
  { value: 'cirrus', label: 'Cirrus' },
  { value: 'plus', label: 'Plus' },
  { value: 'star', label: 'STAR' },
  { value: 'pulse', label: 'Pulse' },
];

function WarningHint({
  warnings,
  field,
  isDark,
}: {
  warnings: BrandWarning[];
  field: string;
  isDark: boolean;
}) {
  const matching = warnings.filter(w => w.field === field);
  if (matching.length === 0) return null;
  return (
    <div>
      {matching.map(w => (
        <p
          key={w.id}
          className={`text-xs mt-1 ${
            w.severity === 'warning'
              ? isDark ? 'text-amber-400' : 'text-amber-600'
              : isDark ? 'text-sky-400' : 'text-sky-600'
          }`}
        >
          {w.severity === 'warning' ? '!!' : 'i'} {w.message}
        </p>
      ))}
    </div>
  );
}


// Section nav icons (tiny inline SVGs)
const NAV_ICONS: Record<string, React.ReactNode> = {
  'card-program': <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="2" width="8" height="6" rx="1" /><path d="M1 4h8" /></svg>,
  'brand-identity': <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="5" cy="4" r="2" /><path d="M2 9a3 3 0 016 0" /></svg>,
  'visual-design': <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="5" cy="5" r="3.5" /><circle cx="5" cy="5" r="1.5" /></svg>,
  'card-details': <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 3h6M2 5h4M2 7h5" /></svg>,
  'card-features': <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="3" width="3" height="4" rx="0.5" /><path d="M7 4a1.5 1.5 0 010 3" /></svg>,
  'card-back': <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="2" width="8" height="6" rx="1" /><path d="M1 3.5h8" /></svg>,
  'compliance': <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M5 1L9 3v3c0 2-2 3-4 4C3 9 1 8 1 6V3l4-2z" /><path d="M3.5 5l1.5 1.5L7 4" /></svg>,
};

export default function LeftPanel() {
  const { config, updateConfig, designs, activeDesignId, saveDesign, loadDesign, updateDesignThumbnail } = useCardConfig();
  const isDark = config.darkMode;
  const warnings = useMemo(() => validateBrandGuidelines(config), [config]);
  const sectionMods = useMemo(() => getSectionModStatus(config), [config]);
  const [activeSection, setActiveSection] = useState<string | null>('card-program');
  const panelRef = useRef<HTMLDivElement>(null);

  // Advanced toggle states
  const [showProgramAdvanced, setShowProgramAdvanced] = useState(false);
  const [showBackAdvanced, setShowBackAdvanced] = useState(false);
  const [showFeaturesAdvanced, setShowFeaturesAdvanced] = useState(false);

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
        <div className={`px-4 py-3 ${isDark ? 'border-b border-slate-700/30' : 'border-b border-slate-200/80'}`}>
          <h2 className={`text-sm font-semibold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Card Configuration
          </h2>
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

      {/* ═══════════ CARD PROGRAM ═══════════ */}
      <div id="section-card-program">
      <Section title="Card Program" defaultOpen={true} isDark={isDark} badge={sectionMods['card-program'] > 0 ? `${sectionMods['card-program']} set` : undefined}>
        <div className="space-y-4">
          {sectionMods['card-program'] === 0 && (
            <p className={`text-xs -mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Set your card type and issuing country</p>
          )}
          <Select
            label="Card Type"
            value={config.cardType}
            onChange={cardType => updateConfig({ cardType: cardType as CardType })}
            options={[
              { value: 'credit', label: 'Credit' },
              { value: 'debit', label: 'Debit' },
              { value: 'prepaid', label: 'Prepaid' },
              { value: 'commercial', label: 'Commercial' },
              { value: 'virtual', label: 'Virtual' },
            ]}
            isDark={isDark}
          />

          <div>
            <Label isDark={isDark}>Orientation</Label>
            <SegmentedControl
              options={[
                { value: 'horizontal' as CardOrientation, label: 'Horizontal' },
                { value: 'vertical' as CardOrientation, label: 'Vertical' },
              ]}
              value={config.orientation}
              onChange={orientation => updateConfig({ orientation })}
              isDark={isDark}
              size="sm"
            />
          </div>

          <div>
            <Label isDark={isDark}>Card Face</Label>
            <SegmentedControl
              options={[
                { value: 'front' as const, label: 'Front' },
                { value: 'back' as const, label: 'Back' },
              ]}
              value={config.face}
              onChange={face => updateConfig({ face })}
              isDark={isDark}
              size="sm"
            />
          </div>

          <Select
            label="Issuing Country"
            value={config.issuingCountry}
            onChange={v => updateConfig({ issuingCountry: v })}
            options={COUNTRIES.map(c => ({ value: c.code, label: `${c.name}` }))}
            isDark={isDark}
          />

          <Select
            label="Issuer Type"
            value={config.issuerType}
            onChange={v => updateConfig({ issuerType: v as IssuerType })}
            options={[
              { value: 'bank', label: 'Bank' },
              { value: 'credit_union', label: 'Credit Union' },
              { value: 'fintech', label: 'Fintech / BaaS' },
              { value: 'other', label: 'Other' },
            ]}
            isDark={isDark}
          />

          <Select
            label="Currency"
            value={config.currency}
            onChange={v => updateConfig({ currency: v })}
            options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} — ${c.name}` }))}
            isDark={isDark}
          />

          {/* Conditional: US bank → FDIC */}
          {config.issuingCountry === 'US' && config.issuerType === 'bank' && (
            <Toggle
              checked={config.fdicInsured}
              onChange={v => updateConfig({ fdicInsured: v })}
              label="Member FDIC"
              sublabel="Display FDIC insurance notice on card back"
              isDark={isDark}
            />
          )}

          {/* Conditional: US credit union → NCUA */}
          {config.issuingCountry === 'US' && config.issuerType === 'credit_union' && (
            <Toggle
              checked={config.ncuaInsured}
              onChange={v => updateConfig({ ncuaInsured: v })}
              label="Federally Insured by NCUA"
              sublabel="Display NCUA insurance notice on card back"
              isDark={isDark}
            />
          )}

          {/* Conditional: US debit → secondary network (Durbin) */}
          {config.issuingCountry === 'US' && config.cardType === 'debit' && (
            <Select
              label="Secondary Network (Durbin)"
              value={config.secondaryNetwork}
              onChange={v => updateConfig({ secondaryNetwork: v as SecondaryNetwork })}
              options={[
                { value: '', label: 'None selected' },
                { value: 'star', label: 'STAR' },
                { value: 'pulse', label: 'Pulse' },
                { value: 'nyce', label: 'NYCE' },
                { value: 'accel', label: 'Accel' },
                { value: 'shazam', label: 'Shazam' },
                { value: 'interlink', label: 'Interlink (Visa)' },
                { value: 'maestro', label: 'Maestro (MC)' },
              ]}
              isDark={isDark}
            />
          )}

          {/* Bilingual (Canada) */}
          {config.issuingCountry === 'CA' && (
            <Toggle
              checked={config.bilingualRequired}
              onChange={v => updateConfig({ bilingualRequired: v })}
              label="Bilingual (EN/FR)"
              sublabel="Display card text in English and French"
              isDark={isDark}
            />
          )}

          {/* ── More program options ── */}
          <AdvancedToggle open={showProgramAdvanced} onToggle={() => setShowProgramAdvanced(v => !v)} isDark={isDark}>
            <LabeledInput
              label="BIN / IIN Range"
              value={config.binRange}
              onChange={v => {
                const digits = v.replace(/\D/g, '');
                updateConfig({ binRange: digits.slice(0, 8) });
              }}
              placeholder="e.g. 412345"
              maxLength={8}
              isDark={isDark}
              mono
              inputMode="numeric"
              hint={
                config.binRange && config.binRange.length > 0 && config.binRange.length < 6 ? (
                  <p className="mt-1 text-xs text-amber-400">BIN should be 6-8 digits</p>
                ) : undefined
              }
            />

            <LabeledInput
              label="Co-Brand Partner"
              value={config.coBrandPartner}
              onChange={v => updateConfig({ coBrandPartner: v.slice(0, 30) })}
              placeholder="e.g. Delta, Costco, Amazon"
              maxLength={30}
              isDark={isDark}
            />
            {config.coBrandPartner && (
              <CoBrandLogoUpload
                logo={config.coBrandLogo}
                onChange={coBrandLogo => updateConfig({ coBrandLogo })}
                isDark={isDark}
              />
            )}

            <Toggle
              checked={config.dualInterfaceBadge}
              onChange={v => updateConfig({ dualInterfaceBadge: v })}
              label="Card Type Badge"
              sublabel={`Show "${config.cardType.toUpperCase()}" on card face`}
              isDark={isDark}
            />

            <LabeledInput
              label="Card Level Badge"
              value={config.cardLevelBadge}
              onChange={v => updateConfig({ cardLevelBadge: v.slice(0, 20) })}
              placeholder="e.g. WORLD ELITE, SIGNATURE"
              maxLength={20}
              isDark={isDark}
              uppercase
            />

            <LabeledInput
              label="Issuer Address"
              value={config.issuerAddress}
              onChange={v => updateConfig({ issuerAddress: v.slice(0, 80) })}
              placeholder="e.g. 123 Main St, New York, NY"
              maxLength={80}
              isDark={isDark}
            />
          </AdvancedToggle>
        </div>
      </Section>
      </div>

      <Divider isDark={isDark} />

      {/* ═══════════ BRAND IDENTITY ═══════════ */}
      <div id="section-brand-identity">
      <Section title="Brand Identity" defaultOpen={true} isDark={isDark} badge={sectionMods['brand-identity'] > 0 ? `${sectionMods['brand-identity']} set` : undefined}>
        <div className="space-y-4">
          {sectionMods['brand-identity'] === 0 && (
            <p className={`text-xs -mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Add your brand name and logo</p>
          )}
          <LabeledInput
            label="Issuer Name"
            value={config.issuerName}
            onChange={v => updateConfig({ issuerName: v.slice(0, 30) })}
            placeholder="e.g. Maple Financial"
            maxLength={30}
            isDark={isDark}
          />
          <IssuerLogoUpload
            logo={config.issuerLogo}
            onChange={issuerLogo => updateConfig({ issuerLogo })}
            isDark={isDark}
          />
          <LabeledInput
            label="Program Name"
            value={config.programName}
            onChange={v => updateConfig({ programName: v.slice(0, 30) })}
            placeholder="e.g. ACME Rewards"
            maxLength={30}
            isDark={isDark}
          />

          {/* Payment Rail */}
          <div>
            <Label isDark={isDark}>Payment Rail</Label>
            <RailSelector
              railId={config.railId}
              tier={config.tier}
              isDark={isDark}
              onSelect={(railId, tier) => {
                const network = isLegacyCardNetwork(railId) ? railId as CardNetwork : config.network;
                updateConfig({ railId, tier, network });
              }}
            />
          </div>

          {/* Rail-specific fields */}
          {getRail(config.railId)?.cardFormFactor !== 'standard_card' && (
            <RailFieldEditor
              railId={config.railId}
              railFields={config.railFields}
              isDark={isDark}
              onChange={railFields => updateConfig({ railFields })}
            />
          )}
        </div>
      </Section>
      </div>

      <Divider isDark={isDark} />

      {/* ═══════════ VISUAL DESIGN ═══════════ */}
      <div id="section-visual-design">
      <Section title="Visual Design" defaultOpen={true} isDark={isDark} badge={sectionMods['visual-design'] > 0 ? `${sectionMods['visual-design']} set` : undefined}>
        <div className="space-y-5">
          {sectionMods['visual-design'] === 0 && (
            <p className={`text-xs -mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Choose colors, art, and materials</p>
          )}

          {/* ── Card Color ── */}
          <div>
            <Label isDark={isDark}>Card Color</Label>
            <SegmentedControl
              options={[
                { value: 'solid' as const, label: 'Custom' },
                { value: 'preset' as const, label: 'Presets' },
                { value: 'gradient' as const, label: 'Gradient' },
              ]}
              value={config.colorMode}
              onChange={colorMode => updateConfig({ colorMode })}
              isDark={isDark}
              size="sm"
            />

            <div className="mt-3">
              {config.colorMode === 'solid' && (
                <ColorPicker
                  color={config.solidColor}
                  onChange={solidColor => updateConfig({ solidColor })}
                  isDark={isDark}
                />
              )}

              {config.colorMode === 'preset' && (
                <SwatchGrid
                  colors={Object.entries(presetColors).map(([key, p]) => ({
                    key,
                    value: p.value,
                    gradient: p.gradient as [string, string] | undefined,
                  }))}
                  selected={config.presetColor}
                  onSelect={presetColor => updateConfig({ presetColor })}
                  isDark={isDark}
                />
              )}

              {config.colorMode === 'gradient' && (
                <GradientEditorUI
                  stops={config.gradientConfig.stops}
                  angle={config.gradientConfig.angle}
                  onStopsChange={stops => updateConfig({ gradientConfig: { ...config.gradientConfig, stops } })}
                  onAngleChange={angle => updateConfig({ gradientConfig: { ...config.gradientConfig, angle } })}
                  isDark={isDark}
                />
              )}
            </div>
            <WarningHint warnings={warnings} field="colorMode" isDark={isDark} />
          </div>

          {/* ── Card Art ── */}
          <div>
            <Label isDark={isDark}>Card Art</Label>
            <CardArtSection
              art={config.cardArt}
              opacity={config.cardArtOpacity}
              fit={config.cardArtFit}
              blend={config.cardArtBlend}
              offsetX={config.cardArtOffsetX}
              offsetY={config.cardArtOffsetY}
              tint={config.cardArtTint}
              blur={config.cardArtBlur}
              onChange={updates => updateConfig(updates)}
              isDark={isDark}
            />
          </div>

          {/* ── Material ── */}
          <div>
            <Label isDark={isDark}>Card Material</Label>
            <OptionGrid
              options={[
                { value: 'matte' as CardMaterial, label: 'Matte' },
                { value: 'glossy' as CardMaterial, label: 'Glossy' },
                { value: 'metal' as CardMaterial, label: 'Metal' },
                { value: 'brushedMetal' as CardMaterial, label: 'Brushed' },
                { value: 'clear' as CardMaterial, label: 'Clear' },
                { value: 'holographic' as CardMaterial, label: 'Holo' },
                { value: 'recycledPlastic' as CardMaterial, label: 'Eco' },
                { value: 'wood' as CardMaterial, label: 'Wood' },
              ]}
              value={config.material}
              onChange={material => updateConfig({ material })}
              isDark={isDark}
            />
          </div>

          {/* ── Text Color Override ── */}
          <div>
            <Toggle
              checked={config.textColorOverride !== null}
              onChange={v => updateConfig({ textColorOverride: v ? '#ffffff' : null })}
              label="Custom Text Color"
              isDark={isDark}
            />
            {config.textColorOverride !== null && (
              <div className="mt-2 ml-11">
                <ColorPicker
                  color={config.textColorOverride}
                  onChange={textColorOverride => updateConfig({ textColorOverride })}
                  isDark={isDark}
                />
              </div>
            )}
            <WarningHint warnings={warnings} field="textColorOverride" isDark={isDark} />
          </div>
        </div>
      </Section>
      </div>

      <Divider isDark={isDark} />

      {/* ═══════════ CARD DETAILS ═══════════ */}
      <div id="section-card-details">
      <Section title="Card Details" defaultOpen={false} isDark={isDark} badge={sectionMods['card-details'] > 0 ? `${sectionMods['card-details']} set` : undefined}>
        <div className="space-y-4">
          {sectionMods['card-details'] === 0 && (
            <p className={`text-xs -mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Customize cardholder name and number display</p>
          )}
          <div>
            <Toggle
              checked={config.numberless}
              onChange={numberless => updateConfig({ numberless })}
              label="Numberless Card"
              sublabel="Hide number, name & expiry from front"
              isDark={isDark}
            />
            <WarningHint warnings={warnings} field="numberless" isDark={isDark} />
          </div>

          {!config.numberless && (
            <>
              <div>
                <Label isDark={isDark}>Number Position</Label>
                <OptionGrid
                  options={[
                    { value: 'standard' as NumberPosition, label: 'Standard' },
                    { value: 'back-only' as NumberPosition, label: 'Back Only' },
                    { value: 'lower-center' as NumberPosition, label: 'Lower' },
                    { value: 'compact-right' as NumberPosition, label: 'Compact' },
                  ]}
                  value={config.numberPosition}
                  onChange={numberPosition => updateConfig({ numberPosition })}
                  isDark={isDark}
                  columns={2}
                />
                <WarningHint warnings={warnings} field="numberPosition" isDark={isDark} />
              </div>

              <LabeledInput
                label="Cardholder Name"
                value={config.cardholderName}
                onChange={v => updateConfig({ cardholderName: v.slice(0, 26) })}
                placeholder="JANE A. CARDHOLDER"
                maxLength={26}
                isDark={isDark}
                uppercase
              />

              <div>
                <Label isDark={isDark}>Card Number Display</Label>
                <SegmentedControl
                  options={[
                    { value: 'full' as CardNumberDisplay, label: 'Full' },
                    { value: 'last4' as CardNumberDisplay, label: 'Last 4' },
                    { value: 'hidden' as CardNumberDisplay, label: 'Hidden' },
                  ]}
                  value={config.cardNumberDisplay}
                  onChange={cardNumberDisplay => updateConfig({ cardNumberDisplay })}
                  isDark={isDark}
                  size="sm"
                />
              </div>

              {config.cardNumberDisplay !== 'hidden' && (
                <div>
                  <Label isDark={isDark}>Card Number</Label>

                  <Input
                    value={config.customCardNumber}
                    onChange={v => {
                      const digits = v.replace(/\D/g, '');
                      const max = config.network === 'amex' ? 15 : 16;
                      updateConfig({ customCardNumber: digits.slice(0, max) });
                    }}
                    placeholder="Enter card number (optional)"
                    maxLength={config.network === 'amex' ? 15 : 16}
                    isDark={isDark}
                    mono
                    inputMode="numeric"
                  />
                  {config.customCardNumber && (
                    <button
                      onClick={() => updateConfig({ customCardNumber: '' })}
                      className={`mt-1 text-xs font-medium ${isDark ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-500'}`}
                    >
                      Reset to test number
                    </button>
                  )}
                </div>
              )}

              <LabeledInput
                label={config.network === 'amex' ? 'Member Since' : 'Expiry Date'}
                value={config.expiryDate}
                onChange={v => {
                  let val = v.replace(/[^\d/]/g, '');
                  if (config.network === 'amex') {
                    val = val.replace(/\//g, '').slice(0, 4);
                  } else {
                    const digits = val.replace(/\//g, '');
                    if (digits.length >= 2) {
                      val = digits.slice(0, 2) + '/' + digits.slice(2, 4);
                    } else {
                      val = digits;
                    }
                  }
                  updateConfig({ expiryDate: val });
                }}
                placeholder={config.network === 'amex' ? '2020' : 'MM/YY'}
                maxLength={config.network === 'amex' ? 4 : 5}
                isDark={isDark}
                mono
                inputMode="numeric"
              />
            </>
          )}
        </div>
      </Section>
      </div>

      <Divider isDark={isDark} />

      {/* ═══════════ CARD FEATURES ═══════════ */}
      <div id="section-card-features">
      <Section title="Card Features" defaultOpen={false} isDark={isDark} badge={sectionMods['card-features'] > 0 ? `${sectionMods['card-features']} set` : undefined}>
        <div className="space-y-4">
          <div>
            <Label isDark={isDark}>EMV Chip Style</Label>
            <OptionGrid
              options={chipStyles.map(cs => ({
                value: cs.value,
                label: cs.label,
                color: cs.color === 'transparent' ? undefined : cs.color,
                preview: cs.value === 'none' ? (
                  <span className={`w-8 h-6 rounded-sm border border-dashed block ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />
                ) : (
                  <span className="w-8 h-6 rounded-sm block" style={{ background: cs.color }} />
                ),
              }))}
              value={config.chipStyle}
              onChange={chipStyle => updateConfig({ chipStyle })}
              isDark={isDark}
            />
            <WarningHint warnings={warnings} field="chipStyle" isDark={isDark} />
          </div>

          <div>
            <Toggle
              checked={config.contactless}
              onChange={contactless => updateConfig({ contactless })}
              label="Contactless (NFC)"
              isDark={isDark}
            />
            <WarningHint warnings={warnings} field="contactless" isDark={isDark} />
          </div>

          <AdvancedToggle open={showFeaturesAdvanced} onToggle={() => setShowFeaturesAdvanced(v => !v)} isDark={isDark}>
            <div>
              <Label isDark={isDark}>Back of Card Logos</Label>
              <div className="flex flex-wrap gap-1.5">
                {backLogoOptions.map(bl => (
                  <Chip
                    key={bl.value}
                    label={bl.label}
                    active={(config.backLogos || []).includes(bl.value)}
                    onClick={() => {
                      const current = config.backLogos || [];
                      const next = current.includes(bl.value)
                        ? current.filter(l => l !== bl.value)
                        : [...current, bl.value];
                      updateConfig({ backLogos: next });
                    }}
                    isDark={isDark}
                  />
                ))}
              </div>
              <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                ATM network logos for card back
              </p>
            </div>
          </AdvancedToggle>
        </div>
      </Section>
      </div>

      <Divider isDark={isDark} />

      {/* ═══════════ CARD BACK ═══════════ */}
      <div id="section-card-back">
      <Section title="Card Back" defaultOpen={false} isDark={isDark} badge={sectionMods['card-back'] > 0 ? `${sectionMods['card-back']} set` : undefined}>
        <div className="space-y-4">
          <Toggle
            checked={config.backShowMagStripe !== false}
            onChange={v => updateConfig({ backShowMagStripe: v })}
            label="Magnetic Stripe"
            isDark={isDark}
          />

          <Toggle
            checked={config.backShowSignatureStrip !== false}
            onChange={v => updateConfig({ backShowSignatureStrip: v })}
            label="Signature Strip & CVV"
            isDark={isDark}
          />

          <LabeledInput
            label="Support Phone"
            value={config.backSupportPhone ?? '1-800-XXX-XXXX'}
            onChange={backSupportPhone => updateConfig({ backSupportPhone })}
            placeholder="1-800-XXX-XXXX"
            isDark={isDark}
            hint={
              config.backSupportPhone && !/^[\d\s\-+().]+$/.test(config.backSupportPhone) ? (
                <p className="mt-1 text-xs text-amber-400">Phone should contain only digits, spaces, dashes, and parentheses</p>
              ) : undefined
            }
          />

          <AdvancedToggle open={showBackAdvanced} onToggle={() => setShowBackAdvanced(v => !v)} isDark={isDark}>
            <Toggle
              checked={config.backShowHologram !== false}
              onChange={v => updateConfig({ backShowHologram: v })}
              label="Security Hologram"
              isDark={isDark}
            />

            <LabeledInput
              label="Support URL"
              value={config.backSupportUrl ?? ''}
              onChange={backSupportUrl => updateConfig({ backSupportUrl })}
              placeholder="support.example.com"
              isDark={isDark}
              hint={
                config.backSupportUrl && !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(config.backSupportUrl) ? (
                  <p className="mt-1 text-xs text-amber-400">Enter a valid URL (e.g. support.example.com)</p>
                ) : undefined
              }
            />

            <LabeledInput
              label="QR Code URL"
              value={config.backQrUrl ?? ''}
              onChange={backQrUrl => updateConfig({ backQrUrl })}
              placeholder="https://example.com/activate"
              isDark={isDark}
              hint={
                config.backQrUrl && !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(config.backQrUrl) ? (
                  <p className="mt-1 text-xs text-amber-400">Enter a valid URL for the QR code</p>
                ) : undefined
              }
            />
            {config.backQrUrl && (
              <p className={`text-xs -mt-2 mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                QR code will appear on card back
              </p>
            )}

            <div>
              <Label isDark={isDark}>Custom Legal Text</Label>
              <textarea
                value={config.backLegalText ?? ''}
                onChange={e => updateConfig({ backLegalText: e.target.value })}
                placeholder="Leave empty for default text"
                rows={3}
                className={`w-full px-2.5 py-1.5 text-xs rounded-md border outline-none resize-none transition-colors ${
                  isDark
                    ? 'bg-slate-800/60 border-slate-600/50 text-slate-200 placeholder:text-slate-600 focus:border-sky-500/50'
                    : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-sky-400'
                }`}
              />
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                Replaces default &quot;This card is property of...&quot; text
              </p>
            </div>
          </AdvancedToggle>
        </div>
      </Section>
      </div>

      <Divider isDark={isDark} />

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
    </div>
  );
}

// ─── Issuer Logo Upload ──────────────────────────────────────
function IssuerLogoUpload({
  logo,
  onChange,
  isDark,
}: {
  logo: string | null;
  onChange: (logo: string | null) => void;
  isDark: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.size > 200_000) {
      alert('Logo must be under 200KB');
      return;
    }
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Unsupported file type. Please use PNG, JPG, or SVG.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => onChange(dataUrl);
      img.onerror = () => alert('Failed to load image. The file may be corrupted.');
      img.src = dataUrl;
    };
    reader.onerror = () => alert('Failed to read file.');
    reader.readAsDataURL(file);
  };

  return (
    <div className="-mt-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {logo ? (
        <div className="flex items-center gap-2">
          <img src={logo} alt="Issuer logo" className="h-8 rounded" />
          <button
            onClick={() => onChange(null)}
            className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${
              isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'
            }`}
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            isDark
              ? 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 border border-slate-700/50'
              : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Upload Logo
        </button>
      )}
    </div>
  );
}

// ─── Co-Brand Logo Upload ────────────────────────────────────
function CoBrandLogoUpload({
  logo,
  onChange,
  isDark,
}: {
  logo: string | null;
  onChange: (logo: string | null) => void;
  isDark: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.size > 200_000) {
      alert('Logo must be under 200KB');
      return;
    }
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Unsupported file type. Please use PNG, JPG, or SVG.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => onChange(dataUrl);
      img.onerror = () => alert('Failed to load image.');
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="-mt-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {logo ? (
        <div className="flex items-center gap-2">
          <img src={logo} alt="Co-brand logo" className="h-8 rounded" />
          <button
            onClick={() => onChange(null)}
            className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${
              isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'
            }`}
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            isDark
              ? 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 border border-slate-700/50'
              : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Upload Partner Logo
        </button>
      )}
    </div>
  );
}

// ─── Card Art Section ────────────────────────────────────────
function CardArtSection({
  art,
  opacity,
  fit,
  blend,
  offsetX,
  offsetY,
  tint,
  blur,
  onChange,
  isDark,
}: {
  art: string | null;
  opacity: number;
  fit: CardArtFit;
  blend: CardArtBlendMode;
  offsetX: number;
  offsetY: number;
  tint: string | null;
  blur: number;
  onChange: (updates: Partial<{
    cardArt: string | null;
    cardArtOpacity: number;
    cardArtFit: CardArtFit;
    cardArtBlend: CardArtBlendMode;
    cardArtOffsetX: number;
    cardArtOffsetY: number;
    cardArtTint: string | null;
    cardArtBlur: number;
  }>) => void;
  isDark: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [artTab, setArtTab] = useState<'upload' | 'url' | 'gallery'>('gallery');
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFile = (file: File) => {
    if (file.size > 2_000_000) {
      alert('Card art must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange({ cardArt: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleUrlLoad = () => {
    const url = urlInput.trim();
    if (!url) return;
    setUrlLoading(true);
    setUrlError(null);
    const img = new Image();
    img.onload = () => {
      setUrlLoading(false);
      onChange({ cardArt: url });
    };
    img.onerror = () => {
      setUrlLoading(false);
      setUrlError('Failed to load image');
    };
    img.src = url;
  };

  return (
    <div className="space-y-3">
      {/* Preview + controls when art is loaded */}
      {art && (
        <div className="space-y-3">
          <div className="relative group">
            <img src={art} alt="Card art" className="w-full h-20 object-cover rounded-lg" />
            <button
              onClick={() => onChange({ cardArt: null })}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
            >
              x
            </button>
          </div>

          <Slider
            value={opacity}
            onChange={v => onChange({ cardArtOpacity: v })}
            min={5}
            max={100}
            label="Opacity"
            suffix="%"
            isDark={isDark}
          />

          <div>
            <Label isDark={isDark}>Fit</Label>
            <SegmentedControl
              options={[
                { value: 'cover' as CardArtFit, label: 'Cover' },
                { value: 'contain' as CardArtFit, label: 'Contain' },
                { value: 'fill' as CardArtFit, label: 'Fill' },
              ]}
              value={fit}
              onChange={v => onChange({ cardArtFit: v })}
              isDark={isDark}
              size="sm"
            />
          </div>

          {/* Advanced art controls (progressive disclosure) */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`text-xs font-medium flex items-center gap-1 transition-colors ${
              isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <svg
              width="12" height="12" viewBox="0 0 10 10"
              className={`transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" strokeWidth="1.5"
            >
              <path d="M3 1.5L6.5 5L3 8.5" />
            </svg>
            Advanced options
          </button>

          {showAdvanced && (
            <div className="space-y-3 pl-3 border-l-2 border-sky-500/20">
              <div>
                <Label isDark={isDark}>Blend Mode</Label>
                <SegmentedControl
                  options={[
                    { value: 'normal' as CardArtBlendMode, label: 'Normal' },
                    { value: 'multiply' as CardArtBlendMode, label: 'Multiply' },
                    { value: 'screen' as CardArtBlendMode, label: 'Screen' },
                    { value: 'overlay' as CardArtBlendMode, label: 'Overlay' },
                    { value: 'soft-light' as CardArtBlendMode, label: 'Soft' },
                  ]}
                  value={blend}
                  onChange={v => onChange({ cardArtBlend: v })}
                  isDark={isDark}
                  size="sm"
                />
              </div>

              <Slider
                value={offsetX}
                onChange={v => onChange({ cardArtOffsetX: v })}
                min={-50}
                max={50}
                label="Offset X"
                isDark={isDark}
              />
              <Slider
                value={offsetY}
                onChange={v => onChange({ cardArtOffsetY: v })}
                min={-50}
                max={50}
                label="Offset Y"
                isDark={isDark}
              />
              {(offsetX !== 0 || offsetY !== 0) && (
                <button
                  onClick={() => onChange({ cardArtOffsetX: 0, cardArtOffsetY: 0 })}
                  className={`text-xs font-medium transition-colors ${
                    isDark ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-500'
                  }`}
                >
                  Reset position
                </button>
              )}

              <div className="flex items-center gap-3">
                <Toggle
                  checked={tint !== null}
                  onChange={v => onChange({ cardArtTint: v ? '#0EA5E9' : null })}
                  label="Tint"
                  isDark={isDark}
                  size="sm"
                />
                {tint !== null && (
                  <input
                    type="color"
                    value={tint}
                    onChange={e => onChange({ cardArtTint: e.target.value })}
                    className="w-6 h-6 rounded-md cursor-pointer border-0 bg-transparent"
                  />
                )}
              </div>

              <Slider
                value={blur}
                onChange={v => onChange({ cardArtBlur: v })}
                min={0}
                max={20}
                label="Blur"
                suffix="px"
                isDark={isDark}
              />
            </div>
          )}
        </div>
      )}

      {/* Tab row */}
      <SegmentedControl
        options={[
          { value: 'gallery' as const, label: 'Gallery' },
          { value: 'upload' as const, label: 'Upload' },
          { value: 'url' as const, label: 'URL' },
        ]}
        value={artTab}
        onChange={setArtTab}
        isDark={isDark}
        size="sm"
      />

      {/* Upload tab */}
      {artTab === 'upload' && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className={`w-full py-6 rounded-lg border-2 border-dashed transition-colors flex flex-col items-center gap-1 ${
              isDark
                ? 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400'
                : 'border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-500'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M10 4v12M4 10h12" />
            </svg>
            <span className="text-xs font-medium">Click to upload</span>
            <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>PNG, JPG, SVG up to 2MB</span>
          </button>
        </div>
      )}

      {/* URL tab */}
      {artTab === 'url' && (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <Input
              value={urlInput}
              onChange={setUrlInput}
              placeholder="Paste image URL..."
              isDark={isDark}
            />
            <button
              onClick={handleUrlLoad}
              disabled={urlLoading}
              className={`shrink-0 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                isDark
                  ? 'bg-sky-500 text-white hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500'
                  : 'bg-sky-500 text-white hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400'
              }`}
            >
              {urlLoading ? '...' : 'Load'}
            </button>
          </div>
          {urlError && (
            <p className="text-xs text-red-400">{urlError}</p>
          )}
        </div>
      )}

      {/* Gallery tab */}
      {artTab === 'gallery' && (
        <div className="grid grid-cols-4 gap-1.5">
          {stockCardArt.map((sa, i) => (
            <button
              key={i}
              onClick={() => onChange({ cardArt: sa.src })}
              className={`rounded-lg overflow-hidden transition-all hover:scale-105 flex flex-col ${
                art === sa.src
                  ? 'ring-2 ring-sky-400 ring-offset-1'
                  : `border ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`
              }`}
              title={sa.label}
            >
              <div
                className="aspect-[3/2] w-full relative"
                style={sa.src ? { background: 'linear-gradient(135deg, #1e3a5f, #2d1b4e)' } : undefined}
              >
                {sa.src ? (
                  <img
                    src={sa.src}
                    alt={sa.label}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className={`w-full h-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
                )}
              </div>
              <span className={`text-[10px] py-0.5 w-full text-center truncate ${
                isDark ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-50 text-slate-500'
              }`}>
                {sa.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
