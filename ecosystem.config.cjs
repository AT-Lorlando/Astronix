// PM2 — config par défaut pour exécuter le backend (AdonisJS) et le serveur web Nuxt.
// Pré-requis : builds de prod générés (`pnpm build`).
//   backend  → backend/build/bin/server.js (node ace build)
//   frontend → frontend/.output/server/index.mjs (nuxt build, preset node-server)
// Lancement : pnpm dlx pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'astronix-backend',
      cwd: './backend',
      script: 'build/bin/server.js',
    },
    {
      name: 'astronix-frontend',
      cwd: './frontend',
      script: '.output/server/index.mjs',
    },
  ],
}
