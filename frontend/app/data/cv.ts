/**
 * Données structurelles du CV (non traduites), partagées par `/cv` et l'accueil.
 * Les textes (intitulés, paragraphes, dates…) sont dans les locales sous `cv.*`.
 */

export interface CvTag {
  label: string
  /** Couleur de la pastille sur le CV imprimé uniquement (l'accueil utilise les tokens du thème). */
  color: string
}
export interface CvExperience {
  key: string
  subtitle?: boolean
  bullets?: boolean
  /** Accueil : id du projet ciblé par le lien `home.experience.details.<key>.link`. */
  anchor?: string
  tags: CvTag[]
}
export interface CvSkill {
  label?: string
  tKey?: string
  fav?: boolean
}

export const experiences: CvExperience[] = [
  {
    key: 'astronix', bullets: true, anchor: 'aster',
    // stack d'Aster, le projet phare de l'activité
    tags: [
      { label: 'AdonisJS', color: '#d4a72c' }, { label: 'PostgreSQL', color: '#e8833a' },
      { label: 'Nuxt', color: '#41b883' }, { label: 'POSIX sh', color: '#3fb950' },
      { label: 'CycloneDX', color: '#39c5cf' },
    ],
  },
  {
    key: 'airbus', subtitle: true,
    tags: [
      { label: 'Python', color: '#3fb950' }, { label: 'Cyberwatch', color: '#39c5cf' },
      { label: 'ELK', color: '#a371f7' }, { label: 'Ansible', color: '#db6d28' },
      { label: 'Linux', color: '#f0623c' },
    ],
  },
  {
    key: 'viveris',
    tags: [
      { label: 'Vue.js/Nuxt', color: '#41b883' }, { label: 'Nest.js', color: '#4a9fd4' },
      { label: 'Three.js', color: '#d4a72c' }, { label: 'PostgreSQL', color: '#e8833a' },
    ],
  },
]

/** `icon` : icône lucide affichée sur l'accueil. */
export const education: { key: string; school: string; icon: string }[] = [
  { key: 'engineer', school: 'INSA Centre Val de Loire, Bourges', icon: 'lucide:shield-check' },
  { key: 'entrepreneur', school: 'INSA Centre Val de Loire, Bourges', icon: 'lucide:graduation-cap' },
]

/* Compétences triées par domaine. `fav: true` met la pastille en avant.
   Les libellés techniques (noms propres) restent en dur ; les soft-skills
   traduisibles passent par `tKey` → t(`cv.softSkills.<tKey>`). */
export const skillDomains: { key: string; skills: CvSkill[] }[] = [
  {
    key: 'dev',
    skills: [
      { label: 'TS/JS', fav: true }, { label: 'Python', fav: true }, { label: 'Vue/Nuxt', fav: true },
      { label: 'Adonis' , fav: true}, { label: 'PostgreSQL' }, { label: 'Html/CSS' }, { label: 'Tailwind' },
      { label: 'ThreeJS' , fav: true}, { label: 'Capacitor' }, { label: 'Bash' }, { label: 'Llama.cpp' }, { label: 'Slidev' },
      { label: 'vLLM' }, { label: 'MCP' },
    ],
  },
  {
    key: 'security',
    skills: [
      { label: 'Cyberwatch', fav: true }, { label: 'CISCAT' }, { label: 'Burp' },
      { label: 'Exegol', fav: true }, { label: 'Wazuh' },
    ],
  },
  {
    key: 'infra',
    skills: [
      { label: 'Docker', fav: true }, { label: 'Ansible' }, { label: 'Git', fav: true },
      { label: 'ELK' }, { label: 'Grafana' }, { label: 'Nginx' }, { label: 'Mikrotik' },
    ],
  },
  {
    key: 'systems',
    skills: [
      { label: 'Arch' , fav: true}, { label: 'Kali' }, { label: 'Suse' }, { label: 'Ubuntu' }, { label: 'Windows' },
    ],
  },
  {
    key: 'soft',
    skills: [
      { tKey: 'selftaught', fav: true }, { tKey: 'autonomous', fav: true }, { tKey: 'curious', fav: true },
      { tKey: 'creative' }, { tKey: 'independent' }, { tKey: 'passionate' },
    ],
  },
]
