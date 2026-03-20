import React, { useRef, useEffect, useMemo, useCallback, useState, Suspense, Component, type ErrorInfo, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useCardConfig } from '../context';
import { drawCardFront, drawCardBack, ensureLogosLoaded } from '../cardCanvas';
import { presetColors } from '../data';
import type { CardMaterial, RenderScene } from '../types';
import { downloadCardSVG } from '../svgExport';
import { validateCompliance } from '../compliance';
import { PhoneFrame, AppleWalletView, GoogleWalletView } from './WalletPreview';
import POSTerminalPreview from './POSTerminalPreview';
import ComparisonView from './ComparisonView';

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
      return {
        roughness: 0.18, metalness: 0.02, clearcoat: 1.0, clearcoatRoughness: 0.08,
        reflectivity: 0.5, envMapIntensity: 1.2,
      };
    case 'metal':
      return {
        roughness: 0.08, metalness: 0.95, clearcoat: 0.5, clearcoatRoughness: 0.04,
        reflectivity: 1.0, envMapIntensity: 1.8,
      };
    case 'brushedMetal':
      return {
        roughness: 0.35, metalness: 0.85, clearcoat: 0.3, clearcoatRoughness: 0.15,
        anisotropy: 1.0, anisotropyRotation: Math.PI / 2,
        reflectivity: 0.8, envMapIntensity: 1.4,
      };
    case 'clear':
      return {
        roughness: 0.05, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.02,
        transmission: 0.7, ior: 1.52, thickness: 0.8,
        envMapIntensity: 1.5, specularIntensity: 1.0,
      };
    case 'holographic':
      return {
        roughness: 0.15, metalness: 0.4, clearcoat: 1.0, clearcoatRoughness: 0.03,
        iridescence: 1.0, iridescenceIOR: 1.5, iridescenceThicknessRange: [100, 500] as [number, number],
        envMapIntensity: 1.8, reflectivity: 0.8, specularIntensity: 1.0,
      };
    case 'recycledPlastic':
      return {
        roughness: 0.9, metalness: 0.0, sheen: 0.3, sheenRoughness: 0.85,
        sheenColor: new THREE.Color('#b0b0b0'), envMapIntensity: 0.4,
      };
    case 'wood':
      return {
        roughness: 0.7, metalness: 0.0, sheen: 0.2, sheenRoughness: 0.6,
        sheenColor: new THREE.Color('#8B6914'), envMapIntensity: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.3,
      };
    case 'matte':
    default:
      return {
        roughness: 0.75, metalness: 0.0, sheen: 0.4, sheenRoughness: 0.7,
        sheenColor: new THREE.Color('#ffffff'), envMapIntensity: 0.6,
        clearcoat: 0.15, clearcoatRoughness: 0.4,
      };
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
  const texDirtyFrames = useRef(0);

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
      // Mark textures dirty for several frames so useFrame can set needsUpdate
      // at the right moment (survives StrictMode double-mount)
      texDirtyFrames.current = 5;
    };
    // Ensure fonts + logos are loaded before first draw
    Promise.all([
      document.fonts.ready,
      ensureLogosLoaded(config.issuerLogo, config.cardArt, config.coBrandLogo, config.backQrUrl),
    ]).then(redraw);
    // Draw immediately with canvas data
    redraw();
    return () => { cancelled = true; };
  }, [config, frontCanvas, backCanvas]);

  useEffect(() => {
    targetFlip.current = config.face === 'back' ? Math.PI : 0;
  }, [config.face]);

  const cardShape = useMemo(
    () => createRoundedRectShape(cardWidth, cardHeight, CORNER_R),
    [cardWidth, cardHeight],
  );

  // Side-wall-only geometry — no caps, just the perimeter edge strip
  const sideWallGeometry = useMemo(() => {
    const geo = createSideWallGeometry(cardWidth, cardHeight, CORNER_R, CARD_D);
    return geo;
  }, [cardWidth, cardHeight]);

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

  // Note: geometry disposal happens automatically when useMemo dependencies change
  // (old geo becomes unreferenced and GC'd). Explicit dispose avoided due to StrictMode double-mount.

  const matProps = getMaterialProps(config.material);

  useFrame((state, delta) => {
    // Apply texture updates inside the render loop where Three.js will consume them
    if (texDirtyFrames.current > 0) {
      frontTex.needsUpdate = true;
      backTex.needsUpdate = true;
      texDirtyFrames.current--;
    }

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
          roughness={0.3}
          metalness={0.1}
          clearcoat={0.6}
          clearcoatRoughness={0.1}
          envMapIntensity={1.0}
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

  const [exporting, setExporting] = useState<string | null>(null);

  const handleExportPDF = useCallback(async () => {
    setExporting('Generating print-ready PDF...');
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

      const { ensureLogosLoaded: loadLogos } = await import('../cardCanvas');
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
                gl.toneMappingExposure = 1.15;
              }}
            >
              <color attach="background" args={isDark ? [BG_DARK.r, BG_DARK.g, BG_DARK.b] : [BG_LIGHT.r, BG_LIGHT.g, BG_LIGHT.b]} />

              {/* Ambient fill — balanced for readable card faces */}
              <ambientLight intensity={0.5} />

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
              <Environment background={false} resolution={512}>
                {/* Main soft box — large, from above-front */}
                <Lightformer
                  form="rect"
                  intensity={3.0}
                  position={[0, 4, 3]}
                  rotation={[-Math.PI / 3, 0, 0]}
                  scale={[8, 4, 1]}
                  color="#fff8f0"
                />
                {/* Side accent strip — cool blue edge light */}
                <Lightformer
                  form="rect"
                  intensity={1.2}
                  position={[-5, 1, 0]}
                  rotation={[0, Math.PI / 2, 0]}
                  scale={[4, 1.5, 1]}
                  color="#c8d8ff"
                />
                {/* Opposite side fill strip */}
                <Lightformer
                  form="rect"
                  intensity={0.8}
                  position={[5, 0, -1]}
                  rotation={[0, -Math.PI / 2, 0]}
                  scale={[3, 2, 1]}
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
                  intensity={2.0}
                  position={[0, 2, -5]}
                  rotation={[0, 0, 0]}
                  scale={[8, 3, 1]}
                  color="#c0d0f0"
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

function ExportMenu({
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
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-lg hover:shadow-xl ${
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
                <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
