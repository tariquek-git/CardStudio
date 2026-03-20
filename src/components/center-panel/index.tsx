import React, { useRef, useEffect, useCallback, useState, Suspense, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useCardConfig } from '../../context';
import { downloadCardSVG } from '../../svgExport';
import { validateCompliance } from '../../compliance';
import type { RenderScene } from '../../types';
import { PhoneFrame, AppleWalletView, GoogleWalletView } from '../WalletPreview';
import POSTerminalPreview from '../POSTerminalPreview';
import ComparisonView from '../ComparisonView';
import CanvasErrorBoundary from './CanvasErrorBoundary';
import { useToast } from './useToast';
import Card3D, { CARD_H } from './Card3D';
import ExportMenu from './ExportMenu';

// Background colors per theme
const BG_DARK = new THREE.Color('#1a1a1a');
const BG_LIGHT = new THREE.Color('#e8ecf1');

// ─── Export canvas from Three.js ─────────────────────────────
function useCanvasExport() {
  const { gl, scene, camera } = useThree();

  return useCallback(
    (scale: number = 2) => {
      const prevSize = gl.getSize(new THREE.Vector2());
      gl.setSize(prevSize.x * scale, prevSize.y * scale);
      gl.render(scene, camera);
      const dataURL = gl.domElement.toDataURL('image/png');
      gl.setSize(prevSize.x, prevSize.y);
      return dataURL;
    },
    [gl, scene, camera],
  );
}

function ExportHelper({ onReady }: { onReady: (fn: (scale: number) => string) => void }) {
  const exportFn = useCanvasExport();
  useEffect(() => {
    onReady(exportFn);
  }, [exportFn, onReady]);
  return null;
}

// ─── Render Scene Selector ───────────────────────────────────
const SCENE_OPTIONS: { value: RenderScene; label: string; icon: ReactNode }[] = [
  {
    value: '3d',
    label: '3D Card',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 1L12.5 4v6L7 13 1.5 10V4L7 1z" />
        <path d="M7 1v6m0 6V7m0 0L1.5 4m5.5 3l5.5-3" />
      </svg>
    ),
  },
  {
    value: 'wallet-apple',
    label: 'Apple Wallet',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <rect x="3" y="1" width="8" height="12" rx="1.5" />
        <line x1="5" y1="3.5" x2="9" y2="3.5" />
      </svg>
    ),
  },
  {
    value: 'wallet-google',
    label: 'Google Wallet',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <rect x="3" y="1" width="8" height="12" rx="1.5" />
        <circle cx="7" cy="7" r="2" />
      </svg>
    ),
  },
  {
    value: 'terminal',
    label: 'Tap to Pay',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="8" height="9" rx="1" />
        <path d="M5 1.5a3 3 0 0 1 4 0" />
        <path d="M6 3.5a1.2 1.2 0 0 1 2 0" />
      </svg>
    ),
  },
  {
    value: 'compare',
    label: 'Compare',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="2" width="5" height="10" rx="0.8" />
        <rect x="8" y="2" width="5" height="10" rx="0.8" />
      </svg>
    ),
  },
];

function RenderSceneSelector({ scene, isDark }: { scene: RenderScene; isDark: boolean }) {
  const { config, updateConfig } = useCardConfig();
  const isWallet = scene === 'wallet-apple' || scene === 'wallet-google';
  return (
    <div className={`flex items-center gap-1 px-3 py-2 border-b ${
      isDark ? 'border-slate-700/30 bg-slate-900/60' : 'border-slate-200/80 bg-slate-50/60'
    } backdrop-blur-sm`}>
      {SCENE_OPTIONS.map(opt => {
        const active = scene === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => updateConfig({ renderScene: opt.value })}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              active
                ? isDark
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-sky-50 text-sky-600 border border-sky-200'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-transparent'
            }`}
            title={opt.label}
          >
            {opt.icon}
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
      {isWallet && (
        <button
          onClick={() => updateConfig({ walletDarkMode: !config.walletDarkMode })}
          className={`ml-auto flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all border ${
            config.walletDarkMode
              ? isDark
                ? 'bg-slate-700/60 text-slate-300 border-slate-600/50'
                : 'bg-slate-700 text-white border-slate-600'
              : isDark
                ? 'bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-white text-slate-600 border-slate-300'
          }`}
          title={config.walletDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {config.walletDarkMode ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0a6 6 0 100 12 4.5 4.5 0 010-12z" /></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="6" cy="6" r="3" /><path d="M6 1v1M6 10v1M1 6h1M10 6h1M2.5 2.5l.7.7M8.8 8.8l.7.7M9.5 2.5l-.7.7M3.2 8.8l-.7.7" /></svg>
          )}
          {config.walletDarkMode ? 'Dark' : 'Light'}
        </button>
      )}
    </div>
  );
}

// ─── Main Center Panel ──────────────────────────────────────
export default function CenterPanel() {
  const { config } = useCardConfig();
  const isDark = config.darkMode;
  const exportFnRef = useRef<((scale: number) => string) | null>(null);
  const [, setExportReady] = useState(false);
  const { toast, show: showToast } = useToast();

  const handleExportCard = useCallback(async () => {
    if (!exportFnRef.current) return;
    const dataURL = exportFnRef.current(2);
    const link = document.createElement('a');
    link.download = 'card-preview.png';
    link.href = dataURL;
    link.click();
    showToast('Card PNG downloaded');
  }, [showToast]);

  const [exporting, setExporting] = useState<string | null>(null);

  const handleExportPDF = useCallback(async () => {
    setExporting('Generating print-ready PDF...');
    try {
      const { drawCardFront: drawFront, drawCardBack: drawBack } = await import('../../canvas');
      const { jsPDF } = await import('jspdf');

      // CR80 card: 3.375" x 2.125" — add 0.125" bleed on each side
      const BLEED = 0.125;
      const CARD_WIDTH_IN = 3.375;
      const CARD_HEIGHT_IN = 2.125;
      const PAGE_W = CARD_WIDTH_IN + BLEED * 2;
      const PAGE_H = CARD_HEIGHT_IN + BLEED * 2;
      const DPI = 300;

      const canvasW = Math.round(CARD_WIDTH_IN * DPI);
      const canvasH = Math.round(CARD_HEIGHT_IN * DPI);

      // Render front at 300 DPI
      const frontCanvas = document.createElement('canvas');
      frontCanvas.width = canvasW;
      frontCanvas.height = canvasH;
      const backCanvas = document.createElement('canvas');
      backCanvas.width = canvasW;
      backCanvas.height = canvasH;

      const { ensureLogosLoaded: loadLogos } = await import('../../canvas');
      await loadLogos(config.issuerLogo, config.cardArt, config.coBrandLogo, config.backQrUrl);
      await drawFront(frontCanvas, config);
      await drawBack(backCanvas, config);

      // Create PDF in inches
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: [PAGE_W, PAGE_H],
      });

      // Page 1 — Front
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

      // Bleed marks (corner crop marks)
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.003);
      const marks = [
        // Top-left
        [BLEED, 0, BLEED, BLEED * 0.6],
        [0, BLEED, BLEED * 0.6, BLEED],
        // Top-right
        [PAGE_W - BLEED, 0, PAGE_W - BLEED, BLEED * 0.6],
        [PAGE_W - BLEED * 0.6, BLEED, PAGE_W, BLEED],
        // Bottom-left
        [BLEED, PAGE_H - BLEED * 0.6, BLEED, PAGE_H],
        [0, PAGE_H - BLEED, BLEED * 0.6, PAGE_H - BLEED],
        // Bottom-right
        [PAGE_W - BLEED, PAGE_H - BLEED * 0.6, PAGE_W - BLEED, PAGE_H],
        [PAGE_W - BLEED * 0.6, PAGE_H - BLEED, PAGE_W, PAGE_H - BLEED],
      ];
      marks.forEach(([x1, y1, x2, y2]) => pdf.line(x1, y1, x2, y2));

      // Card image centered with bleed
      const frontDataURL = frontCanvas.toDataURL('image/png');
      pdf.addImage(frontDataURL, 'PNG', BLEED, BLEED, CARD_WIDTH_IN, CARD_HEIGHT_IN);

      // Label
      pdf.setFontSize(6);
      pdf.setTextColor(150, 150, 150);
      pdf.text('FRONT — 300 DPI — CR80 (3.375" x 2.125") — 0.125" bleed', PAGE_W / 2, PAGE_H - 0.02, { align: 'center' });

      // Page 2 — Back
      pdf.addPage([PAGE_W, PAGE_H], 'landscape');
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');
      marks.forEach(([x1, y1, x2, y2]) => pdf.line(x1, y1, x2, y2));

      const backDataURL = backCanvas.toDataURL('image/png');
      pdf.addImage(backDataURL, 'PNG', BLEED, BLEED, CARD_WIDTH_IN, CARD_HEIGHT_IN);
      pdf.setFontSize(6);
      pdf.setTextColor(150, 150, 150);
      pdf.text('BACK — 300 DPI — CR80 (3.375" x 2.125") — 0.125" bleed', PAGE_W / 2, PAGE_H - 0.02, { align: 'center' });

      // Page 3 — Compliance Summary (letter size)
      const LETTER_W = 8.5;
      const LETTER_H = 11;
      pdf.addPage([LETTER_W, LETTER_H], 'portrait');
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, LETTER_W, LETTER_H, 'F');

      const compliance = validateCompliance(config);
      let cy = 0.6;
      const mx = 0.75;

      // Header
      pdf.setFontSize(16);
      pdf.setTextColor(30, 30, 30);
      pdf.text('Compliance Summary', mx, cy);
      cy += 0.15;
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`${config.issuerName} — ${config.network.toUpperCase()} ${config.cardType} — ${config.issuingCountry}`, mx, cy + 0.15);
      cy += 0.4;

      // Score
      const scoreColor = compliance.score >= 80 ? [16, 185, 129] : compliance.score >= 50 ? [245, 158, 11] : [239, 68, 68];
      pdf.setFontSize(28);
      pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      pdf.text(`${compliance.score}`, mx, cy);
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(' / 100  Compliance Score', mx + pdf.getTextWidth(`${compliance.score}  `), cy);
      cy += 0.15;

      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${compliance.errors.length} errors  ·  ${compliance.warnings.length} warnings  ·  ${compliance.infos.length} info`, mx, cy + 0.15);
      cy += 0.45;

      // Rules list
      const allRules = [...compliance.errors, ...compliance.warnings, ...compliance.infos];
      const maxW = LETTER_W - mx * 2;

      for (const rule of allRules) {
        if (cy > LETTER_H - 0.8) {
          pdf.addPage([LETTER_W, LETTER_H], 'portrait');
          cy = 0.6;
        }

        const icon = rule.severity === 'error' ? '✗' : rule.severity === 'warning' ? '!' : 'i';
        const colors: Record<string, number[]> = {
          error: [239, 68, 68],
          warning: [245, 158, 11],
          info: [59, 130, 246],
        };
        const c = colors[rule.severity] || [100, 100, 100];
        pdf.setTextColor(c[0], c[1], c[2]);
        pdf.setFontSize(9);
        pdf.text(icon, mx, cy);
        pdf.setTextColor(30, 30, 30);
        pdf.setFontSize(9);
        pdf.text(rule.title, mx + 0.2, cy);
        cy += 0.18;

        pdf.setFontSize(7);
        pdf.setTextColor(100, 100, 100);
        const msgLines = pdf.splitTextToSize(rule.message, maxW - 0.2);
        pdf.text(msgLines, mx + 0.2, cy);
        cy += msgLines.length * 0.12 + 0.05;

        if (rule.regulationRef) {
          pdf.setFontSize(6);
          pdf.setTextColor(140, 140, 140);
          pdf.text(`Ref: ${rule.regulationRef}`, mx + 0.2, cy);
          cy += 0.12;
        }
        cy += 0.08;
      }

      // Footer
      pdf.setFontSize(6);
      pdf.setTextColor(180, 180, 180);
      pdf.text('Generated by CardStudio — for reference only, not legal advice', LETTER_W / 2, LETTER_H - 0.4, { align: 'center' });

      pdf.save('card-print-spec.pdf');
      showToast('Print-ready PDF downloaded (300 DPI + compliance)');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('PDF export failed');
    } finally {
      setExporting(null);
    }
  }, [config, showToast]);

  const handleExportSVG = useCallback(() => {
    downloadCardSVG(config);
    showToast('SVG downloaded (Figma-compatible)');
  }, [config, showToast]);

  const handleCopyConfig = useCallback(async () => {
    const configJson = JSON.stringify(config, null, 2);
    try {
      await navigator.clipboard.writeText(configJson);
      showToast('Config copied to clipboard');
    } catch {
      // Fallback for non-HTTPS or older browsers
      const ta = document.createElement('textarea');
      ta.value = configJson;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Config copied to clipboard');
    }
  }, [config, showToast]);

  const handleShareLink = useCallback(async () => {
    // Strip issuerLogo (base64 data URIs make URLs too long for browsers)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { issuerLogo: _issuerLogo, cardArt: _cardArt, ...shareableConfig } = config;
    const encoded = btoa(JSON.stringify(shareableConfig));
    const url = `${window.location.origin}${window.location.pathname}?config=${encoded}`;
    if (url.length > 2000) {
      showToast('Warning: Share link is very long and may not work in all browsers');
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToast('Share link copied to clipboard');
  }, [config, showToast]);

  const handleExportWallet = useCallback(async () => {
    const el = document.querySelector('[data-wallet-preview]');
    if (!el) return;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(el as HTMLElement, { backgroundColor: null, scale: 2 });
    const link = document.createElement('a');
    link.download = 'wallet-preview.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Wallet mockup downloaded');
  }, [showToast]);

  const handleExportReady = useCallback((fn: (scale: number) => string) => {
    exportFnRef.current = fn;
    setExportReady(true);
  }, []);

  const scene = config.renderScene;

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Render Scene Selector */}
      <RenderSceneSelector scene={scene} isDark={isDark} />

      {/* Scene Content */}
      <div className="flex-1 relative" style={{ background: isDark ? '#1a1a1a' : '#e8ecf1' }}>
        {scene === '3d' && (
          <CanvasErrorBoundary>
            <Canvas
              dpr={[1, 2]}
              gl={{ preserveDrawingBuffer: true, antialias: true }}
              camera={{ position: [0.15, 0.1, 6], fov: 30 }}
              frameloop="always"
              onCreated={({ gl }) => {
                gl.toneMapping = THREE.ACESFilmicToneMapping;
                gl.toneMappingExposure = 1.6;
              }}
            >
              <color attach="background" args={isDark ? [BG_DARK.r, BG_DARK.g, BG_DARK.b] : [BG_LIGHT.r, BG_LIGHT.g, BG_LIGHT.b]} />

              {/* Ambient fill — balanced for readable card faces */}
              <ambientLight intensity={0.8} />

              {/* Key light — warm, top-right, main illumination */}
              <directionalLight
                position={[4, 5, 6]}
                intensity={1.5}
                color="#fff0e0"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-bias={-0.00005}
              />

              {/* Fill light — cool blue, opposite side, softer */}
              <directionalLight position={[-3, 2, 3]} intensity={0.6} color="#d0e0ff" />

              {/* Rim/back light — highlights edges for separation */}
              <directionalLight position={[1, 3, -4]} intensity={0.8} color="#c0d4ff" />

              {/* Bottom bounce — subtle warm fill from below */}
              <directionalLight position={[0, -3, 2]} intensity={0.25} color="#ffe8d0" />

              {/* Specular accent — creates the "hot spot" highlight on the card */}
              <spotLight
                position={[2, 4, 8]}
                angle={0.15}
                penumbra={0.8}
                intensity={0.6}
                color="#ffffff"
                distance={20}
                decay={2}
              />

              <Card3D key="card3d" />

              {/* Studio-style environment with custom lightformers */}
              <Environment background={false} resolution={1024}>
                {/* Main soft box — large, from above-front */}
                <Lightformer
                  form="rect"
                  intensity={4.0}
                  position={[0, 4, 3]}
                  rotation={[-Math.PI / 3, 0, 0]}
                  scale={[10, 5, 1]}
                  color="#fff8f0"
                />
                {/* Side accent strip — cool blue edge light */}
                <Lightformer
                  form="rect"
                  intensity={1.8}
                  position={[-5, 1, 0]}
                  rotation={[0, Math.PI / 2, 0]}
                  scale={[5, 2, 1]}
                  color="#c8d8ff"
                />
                {/* Opposite side fill strip */}
                <Lightformer
                  form="rect"
                  intensity={1.2}
                  position={[5, 0, -1]}
                  rotation={[0, -Math.PI / 2, 0]}
                  scale={[4, 2.5, 1]}
                  color="#e0e8ff"
                />
                {/* Bottom warm bounce panel */}
                <Lightformer
                  form="rect"
                  intensity={0.4}
                  position={[0, -3, 0]}
                  rotation={[Math.PI / 2, 0, 0]}
                  scale={[8, 4, 1]}
                  color="#fff0e0"
                />
                {/* Back rim strip */}
                <Lightformer
                  form="rect"
                  intensity={2.5}
                  position={[0, 2, -5]}
                  rotation={[0, 0, 0]}
                  scale={[10, 4, 1]}
                  color="#d0e0ff"
                />
              </Environment>

              <Suspense fallback={null}>
                <ContactShadows
                  position={[0, -CARD_H / 2 - 0.3, 0]}
                  opacity={isDark ? 0.5 : 0.3}
                  scale={10}
                  blur={2.5}
                  far={5}
                  resolution={512}
                />
              </Suspense>

              {/* Post-processing for cinematic quality */}
              <EffectComposer>
                <Bloom
                  luminanceThreshold={0.85}
                  luminanceSmoothing={0.3}
                  intensity={0.25}
                  mipmapBlur
                />
                <Vignette
                  eskil={false}
                  offset={0.35}
                  darkness={isDark ? 0.4 : 0.2}
                />
              </EffectComposer>

              <OrbitControls
                enableDamping
                dampingFactor={0.05}
                minDistance={1}
                maxDistance={15}
              />
              <ExportHelper onReady={handleExportReady} />
            </Canvas>
          </CanvasErrorBoundary>
        )}

        {(scene === 'wallet-apple' || scene === 'wallet-google') && (
          <div className="flex-1 flex items-center justify-center h-full overflow-y-auto py-6" data-wallet-preview>
            <PhoneFrame isDark={config.walletDarkMode}>
              {scene === 'wallet-apple' ? (
                <AppleWalletView config={config} />
              ) : (
                <GoogleWalletView config={config} />
              )}
            </PhoneFrame>
          </div>
        )}

        {scene === 'terminal' && (
          <POSTerminalPreview />
        )}

        {scene === 'compare' && (
          <ComparisonView />
        )}
      </div>

      {/* Export overlay */}
      {exporting && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl ${
            isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'
          }`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin text-sky-500">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
              <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="text-xs font-medium">{exporting}</span>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="assertive"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg text-xs font-medium shadow-lg backdrop-blur-sm animate-[fadeInOut_2.2s_ease-in-out] bg-slate-800/90 text-white border border-slate-600/50"
        >
          {toast}
        </div>
      )}

      {/* Export Menu */}
      <ExportMenu
        isDark={isDark}
        scene={scene}
        onExportPNG={handleExportCard}
        onExportPDF={handleExportPDF}
        onExportSVG={handleExportSVG}
        onExportWallet={handleExportWallet}
        onCopyConfig={handleCopyConfig}
        onShareLink={handleShareLink}
      />
    </div>
  );
}
