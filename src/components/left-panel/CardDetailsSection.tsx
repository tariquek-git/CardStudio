import { useCardConfig } from '../../context';
import { WarningHint } from './constants';
import {
  Section,
  SegmentedControl,
  Toggle,
  OptionGrid,
  Label,
  LabeledInput,
  Input,
  Divider,
} from '../ui';
import type { BrandWarning } from '../../brandRules';
import type {
  CardNumberDisplay,
  NumberPosition,
} from '../../types';

export default function CardDetailsSection({
  isDark,
  warnings,
  sectionMods,
}: {
  isDark: boolean;
  warnings: BrandWarning[];
  sectionMods: Record<string, number>;
}) {
  const { config, updateConfig } = useCardConfig();

  return (
    <>
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
    </>
  );
}
