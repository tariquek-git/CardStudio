const COLOR_MAP = {
  sky: 'border-sky-500/30 bg-sky-500/5',
  emerald: 'border-emerald-500/30 bg-emerald-500/5',
  amber: 'border-amber-500/30 bg-amber-500/5',
  red: 'border-red-500/30 bg-red-500/5',
  violet: 'border-violet-500/30 bg-violet-500/5',
};

const VALUE_COLOR_MAP = {
  sky: 'text-sky-400',
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  violet: 'text-violet-400',
};

interface StatCardProps {
  label: string;
  value: string | number;
  color?: 'sky' | 'emerald' | 'amber' | 'red' | 'violet';
}

export default function StatCard({
  label,
  value,
  color = 'sky',
}: StatCardProps) {
  const isLoading = value === '...';

  return (
    <div
      className={`rounded-xl border p-4 ${COLOR_MAP[color]}`}
    >
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </p>
      {isLoading ? (
        <div className="h-7 w-14 bg-slate-800 rounded animate-pulse mt-2" />
      ) : (
        <p className={`text-2xl font-bold mt-1 ${VALUE_COLOR_MAP[color]}`}>
          {value}
        </p>
      )}
    </div>
  );
}
