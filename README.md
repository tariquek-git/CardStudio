# Fintech Commons Card Studio

Design payment cards in 3D with live wallet mockups. See what your card program could look like before you ship it.

## Features

- **3D Card Preview** — Physically-based rendering with clearcoat, iridescence, and anisotropy via Three.js
- **8 Card Materials** — Matte, Glossy, Metal, Brushed Metal, Clear, Holographic, Recycled Plastic, Wood
- **Card Art System** — Upload, URL, or gallery selection with blend modes, tint, blur, and position controls
- **Wallet Mockups** — Apple Wallet and Google Wallet previews with dark mode
- **Brand Guidelines** — Real-time advisory warnings for network compliance
- **8 Card Networks** — Visa, Mastercard, Amex, Discover, Interac, UnionPay, JCB, Maestro with tier support
- **Full Customization** — Colors, gradients, chip styles, number placement, orientation, card type
- **Export** — Download card PNGs, wallet mockups, and shareable links

## Tech Stack

- React 19 + TypeScript
- Three.js / React Three Fiber for 3D rendering
- Tailwind CSS 4 for styling
- Vite for bundling

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deployment

Configured for Vercel with optimal caching headers. Deploy with:

```bash
vercel
```

## License

Built by [Fintech Commons](https://fintechcommons.io).
