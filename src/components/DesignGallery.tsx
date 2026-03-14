import { useState, useEffect, useRef, useCallback } from 'react';
import { useCardConfig } from '../context';
import { drawCardFront, ensureLogosLoaded } from '../cardCanvas';
import type { SavedDesign } from '../types';

// Generate a small thumbnail from a card config
function generateThumbnail(config: SavedDesign['config']): Promise<string> {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 126;
    Promise.all([
      document.fonts.ready,
      ensureLogosLoaded(config.issuerLogo, config.cardArt),
    ]).then(() => {
      drawCardFront(canvas, config);
      resolve(canvas.toDataURL('image/png', 0.7));
    });
  });
}

export default function DesignGallery({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    config,
    designs,
    activeDesignId,
    saveDesign,
    loadDesign,
    deleteDesign,
    duplicateDesign,
    renameDesign,
    updateDesignThumbnail,
  } = useCardConfig();
  const isDark = config.darkMode;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const saveInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management: trap focus in modal, restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        const first = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        first?.focus();
      });
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Generate thumbnails for designs that don't have one
  useEffect(() => {
    designs.forEach(d => {
      if (!d.thumbnail) {
        generateThumbnail(d.config).then(thumb => {
          updateDesignThumbnail(d.id, thumb);
        });
      }
    });
  }, [designs, updateDesignThumbnail]);

  // Focus save input when shown
  useEffect(() => {
    if (showSaveInput) saveInputRef.current?.focus();
  }, [showSaveInput]);

  // Focus edit input when editing
  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const handleSave = useCallback(() => {
    const name = saveName.trim() || undefined;
    const design = saveDesign(name);
    // Generate thumbnail for the new design
    generateThumbnail(design.config).then(thumb => {
      updateDesignThumbnail(design.id, thumb);
    });
    setSaveName('');
    setShowSaveInput(false);
  }, [saveName, saveDesign, updateDesignThumbnail]);

  const handleRename = useCallback((id: string) => {
    if (editName.trim()) {
      renameDesign(id, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  }, [editName, renameDesign]);

  const handleDelete = useCallback((id: string, name: string) => {
    if (window.confirm(`Delete "${name}"?`)) {
      deleteDesign(id);
    }
  }, [deleteDesign]);

  if (!isOpen) return null;

  const bg = isDark ? 'bg-slate-900' : 'bg-white';
  const border = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-slate-200' : 'text-slate-800';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800/60' : 'bg-slate-50';
  const cardBorder = isDark ? 'border-slate-700/50' : 'border-slate-200';
  const hoverBorder = isDark ? 'hover:border-sky-500/50' : 'hover:border-sky-400';
  const inputBg = isDark ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-slate-300 text-slate-800';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="My Designs"
        className={`relative w-full max-w-2xl max-h-[80vh] rounded-xl ${bg} border ${border} shadow-2xl flex flex-col`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${border}`}>
          <div>
            <h2 className={`text-sm font-semibold ${textPrimary}`}>My Designs</h2>
            <p className={`text-[10px] ${textSecondary}`}>{designs.length} saved design{designs.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {!showSaveInput ? (
              <button
                onClick={() => {
                  setSaveName(`${config.issuerName} ${config.tier}`.trim());
                  setShowSaveInput(true);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-colors"
              >
                Save Current
              </button>
            ) : (
              <form
                onSubmit={e => { e.preventDefault(); handleSave(); }}
                className="flex items-center gap-1.5"
              >
                <input
                  ref={saveInputRef}
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="Design name..."
                  className={`px-2 py-1 text-xs rounded-md border outline-none ${inputBg} w-40`}
                  onKeyDown={e => e.key === 'Escape' && setShowSaveInput(false)}
                />
                <button type="submit" className="px-2 py-1 text-xs rounded-md bg-sky-500 text-white hover:bg-sky-600">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaveInput(false)}
                  className={`px-2 py-1 text-xs rounded-md ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Cancel
                </button>
              </form>
            )}
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {designs.length === 0 ? (
            <div className={`text-center py-12 ${textSecondary}`}>
              <p className="text-sm">No saved designs yet</p>
              <p className="text-[10px] mt-1">Click "Save Current" to save your first design</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {designs.map(design => (
                <DesignCard
                  key={design.id}
                  design={design}
                  isActive={design.id === activeDesignId}
                  isEditing={design.id === editingId}
                  editName={editName}
                  editInputRef={editInputRef}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                  hoverBorder={hoverBorder}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  inputBg={inputBg}
                  isDark={isDark}
                  onLoad={() => { loadDesign(design.id); onClose(); }}
                  onStartEdit={() => { setEditingId(design.id); setEditName(design.name); }}
                  onEditNameChange={setEditName}
                  onFinishEdit={() => handleRename(design.id)}
                  onCancelEdit={() => { setEditingId(null); setEditName(''); }}
                  onDuplicate={() => duplicateDesign(design.id)}
                  onDelete={() => handleDelete(design.id, design.name)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DesignCard({
  design,
  isActive,
  isEditing,
  editName,
  editInputRef,
  cardBg,
  cardBorder,
  hoverBorder,
  textPrimary,
  textSecondary,
  inputBg,
  isDark,
  onLoad,
  onStartEdit,
  onEditNameChange,
  onFinishEdit,
  onCancelEdit,
  onDuplicate,
  onDelete,
}: {
  design: SavedDesign;
  isActive: boolean;
  isEditing: boolean;
  editName: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  cardBg: string;
  cardBorder: string;
  hoverBorder: string;
  textPrimary: string;
  textSecondary: string;
  inputBg: string;
  isDark: boolean;
  onLoad: () => void;
  onStartEdit: () => void;
  onEditNameChange: (name: string) => void;
  onFinishEdit: () => void;
  onCancelEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const activeBorder = isActive ? (isDark ? 'border-sky-500' : 'border-sky-400') : cardBorder;
  const dateStr = new Date(design.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={`group rounded-lg border ${activeBorder} ${hoverBorder} ${cardBg} overflow-hidden transition-all cursor-pointer`}
      onClick={onLoad}
    >
      {/* Thumbnail */}
      <div className="aspect-[1.59/1] bg-slate-900/50 relative overflow-hidden">
        {design.thumbnail ? (
          <img
            src={design.thumbnail}
            alt={design.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
            Loading...
          </div>
        )}
        {isActive && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-semibold bg-sky-500 text-white">
            Active
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5" onClick={e => e.stopPropagation()}>
        {isEditing ? (
          <form onSubmit={e => { e.preventDefault(); onFinishEdit(); }}>
            <input
              ref={editInputRef}
              type="text"
              value={editName}
              onChange={e => onEditNameChange(e.target.value)}
              onBlur={onFinishEdit}
              onKeyDown={e => e.key === 'Escape' && onCancelEdit()}
              className={`w-full px-1.5 py-0.5 text-[11px] rounded border outline-none ${inputBg}`}
            />
          </form>
        ) : (
          <p className={`text-[11px] font-medium truncate ${textPrimary}`}>{design.name}</p>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className={`text-[9px] ${textSecondary}`}>{dateStr}</span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ActionBtn
              title="Rename"
              isDark={isDark}
              onClick={e => { e.stopPropagation(); onStartEdit(); }}
            >
              <path d="M11 4.5l-6.5 6.5L3 13l2-1.5 6.5-6.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </ActionBtn>
            <ActionBtn
              title="Duplicate"
              isDark={isDark}
              onClick={e => { e.stopPropagation(); onDuplicate(); }}
            >
              <rect x="4" y="4" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <rect x="3" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </ActionBtn>
            <ActionBtn
              title="Delete"
              isDark={isDark}
              onClick={e => { e.stopPropagation(); onDelete(); }}
              danger
            >
              <path d="M4 5h6M5 5V4h4v1M5 5v5.5a.5.5 0 00.5.5h3a.5.5 0 00.5-.5V5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </ActionBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  title,
  isDark,
  onClick,
  danger,
  children,
}: {
  title: string;
  isDark: boolean;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const color = danger
    ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
    : isDark
      ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700'
      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200';

  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1 rounded transition-colors ${color}`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        {children}
      </svg>
    </button>
  );
}
