import { useState, useRef } from 'react';
import { useCardConfig } from '../../context';
import { presetColors, stockCardArt } from '../../data';
import { WarningHint } from './constants';
import {
  Section,
  SegmentedControl,
  Toggle,
  Slider,
  ColorPicker,
  OptionGrid,
  Label,
  Input,
  Divider,
  SwatchGrid,
  GradientEditor as GradientEditorUI,
} from '../ui';
import type { BrandWarning } from '../../brandRules';
import type {
  CardMaterial,
  CardArtFit,
  CardArtBlendMode,
} from '../../types';

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

export default function VisualDesignSection({
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
    </>
  );
}
