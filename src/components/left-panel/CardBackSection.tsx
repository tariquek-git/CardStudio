import { useState } from 'react';
import { useCardConfig } from '../../context';
import {
  Section,
  Toggle,
  Label,
  LabeledInput,
  Divider,
  AdvancedToggle,
} from '../ui';
import type { BrandWarning } from '../../brandRules';

export default function CardBackSection({
  isDark,
  warnings,
  sectionMods,
}: {
  isDark: boolean;
  warnings: BrandWarning[];
  sectionMods: Record<string, number>;
}) {
  const { config, updateConfig } = useCardConfig();
  const [showBackAdvanced, setShowBackAdvanced] = useState(false);

  return (
    <>
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
    </>
  );
}
