import { useState } from 'react';
import { useCardConfig } from '../../context';
import { chipStyles, backLogoOptions, WarningHint } from './constants';
import {
  Section,
  Toggle,
  OptionGrid,
  Label,
  Chip,
  Divider,
  AdvancedToggle,
} from '../ui';
import type { BrandWarning } from '../../brandRules';

export default function CardFeaturesSection({
  isDark,
  warnings,
  sectionMods,
}: {
  isDark: boolean;
  warnings: BrandWarning[];
  sectionMods: Record<string, number>;
}) {
  const { config, updateConfig } = useCardConfig();
  const [showFeaturesAdvanced, setShowFeaturesAdvanced] = useState(false);

  return (
    <>
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
    </>
  );
}
