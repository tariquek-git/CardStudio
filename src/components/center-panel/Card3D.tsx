import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCardConfig } from '../../context';
import { drawCardFront, drawCardBack, ensureLogosLoaded } from '../../canvas';
import { presetColors } from '../../data';
import type { CardMaterial } from '../../types';

// Card dimensions in 3D units (CR80 proportions)
export const CARD_W = 3.375;
export const CARD_H = 2.125;
export const CARD_D = 0.03;
export const CORNER_R = 0.125;

// ─── Material configs (MeshPhysicalMaterial for realistic card finishes) ──
export function getMaterialProps(material: CardMaterial): Partial<THREE.MeshPhysicalMaterialParameters> {
  switch (material) {
    case 'glossy':
      return {
        roughness: 0.15, metalness: 0.02, clearcoat: 1.0, clearcoatRoughness: 0.06,
        reflectivity: 0.6, envMapIntensity: 1.5,
      };
    case 'metal':
      return {
        roughness: 0.08, metalness: 0.7, clearcoat: 0.9, clearcoatRoughness: 0.04,
        reflectivity: 1.0, envMapIntensity: 2.2,
      };
    case 'brushedMetal':
      return {
        roughness: 0.28, metalness: 0.6, clearcoat: 0.7, clearcoatRoughness: 0.1,
        anisotropy: 1.0, anisotropyRotation: Math.PI / 2,
        reflectivity: 0.9, envMapIntensity: 2.0,
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
export function createRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
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
export function createSideWallGeometry(
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
export default function Card3D() {
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
