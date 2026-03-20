import React, { useState, useRef, useEffect, type ReactNode } from 'react';
import type { RenderScene } from '../../types';

export default function ExportMenu({
  isDark,
  scene,
  onExportPNG,
  onExportPDF,
  onExportSVG,
  onExportWallet,
  onCopyConfig,
  onShareLink,
}: {
  isDark: boolean;
  scene: RenderScene;
  onExportPNG: () => void;
  onExportPDF: () => void;
  onExportSVG: () => void;
  onExportWallet: () => void;
  onCopyConfig: () => void;
  onShareLink: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const showWallet = scene === 'wallet-apple' || scene === 'wallet-google';

  const items: { icon: ReactNode; label: string; desc: string; onClick: () => void }[] = [
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 2v8M4 7l3 3 3-3" /><path d="M2 11v1.5h10V11" />
        </svg>
      ),
      label: 'Card PNG',
      desc: '3D preview screenshot',
      onClick: onExportPNG,
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.5" y="1" width="9" height="12" rx="1" />
          <path d="M5 4h4M5 6.5h4M5 9h2.5" />
        </svg>
      ),
      label: 'Print PDF',
      desc: '300 DPI with bleed marks',
      onClick: onExportPDF,
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 1h6l3 3v7a2 2 0 01-2 2H3a2 2 0 01-2-2V3a2 2 0 012-2z" />
          <path d="M5 7l2 2 2-2" />
        </svg>
      ),
      label: 'SVG (Figma)',
      desc: 'Vector card design',
      onClick: onExportSVG,
    },
    ...(showWallet ? [{
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <rect x="3" y="1" width="8" height="12" rx="1.5" />
          <path d="M5 10h4" />
        </svg>
      ),
      label: 'Wallet Mockup',
      desc: 'Phone preview PNG',
      onClick: onExportWallet,
    }] : []),
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <path d="M6 3V1.5h5.5V7H10" />
        </svg>
      ),
      label: 'Copy Config',
      desc: 'JSON to clipboard',
      onClick: onCopyConfig,
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5.5 8.5a3 3 0 010-3l1-1a3 3 0 014.24 4.24l-.5.5" />
          <path d="M8.5 5.5a3 3 0 010 3l-1 1a3 3 0 01-4.24-4.24l.5-.5" />
        </svg>
      ),
      label: 'Share Link',
      desc: 'URL to clipboard',
      onClick: onShareLink,
    },
  ];

  return (
    <div ref={ref} className="absolute bottom-4 right-4 z-20">
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-lg hover:shadow-xl hover:shadow-[0_0_12px_rgba(14,165,233,0.3)] active:scale-[0.97] ${
          isDark
            ? 'bg-sky-500/90 text-white hover:bg-sky-400 border border-sky-400/30'
            : 'bg-sky-500 text-white hover:bg-sky-600 border border-sky-600/20'
        } backdrop-blur-sm`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 2v8M4 7l3 3 3-3" /><path d="M2 11v1.5h10V11" />
        </svg>
        Export
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M1.5 3L4 5.5 6.5 3" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`absolute bottom-full right-0 mb-2 w-56 rounded-xl shadow-2xl border overflow-hidden ${
          isDark
            ? 'bg-slate-800/95 border-slate-600/50'
            : 'bg-white/95 border-slate-200'
        } backdrop-blur-md`}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                isDark
                  ? 'text-slate-200 hover:bg-slate-700/60'
                  : 'text-slate-700 hover:bg-slate-50'
              } ${i > 0 ? `border-t ${isDark ? 'border-slate-700/40' : 'border-slate-100'}` : ''}`}
            >
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{item.icon}</span>
              <div>
                <div className="text-xs font-medium">{item.label}</div>
                <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
