# Mobile Template - Frontend

A web + native application template built with Nuxt 4 (SPA) and Capacitor 7, sharing a single
codebase. Designed to work with the AdonisJS backend in `../backend`.

## Features

- **Nuxt 4** (SPA, `ssr: false`) - one codebase for web and native
- **Capacitor 7** - native iOS and Android apps from the same web build
- **Tailwind CSS 4** - utility-first styling via the Vite plugin
- **shadcn-vue** - owned, copy-in UI components (built on reka-ui)
- **@nuxtjs/color-mode** - dark mode by default
- **@nuxtjs/i18n** - English by default, French available
- **@nuxt/icon** - server bundle with the `lucide` and `uil` collections
- **Pinia** - state management
- **TypeScript** - full type safety
- **Authentication** - optional, ready-to-wire scaffolding (disabled by default)

## Prerequisites

- Node.js >= 24 (see `../.nvmrc`)
- pnpm via Corepack: `corepack enable` (the repo pins `pnpm@10.33.0`)
- For iOS development: macOS with Xcode
- For Android development: Android Studio

## Setup

This package is part of a pnpm workspace. From the repo root:

```bash
pnpm install
```

### Environment Configuration

Copy `.env.example` to `.env` and adjust:

```bash
# Backend API base URL - proxy target for the `/api/v1/**` route rule (web/SSR)
API_URL=http://localhost:3333

# Mobile (Capacitor static build) only: set the full backend URL, since there is no proxy server.
# NUXT_PUBLIC_API_BASE=https://api.example.com
```

On the web, API calls go through the same-origin `/api/v1` proxy (configured in `nuxt.config.ts`
via `routeRules`), so you only need `API_URL`. On a packaged mobile app there is no Nuxt server,
so point `NUXT_PUBLIC_API_BASE` directly at the backend.

## Development

### Web Development

```bash
pnpm dev
```

The app is available at `http://localhost:3000`.

### Mobile Development

#### Initial Setup

1. **Generate the static build:**
   ```bash
   pnpm generate
   ```

2. **Add native platforms** (first time only):
   ```bash
   pnpm exec cap add ios
   pnpm exec cap add android
   ```

   This creates `ios/` and `android/` directories with native projects.

3. **Sync web assets to native apps:**
   ```bash
   pnpm mobile:sync
   ```

#### Running on Devices

```bash
pnpm mobile:ios        # opens Xcode
pnpm mobile:android    # opens Android Studio
pnpm dev:android       # generate + sync + run on a connected Android device/emulator
```

Select a simulator/emulator or connected device and run.

#### Live Reload During Development

1. Find your local IP address:
   - macOS/Linux: `ipconfig getifaddr en0`
   - Windows: `ipconfig`

2. Add a `server` block to `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://192.168.x.xx:3000',  // your local IP
     cleartext: true,
   }
   ```

3. Run the dev server (`pnpm dev`), then copy the config and rebuild in the native IDE:
   ```bash
   pnpm exec cap copy
   ```

Changes to your code will now hot-reload on the device.

## Building

The same source produces two outputs:

| Target             | Command          | Output                     |
| ------------------ | ---------------- | -------------------------- |
| Web (Node server)  | `pnpm build`     | `.output/server/index.mjs` |
| Mobile (Capacitor) | `pnpm generate`  | `.output/public`           |

Preview the web build with `pnpm preview`.

For a mobile production build: `pnpm generate`, then `pnpm exec cap sync`, open the native IDE,
configure signing, and archive/upload to the App Store / Play Store.

## UI Components (shadcn-vue)

Components live in `app/components/ui/` and are owned by you (copied in, not a dependency). Add more
with:

```bash
pnpm dlx shadcn-vue@latest add <component>
```

Theme tokens and dark mode are driven by CSS variables in `app/assets/css/tailwind.css`.

### Dark mode

Dark mode is the default, configured in `nuxt.config.ts` (`colorMode` + a forced `dark` html class).
Switch at runtime with the `useColorMode()` composable from `@nuxtjs/color-mode`.

## Internationalization (i18n)

English is the default locale, French is available. Translations live in `i18n/locales/{en,fr}.json`.

```vue
<script setup lang="ts">
const { t, setLocale } = useI18n()
</script>

<template>
  <h1>{{ t('app.title') }}</h1>
  <button @click="setLocale('fr')">FR</button>
</template>
```

## Icons

Icons use `@nuxt/icon` with a local server bundle for the `lucide` and `uil` collections:

```vue
<Icon name="lucide:user" class="h-4 w-4" />
```

## Project Structure

```
frontend/
├── app/
│   ├── assets/css/tailwind.css     # Tailwind + shadcn theme tokens
│   ├── components/
│   │   ├── ui/                      # shadcn-vue components (owned)
│   │   ├── Navbar.vue
│   │   └── Breadcrumbs.vue
│   ├── composables/
│   │   ├── useAPI.ts                # API client accessor
│   │   └── useAuth.ts               # authentication helper
│   ├── layouts/default.vue
│   ├── lib/utils.ts                 # cn() and shared helpers
│   ├── pages/                       # index, login, signup, profile
│   ├── plugins/
│   │   ├── api.client.ts            # API setup (commented out by default)
│   │   └── auth.init.ts             # auth bootstrap (commented out by default)
│   ├── stores/auth.ts               # Pinia auth store
│   └── app.vue
├── i18n/locales/                    # en.json, fr.json
├── public/
├── capacitor.config.ts
├── nuxt.config.ts
└── package.json
```

## API Integration

- **Web**: requests hit the same-origin `/api/v1` proxy (see `routeRules` in `nuxt.config.ts`),
  forwarded to `API_URL`.
- **Mobile**: set `NUXT_PUBLIC_API_BASE` to the full backend URL (no proxy server in a packaged app).
- **API client**: `useAPI()` composable.
- **Auth helper**: `useAuth()` composable.

```typescript
const api = useAPI()
const data = await api('/endpoint', { method: 'GET' })

const { user, login, logout, isAuthenticated } = useAuth()
await login('email@example.com', 'password')
```

### Authentication (optional)

The auth scaffolding (Pinia store, login/signup/profile pages, composables) ships **disabled** so the
template can be published without auth. The `app/plugins/api.client.ts` and `app/plugins/auth.init.ts`
plugins are commented out. To enable auth, uncomment both files and configure the API base.

## Capacitor Plugins

Add any Capacitor plugin, for example:

```bash
pnpm add @capacitor/camera
```

```typescript
import { Camera } from '@capacitor/camera'

const photo = await Camera.getPhoto({
  quality: 90,
  allowEditing: false,
  resultType: 'uri',
})
```

Popular plugins:
- [@capacitor/camera](https://capacitorjs.com/docs/apis/camera)
- [@capacitor/geolocation](https://capacitorjs.com/docs/apis/geolocation)
- [@capacitor/push-notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [@capacitor/share](https://capacitorjs.com/docs/apis/share)

## Troubleshooting

### "Module not found" errors
Run `pnpm install` from the repo root to ensure all workspace dependencies are installed.

### Node version errors
Ensure you're using Node.js 24 or higher:
```bash
node --version
```

### Capacitor sync fails
Run `pnpm generate` first to create the `.output/public` directory.

### iOS build issues
- Update CocoaPods: `sudo gem install cocoapods`
- Clear derived data in Xcode
- Ensure Xcode Command Line Tools are installed

### Android build issues
- Ensure the Android SDK is installed via Android Studio
- Check the `ANDROID_HOME` environment variable
- Sync Gradle files in Android Studio

### Live reload not working
- Verify the device and computer are on the same network
- Check firewall settings aren't blocking port 3000
- Ensure the IP in `capacitor.config.ts` is correct, then run `pnpm exec cap copy`

## Learn More

- [Nuxt 4 Documentation](https://nuxt.com/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [shadcn-vue Documentation](https://www.shadcn-vue.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Nuxt i18n](https://i18n.nuxtjs.org/)

## Backend Integration

This app works with the AdonisJS backend in `../backend`. Start it before testing:

```bash
cd ../backend
pnpm dev
```

Or run the full stack with Docker from the repo root:

```bash
docker compose up --build
```

## License

This template is available for use in your projects.
