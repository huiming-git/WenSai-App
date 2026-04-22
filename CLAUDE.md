# CLAUDE.md — WenSai Frontend

## Overview

WenSai (问赛) — competition material review workbench. React 19 + Tauri v2, runs as both web app and native desktop app.

## Commands

```bash
npm run dev          # Vite dev server http://127.0.0.1:1420
npm run tauri:dev    # Desktop dev (auto-starts Vite + native window)
npm run build        # Web production build → dist-app/
npm run tauri:build  # Desktop installer → src-tauri/target/release/bundle/
npm run lint         # ESLint
npm run test:e2e     # Playwright E2E tests
```

## Architecture

### Routing (React Router v7)
- Public: `/login`, `/register`
- Protected: everything else, wrapped in `ProtectedRoute` → `Layout`

### State
- `AuthContext` — JWT token + user info, stored in localStorage
- `LanguageContext` — i18n toggle (zh/en), `useLanguage()` hook
- React Query — server-side state (papers, reviews)

### API Layer (`src/api/`)
- `client.ts` — Axios instance, auto-attaches JWT, handles 401 redirect
- `auth.ts` / `papers.ts` / `reviews.ts` — endpoint wrappers
- Tauri detection: `'__TAURI_INTERNALS__' in window` → switches baseURL to `http://127.0.0.1:8000/api`

### Styling
- Tailwind CSS v4 via `@tailwindcss/vite` plugin
- Custom UI components in `WensaiUI.tsx` (no external UI library)

### Tauri Desktop
- Custom titlebar (`TitleBar.tsx`) — drag, minimize, maximize, close via `@tauri-apps/api/window`
- Window config in `src-tauri/tauri.conf.json`: 1180x760, min 960x640, `decorations: false`
- Permissions in `src-tauri/capabilities/default.json`: core:default + window control

## Key Files

| File | Role |
|------|------|
| `src/App.tsx` | Router definition, Tauri titlebar toggle |
| `src/main.tsx` | Entry — BrowserRouter, QueryClient, Auth/Language providers |
| `src/api/client.ts` | Axios instance, interceptors (JWT, 401) |
| `src/components/Layout.tsx` | Sidebar + main content area |
| `src/components/TitleBar.tsx` | Tauri custom titlebar |
| `src/components/WensaiUI.tsx` | Shared UI components |
| `src/context/AuthContext.tsx` | Login/logout/token management |
| `src/context/LanguageContext.tsx` | i18n state |
| `src/data/wensai.ts` | App constants (name, version, nav items) |
| `src-tauri/tauri.conf.json` | Window, CSP, bundle config |

## Backend Connection

| Mode | Mechanism |
|------|-----------|
| Web dev | Vite proxy: `/api` → `http://localhost:8000` |
| Tauri | Direct: `http://127.0.0.1:8000/api` (CSP allowlisted) |

Backend is a separate repository, must be started independently.

## CI/CD

`.github/workflows/release.yml` — push to `release` triggers builds for Windows, macOS (ARM + Intel), Linux, then creates a GitHub Release.

## Do Not Commit

`node_modules/`, `dist/`, `dist-app/`, `src-tauri/target/`, `src-tauri/gen/` — all in `.gitignore`.
