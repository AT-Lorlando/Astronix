# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

pnpm workspace monorepo (template named `mobile-template`, repo `Astronix`):

- **`frontend/`** — Nuxt 4 (SPA, `ssr: false`) + Capacitor 7 (iOS/Android from the same code), Tailwind 4, shadcn-vue, Pinia, i18n.
- **`backend/`** — AdonisJS 6 (Lucid ORM, session auth, CORS) + PostgreSQL.

Node 24 (`.nvmrc`), pnpm pinned to `10.33.0` (`corepack enable`).

## Commands

Run from repo root (scripts fan out with `pnpm -r` / `--filter`):

```bash
pnpm install
pnpm dev            # frontend (:3000) + backend (:3333) in parallel
pnpm dev:frontend   # Nuxt only
pnpm dev:backend    # Adonis only
pnpm build          # build both packages
pnpm lint           # eslint both
pnpm typecheck      # vue-tsc (front) + tsc (back)
pnpm format         # prettier both
```

Backend tests (Japa) run from `backend/`: `pnpm --filter ./backend test`, or `cd backend && node ace test`. A single suite/file: `node ace test --files="tests/path/to/file.spec.ts"`. There is no frontend test runner configured.

Adonis CLI is `node ace <cmd>` from `backend/` (e.g. `node ace make:controller`, `node ace migration:run`, `node ace make:mail`). Frontend mobile builds: `cd frontend && pnpm mobile:sync` (generate + `cap sync`), `pnpm mobile:ios`, `pnpm mobile:android`.

## Frontend architecture

Nuxt 4 layout: app code lives under **`frontend/app/`** (`pages/`, `components/`, `composables/`, `stores/`, `layouts/`, `plugins/`, `lib/`, `assets/`). Aliases: `~/` and `@/` both point at `app/`.

- **SPA only** — `ssr: false` (required for Capacitor). Don't add server-only / SSR-dependent code. Web build runs as a Node server; mobile build is static (`nuxt generate`).
- **shadcn-vue components live in `app/components/ui/`** and are owned/vendored here (built on `reka-ui` + `class-variance-authority`, styled via `cn()` from `@/lib/utils`). Add new ones with `cd frontend && pnpm dlx shadcn-vue@latest add <component>` — do not hand-author or restyle from scratch. Config in `components.json` (style `reka-nova`, lucide icons, no prefix).
- **Icons**: `<Icon name="lucide:..." />` (`@nuxt/icon`, bundles `lucide` + `uil`). Components like `Breadcrumbs`, `Navbar` and `Icon` are auto-imported (Nuxt) — don't import them manually; do explicitly import shadcn `ui/*` components.
- **Theme**: dark mode is forced (`colorMode.preference: 'dark'`, `<html class="dark">`). All colors are CSS variables (oklch) in `app/assets/css/tailwind.css` under `:root` / `.dark`. Use semantic Tailwind tokens (`bg-background`, `text-foreground`, `text-primary`, `text-muted-foreground`, `border`, `bg-destructive/10`) — never hardcoded hex/literal colors. To re-theme (e.g. a single accent), edit the `--primary`/etc. variables, not the components. Font is Geist (sans).
- **State**: Pinia option-style stores in `app/stores/` (see `auth.ts`), exposed through thin composables in `app/composables/` (`useAuth` wraps the store with `storeToRefs`). Follow this store→composable pattern.
- **API calls** go through `useAPI()` → `$api` (a `$fetch` instance). Base URL is `runtimeConfig.public.apiBase` (default `/api/v1`, proxied to the backend via `routeRules` on web; set `NUXT_PUBLIC_API_BASE` for mobile).
- **i18n**: `@nuxtjs/i18n`, `strategy: 'no_prefix'`, `defaultLocale: 'en'`, locales in `frontend/i18n/locales/{en,fr}.json`. **All UI text goes through `t('...')`** with a matching key in *both* locale files; never inline literal strings in templates. Access via `const { t } = useI18n()`.

## Auth scaffolding is present but DISABLED

The full auth flow (Pinia `auth` store, `login`/`signup`/`profile` pages, `useAuth`) exists but is inert: the plugins `frontend/app/plugins/api.client.ts` (provides `$api`) and `auth.init.ts` are **commented out**, so `$api` is not provided at runtime. To enable auth, uncomment both plugins and set `NUXT_PUBLIC_API_BASE`. Treat these pages/stores as reference patterns, not active features, unless auth is being turned on.

## Backend architecture

Standard AdonisJS 6 ESM layout under `backend/app/` with subpath imports (`#controllers/*`, `#models/*`, `#validators/*`, `#mails/*`, `#services/*`, `#middleware/*`, … — see `package.json` `imports`; always import via these, not relative paths).

- **Routes** in `start/routes.ts`; controllers lazy-imported (`() => import('#controllers/...')`) and referenced as `[Controller, 'method']`. Middleware applied per-route via `middleware.auth()` / `middleware.guest()` (named middleware registered in `start/kernel.ts`).
- **Validation**: VineJS (`@vinejs/vine`) validators in `app/validators/`, consumed with `request.validateUsing(validator)`. Define a compiled validator per endpoint.
- **Auth**: session/web guard (`auth.use('web')`), Lucid `User` model. CORS has `credentials: true, origin: true`.
- **Env**: validated in `start/env.ts` via `Env.schema` — any new env var (e.g. SMTP/mail config) must be added to that schema or the app won't boot. Copy `backend/.env.example` → `backend/.env` and set `APP_KEY` + `DB_*`.
- **Controllers** return `response.ok({...})`; keep this JSON shape consistent with what the frontend expects.

## Notes for upcoming portfolio work (per project brief)

These are NOT yet in the repo and must be added before use:

- **`@adonisjs/mail`** is not installed — needed for the contact endpoint. Install/configure it, add SMTP vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`) to `start/env.ts`, and make the handler degrade gracefully (log + return success in dev) when creds are absent.
- **`vee-validate` + `zod`** and shadcn-vue `form` components are not installed — needed for the contact form. Add the shadcn `form` component via the CLI and the deps via pnpm.
- Centralize editable site content in a single data file plus the i18n locale JSONs (FR + EN), with clear placeholders.
- Demo videos go in `frontend/public/` (e.g. `/demo-yui.mp4`) and are served as static assets.
