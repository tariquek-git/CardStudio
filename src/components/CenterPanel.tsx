import React, { useRef, useEffect, useMemo, useCallback, useState, Suspense, Component, type ErrorInfo, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useCardConfig } from '../context';
import { drawCardFront, drawCardBack, ensureLogosLoaded } from '../cardCanvas';
import { presetColors } from '../data';
import type { CardMaterial, RenderScene } from '../types';
import { downloadCardSVG } from '../svgExport';
import { PhoneFrame, AppleWalletView, GoogleWalletView } from './WalletPreview';
import POSTerminalPreview from './POSTerminalPreview';

// ─── Error Boundary for WebGL Canvas ────────────────────────
class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('3D Canvas error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-slate-900 text-slate-400">
          <div className="text-center px-8">
            <div className="text-4xl mb-3">⚠</div>
            <p className="text-sm font-medium mb-1">Card preview unavailable</p>
            <p className="text-xs text-slate-500">
              Your browser may not support WebGL.{' '}
              <button
                onClick={() => this.setState({ hasError: false })}
                className="underline text-sky-400 hover:text-sky-300"
              >
                Try again
              </button>
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Toast hook ──────────────────────────────────────────────
function useToast(initial: string | null = null) {
  const [toast, setToast] = useState<string | null>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((msg: string) => {
    clearTimeout(timerRef.current);
    setToast(msg);
    timerRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  return { toast, show };
}

// Card dimensions in 3D units (CR80 proportions)
const CARD_W = 3.375;
const CARD_H = 2.125;
const CARD_D = 0.03;
const CORNER_R = 0.125;

// Background colors per theme
const BG_DARK = new THREE.Color('#1a1a1a');
const BG_LIGHT = new THREE.Color('#e8ecf1');

// ─── Material configs (MeshPhysicalMaterial for realistic card finishes) ──
function getMaterialProps(material: CardMaterial): Partial<THREE.MeshPhysicalMaterialParameters> {
  switch (material) {
    case 'glossy':
      return { roughness: 0.35, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.15 };
    case 'metal':
      return { roughness: 0.15, metalness: 0.9, clearcoat: 0.3, clearcoatRoughness: 0.1, reflectivity: 0.9 };
    case 'brushedMetal':
      return { roughness: 0.45, metalness: 0.7, clearcoat: 0.2, clearcoatRoughness: 0.3, anisotropy: 0.8, anisotropyRotation: Math.PI / 2 };
    case 'clear':
      return { roughness: 0.1, metalness: 0.0, clearcoat: 0.9, clearcoatRoughness: 0.05, transmission: 0.6, ior: 1.5, thickness: 0.5 };
    case 'holographic':
      return { roughness: 0.2, metalness: 0.8, clearcoat: 0.8, clearcoatRoughness: 0.05, iridescence: 1.0, iridescenceIOR: 1.3, iridescenceThicknessRange: [100, 400] as [number, number] };
    case 'recycledPlastic':
      return { roughness: 0.95, metalness: 0.0, sheen: 0.2, sheenRoughness: 0.9, sheenColor: new THREE.Color('#a0a0a0') };
    case 'wood':
      return { roughness: 0.75, metalness: 0.0, sheen: 0.15, sheenRoughness: 0.7, sheenColor: new THREE.Color('#8B6914') };
    case 'matte':
    default:
      return { roughness: 0.85, metalness: 0.0, sheen: 0.3, sheenRoughness: 0.8, sheenColor: new THREE.Color('#ffffff') };
  }
}

// ─── Create rounded rectangle shape ─────────────────────────
function createRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return shape;
}

// ─── Side-wall-only geometry (no caps) ──────────────────────
// Builds a thin perimeter strip from the rounded-rect outline.
// This replaces ExtrudeGeometry which created problematic front/back caps.
function createSideWallGeometry(
  w: number, h: number, r: number, depth: number,
): THREE.BufferGeometry {
  const shape = createRoundedRectShape(w, h, r);
  const pts = shape.getPoints(48);
  const segCount = pts.length - 1;
  const halfD = depth / 2;

  const positions = new Float32Array(segCount * 4 * 3);
  const normals = new Float32Array(segCount * 4 * 3);
  const indices: number[] = [];

  for (let i = 0; i < segCount; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dy / len;
    const ny = -dx / len;

    const base = i * 4;
    positions.set([p0.x, p0.y, halfD], base * 3);
    positions.set([p1.x, p1.y, halfD], (base + 1) * 3);
    positions.set([p1.x, p1.y, -halfD], (base + 2) * 3);
    positions.set([p0.x, p0.y, -halfD], (base + 3) * 3);

    for (let j = 0; j < 4; j++) normals.set([nx, ny, 0], (base + j) * 3);

    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

// ─── 3D Card Component ──────────────────────────────────────
function Card3D() {
  const { config } = useCardConfig();
  const groupRef = useRef<THREE.Group>(null);
  const targetFlip = useRef(0);
  const currentFlip = useRef(0);
  const smoothTiltX = useRef(0);
  const smoothTiltY = useRef(0);
  const frontMatRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const backMatRef = useRef<THREE.MeshPhysicalMaterial>(null);

  const frontCanvas = useMemo(() => document.createElement('canvas'), []);
  const backCanvas = useMemo(() => document.createElement('canvas'), []);
  const frontTex = useMemo(() => {
    const tex = new THREE.CanvasTexture(frontCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.generateMipmaps = true;
    return tex;
  }, [frontCanvas]);
  const backTex = useMemo(() => {
    const tex = new THREE.CanvasTexture(backCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.generateMipmaps = true;
    return tex;
  }, [backCanvas]);

  const isVertical = config.orientation === 'vertical';
  const cardWidth = isVertical ? CARD_H : CARD_W;
  const cardHeight = isVertical ? CARD_W : CARD_H;

  // Redraw textures whenever config changes
  useEffect(() => {
    let cancelled = false;
    const redraw = () => {
      if (cancelled) return;
      drawCardFront(frontCanvas, config);
      drawCardBack(backCanvas, config);
      // eslint-disable-next-line react-hooks/immutability -- Three.js textures require direct mutation
      frontTex.needsUpdate = true;
      // eslint-disable-next-line react-hooks/immutability -- Three.js textures require direct mutation
      backTex.needsUpdate = true;
    };
    // Ensure fonts + logos are loaded before first draw
    Promise.all([
      document.fonts.ready,
      ensureLogosLoaded(config.issuerLogo, config.cardArt),
    ]).then(redraw);
    // Also redraw immediately in case logos already cached
    redraw();
    return () => { cancelled = true; };
  }, [config, frontCanvas, backCanvas, frontTex, backTex]);

  useEffect(() => {
    targetFlip.current = config.face === 'back' ? Math.PI : 0;
  }, [config.face]);

  const cardShape = useMemo(
    () => createRoundedRectShape(cardWidth, cardHeight, CORNER_R),
    [cardWidth, cardHeight],
  );

  // Side-wall-only geometry — no caps, just the perimeter edge strip
  const sideWallGeometry = useMemo(
    () => createSideWallGeometry(cardWidth, cardHeight, CORNER_R, CARD_D),
    [cardWidth, cardHeight],
  );

  // Rounded-rect face geometry with normalized UVs
  const faceGeometry = useMemo(() => {
    const geo = new THREE.ShapeGeometry(cardShape);
    const uvAttr = geo.attributes.uv;
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setX(i, (uvAttr.getX(i) + cardWidth / 2) / cardWidth);
      uvAttr.setY(i, (uvAttr.getY(i) + cardHeight / 2) / cardHeight);
    }
    uvAttr.needsUpdate = true;
    return geo;
  }, [cardShape, cardWidth, cardHeight]);

  const matProps = getMaterialProps(config.material);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const diff = targetFlip.current - currentFlip.current;
    if (Math.abs(diff) > 0.01) {
      currentFlip.current += diff * Math.min(delta * 6, 1);
    }

    // Smooth mouse-reactive tilt
    const lerpFactor = Math.min(delta * 4, 1);
    smoothTiltX.current += (-state.pointer.y * 0.1 - smoothTiltX.current) * lerpFactor;
    smoothTiltY.current += (state.pointer.x * 0.08 - smoothTiltY.current) * lerpFactor;

    groupRef.current.rotation.x = smoothTiltX.current;
    groupRef.current.rotation.y = currentFlip.current + Math.sin(Date.now() * 0.0003) * 0.04 + smoothTiltY.current;
    groupRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.03;
    groupRef.current.rotation.z = Math.sin(Date.now() * 0.0007) * 0.02;

    // Holographic iridescence animation
    if (config.material === 'holographic') {
      const t = Date.now() * 0.001;
      const range: [number, number] = [100 + Math.sin(t) * 50, 400 + Math.cos(t * 0.7) * 100];
      if (frontMatRef.current) frontMatRef.current.iridescenceThicknessRange = range;
      if (backMatRef.current) backMatRef.current.iridescenceThicknessRange = range;
    }
  });

  const edgeColor = useMemo(() => {
    if (config.colorMode === 'solid') return config.solidColor;
    if (config.colorMode === 'gradient') return config.gradientConfig.stops[0]?.color || '#1a1a1a';
    if (config.colorMode === 'preset') {
      const preset = presetColors[config.presetColor];
      return preset?.value || '#1a1a1a';
    }
    return '#1a1a1a';
  }, [config.colorMode, config.solidColor, config.presetColor, config.gradientConfig]);

  return (
    <group ref={groupRef}>
      {/* Side walls — pushed back in depth buffer to never peek through faces */}
      <mesh geometry={sideWallGeometry}>
        <meshPhysicalMaterial
          color={edgeColor}
          {...matProps}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {/* Front face — ShapeGeometry clips to rounded-rect, UVs normalized to 0-1 */}
      <mesh geometry={faceGeometry} position={[0, 0, CARD_D / 2 + 0.001]}>
        <meshPhysicalMaterial ref={frontMatRef} map={frontTex} {...matProps} side={THREE.FrontSide} />
      </mesh>

      {/* Back face — rotated 180° on Y axis */}
      <mesh geometry={faceGeometry} position={[0, 0, -CARD_D / 2 - 0.001]} rotation={[0, Math.PI, 0]}>
        <meshPhysicalMaterial ref={backMatRef} map={backTex} {...matProps} side={THREE.FrontSide} />
      </mesh>
    </group>
  );
}

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

  const handleExportPDF = useCallback(async () => {
    try {
      const { drawCardFront: drawFront, drawCardBack: drawBack } = await import('../cardCanvas');
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

      pdf.save('card-print-spec.pdf');
      showToast('Print-ready PDF downloaded (300 DPI)');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('PDF export failed');
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
              camera={{ position: [0.2, 0.15, 6.5], fov: 32 }}
              frameloop="always"
              onCreated={({ gl }) => {
                gl.toneMapping = THREE.ACESFilmicToneMapping;
                gl.toneMappingExposure = 1.1;
              }}
            >
              <color attach="background" args={isDark ? [BG_DARK.r, BG_DARK.g, BG_DARK.b] : [BG_LIGHT.r, BG_LIGHT.g, BG_LIGHT.b]} />

              <ambientLight intensity={0.5} />
              <directionalLight
                position={[3, 4, 5]}
                intensity={1.2}
                color="#fff5e6"
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-bias={-0.0001}
              />
              <directionalLight position={[-2, 3, 1]} intensity={0.5} color="#e0e8ff" />
              <directionalLight position={[0, -1, 4]} intensity={0.4} />
              <pointLight position={[-1, 2, 5]} intensity={0.3} />
              <directionalLight position={[-1, 2, -3]} intensity={0.35} color="#c0d0ff" />
              <directionalLight position={[0, -2, -3]} intensity={0.6} color="#b0c4ff" />

              <Card3D key="card3d" />

              <Environment preset="apartment" background={false} />

              <Suspense fallback={null}>
                <ContactShadows
                  position={[0, -CARD_H / 2 - 0.3, 0]}
                  opacity={isDark ? 0.4 : 0.25}
                  scale={8}
                  blur={2}
                  far={4}
                />
              </Suspense>

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
      </div>

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

      {/* Floating Export Buttons */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
        <ExportButton onClick={handleExportCard} isDark={isDark} label="Download Card PNG" icon="↓" />
        <ExportButton onClick={handleExportPDF} isDark={isDark} label="Print-Ready PDF (300 DPI)" icon="P" />
        <ExportButton onClick={handleExportSVG} isDark={isDark} label="Download SVG (Figma)" icon="S" />
        {(scene === 'wallet-apple' || scene === 'wallet-google') && (
          <ExportButton onClick={handleExportWallet} isDark={isDark} label="Download Wallet Mockup" icon="W" />
        )}
        <ExportButton onClick={handleCopyConfig} isDark={isDark} label="Copy Config" icon="C" />
        <ExportButton onClick={handleShareLink} isDark={isDark} label="Share Link" icon="L" />
      </div>
    </div>
  );
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
];

function RenderSceneSelector({ scene, isDark }: { scene: RenderScene; isDark: boolean }) {
  const { updateConfig } = useCardConfig();
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
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
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
    </div>
  );
}

function ExportButton({
  onClick,
  isDark,
  label,
  icon,
}: {
  onClick: () => void;
  isDark: boolean;
  label: string;
  icon: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all shadow-lg hover:shadow-xl ${
        isDark
          ? 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-600/50'
          : 'bg-white/90 text-slate-600 hover:bg-white border border-slate-200'
      } backdrop-blur-sm`}
    >
      <span>{icon}</span>
      <span className="max-w-0 overflow-hidden group-hover:max-w-[200px] transition-all duration-300 whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}
