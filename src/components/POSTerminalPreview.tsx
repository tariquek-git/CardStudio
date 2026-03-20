import { useEffect, useRef, useState } from 'react';
import { useCardConfig } from '../context';
import { drawCardFront, ensureLogosLoaded } from '../canvas';

export default function POSTerminalPreview() {
  const { config } = useCardConfig();
  const [cardImage, setCardImage] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDark = config.darkMode;

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current || document.createElement('canvas');
    if (!canvasRef.current) canvasRef.current = canvas;

    ensureLogosLoaded(config.issuerLogo, config.cardArt).then(() => {
      if (cancelled) return;
      drawCardFront(canvas, config);
      setCardImage(canvas.toDataURL('image/png'));
    });
    return () => { cancelled = true; };
  }, [config]);

  const termBg = isDark ? '#1e293b' : '#374151';
  const screenBg = isDark ? '#0f172a' : '#111827';

  return (
    <div className="flex flex-col items-center justify-center h-full py-4 px-4">
      {/* Floating mini card */}
      <div className="relative mb-2">
        {cardImage && (
          <img
            src={cardImage}
            alt="Card preview"
            className="w-44 rounded-lg shadow-2xl"
            style={{ animation: 'cardFloat 3s ease-in-out infinite' }}
          />
        )}

        {/* Contactless waves */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
          <svg width="40" height="30" viewBox="0 0 40 30">
            <path d="M14 22a8 8 0 0 1 0-14" stroke="#4ade80" strokeWidth="2" fill="none" strokeLinecap="round"
              style={{ animation: 'wave1 2s ease-in-out infinite' }} />
            <path d="M10 25a13 13 0 0 1 0-20" stroke="#4ade80" strokeWidth="2" fill="none" strokeLinecap="round"
              style={{ animation: 'wave2 2s ease-in-out infinite' }} />
            <path d="M6 28a18 18 0 0 1 0-26" stroke="#4ade80" strokeWidth="2" fill="none" strokeLinecap="round"
              style={{ animation: 'wave3 2s ease-in-out infinite' }} />
          </svg>
        </div>
      </div>

      {/* POS Terminal */}
      <div
        className="rounded-2xl p-3 pt-4 shadow-xl relative"
        style={{
          background: termBg,
          width: 160,
          animation: 'terminalGlow 3s ease-in-out infinite',
        }}
      >
        {/* Screen */}
        <div
          className="rounded-lg mb-3 flex flex-col items-center justify-center py-3"
          style={{ background: screenBg }}
        >
          <div className="text-green-400 text-xs font-mono font-bold tracking-wider mb-0.5">
            TAP CARD
          </div>
          <div className="text-green-400/50 text-[10px] font-mono">
            $42.50
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-1.5 mb-3 px-1">
          {[1,2,3,4,5,6,7,8,9,'*',0,'#'].map((k, i) => (
            <div
              key={i}
              className="aspect-square rounded flex items-center justify-center text-[10px] font-mono"
              style={{
                background: isDark ? '#334155' : '#4b5563',
                color: isDark ? '#94a3b8' : '#d1d5db',
              }}
            >
              {k}
            </div>
          ))}
        </div>

        {/* Action buttons row */}
        <div className="flex gap-1 px-1">
          <div className="flex-1 h-4 rounded" style={{ background: '#ef4444' }} />
          <div className="flex-1 h-4 rounded" style={{ background: '#eab308' }} />
          <div className="flex-1 h-4 rounded" style={{ background: '#22c55e' }} />
        </div>

        {/* Card slot indicator */}
        <div className="mt-3 mx-auto rounded-sm" style={{
          width: 80,
          height: 4,
          background: isDark ? '#475569' : '#6b7280',
        }} />
      </div>

      {/* Label */}
      <div className={`mt-3 text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        Contactless Payment Preview
      </div>
    </div>
  );
}
