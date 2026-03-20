import { useRef, useState } from 'react';
import { useCardConfig } from '../context';

// Extract dominant colors from an image using canvas sampling
function extractColors(img: HTMLImageElement, sampleCount = 5): string[] {
  const canvas = document.createElement('canvas');
  const size = 100; // downsample for speed
  canvas.width = size;
  canvas.height = Math.round(size * (img.naturalHeight / img.naturalWidth));
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  // Collect all pixels, skip near-white and near-black
  const pixels: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const brightness = (r + g + b) / 3;
    if (brightness > 20 && brightness < 240) {
      pixels.push([r, g, b]);
    }
  }

  if (pixels.length === 0) return ['#1a1a1a'];

  // Simple k-means clustering
  const clusters = kMeans(pixels, Math.min(sampleCount, pixels.length));
  return clusters.map(([r, g, b]) =>
    `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  );
}

function kMeans(pixels: [number, number, number][], k: number): [number, number, number][] {
  // Initialize centroids by sampling evenly
  const step = Math.floor(pixels.length / k);
  let centroids: [number, number, number][] = Array.from({ length: k }, (_, i) => [...pixels[i * step]]);

  for (let iter = 0; iter < 10; iter++) {
    const clusters: [number, number, number][][] = Array.from({ length: k }, () => []);

    for (const px of pixels) {
      let minDist = Infinity;
      let closest = 0;
      for (let c = 0; c < k; c++) {
        const d = (px[0] - centroids[c][0]) ** 2 + (px[1] - centroids[c][1]) ** 2 + (px[2] - centroids[c][2]) ** 2;
        if (d < minDist) { minDist = d; closest = c; }
      }
      clusters[closest].push(px);
    }

    centroids = clusters.map((cluster, i) => {
      if (cluster.length === 0) return centroids[i];
      const avg: [number, number, number] = [0, 0, 0];
      for (const px of cluster) { avg[0] += px[0]; avg[1] += px[1]; avg[2] += px[2]; }
      return [
        Math.round(avg[0] / cluster.length),
        Math.round(avg[1] / cluster.length),
        Math.round(avg[2] / cluster.length),
      ];
    });
  }

  // Sort by cluster size (most dominant first)
  return centroids;
}

export default function CardPhotoImport({ isDark }: { isDark: boolean }) {
  const { updateConfig } = useCardConfig();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      const img = new Image();
      img.onload = () => {
        const extracted = extractColors(img, 5);
        setColors(extracted);
        setLoading(false);
      };
      img.onerror = () => setLoading(false);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const applyColor = (color: string, mode: 'solid' | 'gradient') => {
    if (mode === 'solid') {
      updateConfig({ colorMode: 'solid', solidColor: color });
    } else if (colors.length >= 2) {
      updateConfig({
        colorMode: 'gradient',
        gradientConfig: {
          stops: colors.slice(0, 3).map((c, i) => ({
            color: c,
            position: Math.round((i / (Math.min(colors.length, 3) - 1)) * 100),
          })),
          angle: 135,
        },
      });
    }
  };

  const applyAsCardArt = () => {
    if (preview) {
      updateConfig({ cardArt: preview, cardArtOpacity: 90, cardArtFit: 'cover' });
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {!preview ? (
        <button
          onClick={() => fileRef.current?.click()}
          className={`w-full py-6 rounded-xl border-2 border-dashed transition-all ${
            isDark
              ? 'border-slate-600/50 text-slate-400 hover:border-sky-500/40 hover:text-sky-400 hover:bg-sky-500/5'
              : 'border-slate-200 text-slate-400 hover:border-sky-300 hover:text-sky-500 hover:bg-sky-50'
          }`}
        >
          <div className="text-2xl mb-1">+</div>
          <div className="text-xs font-medium">Upload a card photo</div>
          <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            Extract colors and use as inspiration
          </div>
        </button>
      ) : (
        <div>
          <div className="relative">
            <img src={preview} alt="Uploaded card" className="w-full rounded-lg shadow-md" />
            <button
              onClick={() => { setPreview(null); setColors([]); }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
            >
              x
            </button>
          </div>

          {loading && (
            <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Analyzing colors...</p>
          )}

          {colors.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Extracted palette:
              </p>
              <div className="flex gap-1.5">
                {colors.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => applyColor(c, 'solid')}
                    className="w-8 h-8 rounded-lg border-2 border-transparent hover:border-sky-400 transition-all hover:scale-110 shadow-sm"
                    style={{ backgroundColor: c }}
                    title={`Apply ${c} as solid color`}
                  />
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                {colors.length >= 2 && (
                  <button
                    onClick={() => applyColor(colors[0], 'gradient')}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                      isDark
                        ? 'bg-slate-700/60 text-slate-300 hover:bg-slate-600 border border-slate-600/50'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Apply as Gradient
                  </button>
                )}
                <button
                  onClick={applyAsCardArt}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                    isDark
                      ? 'bg-slate-700/60 text-slate-300 hover:bg-slate-600 border border-slate-600/50'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Use as Card Art
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
