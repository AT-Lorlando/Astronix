export interface SiteProject {
  id: string
  name: string
  featured: boolean
  /** Repo public uniquement : null masque le bouton GitHub (repo privé). */
  repo: string | null
  video: string | null
  stack: string[]
}

export interface SiteData {
  handle: string
  email: string
  github: string
  projects: SiteProject[]
}

export const site: SiteData = {
  handle: 'Jérémy RICHARD',
  email: 'jeremy.richard@astronix.fr',
  github: 'https://github.com/AT-Lorlando',
  projects: [
    { id: 'aster', name: 'Aster', featured: true, repo: null, video: null, stack: ['AdonisJS', 'PostgreSQL', 'Nuxt', 'POSIX sh', 'CycloneDX'] },
    { id: 'yui', name: 'Yui', featured: false, repo: 'https://github.com/AT-Lorlando/yui', video: null, stack: ['Node/TS', 'Python', 'MCP', 'LLM', 'Nuxt', 'Capacitor'] },
    { id: 'koya', name: 'Koya', featured: false, repo: null, video: null, stack: ['Nuxt', 'AdonisJS', 'PostgreSQL', 'SSH', 'PM2', 'Nginx'] },
    { id: 'yoji', name: 'Yoji', featured: false, repo: null, video: null, stack: ['Nuxt', 'AdonisJS', 'Git', 'MCP', 'Electron', 'Capacitor'] },
  ],
}

export function getProject(id: string): SiteProject | undefined {
  return site.projects.find((p) => p.id === id)
}
