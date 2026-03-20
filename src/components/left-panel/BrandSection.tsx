import { useRef } from 'react';
import { useCardConfig } from '../../context';
import { getRail, isLegacyCardNetwork } from '../../rails';
import RailSelector from '../RailSelector';
import RailFieldEditor from '../RailFieldEditor';
import {
  Section,
  Label,
  LabeledInput,
  Divider,
} from '../ui';
import type { BrandWarning } from '../../brandRules';
import type { CardNetwork } from '../../types';

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

export default function BrandSection({
  isDark,
  warnings,
  sectionMods,
}: {
  isDark: boolean;
  warnings: BrandWarning[];
  sectionMods: Record<string, number>;
}) {
  const { config, updateConfig, lockedFields } = useCardConfig();
  const isLocked = (field: string) => lockedFields.has(field);

  return (
    <>
      <div id="section-brand-identity">
      <Section title="Brand Identity" defaultOpen={true} isDark={isDark} badge={sectionMods['brand-identity'] > 0 ? `${sectionMods['brand-identity']} set` : undefined}>
        <div className="space-y-4">
          {sectionMods['brand-identity'] === 0 && (
            <p className={`text-xs -mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Add your brand name and logo</p>
          )}
          {isLocked('issuerName') && (
            <p className={`text-xs -mt-1 px-2 py-1 rounded ${isDark ? 'bg-sky-500/10 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
              Shared fields are managed by the program
            </p>
          )}
          <LabeledInput
            label={isLocked('issuerName') ? '🔒 Issuer Name' : 'Issuer Name'}
            value={config.issuerName}
            onChange={v => updateConfig({ issuerName: v.slice(0, 30) })}
            placeholder="e.g. Maple Financial"
            maxLength={30}
            isDark={isDark}
            disabled={isLocked('issuerName')}
          />
          {!isLocked('issuerLogo') && (
          <IssuerLogoUpload
            logo={config.issuerLogo}
            onChange={issuerLogo => updateConfig({ issuerLogo })}
            isDark={isDark}
          />
          )}
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
            <Label isDark={isDark}>{isLocked('railId') ? '🔒 Payment Rail' : 'Payment Rail'}</Label>
            {isLocked('railId') ? (
              <p className={`text-xs px-3 py-2 rounded-lg ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                {config.railId} — managed by program
              </p>
            ) : (
              <RailSelector
                railId={config.railId}
                tier={config.tier}
                isDark={isDark}
                onSelect={(railId, tier) => {
                  const network = isLegacyCardNetwork(railId) ? railId as CardNetwork : config.network;
                  updateConfig({ railId, tier, network });
                }}
              />
            )}
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
    </>
  );
}
