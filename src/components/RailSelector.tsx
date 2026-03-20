import { useState, useMemo, useRef, useEffect } from 'react';
import {
  filterRails,
  getRail,
  sortedCategories,
  railCategories,
  railRegions,
} from '../rails';
import type { RailCategory, RailRegion, PaymentRailId, PaymentRail } from '../rails';

interface RailSelectorProps {
  railId: PaymentRailId;
  tier: string;
  isDark: boolean;
  onSelect: (railId: PaymentRailId, tier: string) => void;
}

export default function RailSelector({ railId, tier, isDark, onSelect }: RailSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<RailCategory>('card_network');
  const [activeRegion, setActiveRegion] = useState<RailRegion | null>(null);
  const [expandedRail, setExpandedRail] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const currentRail = getRail(railId);
  const currentTierInfo = currentRail?.tiers?.find(t => t.id === tier);
  const displayLabel = currentTierInfo
    ? `${currentRail!.shortName || currentRail!.name} · ${currentTierInfo.label}`
    : currentRail?.shortName || currentRail?.name || railId;

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [isOpen]);

  const filteredRails = useMemo(() => {
    if (search.trim()) {
      return filterRails({ search: search.trim() });
    }
    return filterRails({
      category: activeCategory,
      region: activeRegion || undefined,
    });
  }, [search, activeCategory, activeRegion]);

  // Group by category when searching
  const groupedResults = useMemo(() => {
    if (!search.trim()) return null;
    const groups = new Map<RailCategory, PaymentRail[]>();
    for (const rail of filteredRails) {
      const list = groups.get(rail.category) || [];
      list.push(rail);
      groups.set(rail.category, list);
    }
    return groups;
  }, [search, filteredRails]);

  const handleRailClick = (rail: PaymentRail) => {
    if (rail.tiers && rail.tiers.length > 0) {
      if (expandedRail === rail.id) {
        setExpandedRail(null);
      } else {
        setExpandedRail(rail.id);
      }
    } else {
      onSelect(rail.id, '');
      setIsOpen(false);
      setExpandedRail(null);
      setSearch('');
    }
  };

  const handleTierClick = (rail: PaymentRail, tierId: string) => {
    onSelect(rail.id, tierId);
    setIsOpen(false);
    setExpandedRail(null);
    setSearch('');
  };

  // Style tokens
  const triggerBg = isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300';
  const triggerText = isDark ? 'text-slate-200' : 'text-slate-800';
  const panelBg = isDark ? 'border-slate-700' : 'border-slate-200 bg-white';
  const inputBg = isDark ? 'bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-400';
  const rowHover = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100';
  const rowActive = isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-50 text-sky-700';
  const tierRowBg = isDark ? 'bg-slate-800/50' : 'bg-slate-50';
  const tierBorder = isDark ? 'border-sky-500/30' : 'border-sky-300/50';

  const regionOptions: (RailRegion | null)[] = [null, 'north_america', 'europe', 'asia_pacific', 'latin_america', 'africa', 'middle_east'];

  return (
    <div>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md border ${triggerBg} ${triggerText} transition-colors`}
      >
        {currentRail && (
          <img
            src={currentRail.logoFile}
            alt=""
            className="w-6 h-4 object-contain flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <span className="flex-1 text-left text-xs font-medium truncate">{displayLabel}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
          {currentRail ? railCategories[currentRail.category].shortName : ''}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 12 12"
          className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {/* Dropdown */}
      <div
        className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
        style={{ maxHeight: isOpen ? '600px' : '0px' }}
      >
        <div className={`mt-1 rounded-md border ${panelBg} overflow-hidden`}
          style={isDark ? { backgroundColor: '#0f1729' } : {}}
        >
          {/* Search */}
          <div className="p-2">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search rails..."
              className={`w-full px-2.5 py-1.5 text-xs rounded-md border outline-none ${inputBg}`}
            />
          </div>

          {/* Category tabs (hidden when searching) */}
          {!search.trim() && (
            <div className="flex flex-wrap gap-0.5 px-2 pb-1.5">
              {sortedCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setExpandedRail(null); }}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeCategory === cat
                      ? 'bg-sky-500 text-white'
                      : isDark
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {railCategories[cat].shortName}
                </button>
              ))}
            </div>
          )}

          {/* Region filter (hidden when searching) */}
          {!search.trim() && (
            <div className="flex flex-wrap gap-0.5 px-2 pb-2">
              {regionOptions.map(region => (
                <button
                  key={region || 'all'}
                  onClick={() => { setActiveRegion(region); setExpandedRail(null); }}
                  className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                    activeRegion === region
                      ? isDark ? 'bg-slate-600 text-slate-200' : 'bg-slate-200 text-slate-700'
                      : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {region ? railRegions[region].shortName : 'All'}
                </button>
              ))}
            </div>
          )}

          {/* Rails list */}
          <div className="max-h-[350px] overflow-y-auto">
            {search.trim() && groupedResults ? (
              // Grouped search results
              groupedResults.size === 0 ? (
                <div className={`px-3 py-4 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  No rails found for "{search}"
                </div>
              ) : (
                Array.from(groupedResults.entries()).map(([cat, rails]) => (
                  <div key={cat}>
                    <div className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500 bg-slate-800/50' : 'text-slate-400 bg-slate-50'}`}>
                      {railCategories[cat].name}
                    </div>
                    {rails.map(rail => (
                      <RailRow
                        key={rail.id}
                        rail={rail}
                        isSelected={rail.id === railId}
                        isExpanded={expandedRail === rail.id}
                        selectedTier={tier}
                        isDark={isDark}
                        rowHover={rowHover}
                        rowActive={rowActive}
                        tierRowBg={tierRowBg}
                        tierBorder={tierBorder}
                        onClick={() => handleRailClick(rail)}
                        onTierClick={(tierId) => handleTierClick(rail, tierId)}
                      />
                    ))}
                  </div>
                ))
              )
            ) : (
              // Category-filtered list
              filteredRails.length === 0 ? (
                <div className={`px-3 py-4 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  No rails in this category/region
                </div>
              ) : (
                filteredRails.map(rail => (
                  <RailRow
                    key={rail.id}
                    rail={rail}
                    isSelected={rail.id === railId}
                    isExpanded={expandedRail === rail.id}
                    selectedTier={tier}
                    isDark={isDark}
                    rowHover={rowHover}
                    rowActive={rowActive}
                    tierRowBg={tierRowBg}
                    tierBorder={tierBorder}
                    onClick={() => handleRailClick(rail)}
                    onTierClick={(tierId) => handleTierClick(rail, tierId)}
                  />
                ))
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RailRow({
  rail,
  isSelected,
  isExpanded,
  selectedTier,
  isDark,
  rowHover,
  rowActive,
  tierRowBg,
  tierBorder,
  onClick,
  onTierClick,
}: {
  rail: PaymentRail;
  isSelected: boolean;
  isExpanded: boolean;
  selectedTier: string;
  isDark: boolean;
  rowHover: string;
  rowActive: string;
  tierRowBg: string;
  tierBorder: string;
  onClick: () => void;
  onTierClick: (tierId: string) => void;
}) {
  const regionLabel = rail.country || (rail.countries ? rail.countries[0] : '');

  return (
    <div>
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
          isSelected ? rowActive : `${isDark ? 'text-slate-300' : 'text-slate-600'} ${rowHover}`
        }`}
      >
        <RailLogo rail={rail} className="w-5 h-3.5 object-contain flex-shrink-0" />
        <span className="flex-1 text-left font-medium truncate">
          {rail.shortName || rail.name}
        </span>
        {regionLabel && (
          <span className={`text-[10px] px-1 py-0.5 rounded ${isDark ? 'bg-slate-700/50 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
            {regionLabel}
          </span>
        )}
        {rail.tiers && rail.tiers.length > 0 && (
          <svg
            width="10" height="10" viewBox="0 0 12 12"
            className={`flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        )}
        {!rail.tiers && isSelected && (
          <svg width="10" height="10" viewBox="0 0 12 12" className="flex-shrink-0">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Tier sub-list */}
      {rail.tiers && rail.tiers.length > 0 && (
        <div
          className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
          style={{ maxHeight: isExpanded ? '300px' : '0px' }}
        >
          <div className={tierRowBg}>
            {rail.tiers.map(t => {
              const isTierSelected = isSelected && selectedTier === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onTierClick(t.id)}
                  className={`w-full flex items-center gap-2 pl-10 pr-3 py-1.5 text-xs transition-colors border-l-2 ${
                    isTierSelected
                      ? `${tierBorder} ${isDark ? 'text-sky-300' : 'text-sky-700'} font-medium`
                      : `border-transparent ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`
                  }`}
                >
                  <span className="flex-1 text-left">{t.fullLabel}</span>
                  {isTierSelected && (
                    <svg width="10" height="10" viewBox="0 0 12 12" className="flex-shrink-0">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RailLogo({ rail, className }: { rail: PaymentRail; className: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    // Fallback: colored circle with initials
    const initials = (rail.shortName || rail.name)
      .split(/\s+/)
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const bg = rail.defaultColors?.primary || '#6B7280';
    return (
      <div
        className={`${className} flex items-center justify-center rounded-sm text-white font-bold`}
        style={{ backgroundColor: bg, fontSize: '7px', minWidth: '20px' }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={rail.logoFile}
      alt=""
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
