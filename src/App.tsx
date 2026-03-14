import { useState, useEffect, useCallback } from 'react';
import { useCardConfig } from './context';
import LeftPanel from './components/LeftPanel';
import CenterPanel from './components/CenterPanel';
import RightPanel from './components/RightPanel';
import DesignGallery from './components/DesignGallery';

export default function App() {
  const { config, updateConfig, undo, redo, canUndo, canRedo, designs, storageWarning, clearStorageWarning } = useCardConfig();
  const [showGallery, setShowGallery] = useState(false);
  const isDark = config.darkMode;
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);

  // Close drawers on Escape key + undo/redo shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowLeftPanel(false);
      setShowRightPanel(false);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
  }, [undo, redo]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'dark bg-slate-950 text-slate-200' : 'bg-white text-slate-800'}`}>
      {/* Header */}
      <header
        className={`flex items-center justify-between px-4 py-2.5 ${
          isDark ? 'bg-slate-900/80 backdrop-blur-md border-b border-slate-700/30' : 'bg-white/80 backdrop-blur-md border-b border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Mobile panel toggle */}
          <button
            onClick={() => setShowLeftPanel(!showLeftPanel)}
            className={`xl:hidden p-2 rounded-lg transition-colors ${
              isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title="Toggle config panel"
            aria-label="Toggle config panel"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="3" width="14" height="1.5" rx="0.5" />
              <rect x="1" y="7.25" width="14" height="1.5" rx="0.5" />
              <rect x="1" y="11.5" width="14" height="1.5" rx="0.5" />
            </svg>
          </button>
          {/* Logo mark */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-sm">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="4" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5" fill="none" />
              <rect x="4" y="7" width="4" height="3" rx="0.5" fill="white" opacity="0.8" />
              <line x1="10" y1="11" x2="14" y2="11" stroke="white" strokeWidth="1" opacity="0.6" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <h1 className={`text-[13px] font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Card Studio
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Undo/Redo */}
          <div className={`flex items-center gap-0 mr-1 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-100/80'}`}>
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`p-2 rounded-l-lg transition-colors ${
                isDark
                  ? canUndo ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'
                  : canUndo ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-300 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5.5h6a3.5 3.5 0 0 1 0 7H8" />
                <path d="M5.5 3L3 5.5 5.5 8" />
              </svg>
            </button>
            <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`p-2 rounded-r-lg transition-colors ${
                isDark
                  ? canRedo ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'
                  : canRedo ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-300 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Shift+Z)"
              aria-label="Redo"
            >
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5.5H6a3.5 3.5 0 0 0 0 7h1" />
                <path d="M9.5 3L12 5.5 9.5 8" />
              </svg>
            </button>
          </div>
          {/* My Designs */}
          <button
            onClick={() => setShowGallery(true)}
            className={`p-2 rounded-lg transition-colors relative ${
              isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title="My Designs"
            aria-label="My Designs"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1.5" y="3" width="5" height="4" rx="0.8" />
              <rect x="9.5" y="3" width="5" height="4" rx="0.8" />
              <rect x="1.5" y="9" width="5" height="4" rx="0.8" />
              <rect x="9.5" y="9" width="5" height="4" rx="0.8" />
            </svg>
            {designs.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-sky-500 text-white text-[8px] font-bold flex items-center justify-center">
                {designs.length}
              </span>
            )}
          </button>
          {/* Wallet preview toggle (mobile) */}
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className={`xl:hidden p-2 rounded-lg transition-colors ${
              showRightPanel
                ? 'bg-sky-500 text-white'
                : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title="Toggle wallet preview"
            aria-label="Toggle wallet preview"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="1" width="10" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <circle cx="8" cy="13" r="1" />
            </svg>
          </button>
          {/* Dark mode toggle */}
          <button
            onClick={() => updateConfig({ darkMode: !isDark })}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'text-yellow-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="3.5" />
                <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="8" y1="1" x2="8" y2="2.5" />
                  <line x1="8" y1="13.5" x2="8" y2="15" />
                  <line x1="1" y1="8" x2="2.5" y2="8" />
                  <line x1="13.5" y1="8" x2="15" y2="8" />
                  <line x1="3.05" y1="3.05" x2="4.11" y2="4.11" />
                  <line x1="11.89" y1="11.89" x2="12.95" y2="12.95" />
                  <line x1="3.05" y1="12.95" x2="4.11" y2="11.89" />
                  <line x1="11.89" y1="4.11" x2="12.95" y2="3.05" />
                </g>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 1a7 7 0 1 0 8.87 8.87A5.5 5.5 0 0 1 6 1z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Content - Three Panel Layout */}
      <main className="flex flex-1 overflow-hidden relative">
        {/* Left Panel: always visible on xl+, drawer overlay on smaller */}
        <div
          className={`
            ${showLeftPanel ? 'translate-x-0' : '-translate-x-full'}
            xl:translate-x-0 xl:relative
            fixed inset-y-0 left-0 z-30
            transition-transform duration-300 ease-in-out
          `}
          role={showLeftPanel ? 'dialog' : undefined}
          aria-label={showLeftPanel ? 'Card configuration' : undefined}
        >
          <LeftPanel />
        </div>

        {/* Left panel backdrop */}
        {showLeftPanel && (
          <div
            className="fixed inset-0 bg-black/40 z-20 xl:hidden"
            onClick={() => setShowLeftPanel(false)}
            aria-hidden="true"
          />
        )}

        <CenterPanel />

        {/* Right Panel: always visible on xl+, drawer overlay on smaller */}
        <div
          className={`
            ${showRightPanel ? 'translate-x-0' : 'translate-x-full'}
            xl:translate-x-0 xl:relative
            fixed inset-y-0 right-0 z-30
            transition-transform duration-300 ease-in-out
          `}
          role={showRightPanel ? 'dialog' : undefined}
          aria-label={showRightPanel ? 'Wallet preview' : undefined}
        >
          <RightPanel />
        </div>

        {/* Right panel backdrop */}
        {showRightPanel && (
          <div
            className="fixed inset-0 bg-black/40 z-20 xl:hidden"
            onClick={() => setShowRightPanel(false)}
            aria-hidden="true"
          />
        )}
      </main>

      {/* Footer */}
      <footer
        className={`px-5 py-1.5 flex items-center justify-between text-[10px] ${
          isDark ? 'bg-slate-900/80 border-t border-slate-700/20 text-slate-600' : 'bg-slate-50/80 border-t border-slate-200/50 text-slate-400'
        }`}
      >
        <span>
          <strong className={isDark ? 'text-slate-500' : 'text-slate-500'}>Fintech Commons</strong>
        </span>
        <span className="hidden sm:inline">Card program previewer for fintech builders</span>
      </footer>

      {/* Design Gallery Modal */}
      <DesignGallery isOpen={showGallery} onClose={() => setShowGallery(false)} />

      {/* Storage warning toast */}
      {storageWarning && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-amber-500 text-white text-xs font-medium shadow-lg max-w-md">
          <span>{storageWarning}</span>
          <button
            onClick={clearStorageWarning}
            className="shrink-0 p-0.5 rounded hover:bg-amber-600 transition-colors"
            aria-label="Dismiss warning"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l10 10M11 1L1 11" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
