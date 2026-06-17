export interface SiteProject {
  id: string
  name: string
  featured: boolean
  repo: string
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
    { id: 'yui', name: 'Yui', featured: true, repo: 'https://github.com/AT-Lorlando/yui', video: '/demo-yui.mp4', stack: ['Node/TS', 'Python', 'MCP', 'LLM local'] },
    { id: 'yoji', name: 'Yoji', featured: false, repo: 'https://github.com/AT-Lorlando/yoji', video: null, stack: ['Nuxt', 'Adonis'] },
  ],
}

export function getProject(id: string): SiteProject | undefined {
  return site.projects.find((p) => p.id === id)
}
