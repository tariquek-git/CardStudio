import { drawCardFront, ensureLogosLoaded } from './canvas';
import type { CardConfig } from './types';

// Generate a thumbnail from a card config
// drawCardFront sets its own canvas dimensions (2048×1290), so we render at
// full resolution then downscale to a crisp, compact data URL.
export function generateThumbnail(config: CardConfig): Promise<string> {
  return new Promise(resolve => {
    const fullCanvas = document.createElement('canvas');
    Promise.all([
      document.fonts.ready,
      ensureLogosLoaded(config.issuerLogo, config.cardArt),
    ])
      .then(() => {
        drawCardFront(fullCanvas, config);
        // Downscale to 640×403 for sharp thumbnails without bloating storage
        const thumb = document.createElement('canvas');
        thumb.width = 640;
        thumb.height = 403;
        const ctx = thumb.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(fullCanvas, 0, 0, thumb.width, thumb.height);
        }
        resolve(thumb.toDataURL('image/webp', 0.85));
      })
      .catch(() => {
        resolve('');
      });
  });
}
