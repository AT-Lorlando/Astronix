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
  handle: '[TON NOM]',
  email: '[TON EMAIL]',
  github: 'https://github.com/[USER]',
  projects: [
    { id: 'yui', name: 'Yui', featured: true, repo: '[URL GITHUB YUI]', video: '/demo-yui.mp4', stack: ['Node/TS', 'Python', 'MCP', 'LLM local'] },
    { id: 'yoji', name: 'Yoji', featured: false, repo: '[URL GITHUB YOJI]', video: null, stack: ['[À COMPLÉTER]'] },
  ],
}

export function getProject(id: string): SiteProject | undefined {
  return site.projects.find((p) => p.id === id)
}
