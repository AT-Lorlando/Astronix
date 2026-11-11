import { config } from 'dotenv'
import tailwindcss from '@tailwindcss/vite'

const env = config()

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/tailwind.css'],

  // Disable SSR for Capacitor mobile app
  ssr: false,

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    'shadcn-nuxt',
    '@nuxt/content',
  ],

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: false,
    head: {
      htmlAttrs: {
        class: 'dark',
        style: 'color-scheme: dark',
      },
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },

  // Dark mode by default (https://color-mode.nuxtjs.org)
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: '',
  },

  // i18n: English by default, French available (https://i18n.nuxtjs.org)
  i18n: {
    defaultLocale: 'fr',
    strategy: 'no_prefix',
    detectBrowserLanguage: false,
    langDir: 'locales',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' },
    ],
  },

  icon: {
    serverBundle: {
      collections: ['uil', 'lucide'],
    },
  },

  shadcn: {
    prefix: '',
    componentDir: '~/components/ui',
  },

  runtimeConfig: {
    public: {
      // Web: calls go through the `/api/v1` proxy (see routeRules below).
      // Mobile (Capacitor static): set NUXT_PUBLIC_API_BASE to the full backend URL.
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api/v1',
    },
  },

  // Proxy API calls to the backend so the web app stays same-origin.
  // Note: only applies to the node-server (web) build, not the static mobile build.
  routeRules: {
    '/api/v1/**': { proxy: `${env.parsed?.API_URL}/**` },
    // anciennes pages, devenues des sections de l'accueil
    '/about': { redirect: '/#about' },
    '/projects': { redirect: '/#projects' },
    '/projects/**': { redirect: '/#projects' },
  },

  vite: {
    plugins: [tailwindcss()],
  },
})
