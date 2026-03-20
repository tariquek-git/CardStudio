import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';

interface Template {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  network: string;
  category: string | null;
  sortOrder: number;
  createdAt: string;
}

interface TemplatesResponse {
  designs: Template[];
  total: number;
}

export default function AdminTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch<TemplatesResponse>('/admin/designs?isTemplate=true&limit=200')
      .then((data) => setTemplates(data.designs))
      .catch((err) => setError(err.message || 'Failed to load templates'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const id = templates[index].id;
    const newOrder = templates[index - 1].sortOrder;
    try {
      await apiFetch(`/admin/designs/${id}/sort`, {
        method: 'PATCH',
        body: JSON.stringify({ sortOrder: newOrder - 1 }),
      });
      fetchTemplates();
    } catch {
      // silent
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= templates.length - 1) return;
    const id = templates[index].id;
    const newOrder = templates[index + 1].sortOrder;
    try {
      await apiFetch(`/admin/designs/${id}/sort`, {
        method: 'PATCH',
        body: JSON.stringify({ sortOrder: newOrder + 1 }),
      });
      fetchTemplates();
    } catch {
      // silent
    }
  };

  const handleRemove = async (designId: string) => {
    if (!confirm('Remove this design from templates?')) return;
    try {
      await apiFetch(`/admin/designs/${designId}/template`, {
        method: 'PATCH',
        body: JSON.stringify({ isTemplate: false }),
      });
      fetchTemplates();
    } catch {
      // silent
    }
  };

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-red-400">
        <p className="font-medium">Failed to load templates</p>
        <p className="text-sm mt-1 text-red-400/70">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-100">Templates</h2>
        <span className="text-sm text-slate-500">
          {templates.length} template{templates.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-pulse"
            >
              <div className="aspect-[85.6/54] bg-slate-800" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-24 bg-slate-800 rounded" />
                <div className="h-2.5 w-16 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : templates.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {templates.map((template, index) => (
            <div
              key={template.id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group hover:border-slate-700 transition-colors"
            >
              {/* Thumbnail */}
              <div className="aspect-[85.6/54] bg-slate-800 relative">
                {template.thumbnailUrl ? (
                  <img
                    src={template.thumbnailUrl}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
                      />
                    </svg>
                  </div>
                )}
                <span className="absolute top-1.5 left-1.5 bg-slate-900/80 text-slate-400 text-[10px] font-mono px-1.5 py-0.5 rounded">
                  #{index + 1}
                </span>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-xs font-medium text-slate-200 truncate">
                  {template.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">
                    {template.network}
                  </span>
                  {template.category && (
                    <span className="text-[10px] text-slate-500">
                      {template.category}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="flex-none px-2 py-1 text-[10px] font-medium rounded bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move up"
                  >
                    Up
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index >= templates.length - 1}
                    className="flex-none px-2 py-1 text-[10px] font-medium rounded bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move down"
                  >
                    Down
                  </button>
                  <button
                    onClick={() => handleRemove(template.id)}
                    className="flex-1 text-[10px] font-medium py-1 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500">
          <p className="text-sm">No templates found</p>
          <p className="text-xs mt-1 text-slate-600">
            Promote designs from the Designs page to create templates
          </p>
        </div>
      )}
    </div>
  );
}
