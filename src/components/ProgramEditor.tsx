import { useState, useMemo } from 'react';
import { useCardConfig } from '../context';
import { validateCompliance } from '../compliance';
import { networkTierConfig, networkNames } from '../data';
import type { CardProgram, ProgramTier, CardMaterial, ChipStyle, CardNetwork } from '../types';

interface ProgramEditorProps {
  onBack: () => void;
  onEditTier: (programId: string, tierId: string) => void;
  onCompareAll?: (designIds: string[]) => void;
}

const materialOptions: { value: CardMaterial; label: string }[] = [
  { value: 'matte', label: 'Matte' },
  { value: 'glossy', label: 'Glossy' },
  { value: 'metal', label: 'Metal' },
  { value: 'brushedMetal', label: 'Brushed Metal' },
  { value: 'clear', label: 'Clear' },
  { value: 'holographic', label: 'Holographic' },
  { value: 'recycledPlastic', label: 'Recycled Plastic' },
  { value: 'wood', label: 'Wood' },
];

const chipStyleOptions: { value: ChipStyle; label: string }[] = [
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'black', label: 'Black' },
  { value: 'none', label: 'None' },
];

const issuerTypeOptions = [
  { value: 'bank', label: 'Bank' },
  { value: 'credit_union', label: 'Credit Union' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'other', label: 'Other' },
];

interface ComplianceSummary {
  tierName: string;
  score: number;
  errors: number;
  warnings: number;
}

export default function ProgramEditor({ onBack, onEditTier, onCompareAll }: ProgramEditorProps) {
  const {
    config,
    designs,
    activeProgram,
    updateProgram,
    duplicateProgram,
    deleteProgram,
    addTier,
    removeTier,
  } = useCardConfig();

  const isDark = config.darkMode;

  // Inline editing state for program name
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  // Add tier form state
  const [showAddTier, setShowAddTier] = useState(false);
  const [newTierName, setNewTierName] = useState('');
  const [newTierNetworkTier, setNewTierNetworkTier] = useState('');
  const [newTierMaterial, setNewTierMaterial] = useState<CardMaterial>('matte');
  const [newTierChipStyle, setNewTierChipStyle] = useState<ChipStyle>('gold');

  // Inline editing state for tier names
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierNameDraft, setTierNameDraft] = useState('');

  // Compliance summary
  const [complianceResults, setComplianceResults] = useState<ComplianceSummary[] | null>(null);
  const [showComplianceModal, setShowComplianceModal] = useState(false);

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── Guard clause ──
  if (!activeProgram) {
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <svg className="w-12 h-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
        <p className="text-sm font-medium">No program selected</p>
        <button
          onClick={onBack}
          className={`px-3 py-2 text-xs font-medium rounded-lg ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'} transition-colors`}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const program = activeProgram;
  const networkTiers = networkTierConfig[program.network] ?? [];

  // Resolve tier thumbnails
  const tierDesignMap = useMemo(() => {
    const map = new Map<string, { thumbnail: string; name: string }>();
    for (const tier of program.tiers) {
      const design = designs.find(d => d.id === tier.cardConfigId);
      if (design) {
        map.set(tier.id, { thumbnail: design.thumbnail, name: design.name });
      }
    }
    return map;
  }, [program.tiers, designs]);

  // Get the full label for a network tier id
  const getTierFullLabel = (tierId: string): string => {
    const info = networkTiers.find(t => t.id === tierId);
    return info?.fullLabel ?? tierId;
  };

  // ── Handlers ──

  const startEditingName = () => {
    setNameDraft(program.name);
    setEditingName(true);
  };

  const saveName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== program.name) {
      updateProgram(program.id, { name: trimmed });
    }
    setEditingName(false);
  };

  const cancelEditName = () => {
    setEditingName(false);
  };

  const startEditingTierName = (tier: ProgramTier) => {
    setTierNameDraft(tier.name);
    setEditingTierId(tier.id);
  };

  const saveTierName = (tier: ProgramTier) => {
    const trimmed = tierNameDraft.trim();
    if (trimmed && trimmed !== tier.name) {
      const updatedTiers = program.tiers.map(t =>
        t.id === tier.id ? { ...t, name: trimmed } : t
      );
      updateProgram(program.id, { tiers: updatedTiers } as Partial<CardProgram>);
    }
    setEditingTierId(null);
  };

  const cancelEditTierName = () => {
    setEditingTierId(null);
  };

  const handleAddTier = () => {
    if (!newTierName.trim()) return;
    const tierValue = newTierNetworkTier || (networkTiers.length > 0 ? networkTiers[0].id : '');
    addTier(program.id, newTierName.trim(), tierValue, newTierMaterial, newTierChipStyle);
    setNewTierName('');
    setNewTierNetworkTier('');
    setNewTierMaterial('matte');
    setNewTierChipStyle('gold');
    setShowAddTier(false);
  };

  const handleDuplicate = () => {
    duplicateProgram(program.id);
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteProgram(program.id);
    onBack();
  };

  const handleBatchCompliance = () => {
    const results: ComplianceSummary[] = program.tiers.map(tier => {
      const design = designs.find(d => d.id === tier.cardConfigId);
      if (!design) {
        return { tierName: tier.name, score: 0, errors: 0, warnings: 0 };
      }
      const result = validateCompliance(design.config);
      return {
        tierName: tier.name,
        score: result.score,
        errors: result.errors.length,
        warnings: result.warnings.length,
      };
    });
    setComplianceResults(results);
    setShowComplianceModal(true);
  };

  const handleCompareAll = () => {
    if (onCompareAll) {
      const configIds = program.tiers.map(t => t.cardConfigId);
      onCompareAll(configIds);
    }
  };

  const overallAvgScore = complianceResults
    ? Math.round(complianceResults.reduce((sum, r) => sum + r.score, 0) / complianceResults.length)
    : 0;

  // ── Shared styles ──
  const inputCls = `w-full px-3 py-2 text-xs rounded-lg border transition-colors outline-none focus:ring-1 focus:ring-sky-500/50 ${
    isDark
      ? 'bg-slate-700/50 border-slate-600/50 text-slate-200 placeholder-slate-500'
      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
  }`;
  const labelCls = `block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;
  const cardCls = `rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700/40' : 'bg-white border-slate-200'}`;
  const btnPrimary = 'px-3 py-2 text-xs font-medium rounded-lg bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:from-sky-600 hover:to-sky-700 transition-all';
  const btnSecondary = `px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
    isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
  }`;
  const sectionHeader = `text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`;
  const badgeCls = `inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
    isDark ? 'bg-slate-700/70 text-slate-300' : 'bg-slate-100 text-slate-600'
  }`;

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      {/* ── Header Bar ── */}
      <div className={`flex items-center gap-3 px-5 py-3 border-b shrink-0 ${isDark ? 'border-slate-700/60 bg-slate-800/80' : 'border-slate-200 bg-white'}`}>
        <button
          onClick={onBack}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
            isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Dashboard
        </button>

        <div className="flex-1 flex items-center justify-center">
          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveName();
                if (e.key === 'Escape') cancelEditName();
              }}
              onBlur={saveName}
              className={`text-lg font-bold text-center bg-transparent border-b-2 border-sky-500 outline-none px-2 py-0.5 ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            />
          ) : (
            <button
              onClick={startEditingName}
              className={`text-lg font-bold hover:opacity-70 transition-opacity cursor-text ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
              title="Click to rename"
            >
              {program.name}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleDuplicate} className={btnSecondary} title="Duplicate program">
            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
            </svg>
            Duplicate
          </button>
          <button
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              confirmDelete
                ? 'bg-red-600 text-white hover:bg-red-700'
                : isDark
                  ? 'bg-slate-700 text-red-400 hover:bg-red-900/40'
                  : 'bg-slate-200 text-red-600 hover:bg-red-50'
            }`}
            title="Delete program"
          >
            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            {confirmDelete ? 'Confirm Delete' : 'Delete'}
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel: Shared Settings ── */}
        <div className={`w-80 shrink-0 border-r overflow-y-auto p-5 space-y-4 ${isDark ? 'border-slate-700/60' : 'border-slate-200'}`}>
          <h3 className={sectionHeader}>Shared Settings</h3>
          <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            These fields are shared across all tiers in this program.
          </p>

          <div>
            <label className={labelCls}>Issuer Name</label>
            <input
              type="text"
              value={program.issuerName}
              onChange={e => updateProgram(program.id, { issuerName: e.target.value })}
              className={inputCls}
              placeholder="e.g., Chase, Capital One"
            />
          </div>

          <div>
            <label className={labelCls}>Network</label>
            <select
              value={program.network}
              onChange={e => updateProgram(program.id, { network: e.target.value as CardNetwork, railId: e.target.value })}
              className={inputCls}
            >
              {(Object.keys(networkNames) as CardNetwork[]).map(key => (
                <option key={key} value={key}>{networkNames[key]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Issuing Country</label>
            <input
              type="text"
              value={program.issuingCountry}
              onChange={e => updateProgram(program.id, { issuingCountry: e.target.value.toUpperCase().slice(0, 2) })}
              className={inputCls}
              placeholder="US"
              maxLength={2}
            />
          </div>

          <div>
            <label className={labelCls}>Issuer Type</label>
            <select
              value={program.issuerType}
              onChange={e => updateProgram(program.id, { issuerType: e.target.value as CardProgram['issuerType'] })}
              className={inputCls}
            >
              {issuerTypeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Currency</label>
            <input
              type="text"
              value={program.currency}
              onChange={e => updateProgram(program.id, { currency: e.target.value.toUpperCase().slice(0, 3) })}
              className={inputCls}
              placeholder="USD"
              maxLength={3}
            />
          </div>

          <div>
            <label className={labelCls}>Brand Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={program.brandColor}
                onChange={e => updateProgram(program.id, { brandColor: e.target.value })}
                className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={program.brandColor}
                onChange={e => {
                  const v = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                    updateProgram(program.id, { brandColor: v });
                  }
                }}
                className={inputCls}
                placeholder="#0EA5E9"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Brand Accent</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={program.brandAccent}
                onChange={e => updateProgram(program.id, { brandAccent: e.target.value })}
                className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={program.brandAccent}
                onChange={e => {
                  const v = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                    updateProgram(program.id, { brandAccent: v });
                  }
                }}
                className={inputCls}
                placeholder="#6366F1"
              />
            </div>
          </div>
        </div>

        {/* ── Right Panel: Tier Grid ── */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className={sectionHeader}>
              Tier Cards
              <span className={`ml-2 text-xs font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                ({program.tiers.length} tier{program.tiers.length !== 1 ? 's' : ''})
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Tier cards */}
            {program.tiers.map(tier => {
              const designInfo = tierDesignMap.get(tier.id);
              const isEditingTier = editingTierId === tier.id;
              return (
                <div key={tier.id} className={`${cardCls} flex flex-col overflow-hidden group`}>
                  {/* Thumbnail */}
                  <div className={`relative aspect-[1.586/1] ${isDark ? 'bg-slate-700/30' : 'bg-slate-100'}`}>
                    {designInfo?.thumbnail ? (
                      <img
                        src={designInfo.thumbnail}
                        alt={tier.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Tier info */}
                  <div className="p-3 flex flex-col gap-2">
                    {/* Tier name (editable) */}
                    {isEditingTier ? (
                      <input
                        autoFocus
                        value={tierNameDraft}
                        onChange={e => setTierNameDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveTierName(tier);
                          if (e.key === 'Escape') cancelEditTierName();
                        }}
                        onBlur={() => saveTierName(tier)}
                        className={`text-sm font-semibold bg-transparent border-b border-sky-500 outline-none px-0 py-0.5 ${
                          isDark ? 'text-slate-100' : 'text-slate-900'
                        }`}
                      />
                    ) : (
                      <button
                        onClick={() => startEditingTierName(tier)}
                        className={`text-sm font-semibold text-left hover:opacity-70 transition-opacity cursor-text truncate ${
                          isDark ? 'text-slate-100' : 'text-slate-900'
                        }`}
                        title="Click to rename tier"
                      >
                        {tier.name}
                      </button>
                    )}

                    {/* Network tier badge */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isDark ? 'bg-sky-900/40 text-sky-300' : 'bg-sky-50 text-sky-700'
                      }`}>
                        {getTierFullLabel(tier.tier)}
                      </span>
                      <span className={badgeCls}>
                        {materialOptions.find(m => m.value === tier.material)?.label ?? tier.material}
                      </span>
                      <span className={badgeCls}>
                        {chipStyleOptions.find(c => c.value === tier.chipStyle)?.label ?? tier.chipStyle} chip
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => onEditTier(program.id, tier.id)}
                        className={btnPrimary + ' flex-1'}
                      >
                        Edit Design
                      </button>
                      {program.tiers.length > 1 && (
                        <button
                          onClick={() => removeTier(program.id, tier.id)}
                          className={`px-2 py-2 rounded-lg text-xs transition-colors ${
                            isDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/20' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title="Remove tier"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ── Add Tier Card ── */}
            {showAddTier ? (
              <div className={`${cardCls} p-4 flex flex-col gap-3`}>
                <h4 className={sectionHeader}>New Tier</h4>

                <div>
                  <label className={labelCls}>Tier Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={newTierName}
                    onChange={e => setNewTierName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddTier();
                      if (e.key === 'Escape') setShowAddTier(false);
                    }}
                    className={inputCls}
                    placeholder="e.g., Platinum, Reserve"
                  />
                </div>

                {networkTiers.length > 0 && (
                  <div>
                    <label className={labelCls}>Network Tier</label>
                    <select
                      value={newTierNetworkTier || (networkTiers[0]?.id ?? '')}
                      onChange={e => setNewTierNetworkTier(e.target.value)}
                      className={inputCls}
                    >
                      {networkTiers.map(t => (
                        <option key={t.id} value={t.id}>{t.fullLabel}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className={labelCls}>Material</label>
                  <select
                    value={newTierMaterial}
                    onChange={e => setNewTierMaterial(e.target.value as CardMaterial)}
                    className={inputCls}
                  >
                    {materialOptions.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Chip Style</label>
                  <select
                    value={newTierChipStyle}
                    onChange={e => setNewTierChipStyle(e.target.value as ChipStyle)}
                    className={inputCls}
                  >
                    {chipStyleOptions.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <button onClick={handleAddTier} className={btnPrimary + ' flex-1'} disabled={!newTierName.trim()}>
                    Add Tier
                  </button>
                  <button onClick={() => setShowAddTier(false)} className={btnSecondary}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setNewTierNetworkTier(networkTiers[0]?.id ?? '');
                  setShowAddTier(true);
                }}
                className={`${cardCls} flex flex-col items-center justify-center gap-2 min-h-[200px] border-dashed cursor-pointer transition-colors ${
                  isDark ? 'hover:bg-slate-700/30 hover:border-slate-600' : 'hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <svg className={`w-8 h-8 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Add Tier</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className={`flex items-center justify-center gap-3 px-5 py-3 border-t shrink-0 ${isDark ? 'border-slate-700/60 bg-slate-800/80' : 'border-slate-200 bg-white'}`}>
        {onCompareAll && program.tiers.length > 1 && (
          <button onClick={handleCompareAll} className={btnSecondary}>
            <svg className="w-3.5 h-3.5 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            Compare All Tiers
          </button>
        )}
        <button onClick={handleBatchCompliance} className={btnSecondary}>
          <svg className="w-3.5 h-3.5 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Batch Compliance Check
        </button>
      </div>

      {/* ── Compliance Summary Modal ── */}
      {showComplianceModal && complianceResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowComplianceModal(false)}>
          <div
            className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Compliance Summary
              </h3>
              <button
                onClick={() => setShowComplianceModal(false)}
                className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {complianceResults.map((result, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-700/40' : 'bg-slate-50'}`}>
                  <div>
                    <p className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{result.tierName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {result.errors > 0 && (
                        <span className="text-[10px] font-medium text-red-500">{result.errors} error{result.errors !== 1 ? 's' : ''}</span>
                      )}
                      {result.warnings > 0 && (
                        <span className="text-[10px] font-medium text-amber-500">{result.warnings} warning{result.warnings !== 1 ? 's' : ''}</span>
                      )}
                      {result.errors === 0 && result.warnings === 0 && (
                        <span className="text-[10px] font-medium text-emerald-500">No issues</span>
                      )}
                    </div>
                  </div>
                  <div className={`text-lg font-bold tabular-nums ${
                    result.score >= 80 ? 'text-emerald-500' : result.score >= 50 ? 'text-amber-500' : 'text-red-500'
                  }`}>
                    {result.score}
                  </div>
                </div>
              ))}
            </div>

            <div className={`flex items-center justify-between px-5 py-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Overall Average</span>
              <span className={`text-lg font-bold tabular-nums ${
                overallAvgScore >= 80 ? 'text-emerald-500' : overallAvgScore >= 50 ? 'text-amber-500' : 'text-red-500'
              }`}>
                {overallAvgScore}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
