import type { ChipStyle, BackLogo } from '../../types';
import type { BrandWarning } from '../../brandRules';

export const chipStyles: { value: ChipStyle; label: string; color: string }[] = [
  { value: 'gold', label: 'Gold', color: '#D4A847' },
  { value: 'silver', label: 'Silver', color: '#C0C0C0' },
  { value: 'black', label: 'Stealth', color: '#2a2a2a' },
  { value: 'none', label: 'None', color: 'transparent' },
];

export const backLogoOptions: { value: BackLogo; label: string }[] = [
  { value: 'cirrus', label: 'Cirrus' },
  { value: 'plus', label: 'Plus' },
  { value: 'star', label: 'STAR' },
  { value: 'pulse', label: 'Pulse' },
];

export function WarningHint({
  warnings,
  field,
  isDark,
}: {
  warnings: BrandWarning[];
  field: string;
  isDark: boolean;
}) {
  const matching = warnings.filter(w => w.field === field);
  if (matching.length === 0) return null;
  return (
    <div>
      {matching.map(w => (
        <p
          key={w.id}
          className={`text-xs mt-1 ${
            w.severity === 'warning'
              ? isDark ? 'text-amber-400' : 'text-amber-600'
              : isDark ? 'text-sky-400' : 'text-sky-600'
          }`}
        >
          {w.severity === 'warning' ? '!!' : 'i'} {w.message}
        </p>
      ))}
    </div>
  );
}

// Section nav icons (tiny inline SVGs)
export const NAV_ICONS: Record<string, React.ReactNode> = {
  'card-program': <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="2" width="8" height="6" rx="1" /><path d="M1 4h8" /></svg>,
  'brand-identity': <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="5" cy="4" r="2" /><path d="M2 9a3 3 0 016 0" /></svg>,
  'visual-design': <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="5" cy="5" r="3.5" /><circle cx="5" cy="5" r="1.5" /></svg>,
  'card-details': <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 3h6M2 5h4M2 7h5" /></svg>,
  'card-features': <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="3" width="3" height="4" rx="0.5" /><path d="M7 4a1.5 1.5 0 010 3" /></svg>,
  'card-back': <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="2" width="8" height="6" rx="1" /><path d="M1 3.5h8" /></svg>,
  'compliance': <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M5 1L9 3v3c0 2-2 3-4 4C3 9 1 8 1 6V3l4-2z" /><path d="M3.5 5l1.5 1.5L7 4" /></svg>,
};
