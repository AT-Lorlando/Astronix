# MobileTemplate

Monorepo template pour applications **web + natives** (une seule base de code).

- **frontend/** — Nuxt 4 (SPA) + Capacitor 7 (iOS/Android), Tailwind 4, shadcn-vue, Pinia
- **backend/** — AdonisJS 6 (Lucid, Auth session, CORS) + PostgreSQL

Géré en **workspace pnpm**.

## Pré-requis

- **Node 24** (voir `.nvmrc`)
- **pnpm 9+** via Corepack : `corepack enable` (le dépôt épingle `pnpm@10.33.0`)
- Docker (optionnel, pour la stack complète)
- Xcode / Android Studio (optionnel, pour les builds natifs)

## Installation

```bash
pnpm install
```

## Développement

```bash
pnpm dev            # frontend + backend en parallèle
pnpm dev:frontend   # http://localhost:3000
pnpm dev:backend    # http://localhost:3333
```

## Qualité

```bash
pnpm build          # build des deux paquets
pnpm lint
pnpm typecheck
```

## Frontend : web vs mobile

Le frontend produit deux sorties depuis le **même code** :

| Cible              | Commande                              | Sortie                       |
| ------------------ | ------------------------------------- | ---------------------------- |
| Web (serveur Node) | `pnpm --filter ./frontend build`      | `.output/server/index.mjs`   |
| Mobile (Capacitor) | `pnpm --filter ./frontend generate`   | `.output/public`             |

### Flux mobile

```bash
cd frontend
pnpm mobile:sync       # generate + cap sync
pnpm mobile:ios        # ouvre Xcode
pnpm mobile:android    # ouvre Android Studio
pnpm dev:android       # generate + sync + run android
```

## UI (shadcn-vue)

Les composants vivent dans `frontend/app/components/ui/` (tu en es propriétaire). Pour en
ajouter :

```bash
cd frontend
pnpm dlx shadcn-vue@latest add <composant>
```

Thème et dark mode sont pilotés par variables CSS dans `frontend/app/assets/css/tailwind.css`.

## Authentification (optionnelle)

Le scaffolding d'auth (store Pinia, pages login/signup/profile, composables) est présent mais
**désactivé** : les plugins `frontend/app/plugins/api.client.ts` et `auth.init.ts` sont commentés,
pour pouvoir publier une app sans auth. Pour l'activer, décommente ces deux fichiers et configure
`NUXT_PUBLIC_API_BASE`.

## Production (PM2)

```bash
pnpm build
pnpm dlx pm2 start ecosystem.config.cjs
```

Gère le serveur web Nuxt (port 3000) et l'API AdonisJS (port 3333).

## Production (Docker)

```bash
cp backend/.env.example backend/.env   # renseigner APP_KEY, DB_*
docker compose up --build
```

Les images sont construites depuis la racine du dépôt (lockfile pnpm partagé) et empaquetées
via `pnpm deploy`.

## Structure

```
.
├── frontend/             # Nuxt + Capacitor
├── backend/              # AdonisJS + PostgreSQL
├── ecosystem.config.cjs  # PM2 (web + api)
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json          # scripts orchestrateurs du workspace
```
