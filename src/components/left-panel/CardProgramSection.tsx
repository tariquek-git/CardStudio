import { useState, useRef } from 'react';
import { useCardConfig } from '../../context';
import { COUNTRIES, CURRENCIES } from '../../compliance/utils';
import { WarningHint } from './constants';
import {
  Section,
  SegmentedControl,
  Toggle,
  Label,
  LabeledInput,
  Select,
  Divider,
  AdvancedToggle,
} from '../ui';
import type { BrandWarning } from '../../brandRules';
import type {
  CardType,
  CardOrientation,
  IssuerType,
  SecondaryNetwork,
} from '../../types';

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

export default function CardProgramSection({
  isDark,
  warnings,
  sectionMods,
}: {
  isDark: boolean;
  warnings: BrandWarning[];
  sectionMods: Record<string, number>;
}) {
  const { config, updateConfig, lockedFields } = useCardConfig();
  const [showProgramAdvanced, setShowProgramAdvanced] = useState(false);
  const isLocked = (field: string) => lockedFields.has(field);

  return (
    <>
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
            label={isLocked('issuingCountry') ? '🔒 Issuing Country' : 'Issuing Country'}
            value={config.issuingCountry}
            onChange={v => updateConfig({ issuingCountry: v })}
            options={COUNTRIES.map(c => ({ value: c.code, label: `${c.name}` }))}
            isDark={isDark}
            disabled={isLocked('issuingCountry')}
          />

          <Select
            label={isLocked('issuerType') ? '🔒 Issuer Type' : 'Issuer Type'}
            value={config.issuerType}
            onChange={v => updateConfig({ issuerType: v as IssuerType })}
            options={[
              { value: 'bank', label: 'Bank' },
              { value: 'credit_union', label: 'Credit Union' },
              { value: 'fintech', label: 'Fintech / BaaS' },
              { value: 'other', label: 'Other' },
            ]}
            isDark={isDark}
            disabled={isLocked('issuerType')}
          />

          <Select
            label={isLocked('currency') ? '🔒 Currency' : 'Currency'}
            value={config.currency}
            onChange={v => updateConfig({ currency: v })}
            options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} — ${c.name}` }))}
            isDark={isDark}
            disabled={isLocked('currency')}
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
    </>
  );
}
