import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useCardConfig } from './context';
import { useAuth } from './auth/AuthProvider';
import { useMigration } from './hooks/useMigration';
import { track } from './analytics';
import LeftPanel from './components/left-panel';
import CenterPanel from './components/center-panel';
import DesignGallery from './components/DesignGallery';
import Dashboard from './components/Dashboard';
import AIDesignGenerator from './components/AIDesignGenerator';
import ProgramEditor from './components/ProgramEditor';
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';

// Lazy-load admin portal
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./admin/AdminUsers'));
const AdminDesigns = lazy(() => import('./admin/AdminDesigns'));
const AdminPrograms = lazy(() => import('./admin/AdminPrograms'));
const AdminTemplates = lazy(() => import('./admin/AdminTemplates'));
const AdminCompliance = lazy(() => import('./admin/AdminCompliance'));
const AdminAuditLog = lazy(() => import('./admin/AdminAuditLog'));

const HUB_URL = 'https://fintechcommons.com';
type AppView = 'dashboard' | 'editor' | 'program-editor';

function AdminRouter({ path, onNavigate }: { path: string; onNavigate: (p: string) => void }) {
  const adminPath = path.replace(/^\/admin\/?/, '') || '';
  let content;
  switch (adminPath) {
    case '':
      content = <AdminDashboard />; break;
    case 'users':
      content = <AdminUsers />; break;
    case 'designs':
      content = <AdminDesigns />; break;
    case 'programs':
      content = <AdminPrograms />; break;
    case 'templates':
      content = <AdminTemplates />; break;
    case 'compliance':
      content = <AdminCompliance />; break;
    case 'audit':
      content = <AdminAuditLog />; break;
    default:
      content = <AdminDashboard />;
  }
  return (
    <AdminLayout onNavigate={onNavigate} currentPath={path}>
      {content}
    </AdminLayout>
  );
}

export default function App() {
  const { config, updateConfig, undo, redo, canUndo, canRedo, designs, loadDesign, storageWarning, clearStorageWarning, createProgram, loadProgram, editTierDesign, exitProgram, activeProgramId } = useCardConfig();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const migration = useMigration();
  const [showGallery, setShowGallery] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const isDark = config.darkMode;
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [path, setPath] = useState(() => window.location.pathname);
  const [view, setView] = useState<AppView>(() => {
    if (new URLSearchParams(window.location.search).has('config')) return 'editor';
    return 'dashboard';
  });

  // Simple client-side routing
  const navigate = useCallback((newPath: string) => {
    window.history.pushState({}, '', newPath);
    setPath(newPath);
  }, []);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Route to login/register/admin pages
  if (authLoading) {
    return <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-500 text-sm">Loading...</div>;
  }
  if (path === '/login') {
    return <LoginPage onNavigate={navigate} />;
  }
  if (path === '/register') {
    return <RegisterPage onNavigate={navigate} />;
  }
  if (path.startsWith('/admin')) {
    if (!isAdmin) {
      return (
        <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
          <div className="text-center">
            <p className="text-lg font-bold text-slate-200 mb-2">Access Denied</p>
            <p>You need admin privileges to access this page.</p>
            <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 rounded-lg bg-sky-500 text-white text-xs font-semibold">Back to Studio</button>
          </div>
        </div>
      );
    }
    return (
      <Suspense fallback={<div className="h-screen bg-slate-950 flex items-center justify-center text-slate-500 text-sm">Loading admin...</div>}>
        <AdminRouter path={path} onNavigate={navigate} />
      </Suspense>
    );
  }

  // Track page views
  useEffect(() => {
    track({ type: 'page_view', view });
  }, [view]);

  const handleNewDesign = useCallback(() => setView('editor'), []);
  const handleOpenDesign = useCallback((id: string) => {
    loadDesign(id);
    setView('editor');
  }, [loadDesign]);
  const handleBackToDashboard = useCallback(() => setView('dashboard'), []);
  const handleOpenAI = useCallback(() => {
    setView('editor');
    // Small delay so editor mounts first
    setTimeout(() => setShowAIModal(true), 100);
  }, []);
  const handleNewProgram = useCallback(() => {
    createProgram('New Program');
    setView('program-editor');
  }, [createProgram]);
  const handleOpenProgram = useCallback((id: string) => {
    loadProgram(id);
    setView('program-editor');
  }, [loadProgram]);
  const handleEditTier = useCallback((programId: string, tierId: string) => {
    editTierDesign(programId, tierId);
    setView('editor');
  }, [editTierDesign]);
  const handleBackFromProgram = useCallback(() => {
    exitProgram();
    setView('dashboard');
  }, [exitProgram]);
  const handleBackToDashboardFromEditor = useCallback(() => {
    if (activeProgramId) {
      setView('program-editor');
    } else {
      setView('dashboard');
    }
  }, [activeProgramId]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (canUndo) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [canUndo]);

  // Close drawers on Escape key + undo/redo shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowLeftPanel(false);
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
        className={`relative flex items-center justify-between px-4 py-3 ${
          isDark ? 'bg-slate-900/80 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Back to Hub */}
          <a
            href={HUB_URL}
            onClick={() => track({ type: 'hub_navigate' })}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title="Back to Fintech Commons"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 3L4.5 7l4 4" />
            </svg>
            <span className="hidden sm:inline">Hub</span>
          </a>
          {/* Divider */}
          <div className={`w-px h-5 ${isDark ? 'bg-slate-700/60' : 'bg-slate-200'}`} />
          {/* Mobile panel toggle (editor only) */}
          {(view === 'editor') && (
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
          )}
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center shadow-sm">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="4" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5" fill="none" />
              <rect x="4" y="7" width="4" height="3" rx="0.5" fill="white" opacity="0.8" />
              <line x1="10" y1="11" x2="14" y2="11" stroke="white" strokeWidth="1" opacity="0.6" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <h1 className={`text-sm font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Card Studio
            </h1>
          </div>
          {/* Back to dashboard (editor view only) */}
          {(view === 'editor' || view === 'program-editor') && (
            <>
              <div className={`w-px h-5 ${isDark ? 'bg-slate-700/60' : 'bg-slate-200'}`} />
              <button
                onClick={view === 'program-editor' ? handleBackFromProgram : handleBackToDashboardFromEditor}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
                title={view === 'program-editor' ? 'Back to Dashboard' : activeProgramId ? 'Back to Program' : 'Back to Dashboard'}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.5 2.5L4 6l3.5 3.5" />
                </svg>
                {view === 'program-editor' ? 'Dashboard' : activeProgramId ? 'Program' : 'Dashboard'}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Undo/Redo (editor only) */}
          {view === 'editor' && (
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
                <svg width="16" height="16" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="16" height="16" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5.5H6a3.5 3.5 0 0 0 0 7h1" />
                  <path d="M9.5 3L12 5.5 9.5 8" />
                </svg>
              </button>
            </div>
          )}
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
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center">
                {designs.length}
              </span>
            )}
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
      {/* Gradient accent line */}
      <div className={`h-px ${isDark ? 'bg-gradient-to-r from-sky-500/50 via-violet-500/30 to-transparent' : 'bg-gradient-to-r from-sky-400/40 via-violet-400/20 to-transparent'}`} />

      {/* Main Content */}
      {view === 'dashboard' ? (
        <Dashboard
          onNewDesign={handleNewDesign}
          onOpenDesign={handleOpenDesign}
          onShowGallery={() => setShowGallery(true)}
          onOpenAI={handleOpenAI}
          onNewProgram={handleNewProgram}
          onOpenProgram={handleOpenProgram}
        />
      ) : view === 'program-editor' ? (
        <ProgramEditor
          onBack={handleBackFromProgram}
          onEditTier={handleEditTier}
        />
      ) : (
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
        </main>
      )}

      {/* Footer */}
      <footer
        className={`px-5 py-2 flex items-center justify-between text-xs ${
          isDark ? 'bg-slate-900/80 border-t border-slate-700/20 text-slate-600' : 'bg-slate-50/80 border-t border-slate-200/50 text-slate-400'
        }`}
      >
        <span>
          <strong className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">Fintech Commons</strong>
        </span>
        <span className="hidden sm:inline">Card program previewer for fintech builders</span>
      </footer>

      {/* Design Gallery Modal */}
      <DesignGallery isOpen={showGallery} onClose={() => setShowGallery(false)} onOpenDesign={() => { setShowGallery(false); setView('editor'); }} />

      {/* AI Design Generator Modal (triggered from dashboard) */}
      <AIDesignGenerator open={showAIModal} onClose={() => setShowAIModal(false)} isDark={isDark} />

      {/* Migration prompt */}
      {migration.hasLocalData && isAuthenticated && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-violet-600 text-white text-xs font-medium shadow-lg max-w-lg">
          <span>
            Found {migration.localDesignCount} design{migration.localDesignCount !== 1 ? 's' : ''}
            {migration.localProgramCount > 0 ? ` and ${migration.localProgramCount} program${migration.localProgramCount !== 1 ? 's' : ''}` : ''} in your browser. Import to your account?
          </span>
          <button
            onClick={migration.migrate}
            disabled={migration.migrating}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-white text-violet-600 font-semibold hover:bg-violet-50 transition-colors disabled:opacity-50"
          >
            {migration.migrating ? 'Importing...' : 'Import'}
          </button>
          <button onClick={migration.dismiss} className="shrink-0 p-1 rounded hover:bg-violet-500 transition-colors" aria-label="Dismiss">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l10 10M11 1L1 11" />
            </svg>
          </button>
        </div>
      )}

      {/* Auth prompt (show login link when not authenticated) */}
      {!isAuthenticated && view === 'dashboard' && (
        <div className="fixed bottom-16 right-4 z-40">
          <button
            onClick={() => navigate('/login')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg transition-all hover:shadow-xl ${
              isDark
                ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="5" r="2.5" />
              <path d="M2.5 12.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
            </svg>
            Sign in to save to cloud
          </button>
        </div>
      )}

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
