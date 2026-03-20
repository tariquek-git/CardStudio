import { getRail } from '../rails';
import type { PaymentRailId, RailFieldDef } from '../rails';

interface RailFieldEditorProps {
  railId: PaymentRailId;
  railFields: Record<string, string>;
  isDark: boolean;
  onChange: (fields: Record<string, string>) => void;
}

export default function RailFieldEditor({ railId, railFields, isDark, onChange }: RailFieldEditorProps) {
  const rail = getRail(railId);
  if (!rail) return null;

  // Only show fields for non-standard-card form factors, or if there are non-card fields
  // For standard cards the existing LeftPanel inputs handle PAN/expiry/CVV
  const isStandardCard = rail.cardFormFactor === 'standard_card';
  if (isStandardCard) return null;

  const fields = rail.fields.filter(f => f.position === 'front' || f.position === 'both');

  if (fields.length === 0) return null;

  const handleFieldChange = (fieldId: string, value: string) => {
    onChange({ ...railFields, [fieldId]: value });
  };

  const inputBg = isDark
    ? 'bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500'
    : 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-400';
  const labelColor = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className="space-y-2.5">
      <div className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        {rail.shortName || rail.name} Fields
      </div>

      {/* Form factor badge */}
      <div className="flex items-center gap-1.5 mb-2">
        <FormFactorBadge formFactor={rail.cardFormFactor} isDark={isDark} />
        {rail.hasQrCode && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            QR Code
          </span>
        )}
        {rail.hasChip && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            Chip
          </span>
        )}
        {rail.hasContactless && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            NFC
          </span>
        )}
      </div>

      {fields.map(field => (
        <FieldInput
          key={field.id}
          field={field}
          value={railFields[field.id] || ''}
          isDark={isDark}
          inputBg={inputBg}
          labelColor={labelColor}
          onChange={(val) => handleFieldChange(field.id, val)}
        />
      ))}
    </div>
  );
}

function FieldInput({
  field,
  value,
  isDark,
  inputBg,
  labelColor,
  onChange,
}: {
  field: RailFieldDef;
  value: string;
  isDark: boolean;
  inputBg: string;
  labelColor: string;
  onChange: (val: string) => void;
}) {
  const formatValue = (raw: string): string => {
    switch (field.format) {
      case 'swift_bic':
        return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
      case 'routing_number':
        return raw.replace(/\D/g, '');
      case 'sort_code': {
        const digits = raw.replace(/\D/g, '');
        if (digits.length <= 2) return digits;
        if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
      }
      case 'iban':
        return raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
      case 'phone':
        return raw.replace(/[^0-9+\- ()]/g, '');
      default:
        return raw;
    }
  };

  return (
    <div>
      <label className={`block text-xs font-medium mb-0.5 ${labelColor}`}>
        {field.label}
        {field.required && <span className={isDark ? 'text-sky-400' : 'text-sky-500'}> *</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(formatValue(e.target.value))}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        className={`w-full px-2.5 py-1.5 text-xs rounded-md border outline-none focus:ring-1 focus:ring-sky-500/50 ${inputBg}`}
      />
    </div>
  );
}

function FormFactorBadge({ formFactor, isDark }: { formFactor: string; isDark: boolean }) {
  const labels: Record<string, { label: string; color: string }> = {
    standard_card: { label: 'Card', color: 'bg-sky-500/20 text-sky-400' },
    document: { label: 'Document', color: 'bg-amber-500/20 text-amber-400' },
    mobile_first: { label: 'Mobile', color: 'bg-green-500/20 text-green-400' },
    virtual_only: { label: 'Virtual', color: 'bg-purple-500/20 text-purple-400' },
  };

  const info = labels[formFactor] || labels.standard_card;
  const lightLabels: Record<string, string> = {
    standard_card: 'bg-sky-50 text-sky-600',
    document: 'bg-amber-50 text-amber-600',
    mobile_first: 'bg-green-50 text-green-600',
    virtual_only: 'bg-purple-50 text-purple-600',
  };
  const color = isDark ? info.color : (lightLabels[formFactor] || lightLabels.standard_card);

  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${color}`}>
      {info.label}
    </span>
  );
}
