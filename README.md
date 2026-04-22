# WenSai (问赛)

Competition material review workbench built with React 19 and Tauri v2. Supports both web browser and native desktop.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Server State | React Query (TanStack) |
| HTTP Client | Axios |
| Desktop Shell | Tauri v2 (Rust) |
| Testing | Playwright E2E |
| i18n | Chinese / English |

## Getting Started

### Prerequisites

- Node.js >= 18
- Backend server running at `http://localhost:8000` (separate repository)
- Rust toolchain (only needed for desktop builds)

### Install & Run

```bash
npm install

# Web development
npm run dev

# Desktop development (requires Rust)
npm run tauri:dev
```

### Build

```bash
# Web production build → dist-app/
npm run build

# Desktop installer → src-tauri/target/release/bundle/
npm run tauri:build
```

### Other Commands

```bash
npm run lint         # ESLint check
npm run test:e2e     # Playwright E2E tests
```

## Project Structure

```
├── src/
│   ├── api/             # Axios client, auth / papers / reviews API
│   ├── components/      # Layout, TitleBar, WensaiUI, ProtectedRoute
│   ├── context/         # AuthContext (JWT), LanguageContext (i18n)
│   ├── data/            # App constants
│   ├── hooks/           # React Query hooks
│   ├── locales/         # zh.ts, en.ts
│   ├── pages/           # 9 pages (Login, Register, Dashboard, etc.)
│   ├── utils/           # Export, history helpers
│   ├── App.tsx          # Router & Tauri titlebar detection
│   └── main.tsx         # Entry point
├── src-tauri/           # Tauri config, Rust entry, icons, permissions
├── tests/e2e/           # Playwright specs
├── public/              # Static assets (logo)
└── .github/workflows/   # CI/CD (build & release)
```

## Pages

| Route | Page | Auth |
|-------|------|------|
| `/login` | Login | Public |
| `/register` | Register (invite code) | Public |
| `/` | Dashboard | Protected |
| `/papers` | Paper list | Protected |
| `/papers/upload` | Upload paper | Protected |
| `/papers/:id` | Paper detail & review | Protected |
| `/papers/:paperId/review` | Submit review | Protected |
| `/pricing` | Pricing info | Protected |
| `/settings` | User settings | Protected |

## Desktop App (Tauri)

- Custom titlebar — no native window decorations
- Window: 1180x760 (min 960x640)
- CSP restricts connections to `localhost:8000` backend only
- Targets: Windows (NSIS), macOS (DMG), Linux (AppImage / deb)

## CI/CD

Push to `release` branch triggers GitHub Actions to build installers for Windows, macOS (ARM + Intel), and Linux, then publishes a GitHub Release automatically.

## Backend

The backend runs as a separate service. In development:

- **Web mode**: Vite proxies `/api` to `http://localhost:8000`
- **Desktop mode**: Axios calls `http://127.0.0.1:8000/api` directly

## License

MIT
