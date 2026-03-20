import { useState } from 'react';
import { useCardConfig } from '../context';
import { presetColors } from '../data';
import type { CardNetwork, CardType } from '../types';
import { isLegacyCardNetwork } from '../rails';

const STORAGE_KEY = 'cardstudio-onboarded';

const NETWORKS: { value: CardNetwork; label: string }[] = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'MC' },
  { value: 'amex', label: 'Amex' },
  { value: 'discover', label: 'Disc' },
  { value: 'unionpay', label: 'UPay' },
  { value: 'jcb', label: 'JCB' },
];

const CARD_TYPES: { value: CardType; label: string }[] = [
  { value: 'credit', label: 'Credit' },
  { value: 'debit', label: 'Debit' },
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'commercial', label: 'Commercial' },
];

const COLOR_PICKS = [
  { key: 'deepNavy', color: '#0F172A' },
  { key: 'matteBlack', color: '#1a1a1a' },
  { key: 'oceanGradient', color: 'linear-gradient(135deg, #0EA5E9, #6366F1)' },
  { key: 'sunsetGradient', color: 'linear-gradient(135deg, #F97316, #DC2626)' },
  { key: 'roseGold', color: '#B76E79' },
  { key: 'emerald', color: '#065F46' },
  { key: 'arcticWhite', color: '#F1F5F9' },
  { key: 'neonMint', color: '#34D399' },
];

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markOnboarded() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch { /* noop */ }
}

export default function QuickSetupBanner({ isDark }: { isDark: boolean }) {
  const { config, updateConfig } = useCardConfig();
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const steps = ['Network', 'Type', 'Color', 'Name'];

  const handleDismiss = () => {
    markOnboarded();
    setDismissed(true);
  };

  const advance = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleDismiss();
    }
  };

  const bg = isDark ? 'bg-slate-800/60 border-slate-700/40' : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-slate-200' : 'text-slate-800';
  const textSecondary = isDark ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className={`mx-3 mt-3 mb-1 rounded-xl border ${bg} overflow-hidden`}>
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <p className={`text-[12px] font-semibold ${textPrimary}`}>Design your card</p>
          <p className={`text-xs ${textSecondary}`}>Quick setup — {step + 1} of {steps.length}</p>
        </div>
        <button
          onClick={handleDismiss}
          className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${
            isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
        >
          Skip
        </button>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1 px-4 mb-3">
        {steps.map((s, i) => (
          <div key={s} className="flex-1 flex items-center gap-1.5">
            <div className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step
                ? 'bg-sky-500'
                : isDark ? 'bg-slate-700' : 'bg-slate-200'
            }`} />
            <span className={`text-[9px] font-medium ${
              i === step ? (isDark ? 'text-sky-400' : 'text-sky-600') : textSecondary
            }`}>{s}</span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="px-4 pb-3">
        {step === 0 && (
          <div className="flex flex-wrap gap-1.5">
            {NETWORKS.map(n => (
              <button
                key={n.value}
                onClick={() => {
                  const network = n.value;
                  updateConfig({ railId: network, network, tier: 'platinum' });
                  advance();
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  config.network === n.value
                    ? 'bg-sky-500 text-white'
                    : isDark
                      ? 'bg-slate-700/60 text-slate-300 hover:bg-slate-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-wrap gap-1.5">
            {CARD_TYPES.map(ct => (
              <button
                key={ct.value}
                onClick={() => {
                  updateConfig({ cardType: ct.value });
                  advance();
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  config.cardType === ct.value
                    ? 'bg-sky-500 text-white'
                    : isDark
                      ? 'bg-slate-700/60 text-slate-300 hover:bg-slate-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {ct.label}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-wrap gap-2">
            {COLOR_PICKS.map(c => {
              const preset = presetColors[c.key];
              const isGradient = preset?.gradient;
              return (
                <button
                  key={c.key}
                  onClick={() => {
                    if (isGradient) {
                      updateConfig({ colorMode: 'preset', presetColor: c.key });
                    } else {
                      updateConfig({ colorMode: 'preset', presetColor: c.key });
                    }
                    advance();
                  }}
                  className={`w-8 h-8 rounded-lg transition-all hover:scale-110 border ${
                    config.presetColor === c.key
                      ? 'ring-2 ring-sky-400 ring-offset-1'
                      : isDark ? 'border-slate-600' : 'border-slate-200'
                  }`}
                  style={{ background: c.color }}
                />
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={config.cardholderName}
              onChange={e => updateConfig({ cardholderName: e.target.value.toUpperCase().slice(0, 26) })}
              placeholder="JANE A. CARDHOLDER"
              maxLength={26}
              className={`flex-1 px-3 py-2 text-xs font-mono rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/50 ${
                isDark
                  ? 'bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-600'
                  : 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400'
              }`}
              onKeyDown={e => {
                if (e.key === 'Enter') advance();
              }}
              autoFocus
            />
            <button
              onClick={advance}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
