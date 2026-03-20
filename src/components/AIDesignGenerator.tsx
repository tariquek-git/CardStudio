import { useState, useEffect, useRef } from 'react';
import { useCardConfig } from '../context';
import { getApiKey, setApiKey, clearApiKey } from '../ai/apiKey';
import { generateDesign } from '../ai/generateDesign';
import { validateGenerated } from '../ai/validateGenerated';
import { Spinner } from './ui';
import type { CardConfig } from '../types';

interface AIDesignGeneratorProps {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  network: 'Network',
  cardType: 'Card Type',
  tier: 'Tier',
  chipStyle: 'Chip Style',
  material: 'Material',
  orientation: 'Orientation',
  colorMode: 'Color Mode',
  solidColor: 'Solid Color',
  presetColor: 'Preset Color',
  gradientConfig: 'Gradient',
  textColorOverride: 'Text Color',
  contactless: 'Contactless',
  numberless: 'Numberless',
  numberPosition: 'Number Position',
  cardArtOpacity: 'Card Art Opacity',
  cardArtBlend: 'Card Art Blend',
  cardArtFit: 'Card Art Fit',
  issuerName: 'Issuer Name',
  cardholderName: 'Cardholder Name',
  programName: 'Program Name',
  backShowMagStripe: 'Mag Stripe',
  backShowSignatureStrip: 'Signature Strip',
  backShowHologram: 'Hologram',
};

function formatValue(key: string, value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (key === 'gradientConfig' && typeof value === 'object' && value !== null) {
    const gc = value as { stops?: { color: string; position: number }[]; angle?: number };
    const stopStr = gc.stops?.map(s => s.color).join(' -> ') || '';
    return `${stopStr} at ${gc.angle || 0} deg`;
  }
  return JSON.stringify(value);
}

export default function AIDesignGenerator({ open, onClose, isDark }: AIDesignGeneratorProps) {
  const { updateConfig } = useCardConfig();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Partial<CardConfig> | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasKey(!!getApiKey());
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleGenerate = async () => {
    const apiKey = getApiKey();
    if (!apiKey || !prompt.trim()) return;

    setLoading(true);
    setError(null);
    setGenerated(null);
    setWarnings([]);

    try {
      const raw = await generateDesign(apiKey, prompt.trim());
      const { valid, warnings: w } = validateGenerated(raw);
      setGenerated(valid);
      setWarnings(w);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      if (msg.includes('401') || msg.includes('authentication') || msg.toLowerCase().includes('invalid api key')) {
        setError('Invalid API key. Please update your key in settings.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (generated) {
      updateConfig(generated);
      onClose();
    }
  };

  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    if (trimmed) {
      setApiKey(trimmed);
      setHasKey(true);
      setKeyInput('');
      setShowKeyInput(false);
    }
  };

  const handleClearKey = () => {
    clearApiKey();
    setHasKey(false);
    setKeyInput('');
  };

  if (!open) return null;

  const bg = isDark ? 'bg-slate-800' : 'bg-white';
  const border = isDark ? 'border-slate-600' : 'border-slate-200';
  const textPrimary = isDark ? 'text-slate-200' : 'text-slate-800';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const inputBg = isDark
    ? 'bg-slate-700/70 border-slate-600 text-slate-200 placeholder:text-slate-500'
    : 'bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl ${bg} ${border} overflow-hidden`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200/80'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1l1.5 4.5H14l-3.5 2.8 1.2 4.2L8 9.8l-3.7 2.7 1.2-4.2L2 5.5h4.5L8 1z" fill="white" />
              </svg>
            </div>
            <div>
              <h2 className={`text-sm font-semibold ${textPrimary}`}>AI Design Generator</h2>
              <p className={`text-xs ${textMuted}`}>Describe your card, let AI configure it</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* API Key settings gear */}
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              } ${showKeyInput ? (isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600') : ''}`}
              title="API Key Settings"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="2.5" />
                <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M3.4 12.6l.85-.85M11.75 4.25l.85-.85" />
              </svg>
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* API Key section */}
        {showKeyInput && (
          <div className={`px-5 py-3 border-b ${isDark ? 'border-slate-700/50 bg-slate-800/50' : 'border-slate-200/80 bg-slate-50/50'}`}>
            <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>
              Anthropic API Key
            </label>
            {hasKey ? (
              <div className="flex items-center gap-2">
                <span className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  Key saved
                </span>
                <button
                  onClick={handleClearKey}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'
                  }`}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                  placeholder="sk-ant-..."
                  className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/50 ${inputBg}`}
                />
                <button
                  onClick={handleSaveKey}
                  disabled={!keyInput.trim()}
                  className="px-3 py-2 text-xs font-medium rounded-lg text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
              </div>
            )}
            <p className={`text-xs mt-1.5 ${textMuted}`}>
              Your key is stored in localStorage and never leaves your browser.
            </p>
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Prompt input */}
          <div>
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="Describe your card design... e.g., &quot;A premium black metal Visa Infinite card with a subtle gold gradient and minimalist design&quot;"
              rows={3}
              className={`w-full px-3.5 py-2.5 text-xs rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/50 resize-none ${inputBg}`}
            />
            <p className={`text-xs mt-1 ${textMuted}`}>
              Press Ctrl+Enter to generate
            </p>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !hasKey || !prompt.trim()}
            className={`w-full py-2.5 text-xs font-semibold rounded-lg text-white transition-all active:scale-[0.98] ${
              loading || !hasKey || !prompt.trim()
                ? 'bg-slate-500 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-violet-500 to-sky-500 hover:from-violet-600 hover:to-sky-600 shadow-sm hover:shadow-md'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size={14} className="text-white" />
                Generating...
              </span>
            ) : !hasKey ? (
              'Set API key first (click gear icon)'
            ) : (
              'Generate Design'
            )}
          </button>

          {/* Error */}
          {error && (
            <div className={`px-3 py-2.5 rounded-lg text-xs ${
              isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {error}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className={`px-3 py-2.5 rounded-lg text-xs ${
              isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}>
              <p className="font-medium mb-1">Validation warnings:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Generated result */}
          {generated && (
            <div>
              <h3 className={`text-xs font-semibold mb-2 ${textPrimary}`}>Generated Configuration</h3>
              <div className={`rounded-lg border divide-y ${isDark ? 'border-slate-700/50 divide-slate-700/30' : 'border-slate-200 divide-slate-100'}`}>
                {Object.entries(generated).map(([key, value]) => (
                  <div key={key} className={`flex items-center justify-between px-3 py-2 text-xs`}>
                    <span className={`font-medium ${textSecondary}`}>
                      {FIELD_LABELS[key] || key}
                    </span>
                    <span className={`font-mono ${textPrimary}`}>
                      {key === 'solidColor' || key === 'textColorOverride' ? (
                        <span className="flex items-center gap-1.5">
                          <span
                            className="inline-block w-3 h-3 rounded-sm border"
                            style={{ background: String(value), borderColor: isDark ? '#475569' : '#d1d5db' }}
                          />
                          {String(value)}
                        </span>
                      ) : (
                        formatValue(key, value)
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {generated && (
          <div className={`flex items-center justify-end gap-2 px-5 py-3 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-200/80'}`}>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Regenerate
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 text-xs font-semibold rounded-lg text-white bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 shadow-sm transition-all active:scale-[0.97]"
            >
              Apply Design
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
