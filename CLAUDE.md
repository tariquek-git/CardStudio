# CLAUDE.md — Card Studio

## Project Overview

Card Studio is a payment card design tool for fintech builders. Users can design payment cards in 3D, preview them in Apple/Google Wallet mockups and POS terminal scenes, run compliance checks against network and regional regulations, and export production-ready assets.

- **Live URL:** https://cardstudio.fintechcommons.io
- **Part of:** Fintech Commons ecosystem (hub at https://fintechcommons.com)
- **Hosted on:** Vercel (SPA + serverless API routes)

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 8, `@vitejs/plugin-react` |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite` plugin) |
| 3D Rendering | Three.js + React Three Fiber + Drei + Postprocessing |
| Database | PostgreSQL (Neon serverless) via Prisma 7 |
| Auth | JWT (jose) with bcryptjs — access tokens (15 min) + refresh tokens (30 day) |
| AI | Anthropic SDK (Claude) for natural-language card design generation |
| File Storage | Vercel Blob (`@vercel/blob`) |
| Validation | Zod 4 |
| Export | html2canvas, jsPDF, custom SVG export |
| QR Codes | qrcode library (card back QR) |
| Testing | Vitest + jsdom + React Testing Library |
| Linting | ESLint 9 (flat config) with typescript-eslint, react-hooks, react-refresh |
| Formatting | Prettier |
| Git Hooks | Husky + lint-staged (pre-commit runs `npx lint-staged`) |
| Node | >= 20 |

## Project Structure

```
card-studio/
├── api/                        # Vercel serverless API routes
│   ├── _lib/                   # Shared server utils (auth, prisma, audit, upload, validation)
│   ├── auth/                   # login, register, me, refresh
│   ├── designs/                # CRUD + [id]/compliance, duplicate, thumbnail
│   ├── programs/               # CRUD + [id]/tiers, duplicate
│   ├── admin/                  # stats, users, designs, templates, audit
│   ├── upload/                 # File upload (Vercel Blob)
│   └── migrate/                # Data migration endpoint
├── prisma/
│   └── schema.prisma           # User, Org, Design, CardProgram, ProgramTier, AuditLog, ApiKey
├── src/
│   ├── App.tsx                 # Root component — client-side router (dashboard/editor/program-editor/admin)
│   ├── main.tsx                # Entry point
│   ├── context.tsx             # CardConfig context — undo/redo history, design CRUD, program management
│   ├── types.ts                # Core types: CardConfig, SavedDesign, CardProgram, ProgramTier, print specs
│   ├── data.ts                 # Preset colors, network tier configs, card number generators
│   ├── analytics.ts            # Zero-dependency event bus (subscribable for PostHog/Segment)
│   ├── templates.ts            # Design templates
│   ├── autoDefaults.ts         # Smart defaults logic
│   ├── brandRules.ts           # Brand rule enforcement
│   ├── sectionUtils.ts         # Section helper utilities
│   ├── svgExport.ts            # SVG export renderer
│   ├── cardCanvas.ts           # Canvas dimension constants
│   ├── thumbnailUtils.ts       # Thumbnail generation
│   ├── index.css               # Global styles
│   ├── ai/                     # Anthropic-powered AI design generation
│   │   ├── generateDesign.ts   # Claude tool-use to produce CardConfig from natural language
│   │   ├── validateGenerated.ts
│   │   └── apiKey.ts
│   ├── api/                    # Client-side API wrappers
│   │   ├── client.ts           # Base fetch with auth token management
│   │   ├── auth.ts             # Auth API calls
│   │   ├── designs.ts          # Design API calls
│   │   ├── programs.ts         # Program API calls
│   │   └── upload.ts           # Upload API call
│   ├── auth/                   # Auth UI
│   │   ├── AuthProvider.tsx    # Auth context — JWT session restore, login/register/logout
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── canvas/                 # 2D card rendering (Canvas API)
│   │   ├── drawFront.ts        # Front face renderer
│   │   ├── drawBack.ts         # Back face renderer
│   │   ├── elements.ts         # Chip, contactless, network logos, etc.
│   │   ├── utils.ts            # Color contrast, text sizing
│   │   └── index.ts
│   ├── compliance/             # Regulatory compliance engine
│   │   ├── index.ts            # Main validator — runs rules by jurisdiction
│   │   ├── types.ts            # ComplianceResult, ComplianceRuleFn
│   │   ├── utils.ts            # Jurisdiction mapping
│   │   └── rules/              # Rule modules: general, us, eu, canada, networks, brandDesign
│   ├── rails/                  # Payment rail abstraction
│   │   ├── types.ts            # PaymentRail, RailFieldDef, RailCategory, RailRegion
│   │   ├── registry.ts         # Rail definitions (Visa, MC, Amex, ACH, SEPA, Wire, UPI, Pix, etc.)
│   │   ├── categories.ts
│   │   ├── cardLayouts.ts
│   │   └── index.ts
│   ├── components/
│   │   ├── Dashboard.tsx       # Home view — recent designs, programs, templates
│   │   ├── DesignGallery.tsx   # Design list/search modal
│   │   ├── AIDesignGenerator.tsx # AI prompt modal
│   │   ├── ProgramEditor.tsx   # Card program (multi-tier) editor
│   │   ├── CompliancePanel.tsx # Compliance results sidebar
│   │   ├── ComplianceFixPreview.tsx
│   │   ├── ComparisonView.tsx  # Side-by-side comparison
│   │   ├── WalletPreview.tsx   # Apple/Google Wallet mockup
│   │   ├── POSTerminalPreview.tsx # POS terminal scene
│   │   ├── CardPhotoImport.tsx # Photo upload for card art
│   │   ├── QuickSetupBanner.tsx
│   │   ├── RailSelector.tsx    # Payment rail picker
│   │   ├── RailFieldEditor.tsx # Dynamic fields per rail
│   │   ├── ProgramCard.tsx     # Program card tile
│   │   ├── LeftPanel.tsx       # Config sidebar (wraps left-panel/)
│   │   ├── CenterPanel.tsx     # Main canvas area (wraps center-panel/)
│   │   ├── ui.tsx              # Shared UI primitives
│   │   ├── left-panel/         # Sidebar sections: Brand, CardDetails, CardBack, CardFeatures, CardProgram, VisualDesign
│   │   └── center-panel/       # Card3D (Three.js), ExportMenu, CanvasErrorBoundary, useToast
│   ├── admin/                  # Admin portal (lazy-loaded)
│   │   ├── AdminLayout.tsx
│   │   ├── AdminDashboard.tsx, AdminUsers.tsx, AdminDesigns.tsx, AdminPrograms.tsx
│   │   ├── AdminTemplates.tsx, AdminCompliance.tsx, AdminAuditLog.tsx
│   │   └── components/         # DataTable, StatCard
│   ├── hooks/
│   │   ├── useDataProvider.ts  # Abstraction over localStorage vs API (auth-aware)
│   │   └── useMigration.ts     # Migrate localStorage designs to server on login
│   └── test/
│       └── setup.ts            # Vitest setup
├── public/                     # Static assets (favicon, OG image, logos)
├── vercel.json                 # Rewrites (SPA fallback + API), security headers, caching
├── vite.config.ts
├── vitest.config.ts
├── eslint.config.js
├── prisma.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
└── package.json
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (port 5173, host 127.0.0.1) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Preview production build locally |
| `npm test` | Run Vitest in watch mode |
| `npm run test:coverage` | Run tests with v8 coverage (compliance, context, canvas/utils, sectionUtils) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |

## Key Architecture Decisions

- **Dual storage mode:** Works without auth using localStorage; authenticated users get server-side persistence via Prisma/Neon. The `useDataProvider` hook abstracts this.
- **Migration on login:** `useMigration` detects localStorage designs and prompts users to import them to their server account.
- **Payment rails abstraction:** The `rails/` module defines a registry of payment rails (Visa, Mastercard, ACH, SEPA, Wire, UPI, Pix, etc.) each with typed field definitions, form factors, and regional metadata. Card configs reference a `railId` instead of just a network.
- **Compliance engine:** Rule-based validation split by jurisdiction (US, EU, CA, Global) and category (network brand rules, regulatory rules, design rules). Returns a 0-100 score with errors/warnings/info items.
- **3D rendering:** React Three Fiber with `MeshPhysicalMaterial` for realistic card finishes (matte, glossy, metal, brushed metal, holographic, etc.). Canvas 2D rendering used as texture source.
- **Canvas rendering pipeline:** `canvas/drawFront.ts` and `canvas/drawBack.ts` produce 2D card images used as Three.js textures and for export (PNG via html2canvas, PDF via jsPDF, SVG via custom renderer).
- **AI design generation:** Uses Anthropic Claude with tool-use to convert natural language prompts into `CardConfig` objects.
- **Client-side routing:** Simple `pushState`-based routing in App.tsx (no React Router). Routes: `/` (dashboard), `/login`, `/register`, `/admin/*`.
- **Admin portal:** Lazy-loaded admin section behind `isAdmin` role check.
- **Card programs:** Multi-tier program management (e.g., "Chase Sapphire" with Reserve, Preferred tiers). Shared fields cascade from program to all tier designs via `PROGRAM_SHARED_FIELDS`.
- **Undo/redo:** Config history stack (max 50 entries) in context.tsx.
- **Analytics:** Custom event bus with subscribable handlers — no analytics provider baked in.

## Conventions

- **TypeScript strict mode** enabled. Target ES2023.
- **Tailwind 4** via Vite plugin (no PostCSS config). Dark mode via class-based toggling.
- **Fonts:** Inter (UI), JetBrains Mono (card numbers/code), loaded from Google Fonts.
- **Component organization:** Feature folders (`admin/`, `auth/`, `compliance/`, `rails/`). Shared UI in `components/ui.tsx`.
- **API routes:** Vercel serverless functions in `api/` directory. Shared helpers in `api/_lib/`. Dynamic routes use `[id].ts` convention.
- **Auth flow:** JWT access token (15 min) + refresh token (30 day, httpOnly cookie). Client stores access token in memory (`api/client.ts`).
- **Prisma:** Schema uses `cuid()` IDs. Neon serverless adapter. Config in `prisma.config.ts` reads `DATABASE_URL` from env.
- **ISO standards:** Card dimensions follow ISO 7810 ID-1. Chip placement per ISO 7816-2. Network brand mark specifications in `CARD_PRINT_SPECS`.

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `JWT_SECRET` | Secret for signing JWT tokens (falls back to `dev-secret-change-me` in dev) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI design generation (user can also provide their own) |
| `PORT` | Dev server port (default 5173) |

## Database Models

- **User** — email/password auth, roles (USER / ADMIN / SUPER_ADMIN), optional org membership
- **Organization** — multi-tenant orgs with FREE / PRO / ENTERPRISE plans
- **Design** — card config (JSON), thumbnail, optional program association, template/public flags, compliance score
- **CardProgram** — issuer-level program with shared fields, owns multiple ProgramTiers
- **ProgramTier** — individual tier within a program, linked 1:1 to a Design
- **AuditLog** — action tracking (user, entity, metadata, IP)
- **ApiKey** — hashed API keys per user with expiry
