import { type ReactNode } from 'react';

interface Column {
  key: string;
  label: string;
  width?: string;
  render?: (value: any, row: any) => ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
}

export default function DataTable({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data',
}: DataTableProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-slate-800/50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-3.5 bg-slate-800 rounded animate-pulse" style={{ width: `${50 + Math.random() * 30}%` }} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-12 text-slate-500 text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={row.id ?? rowIdx}
                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-slate-300"
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : row[col.key] ?? '-'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
