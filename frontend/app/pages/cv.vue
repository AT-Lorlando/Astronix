<script setup lang="ts">
import type { MessageFunction, VueMessageType } from 'vue-i18n'
import { ref, h, computed } from 'vue'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Label } from '~/components/ui/label'

const { t, tm, rt } = useI18n()

const a4Mode = ref(false)                 // bascule l'aperçu écran en format A4 fixe
const avatarUrl = ref('/profilpic.webp')  // photo servie depuis frontend/public/ ; fallback "RJ" si absente

function exportPDF() {
  window.print()
}

/* Petites icônes outline génériques (style lucide) — les marques Root-Me / HTB
   utilisent les composants <IconRootme /> / <IconHtb /> auto-importés. */
const PATHS: Record<string, ReturnType<typeof h>[]> = {
  info:    [h('circle', { cx: 12, cy: 12, r: 10 }), h('path', { d: 'M12 16v-4M12 8h.01' })],
  contact: [h('rect', { x: 3, y: 4, width: 18, height: 16, rx: 2 }), h('path', { d: 'M8 2v4M16 2v4M8 14a3 3 0 0 1 6 0M11 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z' })],
  dots:    [h('circle', { cx: 5, cy: 12, r: 1.4 }), h('circle', { cx: 12, cy: 12, r: 1.4 }), h('circle', { cx: 19, cy: 12, r: 1.4 })],
  globe:   [h('circle', { cx: 12, cy: 12, r: 10 }), h('path', { d: 'M2 12h20' }), h('path', { d: 'M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20Z' })],
  chart:   [h('path', { d: 'M3 3v18h18' }), h('path', { d: 'M7 14l4-4 3 3 5-6' })],
  book:    [h('path', { d: 'M3 5a2 2 0 0 1 2-2h6v17H5a2 2 0 0 0-2 2zM21 5a2 2 0 0 0-2-2h-6v17h6a2 2 0 0 1 2 2z' })],
  monitor: [h('rect', { x: 3, y: 4, width: 18, height: 13, rx: 1.5 }), h('path', { d: 'M8 21h8M12 17v4' })],
  mail:    [h('rect', { x: 3, y: 5, width: 18, height: 14, rx: 2 }), h('path', { d: 'm3 7 9 6 9-6' })],
  phone:   [h('path', { d: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L19 13l5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 6a2 2 0 0 1 2-2Z' })],
  pin:     [h('path', { d: 'M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z' }), h('circle', { cx: 12, cy: 10, r: 2.5 })],
  linkedin:[h('rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }), h('path', { d: 'M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 17v-7' })],
  github:  [h('path', { d: 'M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1-.3-3.5 1.3a12 12 0 0 0-6 0C6.6 2.9 5.6 3.2 5.6 3.2a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.6c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21' })],
  star:    [h('path', { d: 'M12 3l2.6 5.6 6 .9-4.3 4.3 1 6-5.3-2.9L6.7 19.8l1-6L3.4 9.5l6-.9z' })],
  branch:  [h('circle', { cx: 6, cy: 6, r: 2 }), h('circle', { cx: 6, cy: 18, r: 2 }), h('circle', { cx: 18, cy: 8, r: 2 }), h('path', { d: 'M6 8v8M18 10a6 6 0 0 1-6 6H8' })],
}
const Icon = (props: { name: string }) => h('svg', {
  class: 'ic', viewBox: '0 0 24 24', width: 16, height: 16,
  fill: 'none', stroke: 'currentColor', 'stroke-width': 2,
  'stroke-linecap': 'round', 'stroke-linejoin': 'round',
}, PATHS[props.name] || [])

/* Contenu traductible (i18n) ---------------------------------------------- */
const about = computed(() => tm('cv.about') as MessageFunction<VueMessageType>[])
const passions = computed(() => tm('cv.passions') as MessageFunction<VueMessageType>[])
const paras = (key: string) => tm(`cv.experiences.${key}.paragraphs`) as MessageFunction<VueMessageType>[]
const expBullets = (key: string) => tm(`cv.experiences.${key}.bullets`) as MessageFunction<VueMessageType>[]

/* Données structurelles (non traduites) ----------------------------------- */
const contact = {
  email: 'richard-jeremy@outlook.fr',
  phone: '06 95 30 33 26',
}

const langKeys = ['fr', 'en']

const more = [
  { icon: 'pin',      text: '31300 Toulouse' },
  { icon: 'linkedin', text: '/in/jeremy-richard-at', href: 'https://linkedin.com/in/jeremy-richard-at' },
  { icon: 'github',   text: 'AT-Lorlando',           href: 'https://github.com/AT-Lorlando' },
  { svg: 'rootme',    text: 'Chuya-711797', tag: '# 4173', href: 'https://www.root-me.org/Chuya-711797' },
  { svg: 'htb',       text: 'users/2444957',          href: 'https://app.hackthebox.com/users/2444957' },
]

/* Projets — `fav: true` met la pastille en avant (remplie bleu). */
const projects: { label: string; fav?: boolean }[] = [
  { label: 'Lea', fav: true  }, { label: 'Vera', fav: true  }, { label: 'Yui', fav: true }, { label: 'ThCon2026' },
  { label: 'Kyobo' }, { label: 'Koya' , fav: true }, { label: 'Genkin' }, { label: 'Yoji' },
  { label: 'Astronix' }, { label: 'Hisho' }, { label: 'KidScope' }, { label: 'Sofubo' },
  { label: 'Titalis' }, { label: 'Inspiron', fav: true  }, { label: 'Homelab', fav: true  }, { label: 'YuiSSH' },
  { label: 'SSO' }, { label: 'TerraPaysage' }, { label: '...' },
]


const experiences = [
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
  {
    key: 'altab', bullets: true,
    tags: [
      { label: 'JS/TS', color: '#3fb950' }, { label: 'Python', color: '#3fb950' },
      { label: 'Vue.js/Nuxt', color: '#4a9fd4' }, { label: 'Adonis', color: '#d4a72c' },
      { label: 'Three.js', color: '#d4a72c' },
    ],
  },
]

const education = [
  { key: 'engineer', school: 'INSA Centre Val de Loire, Bourges' },
  { key: 'entrepreneur', school: 'INSA Centre Val de Loire, Bourges' },
]

/* Compétences triées par domaine. `fav: true` met la pastille en avant.
   Les libellés techniques (noms propres) restent en dur ; les soft-skills
   traduisibles passent par `tKey` → t(`cv.softSkills.<tKey>`). */
const skillDomains: { key: string; skills: { label?: string; tKey?: string; fav?: boolean }[] }[] = [
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
</script>

<template>
  <div class="cv-page">
  <!-- Barre d'outils (hors CV, non imprimée) -->
  <div class="toolbar">
    <div class="tgl">
      <Checkbox id="a4" :model-value="a4Mode" @update:model-value="(v) => (a4Mode = v === true)" />
      <Label for="a4" class="cursor-pointer">{{ t('cv.a4Preview') }}</Label>
    </div>
    <Button size="sm" @click="exportPDF">{{ t('cv.exportPdf') }}</Button>
  </div>

  <div class="cv" :class="{ a4: a4Mode }">
    <!-- En-tête ------------------------------------------------------------ -->
    <header class="cv-head">
      <Avatar class="avatar">
        <AvatarImage :src="avatarUrl" alt="Jérémy Richard" />
        <AvatarFallback>RJ</AvatarFallback>
      </Avatar>
      <h1>RICHARD <span>Jérémy</span></h1>
    </header>

    <div class="cv-body">
      <!-- COLONNE GAUCHE ------------------------------------------------- -->
      <aside class="col-left">
        <section>
          <h2 class="sec"><Icon name="info" />/about</h2>
          <p v-for="(p, i) in about" :key="i" class="about-p">{{ rt(p) }}</p>
        </section>

        <section>
          <h2 class="sec"><Icon name="contact" />/contact</h2>
          <div class="line"><Icon name="mail" /><span>{{ contact.email }}</span></div>
          <div class="line"><Icon name="phone" /><span>{{ contact.phone }}</span></div>
        </section>

        <section>
          <h2 class="sec"><Icon name="dots" />/more</h2>
          <a v-for="(m, i) in more" :key="i" class="line" :href="m.href" target="_blank" rel="noopener">
            <IconRootme v-if="m.svg === 'rootme'" class="ic ic-brand" />
            <IconHtb v-else-if="m.svg === 'htb'" class="ic ic-brand" />
            <Icon v-else :name="m.icon!" />
            <span>{{ m.text }} <em v-if="m.tag">({{ m.tag }})</em></span>
          </a>
        </section>

        <section>
          <h2 class="sec"><Icon name="globe" />/langages</h2>
          <p v-for="k in langKeys" :key="k" class="plain">
            {{ t(`cv.languages.${k}.name`) }} | {{ t(`cv.languages.${k}.level`) }}
          </p>
        </section>

        <section>
          <h2 class="sec"><Icon name="dots" />/passions</h2>
          <p v-for="(p, i) in passions" :key="i" class="plain">{{ rt(p) }}</p>
        </section>

        <section>
          <h2 class="sec"><Icon name="github" />/projects</h2>
          <div class="proj-grid">
            <span v-for="(pr, i) in projects" :key="i" class="proj" :class="{ 'is-fav': pr.fav }">{{ pr.label }}</span>
          </div>
        </section>
      </aside>

      <!-- COLONNE DROITE ------------------------------------------------- -->
      <main class="col-right">
        <section>
          <h2 class="sec" style="--a:#3fb950"><Icon name="chart" />/experiences</h2>

          <article v-for="xp in experiences" :key="xp.key" class="card">
            <div class="card-top">
              <div class="card-id">
                <Icon name="monitor" class="card-ic" />
                <div>
                  <h3>{{ t(`cv.experiences.${xp.key}.title`) }}</h3>
                  <p v-if="xp.subtitle" class="sub">{{ t(`cv.experiences.${xp.key}.subtitle`) }}</p>
                </div>
              </div>
              <span class="date">{{ t(`cv.experiences.${xp.key}.date`) }}</span>
            </div>

            <p v-for="(p, j) in paras(xp.key)" :key="j" class="body">{{ rt(p) }}</p>

            <ul v-if="xp.bullets" class="bullets">
              <li v-for="(b, k) in expBullets(xp.key)" :key="k">{{ rt(b) }}</li>
            </ul>

            <div class="tags">
              <span v-for="(tg, j) in xp.tags" :key="j" class="tag">
<i class="dot" :style="{ background: tg.color }" />{{ tg.label }}
              </span>
              <Icon name="star" class="t-star" />
              <Icon name="branch" class="t-branch" />
            </div>
          </article>
        </section>

        <section>
          <h2 class="sec" style="--a:#db6d28"><Icon name="book" />/education</h2>
          <div v-for="ed in education" :key="ed.key" class="edu">
            <div>
              <p class="edu-deg">{{ t(`cv.education.${ed.key}.degree`) }}</p>
              <p class="edu-school">{{ ed.school }}</p>
            </div>
            <span class="edu-date">{{ t(`cv.education.${ed.key}.date`) }}</span>
          </div>
        </section>

        <section>
          <h2 class="sec" style="--a:#db6d28"><Icon name="book" />/skills</h2>
          <div v-for="d in skillDomains" :key="d.key" class="skill-group">
            <span class="skill-domain">{{ t(`cv.skillDomains.${d.key}`) }}</span>
            <div class="skills">
              <span v-for="(s, i) in d.skills" :key="i" class="skill" :class="{ 'is-fav': s.fav }">{{ s.tKey ? t(`cv.softSkills.${s.tKey}`) : s.label }}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
  </div>
</template>

<style scoped>
/* ════════════════════════════════════════════════════════════════════════
 *  PALETTE — GitHub Primer (thème sombre). Change ces variables pour reskinner.
 * ════════════════════════════════════════════════════════════════════════ */
.cv {
  --bg:          #0d1117;   /* canvas.default  */
  --head-bg:     #161b22;   /* canvas.subtle   */
  --card:        #161b22;   /* canvas.subtle   */
  --card-border: #30363d;   /* border.default  */
  --text:        #e6edf3;   /* fg.default      */
  --text-dim:    #7d8590;   /* fg.muted        */
  --heading:     #e6edf3;
  --blue:        #2f81f7;   /* accent.fg (liens / titres de poste) */
  --badge-bg:    #21262d;   /* neutral.muted   */
  --badge-text:  #7d8590;
  --edu-badge:   #1f6feb;   /* accent.emphasis */
  --skill-bd:    #30363d;
  --skill-tx:    #2f81f7;
  --star:        #e3b341;   /* attention/star  */
  --radius: 6px;            /* rayon Primer    */
  --gap: 22px;

  /* ══ ÉCHELLE TYPO ════════════════════════════════════════════════════════
   *  Source unique pour les tailles de texte. Change une valeur ici → elle
   *  s'applique à l'écran. L'aperçu A4 (.cv.a4) et l'impression (@media print)
   *  ne font que REDÉFINIR ces mêmes variables, plus bas dans la feuille.
   * ════════════════════════════════════════════════════════════════════════ */
  --fs-name:  32px;     /* nom dans l'en-tête                               */
  --fs-title: 16px;     /* titres de section (/about, /skills…)             */
  --fs-text:  14px;     /* texte courant : about, contact, langues, lignes  */
  --fs-body:  14px;     /* paragraphes & listes d'expérience, diplômes      */
  --fs-job:   14.5px;   /* intitulé de poste                               */
  --fs-sub:   12.5px;   /* sous-titre, tags techno, école, compétences     */
  --fs-meta:  14px;   /* pastilles (dates), labels de domaine, projets   */

  background: var(--bg);
  color: var(--text);
  /* Pile de polices GitHub (Primer) */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif,
    'Apple Color Emoji', 'Segoe UI Emoji';
  font-size: var(--fs-text); line-height: 1.5;
  max-width: 960px; margin: 0 auto;
  border: 1px solid var(--card-border);
  border-radius: 12px; overflow: hidden;
}

/* En-tête */
.cv-head { display: flex; align-items: center; gap: 18px; background: var(--head-bg); padding: 18px 24px; border-bottom: 1px solid var(--card-border); }
/* Avatar shadcn (gère le rond + l'anneau) ; on pilote la taille/la police + le zoom.
   --avatar-zoom : 1 = remplit le cercle ; <1 dézoome (50% ici), >1 zoome/recadre. */
.avatar { width: 64px; height: 64px; font-size: 20px; font-weight: 700; --avatar-zoom: 1.6; overflow: hidden; background: var(--badge-bg); }
.avatar :deep(img) { transform: scale(var(--avatar-zoom)); transform-origin: center; }
.cv-head h1 { margin: 0; font-size: var(--fs-name); font-weight: 600; letter-spacing: -.5px; color: var(--heading); }
.cv-head h1 span { font-weight: 400; color: var(--text-dim); }

/* Corps deux colonnes */
.cv-body { display: grid; grid-template-columns: 250px 1fr; gap: 28px; padding: 22px 24px 28px; }
.col-left, .col-right { display: flex; flex-direction: column; gap: var(--gap); }
section { break-inside: avoid; }

/* Titres de section /xxx */
.sec {
  display: flex; align-items: center; gap: 8px; margin: 0 0 12px; padding-bottom: 6px;
  font-size: var(--fs-title); font-weight: 600; color: var(--heading);
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  border-bottom: 1px solid var(--card-border);
}
.sec :deep(.ic) { color: var(--a, var(--blue)); flex: none; }

/* Texte courant */
.about-p { margin: 0 0 10px; color: var(--text); }
.plain   { margin: 0 0 4px; color: var(--text); }

/* Lignes contact / more */
.line { display: flex; align-items: center; gap: 9px; margin-bottom: 7px; color: var(--text); text-decoration: none; }
a.line:hover { color: var(--blue); }
/* Sidebar : toutes les icônes en bleu (accent GitHub) */
.line :deep(.ic) { color: var(--blue); flex: none; }
.line :deep(.ic-brand) { width: 16px; height: 15px; color: var(--blue); }
.line em { font-style: normal; color: var(--blue); font-size: .85em; }

/* Projets — monochrome bleu : bordés par défaut, remplis si favoris */
.proj-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.proj { font-size: var(--fs-meta); font-weight: 600; color: var(--skill-tx); background: var(--badge-bg); border: 1px solid var(--skill-bd); padding: 3px 10px; border-radius: 2em; line-height: 1.5; }
.proj.is-fav { color: #fff; background: var(--blue); border-color: var(--blue); }

/* Cartes d'expérience */
.card { background: var(--card); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 16px 18px; margin-bottom: 14px; }
.card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
.card-id { display: flex; gap: 10px; }
.card-ic { color: var(--text-dim); margin-top: 2px; }
.card h3 { margin: 0; font-size: var(--fs-job); font-weight: 600; color: var(--blue); }
.sub { margin: 1px 0 0; font-size: var(--fs-sub); color: var(--text-dim); }
.date { flex: none; font-size: var(--fs-meta); color: var(--badge-text); background: var(--badge-bg); border: 1px solid var(--card-border); padding: 3px 10px; border-radius: 2em; white-space: nowrap; }
.body { margin: 0 0 8px; font-size: var(--fs-body); color: var(--text); }
.bullets { margin: 0 0 8px; padding-left: 18px; }
.bullets li { font-size: var(--fs-body); margin-bottom: 2px; }

/* Tags techno */
.tags { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-top: 10px; }
.tag { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-sub); color: var(--text); }
.dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.t-star { color: var(--star); margin-left: auto; }
.t-branch { color: var(--text-dim); }

/* Education */
.edu { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.edu-deg { margin: 0; font-size: var(--fs-body); color: var(--heading); }
.edu-school { margin: 2px 0 0; font-size: var(--fs-sub); color: var(--blue); }
.edu-date { flex: none; font-size: var(--fs-meta); color: #fff; background: var(--edu-badge); padding: 4px 12px; border-radius: 2em; white-space: nowrap; }

/* Skills — groupés par domaine, label de domaine au-dessus de ses pastilles */
.skill-group { margin-bottom: 10px; }
.skill-group:last-child { margin-bottom: 0; }
.skill-domain {
  display: block; margin-bottom: 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--fs-meta); color: var(--text-dim);
}
.skills { display: flex; flex-wrap: wrap; gap: 6px; }
.skill { font-size: var(--fs-sub); color: var(--skill-tx); border: 1px solid var(--skill-bd); border-radius: 2em; padding: 3px 11px; background: var(--badge-bg); }
/* Pastille "favorite" : remplie en bleu, mise en avant */
.skill.is-fav { color: #fff; background: var(--blue); border-color: var(--blue); font-weight: 600; }

/* Barre d'outils (non imprimée) — contrôles shadcn (Checkbox + Button) */
.toolbar { display: flex; align-items: center; gap: 14px; justify-content: flex-end; max-width: 960px; margin: 0 auto 12px; padding: 0 4px; }
.tgl { display: flex; align-items: center; gap: 8px; }

/* RESPONSIVE — une colonne sur mobile */
@media (max-width: 720px) {
  .cv-body { grid-template-columns: 1fr; gap: var(--gap); }
  .cv-head h1 { font-size: 26px; }
}

/* MODE A4 FIXE (aperçu écran) — 210×297mm ≈ 794×1123px @96dpi.
   On ne redéfinit que l'échelle typo + quelques marges ; aucune taille en dur. */
.cv.a4 {
  --fs-name: 26px; --fs-title: 13px; --fs-text: 11px;
  --fs-body: 10.5px; --fs-job: 11.5px; --fs-sub: 10px; --fs-meta: 9.5px;
  width: 794px; max-width: 794px; min-height: 1123px;
  border-radius: 0; box-shadow: 0 0 0 1px #0003, 0 12px 40px #0006;
}
.cv.a4 .cv-body { grid-template-columns: 230px 1fr; gap: 18px; padding: 14px 18px 18px; }
.cv.a4 .cv-head { padding: 14px 18px; }
.cv.a4 .card { padding: 11px 13px; margin-bottom: 9px; }

/* ════════════════════════════════════════════════════════════════════════
 *  IMPRESSION / EXPORT PDF — A4 exact, fond sombre conservé, texte vectoriel
 *  (le masquage du header/footer du layout est dans le bloc <style> global)
 * ════════════════════════════════════════════════════════════════════════ */
@media print {
  :global(html), :global(body) { margin: 0; padding: 0; background: #0d1117; }
  .toolbar { display: none !important; }

  /* Tout le CV tient sur une seule page A4. On redéfinit l'échelle typo
     (↑/↓ ces 7 valeurs pour agrandir/réduire globalement) + l'espacement. */
  .cv {
    --fs-name: 21px; --fs-title: 11px; --fs-text: 9.6px;
    --fs-body: 9.2px; --fs-job: 11px; --fs-sub: 9.2px; --fs-meta: 8.8px;
    width: 210mm;
    height: 297mm;
    margin: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* En-tête */
  .cv-head { padding: 5mm 11mm 3.5mm; gap: 14px; }
  .avatar { width: 48px; height: 48px; font-size: 16px; }

  /* Corps : colonnes serrées, sections rapprochées */
  .cv-body { grid-template-columns: 54mm 1fr; gap: 6mm; padding: 3.5mm 11mm 5mm; }
  .col-left, .col-right { gap: 10px; }
  .sec { margin-bottom: 5px; padding-bottom: 3px; gap: 6px; }

  /* Colonne gauche */
  .about-p { margin-bottom: 4px; }
  .plain { margin-bottom: 1px; }
  .line { margin-bottom: 3px; gap: 7px; }
  .proj { padding: 2px 8px; }
  .proj-grid { gap: 6px; }

  /* Expériences */
  .card { padding: 8px 10px; margin-bottom: 6px; }
  .card-top { margin-bottom: 6px; }
  .date { padding: 2px 7px; }
  .body { margin-bottom: 3px; }
  .bullets { padding-left: 14px; }
  .bullets li { margin-bottom: 1px; }
  .tags { gap: 8px; margin-top: 6px; }

  /* Education / skills */
  .edu { margin-bottom: 6px; }
  .edu-date { padding: 3px 9px; }
  .skill-group { margin-bottom: 5px; }
  .skill-domain { margin-bottom: 3px; }
  .skills { gap: 5px; }
  .skill { padding: 2px 8px; }

  /* Évite les coupures disgracieuses au milieu d'un bloc */
  section, .card, .edu, article { break-inside: avoid; }
}
</style>

<!--
  Styles GLOBAUX (non scoped) : le format papier et le masquage du chrome de
  layout (AppHeader / AppFooter / fond animé) doivent cibler des éléments rendus
  hors de ce composant, donc hors de portée d'un bloc `scoped`.
-->
<style>
/* Feuille au format A4, sans marges ajoutées par le navigateur */
@page { size: A4; margin: 0; }

@media print {
  /* On masque le chrome de mise en page (header/footer du layout, fond animé).
     `:not(.cv-head)` épargne l'en-tête interne du CV (photo + nom). */
  header:not(.cv-head),
  footer,
  .pointer-events-none.fixed {
    display: none !important;
  }
  /* Le wrapper de layout (min-h-screen + flex) ne doit pas générer de page vide. */
  .min-h-screen {
    display: block !important;
    min-height: 0 !important;
  }
}
</style>
