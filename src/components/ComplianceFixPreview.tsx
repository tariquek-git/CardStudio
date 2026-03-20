import { useEffect, useRef } from 'react';

export interface FixChange {
  field: string;
  label: string;
  currentValue: string;
  newValue: string;
}

interface ComplianceFixPreviewProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  changes: FixChange[];
  isDark: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  chipStyle: 'Chip Style',
  contactless: 'Contactless',
  fdicInsured: 'FDIC Insured',
  ncuaInsured: 'NCUA Insured',
  secondaryNetwork: 'Secondary Network',
  dualInterfaceBadge: 'Dual Interface Badge',
  bilingualRequired: 'Bilingual Required',
  backShowMagStripe: 'Magnetic Stripe',
  backShowSignatureStrip: 'Signature Strip',
  backShowHologram: 'Hologram',
  cardType: 'Card Type',
  network: 'Network',
  orientation: 'Orientation',
  tier: 'Tier',
  issuerName: 'Issuer Name',
  cardholderName: 'Cardholder Name',
  cardNumberDisplay: 'Card Number Display',
  numberPosition: 'Number Position',
  numberless: 'Numberless',
  material: 'Material',
  colorMode: 'Color Mode',
  solidColor: 'Solid Color',
  presetColor: 'Preset Color',
  issuingCountry: 'Issuing Country',
  issuerType: 'Issuer Type',
  currency: 'Currency',
  coBrandPartner: 'Co-Brand Partner',
  cardLevelBadge: 'Card Level Badge',
  programName: 'Program Name',
  backSupportPhone: 'Support Phone',
  backSupportUrl: 'Support URL',
  backLegalText: 'Legal Text',
  issuerAddress: 'Issuer Address',
  backQrUrl: 'QR Code URL',
  binRange: 'BIN Range',
};

export function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

export function formatValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined) return '(none)';
  if (value === '') return '(empty)';
  if (Array.isArray(value)) return value.length === 0 ? '(none)' : value.join(', ');
  return String(value);
}

export default function ComplianceFixPreview({
  open,
  onClose,
  onApply,
  changes,
  isDark,
}: ComplianceFixPreviewProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={dialogRef}
        className={`relative z-10 w-full max-w-md mx-4 rounded-xl border shadow-2xl ${
          isDark
            ? 'bg-slate-900 border-slate-700'
            : 'bg-white border-slate-200'
        }`}
      >
        {/* Header */}
        <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Review Compliance Fixes
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {changes.length} field{changes.length !== 1 ? 's' : ''} will be updated
          </p>
        </div>

        {/* Changes table */}
        <div className="px-4 py-3 max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                <th className="text-left font-medium pb-2 pr-2">Field</th>
                <th className="text-left font-medium pb-2 pr-2">Current</th>
                <th className="text-left font-medium pb-2"></th>
                <th className="text-left font-medium pb-2">New</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={change.field} className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <td className={`py-1.5 pr-2 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {change.label}
                  </td>
                  <td className={`py-1.5 pr-2 ${isDark ? 'text-red-400/80' : 'text-red-600'}`}>
                    {change.currentValue}
                  </td>
                  <td className={`py-1.5 px-1 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                    &rarr;
                  </td>
                  <td className={`py-1.5 ${isDark ? 'text-emerald-400/80' : 'text-emerald-600'}`}>
                    {change.newValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t flex justify-end gap-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <button
            onClick={onClose}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={() => { onApply(); onClose(); }}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              isDark
                ? 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
                : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
            }`}
          >
            Apply All
          </button>
        </div>
      </div>
    </div>
  );
}
