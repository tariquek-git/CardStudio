import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';

// ─── TOGGLE SWITCH ─────────────────────────────────────────
// Modern iOS-style pill toggle
export function Toggle({
  checked,
  onChange,
  label,
  sublabel,
  isDark,
  size = 'md',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  sublabel?: string;
  isDark: boolean;
  size?: 'sm' | 'md';
}) {
  const w = size === 'sm' ? 32 : 40;
  const h = size === 'sm' ? 18 : 22;
  const dot = size === 'sm' ? 14 : 18;
  const pad = 2;

  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none group">
      <button
        role="switch"
        type="button"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
        style={{
          width: w,
          height: h,
          background: checked
            ? '#0ea5e9'
            : isDark ? '#334155' : '#cbd5e1',
        }}
      >
        <span
          className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm transition-all duration-200"
          style={{
            width: dot,
            height: dot,
            left: checked ? w - dot - pad : pad,
          }}
        />
      </button>
      {(label || sublabel) && (
        <div className="min-w-0">
          {label && (
            <span className={`text-xs font-medium ${isDark ? 'text-slate-300 group-hover:text-slate-200' : 'text-slate-600 group-hover:text-slate-700'}`}>
              {label}
            </span>
          )}
          {sublabel && (
            <span className={`block text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {sublabel}
            </span>
          )}
        </div>
      )}
    </label>
  );
}

// ─── SEGMENTED CONTROL ─────────────────────────────────────
// Modern pill-shaped option group with sliding indicator
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  isDark,
  size = 'md',
  fullWidth = true,
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  isDark: boolean;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const idx = options.findIndex(o => o.value === value);
    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>('[data-seg-btn]');
    const btn = buttons[idx];
    if (btn) {
      setIndicator({
        left: btn.offsetLeft,
        width: btn.offsetWidth,
      });
    }
  }, [value, options]);

  const py = size === 'sm' ? 'py-1' : 'py-1.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-xs';

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center rounded-lg p-0.5 ${fullWidth ? 'w-full' : 'w-fit'} ${
        isDark ? 'bg-slate-800/80' : 'bg-slate-100'
      }`}
    >
      {/* Sliding indicator */}
      <div
        className="absolute top-0.5 rounded-md transition-all duration-200 ease-out shadow-sm"
        style={{
          left: indicator.left,
          width: indicator.width,
          height: 'calc(100% - 4px)',
          background: isDark ? '#0ea5e9' : '#ffffff',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
        }}
      />

      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          data-seg-btn
          onClick={() => onChange(opt.value)}
          className={`relative z-10 ${py} px-3 ${textSize} font-medium rounded-md transition-colors duration-200 ${fullWidth ? 'flex-1' : ''} flex items-center justify-center gap-1.5 ${
            value === opt.value
              ? isDark ? 'text-white' : 'text-slate-900'
              : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-600'
          }`}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── SLIDER ────────────────────────────────────────────────
// Styled range slider with optional value display
export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  suffix = '',
  isDark,
  showValue = true,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  label?: string;
  suffix?: string;
  isDark: boolean;
  showValue?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {label}
            </span>
          )}
          {showValue && (
            <span className={`text-xs font-mono tabular-nums ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {value}{suffix}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${pct}%, ${isDark ? '#334155' : '#e2e8f0'} ${pct}%, ${isDark ? '#334155' : '#e2e8f0'} 100%)`,
        }}
      />
    </div>
  );
}

// ─── COLLAPSIBLE SECTION ───────────────────────────────────
// Smooth expand/collapse with header badge
export function Section({
  title,
  badge,
  children,
  defaultOpen = true,
  isDark,
  indent = true,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  isDark: boolean;
  indent?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`${isDark ? 'border-slate-700/40' : 'border-slate-200/80'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between py-3 ${indent ? 'px-4' : 'px-0'} group transition-colors ${
          isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`border-l-2 pl-2 text-xs font-semibold uppercase tracking-widest ${
            isDark ? 'text-slate-400 border-sky-500/50' : 'text-slate-500 border-sky-400/50'
          }`}>
            {title}
          </span>
          {badge !== undefined && badge !== null && (
            typeof badge === 'object' ? badge : (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-500'
              }`}>
                {badge}
              </span>
            )
          )}
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''} ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
        style={{ maxHeight: open ? '2000px' : '0px', opacity: open ? 1 : 0 }}
      >
        <div className={`${indent ? 'px-4' : 'px-0'} pb-4`}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── COLOR PICKER POPOVER ──────────────────────────────────
// Rich color picker: swatch grid + hex input + HSL spectrum
const QUICK_COLORS = [
  '#0F172A', '#1E293B', '#334155', '#475569', '#64748B',
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
  '#FFFFFF', '#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1',
];

export function ColorPicker({
  color,
  onChange,
  label,
  isDark,
}: {
  color: string;
  onChange: (c: string) => void;
  label?: string;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(color);
  const ref = useRef<HTMLDivElement>(null);

  // Sync local hex when color prop changes
  useEffect(() => {
    queueMicrotask(() => setHex(color));
  }, [color]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const commitHex = (v: string) => {
    const cleaned = v.startsWith('#') ? v : `#${v}`;
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
      onChange(cleaned);
    }
  };

  return (
    <div ref={ref} className="relative">
      {label && (
        <span className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {label}
        </span>
      )}
      <div className="flex items-center gap-2">
        {/* Swatch trigger */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-105 focus-visible:ring-2 focus-visible:ring-sky-400 ${
            isDark ? 'border-slate-600' : 'border-slate-300'
          } ${open ? 'ring-2 ring-sky-400' : ''}`}
          style={{ background: color }}
        />
        {/* Hex input */}
        <input
          type="text"
          value={hex}
          onChange={e => setHex(e.target.value)}
          onBlur={() => commitHex(hex)}
          onKeyDown={e => e.key === 'Enter' && commitHex(hex)}
          className={`flex-1 px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/50 ${
            isDark
              ? 'bg-slate-800 border-slate-600 text-slate-200'
              : 'bg-white border-slate-300 text-slate-700'
          }`}
          maxLength={7}
        />
      </div>

      {/* Popover */}
      {open && (
        <div className={`absolute left-0 top-full mt-2 z-50 p-3 rounded-xl shadow-xl border ${
          isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
        }`} style={{ width: 232 }}>
          {/* Spectrum input (native, well-styled) */}
          <div className="mb-3">
            <input
              type="color"
              value={color}
              onChange={e => { onChange(e.target.value); setHex(e.target.value); }}
              className="w-full h-32 rounded-lg cursor-pointer"
              style={{ padding: 0, border: 'none' }}
            />
          </div>
          {/* Quick swatches */}
          <div className="grid grid-cols-5 gap-1.5">
            {QUICK_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { onChange(c); setHex(c); }}
                className={`w-full aspect-square rounded-md border transition-all hover:scale-110 ${
                  color.toLowerCase() === c.toLowerCase()
                    ? 'ring-2 ring-sky-400 ring-offset-1'
                    : ''
                } ${isDark ? 'border-slate-600' : 'border-slate-200'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OPTION GRID ───────────────────────────────────────────
// Grid of selectable cards/chips (for materials, positions, etc.)
export function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  isDark,
  columns = 4,
}: {
  options: { value: T; label: string; icon?: ReactNode; color?: string; preview?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  isDark: boolean;
  columns?: number;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {options.map(opt => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-lg text-xs font-medium transition-all ${
              selected
                ? isDark
                  ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/50'
                  : 'bg-sky-50 text-sky-600 ring-1 ring-sky-300'
                : isDark
                  ? 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300 hover:-translate-y-px hover:shadow-sm'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-600 hover:-translate-y-px hover:shadow-sm'
            }`}
          >
            {opt.preview}
            {opt.color && (
              <span
                className="w-4 h-4 rounded-full border"
                style={{
                  background: opt.color,
                  borderColor: isDark ? '#475569' : '#d1d5db',
                }}
              />
            )}
            {opt.icon}
            <span className="truncate w-full text-center">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── LABEL ─────────────────────────────────────────────────
export function Label({ children, isDark }: { children: ReactNode; isDark: boolean }) {
  return (
    <span className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
      {children}
    </span>
  );
}

// ─── INPUT ─────────────────────────────────────────────────
export function Input({
  value,
  onChange,
  placeholder,
  maxLength,
  isDark,
  uppercase = false,
  mono = false,
  className: extraClass = '',
  inputMode,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  isDark: boolean;
  uppercase?: boolean;
  mono?: boolean;
  className?: string;
  inputMode?: 'numeric' | 'text';
  disabled?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      disabled={disabled}
      className={`w-full px-3.5 py-2.5 text-xs rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/50 ${
        mono ? 'font-mono' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
        isDark
          ? 'bg-slate-800/70 border-transparent text-slate-200 placeholder:text-slate-600 hover:bg-slate-800 focus:bg-slate-800 focus:border-sky-500/40'
          : 'bg-slate-50 border-transparent text-slate-700 placeholder:text-slate-400 hover:bg-slate-100 focus:bg-white focus:border-sky-300'
      } ${extraClass}`}
    />
  );
}

// ─── INLINE INPUT WITH LABEL ───────────────────────────────
export function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  isDark,
  uppercase = false,
  mono = false,
  hint,
  inputMode,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  isDark: boolean;
  uppercase?: boolean;
  mono?: boolean;
  hint?: ReactNode;
  inputMode?: 'numeric' | 'text';
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label isDark={isDark}>{label}</Label>
        {maxLength && (
          <span className={`text-xs tabular-nums ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        isDark={isDark}
        uppercase={uppercase}
        mono={mono}
        inputMode={inputMode}
        disabled={disabled}
      />
      {hint}
    </div>
  );
}

// ─── DIVIDER ───────────────────────────────────────────────
export function Divider({ isDark }: { isDark: boolean }) {
  return <div className={`h-px my-2 ${isDark ? 'bg-slate-700/40' : 'bg-slate-200/80'}`} />;
}

// ─── COLOR SWATCH GRID ─────────────────────────────────────
// For preset color selection
export function SwatchGrid({
  colors,
  selected,
  onSelect,
  isDark,
}: {
  colors: { key: string; value: string; gradient?: [string, string] }[];
  selected: string;
  onSelect: (key: string) => void;
  isDark: boolean;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {colors.map(c => {
        const bg = c.gradient
          ? `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})`
          : c.value;
        const isSelected = c.key === selected;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelect(c.key)}
            className={`aspect-square rounded-lg transition-all hover:scale-105 ${
              isSelected
                ? 'ring-2 ring-sky-400 ring-offset-2 scale-105'
                : `border ${isDark ? 'border-slate-600' : 'border-slate-200'}`
            }`}
            style={{
              background: bg,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── ICON BUTTON ───────────────────────────────────────────
export function IconButton({
  onClick,
  isDark,
  title,
  children,
  active = false,
  size = 'md',
}: {
  onClick: () => void;
  isDark: boolean;
  title: string;
  children: ReactNode;
  active?: boolean;
  size?: 'sm' | 'md';
}) {
  const s = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`${s} flex items-center justify-center rounded-lg transition-all active:scale-95 ${
        active
          ? 'bg-sky-500 text-white shadow-sm'
          : isDark
            ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

// ─── DROPDOWN SELECT ───────────────────────────────────────
export function Select<T extends string>({
  value,
  onChange,
  options,
  isDark,
  label,
  disabled = false,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  isDark: boolean;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      {label && <Label isDark={isDark}>{label}</Label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        disabled={disabled}
        className={`w-full px-3.5 py-2.5 text-xs rounded-lg border transition-colors appearance-none cursor-pointer bg-no-repeat focus:outline-none focus:ring-2 focus:ring-sky-400/50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
          isDark
            ? 'bg-slate-800/70 border-transparent text-slate-200 hover:bg-slate-800 focus:bg-slate-800 focus:border-sky-500/40'
            : 'bg-slate-50 border-transparent text-slate-700 hover:bg-slate-100 focus:bg-white focus:border-sky-300'
        }`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='%2394a3b8' stroke-width='1.5'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5'/%3E%3C/svg%3E")`,
          backgroundPosition: 'right 8px center',
          paddingRight: '28px',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── THUMBNAIL GRID ────────────────────────────────────────
// For card art gallery / template selection
export function ThumbnailGrid({
  items,
  selected,
  onSelect,
  isDark,
  columns = 4,
  aspectRatio = '3/2',
}: {
  items: { key: string; src?: string; label?: string; preview?: ReactNode }[];
  selected?: string;
  onSelect: (key: string) => void;
  isDark: boolean;
  columns?: number;
  aspectRatio?: string;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {items.map(item => {
        const isSelected = item.key === selected;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            className={`relative rounded-lg overflow-hidden transition-all hover:scale-[1.03] hover:shadow-md ${
              isSelected
                ? 'ring-2 ring-sky-400 ring-offset-1'
                : `border ${isDark ? 'border-slate-700' : 'border-slate-200'}`
            }`}
            style={{
              aspectRatio,
            }}
          >
            {item.src ? (
              <img src={item.src} alt={item.label || ''} className="w-full h-full object-cover" />
            ) : item.preview ? (
              item.preview
            ) : (
              <div className={`w-full h-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── GRADIENT EDITOR ───────────────────────────────────────
export function GradientEditor({
  stops,
  angle,
  onStopsChange,
  onAngleChange,
  isDark,
}: {
  stops: { color: string; position: number }[];
  angle: number;
  onStopsChange: (stops: { color: string; position: number }[]) => void;
  onAngleChange: (angle: number) => void;
  isDark: boolean;
}) {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const gradient = `linear-gradient(90deg, ${sorted.map(s => `${s.color} ${s.position}%`).join(', ')})`;

  const updateStop = (idx: number, field: 'color' | 'position', val: string | number) => {
    const next = [...stops];
    if (field === 'color') next[idx] = { ...next[idx], color: val as string };
    else next[idx] = { ...next[idx], position: val as number };
    onStopsChange(next);
  };

  return (
    <div className="space-y-3">
      {/* Preview bar */}
      <div className="h-8 rounded-lg" style={{ background: gradient }} />

      {/* Stops */}
      {stops.map((stop, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="color"
            value={stop.color}
            onChange={e => updateStop(i, 'color', e.target.value)}
            className="w-7 h-7 rounded-md cursor-pointer shrink-0"
          />
          <input
            type="range"
            min={0}
            max={100}
            value={stop.position}
            onChange={e => updateStop(i, 'position', Number(e.target.value))}
            className="flex-1 h-1"
            style={{
              background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${stop.position}%, ${isDark ? '#334155' : '#e2e8f0'} ${stop.position}%, ${isDark ? '#334155' : '#e2e8f0'} 100%)`,
            }}
          />
          <span className={`text-xs font-mono w-8 text-right ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {stop.position}%
          </span>
          {stops.length > 2 && (
            <button
              type="button"
              onClick={() => onStopsChange(stops.filter((_, j) => j !== i))}
              className={`text-xs p-1 rounded hover:bg-red-500/10 ${isDark ? 'text-slate-600 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2l6 6M8 2l-6 6" />
              </svg>
            </button>
          )}
        </div>
      ))}

      {/* Add stop */}
      {stops.length < 4 && (
        <button
          type="button"
          onClick={() => onStopsChange([...stops, { color: '#6366f1', position: 50 }])}
          className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${
            isDark ? 'text-sky-400 hover:bg-sky-500/10' : 'text-sky-600 hover:bg-sky-50'
          }`}
        >
          + Add color stop
        </button>
      )}

      {/* Angle */}
      <Slider
        value={angle}
        onChange={onAngleChange}
        min={0}
        max={360}
        label="Angle"
        suffix="°"
        isDark={isDark}
      />
    </div>
  );
}

// ─── EMPTY STATE ───────────────────────────────────────────
export function EmptyState({
  icon,
  message,
  isDark,
}: {
  icon: ReactNode;
  message: string;
  isDark: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
      <div className="mb-2">{icon}</div>
      <p className="text-xs text-center">{message}</p>
    </div>
  );
}

// ─── CHIP / TAG ────────────────────────────────────────────
export function Chip({
  label,
  active,
  onClick,
  isDark,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  isDark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
        active
          ? isDark
            ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/50'
            : 'bg-sky-50 text-sky-600 ring-1 ring-sky-300'
          : isDark
            ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

// ─── SECTION NAVIGATOR ────────────────────────────────────

export interface SectionNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  modCount: number;
  hasError?: boolean;
}

export function SectionNav({
  items,
  activeId,
  isDark,
  onJump,
}: {
  items: SectionNavItem[];
  activeId: string | null;
  isDark: boolean;
  onJump: (id: string) => void;
}) {
  return (
    <div className={`flex items-center gap-1 px-3 py-1.5 overflow-x-auto scrollbar-thin ${
      isDark ? 'border-b border-slate-700/30' : 'border-b border-slate-200/80'
    }`}>
      {items.map(item => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => onJump(item.id)}
            className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all whitespace-nowrap active:scale-95 ${
              active
                ? isDark
                  ? 'bg-sky-500/15 text-sky-400'
                  : 'bg-sky-50 text-sky-600'
                : isDark
                  ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title={item.label}
          >
            {item.icon}
            <span className="hidden sm:inline">{item.label}</span>
            {item.hasError && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
            )}
            {!item.hasError && item.modCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sky-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── CONFIRM DIALOG ──────────────────────────────────────

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  confirmDestructive = true,
  onConfirm,
  onCancel,
  isDark,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDark: boolean;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full max-w-sm rounded-xl border shadow-2xl p-5 ${
          isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
        }`}
      >
        <h3 className={`text-sm font-semibold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{title}</h3>
        <p className={`text-xs mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-medium rounded-lg text-white transition-colors active:scale-[0.97] ${
              confirmDestructive
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                : 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── VALIDATED INPUT ─────────────────────────────────────

export type ValidationRule = {
  test: (value: string) => boolean;
  message: string;
};

export function ValidatedInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  isDark,
  uppercase = false,
  mono = false,
  rules = [],
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  isDark: boolean;
  uppercase?: boolean;
  mono?: boolean;
  rules?: ValidationRule[];
  inputMode?: 'numeric' | 'text' | 'tel' | 'url';
}) {
  const [touched, setTouched] = useState(false);

  const error = touched && value.length > 0
    ? rules.find(r => !r.test(value))?.message ?? null
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label isDark={isDark}>{label}</Label>
        {maxLength && (
          <span className={`text-xs tabular-nums ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        isDark={isDark}
        uppercase={uppercase}
        mono={mono}
        inputMode={inputMode as 'numeric' | 'text'}
        className={error ? (isDark ? 'border-red-500/60 ring-1 ring-red-500/30' : 'border-red-400 ring-1 ring-red-300/50') : ''}
      />
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
      {!touched && <input type="hidden" onFocus={() => setTouched(true)} />}
      {/* trigger touch on blur of the actual input above — handled via wrapping */}
    </div>
  );
}

// ─── LOADING SPINNER ─────────────────────────────────────

export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.2" />
      <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── useConfirm hook ─────────────────────────────────────

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    destructive: boolean;
    resolve: ((v: boolean) => void) | null;
  }>({ open: false, title: '', message: '', confirmLabel: 'Confirm', destructive: true, resolve: null });

  const confirm = useCallback((opts: { title: string; message: string; confirmLabel?: string; destructive?: boolean }): Promise<boolean> => {
    return new Promise(resolve => {
      setState({
        open: true,
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? 'Delete',
        destructive: opts.destructive ?? true,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState(s => ({ ...s, open: false, resolve: null }));
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState(s => ({ ...s, open: false, resolve: null }));
  }, [state.resolve]);

  return { confirm, dialogProps: { ...state, onConfirm: handleConfirm, onCancel: handleCancel } };
}

// ─── ADVANCED TOGGLE ──────────────────────────────────────

export function AdvancedToggle({
  open,
  onToggle,
  isDark,
  label = 'More options',
  children,
}: {
  open: boolean;
  onToggle: () => void;
  isDark: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
          isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 8 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        >
          <path d="M2.5 1L5.5 4L2.5 7" />
        </svg>
        {label}
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: open ? '1200px' : '0px' }}
      >
        <div className={`mt-3 space-y-4 pl-3 ${
          isDark ? 'border-l-2 border-slate-700/50' : 'border-l-2 border-slate-200'
        }`}>
          {children}
        </div>
      </div>
    </div>
  );
}
