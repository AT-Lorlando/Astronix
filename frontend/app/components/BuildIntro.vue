<script setup lang="ts">
/**
 * Intro « construction » de la page d'accueil, façon Figma, multi-curseurs.
 * Enveloppe le layout : tout son contenu est caché puis construit nœud par nœud.
 *
 * - Chaque nœud est sélectionné au lasso, devient une frame (nom, taille, poignées),
 *   puis son contenu apparaît, avec ses cotes (padding, écarts) en pointillé.
 * - Curseur principal : structure seulement (profondeur ≤ LEAD_DEPTH), suivi par la caméra.
 *   Les autres curseurs possèdent chacun un sous-arbre, et se dupliquent si besoin.
 * - Listes (≥ 2 frères de même forme dans un flex/grid, ou `data-build-clone="Nom"`) :
 *   modèle avec slugs `{{ title }}`, copier/coller, puis données glissées depuis « data ».
 * - Icônes et données : deux bases (« lucid », « data ») remplies par des agents qui
 *   tapent ; deux curseurs dédiés y piochent.
 * - Se joue à chaque chargement (ou refresh) de `/`, pas en navigation interne,
 *   ni sur une ancre (`/#…`), ni en reduced-motion.
 *   Bouton « Passer » (ou Échap). En dev, `?debug` affiche le panneau de réglages
 *   (textes en dur : outil de dev, pas de l'UI).
 */
import { Easing, Group, Tween } from 'three/examples/jsm/libs/tween.module.js'
import { Button } from '~/components/ui/button'

const { t, te, locale } = useI18n()
const route = useRoute()

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
// arrivée sur une ancre (/#experience…) : on va directement au contenu
// le layout persiste entre les pages : ceci n'est évalué qu'au chargement (ou refresh) du site
const shouldPlay = route.path === '/' && !route.hash && !reducedMotion()
const debug = import.meta.dev && route.query.debug !== undefined

const stage = ref<HTMLElement>()
const root = ref<HTMLElement>()
const overlay = ref<HTMLElement>()

const pending = ref(shouldPlay)
/** Une section attend que le visiteur fasse défiler (déclenchement au scroll). */
const awaitingScroll = ref(false)
/** Flèche d'incitation : les curseurs de construction sont à l'arrêt faute de scroll. */
const scrollHint = ref(false)

/** Curseurs de construction afk (aucun n'a bougé depuis un moment) alors que du travail
 *  attend le scroll : une section pas encore déclenchée, ou une cible hors de l'écran. */
function updateScrollHint() {
  const now = performance.now()
  const busy = pool.some((w) => !w.special && now - w.movedAt < 900)
  const blocked = awaitingScroll.value || waiting.size > 0
  const show = !busy && blocked
  if (scrollHint.value !== show) scrollHint.value = show
}
const running = ref(false)
const guidesShown = ref(false)
const speed = ref(1)
const cursorCount = ref(3)
const maxCursors = ref(6)
const guides = ref(true)
const panelOpen = ref(true)
const stats = reactive({ done: 0, total: 0, elapsed: 0, live: 0 })

type El = HTMLElement | SVGElement
type Box = { x: number; y: number; w: number; h: number }
type Ease = (amount: number) => number

/* ───────────── Moteur de tweens (promesses annulables) ───────────── */

const group = new Group()
const CANCEL = Symbol('cancel')
const noop = () => {}
let runId = 0
let raf = 0
let startedAt = 0

/* Icônes pas encore posées dont l'emplacement existe : un petit « <svg> » en attendant. */
let iconHoles = new Map<Element, HTMLElement>()

function iconPlaceholders() {
  const r = root.value
  const ov = overlay.value
  if (!r || !ov) return
  for (const icon of r.querySelectorAll<El>('svg, .iconify')) {
    if (icon.parentElement?.closest('svg, .iconify')) continue
    const waiting = icon.parentElement?.hasAttribute('data-built') && !icon.hasAttribute('data-built') && visible(icon)
    let hole = iconHoles.get(icon)
    if (!waiting) {
      if (hole) {
        hole.remove()
        iconHoles.delete(icon)
      }
      continue
    }
    if (!hole) {
      hole = mk('span', 'bt-icon-hole', ov)
      hole.textContent = '<svg>'
      iconHoles.set(icon, hole)
    }
    const b = boxOf(icon)
    hole.style.transform = `translate(${b.x + b.w / 2}px, ${b.y + b.h / 2}px) translate(-50%, -50%)`
  }
}

function loop(time: number) {
  group.update(time)
  if (running.value) {
    iconPlaceholders()
    updateScrollHint()
    if (SCROLL_LOCK) camera()
    idleDrift()
    placeDbs()
    stats.elapsed = (performance.now() - startedAt) / 1000
  }
  // hors intro, la boucle s'arrête (relancée par play)
  raf = running.value || group.getAll().length ? requestAnimationFrame(loop) : 0
}

function tw<T extends Record<string, number>>(
  obj: T,
  to: Partial<T>,
  ms: number,
  ease: Ease = Easing.Cubic.InOut,
  onUpdate?: (o: T) => void,
): Promise<void> {
  const id = runId
  return new Promise((resolve, reject) => {
    if (id !== runId) return reject(CANCEL)
    new Tween(obj, group)
      .to(to, ms / speed.value)
      .easing(ease)
      .onUpdate(() => onUpdate?.(obj))
      .onComplete(() => (id === runId ? resolve() : reject(CANCEL)))
      .onStop(() => reject(CANCEL))
      .start()
  })
}

const wait = (ms: number) => tw({ v: 0 }, { v: 1 }, ms, Easing.Linear.None)

function cancelTweens() {
  runId++
  group.getAll().forEach((tween) => tween.stop())
  group.removeAll()
}

/* ───────────── Géométrie ───────────── */

function boxOf(el: Element): Box {
  const b = el.getBoundingClientRect()
  const s = stage.value!.getBoundingClientRect()
  return { x: b.left - s.left, y: b.top - s.top, w: b.width, h: b.height }
}
const stageTop = () => stage.value!.getBoundingClientRect().top + window.scrollY
const vh = () => window.innerHeight

function mk<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent: HTMLElement) {
  const e = document.createElement(tag)
  e.className = cls
  parent.appendChild(e)
  return e
}

/* ───────────── Curseurs (workers) ───────────── */

const HUES = [255, 25, 150, 75, 200, 340, 110, 50]

type Worker = {
  cur: { x: number; y: number }
  /** Dernier déplacement du curseur (performance.now). */
  movedAt: number
  /** Nombre de tâches en cours pour ce curseur ; 0 = libre. */
  load: number
  /** Curseur principal : structure uniquement, suivi par la caméra. */
  lead: boolean
  /** Curseur spécialisé : « lucid » (icônes) ou « data » (données des listes). */
  special: 'icon' | 'data' | null
  /** Déphasage de la dérive au repos (afk). */
  phase: number
  /** Boîte sur laquelle le curseur travaille (coordonnées stage) : ce que la caméra cadre. */
  focus: Box | null
  /** Duplicata créé en cours de route : disparaît une fois sa tâche finie. */
  spawned: boolean
  /** Principal qui attend la fin d'une section : la caméra suit alors ceux qui la construisent. */
  watching?: boolean
  /** Section en cours (principal) : la caméra s'y tient tant qu'il s'y passe quelque chose. */
  section?: Element
  /** Fin de l'animation d'apparition d'un duplicata (sa tâche attend dessus). */
  ready?: Promise<void>
  sel: HTMLElement
  label: HTMLElement
  size: HTMLElement
  cursor: HTMLElement
}

let pool: Worker[] = []
let workerSeq = 0
let leadDone = false

function makeWorker(at?: { x: number; y: number }): Worker {
  const i = workerSeq++
  const color = `oklch(0.66 0.19 ${HUES[i % HUES.length]})`
  const ov = overlay.value!
  const sel = mk('div', 'bt-sel', ov)
  sel.dataset.mode = 'hidden'
  sel.style.setProperty('--bt-c', color)
  const label = mk('span', 'bt-label', sel)
  const size = mk('span', 'bt-size', sel)
  for (const c of ['bt-tl', 'bt-tr', 'bt-bl', 'bt-br']) mk('i', `bt-h ${c}`, sel)
  const cursor = mk('div', 'bt-cursor', ov)
  cursor.style.setProperty('--bt-c', color)
  // flèche du curseur (la même pendant les glisser)
  cursor.innerHTML =
    '<svg class="bt-arrow" width="18" height="22" viewBox="0 0 18 22"><path d="M1 1 L1 17 L5.5 13 L8.5 20 L11.5 18.7 L8.6 12 L15 12 Z"/></svg>'
  const w: Worker = {
    cur: at ? { ...at } : { x: 24 + i * 30, y: 24 + i * 18 },
    movedAt: 0,
    load: 0,
    lead: i === 0,
    special: null,
    phase: Math.random() * Math.PI * 2,
    focus: null,
    spawned: !!at,
    sel,
    label,
    size,
    cursor,
  }
  placeCursor(w)
  return w
}

function setupWorkers(n: number) {
  overlay.value?.replaceChildren()
  workerSeq = 0
  pool = Array.from({ length: Math.min(n, MAX_CURSORS - 2) }, () => makeWorker())
  // + deux curseurs spécialisés (icônes, données), hors du pool de délégation
  for (const [st, special] of [
    [iconStation, 'icon'],
    [dataStation, 'data'],
  ] as const) {
    const w = makeWorker()
    w.special = special
    st.worker = w
    pool.push(w)
  }
  stats.live = pool.length
}

/* Arrivée : les curseurs entrent par les bords de l'écran, en fondu et en décalé. */
async function cursorsEnter() {
  const W = stage.value!.getBoundingClientRect().width
  const top = window.scrollY - stageTop()
  await Promise.all(
    pool.map((w, i) => {
      const fromLeft = i % 2 === 0
      w.cur = { x: fromLeft ? -40 : W + 40, y: top + 140 + i * 55 }
      w.cursor.style.opacity = '0'
      placeCursor(w)
      const end = { x: fromLeft ? 48 + i * 26 : W - 90 - i * 26, y: top + 110 + i * 34 }
      const o = { o: 0 }
      return wait(i * 140).then(() =>
        Promise.all([
          moveCursor(w, end.x, end.y, 650),
          tw(o, { o: 1 }, 450, Easing.Quadratic.Out, () => (w.cursor.style.opacity = String(o.o))),
        ]),
      )
    }),
  )
}

/* Sortie : chacun repart par le bord le plus proche ; les bases s'effacent en même temps. */
async function cursorsExit() {
  const W = stage.value!.getBoundingClientRect().width
  const panels = dbPanels.map((p) => {
    const o = { o: 1 }
    return tw(o, { o: 0 }, 450, Easing.Quadratic.In, () => (p.style.opacity = String(o.o)))
  })
  const cursors = pool.map((w, i) => {
    hideSel(w)
    const toRight = w.cur.x > W * 0.5
    const o = { o: 1 }
    return wait(i * 100).then(() =>
      Promise.all([
        moveCursor(w, toRight ? W + 60 : -60, w.cur.y - 30, 550),
        tw(o, { o: 0 }, 600, Easing.Quadratic.In, () => (w.cursor.style.opacity = String(o.o))),
      ]),
    )
  })
  await Promise.all([...panels, ...cursors])
}

/* Repos (afk) : un curseur immobile dérive doucement autour de sa position. */
function idleDrift() {
  const now = performance.now()
  for (const w of pool) {
    if (now - w.movedAt < 700) continue
    const dx = Math.sin(now / 850 + w.phase) * 4 + Math.sin(now / 2300 + w.phase * 2) * 3
    const dy = Math.cos(now / 1150 + w.phase) * 3.5
    w.cursor.style.transform = `translate(${w.cur.x + dx}px, ${w.cur.y + dy}px)`
  }
}

/* Duplication : un curseur débordé se dédouble sur place, la copie s'écarte. */
const DUP_MIN_SIZE = 3
/** Plafond absolu de curseurs à l'écran, les deux spécialisés (icônes, données) compris. */
const MAX_CURSORS = 7
const maxPool = () => Math.min(MAX_CURSORS, Math.max(cursorCount.value, maxCursors.value) + 2)

function spawnFrom(w: Worker): Worker {
  const x = makeWorker(w.cur)
  pool.push(x)
  stats.live = pool.length
  x.cursor.style.opacity = '0'
  const from = { ...w.cur }
  const o = { o: 0, dx: 0, dy: 0 }
  x.ready = tw(o, { o: 1, dx: 18, dy: 14 }, 280, Easing.Back.Out, () => {
    x.cursor.style.opacity = String(o.o)
    x.cur.x = from.x + o.dx
    x.cur.y = from.y + o.dy
    placeCursor(x)
  })
  x.ready.catch(noop)
  return x
}

function despawn(x: Worker) {
  const o = { o: 1 }
  tw(o, { o: 0 }, 300, Easing.Quadratic.In, () => (x.cursor.style.opacity = String(o.o)))
    .then(() => {
      x.cursor.remove()
      x.sel.remove()
      pool = pool.filter((p) => p !== x)
      stats.live = pool.length
    })
    .catch(noop)
}

function placeCursor(w: Worker) {
  w.cursor.style.transform = `translate(${w.cur.x}px, ${w.cur.y}px)`
  w.movedAt = performance.now()
}

/** Lenteur des trajets de curseur : plus longs, départ et arrivée en douceur. */
const TRAVEL = 1.5

async function moveCursor(w: Worker, x: number, y: number, ms: number) {
  await tw(w.cur, { x, y }, ms * TRAVEL, Easing.Cubic.InOut, () => placeCursor(w))
}

type Mode = 'hidden' | 'marquee' | 'frame' | 'component' | 'drop'
function setSel(w: Worker, b: Box, mode: Mode, name?: string, cls = '') {
  w.sel.dataset.mode = mode
  w.sel.style.transform = `translate(${b.x}px, ${b.y}px)`
  w.sel.style.width = `${b.w}px`
  w.sel.style.height = `${b.h}px`
  if (name !== undefined) fillLabel(w.label, name, cls)
  // pendant le lasso, le label est placé une fois au départ (le coin haut-gauche ne bouge pas)
  if (mode !== 'hidden' && (mode !== 'marquee' || name !== undefined)) placeLabel(w.label, b)
  w.size.textContent = `${Math.round(b.w)} × ${Math.round(b.h)}`
}

/** Hauteur réservée au label au-dessus d'une boîte (nom + ligne de classes). */
const LABEL_ROOM = 30

function fillLabel(label: HTMLElement, name: string, cls: string) {
  label.textContent = name
  if (cls) mk('span', 'bt-cls', label).textContent = cls
}

/** Le label reste dans l'écran : dedans si la boîte touche le haut, calé à droite si ça déborde. */
function placeLabel(label: HTMLElement, b: Box) {
  label.classList.toggle('is-inside', b.y < LABEL_ROOM)
  label.classList.remove('is-end')
  label.classList.toggle('is-end', b.x + label.offsetWidth > stage.value!.clientWidth - 8)
  // le label d'un curseur a la priorité : les textes affichés qu'il recouvre s'effacent
  if (label.closest('.bt-sel')) for (const t of texts) if (t !== label && hits(t, label)) yieldText(t)
}

/* ───────────── Anti-chevauchement des textes ─────────────
 * Chaque texte posé (cotes, étiquettes) réserve sa place ; un nouveau texte qui en
 * recouvrirait un autre (ou le label d'un curseur) n'est pas affiché. */

let texts = new Set<HTMLElement>()

function hits(a: HTMLElement, b: HTMLElement, pad = 3) {
  const r = a.getBoundingClientRect()
  const q = b.getBoundingClientRect()
  if (!r.width || !q.width) return false
  return r.left < q.right + pad && q.left < r.right + pad && r.top < q.bottom + pad && q.top < r.bottom + pad
}

function yieldText(t: HTMLElement) {
  t.style.visibility = 'hidden'
  texts.delete(t)
}

/** Réserve la place de `t` s'il ne chevauche rien ; sinon le masque. Renvoie true s'il reste. */
function claimText(t: HTMLElement): boolean {
  for (const o of [...texts]) if (!o.isConnected || o.style.visibility === 'hidden') texts.delete(o)
  const sels = overlay.value!.querySelectorAll<HTMLElement>('.bt-sel:not([data-mode="hidden"]) .bt-label')
  for (const o of [...texts, ...sels]) {
    if (hits(t, o)) {
      t.style.visibility = 'hidden'
      return false
    }
  }
  texts.add(t)
  return true
}

/** Classes Tailwind de mise en page / espacement, pour le label (les couleurs, typos… sont omises). */
/** Classes Tailwind de mise en page flex / grid, affichées seulement sur les conteneurs flex / grid
 *  (les espacements ont leurs propres cotes). */
const TW_LAYOUT =
  /^(?:flex|inline-flex|grid|inline-grid|flex-(?:row|col|wrap)(?:-reverse)?|grid-(?:cols|rows|flow)-|justify-|items-|content-|place-)/
function twLayout(el: Element): string {
  if (!/flex|grid/.test(getComputedStyle(el).display)) return ''
  return [...el.classList].filter((c) => TW_LAYOUT.test(c.split(':').pop()!)).join(' ')
}
const hideSel = (w: Worker) => (w.sel.dataset.mode = 'hidden')

/* ───────────── Champ de vision ───────────── */

/** Cibles que des curseurs secondaires attendent de voir à l'écran. */
const waiting = new Set<{ el: Element }>()

/** À l'écran dès qu'un morceau dépasse (sans marge : un élément collé en haut ou en
 *  bas de page doit rester atteignable, la caméra ne peut pas aller plus loin). */
function inView(el: Element) {
  const r = el.getBoundingClientRect()
  return r.bottom > 2 && r.top < vh() - 2
}

/** Garde-fou : passé ce délai, le curseur commence quand même (jamais de blocage). */
const MAX_WAIT_MS = 2500

/** Hors champ = pas de travail : le curseur principal, lui, n'attend jamais. */
function untilInView(w: Worker, el: Element): Promise<void> {
  // principal et spécialisés (icônes, données) n'attendent jamais d'être à l'écran
  if (w.lead || w.special || inView(el)) return Promise.resolve()
  const id = runId
  const entry = { el }
  const since = performance.now()
  waiting.add(entry)
  return new Promise((resolve, reject) => {
    const check = () => {
      if (id !== runId) {
        waiting.delete(entry)
        return reject(CANCEL)
      }
      if (inView(el) || (w.special && performance.now() - since > MAX_WAIT_MS) || (SCROLL_LOCK && performance.now() - since > MAX_WAIT_MS)) {
        waiting.delete(entry)
        return resolve()
      }
      requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })
}

/* ───────────── Caméra : le curseur principal, puis le travail restant ───────────── */

/* Ce que la caméra cadre : une boîte (coordonnées document) + le curseur qui y travaille. */
type Shot = { top: number; bottom: number; cursorY: number | null }

function shotOf(w: Worker): Shot {
  const off = stageTop()
  if (!w.focus) return { top: w.cur.y + off, bottom: w.cur.y + off, cursorY: w.cur.y + off }
  return withLingers({
    top: w.focus.y + off - LABEL_ROOM,
    bottom: w.focus.y + w.focus.h + off,
    cursorY: w.cur.y + off,
  })
}

/** Élargit le cadre aux étiquettes encore affichées, tant que le tout tient à l'écran. */
function withLingers(s: Shot): Shot {
  const now = performance.now()
  const off = stageTop()
  const room = vh() - 2 * Math.max(80, vh() * 0.18)
  let out = s
  for (const l of lingers) {
    if (l.until < now) continue
    const top = Math.min(out.top, l.box.y + off - LABEL_ROOM)
    const bottom = Math.max(out.bottom, l.box.y + l.box.h + off)
    if (bottom - top <= room) out = { ...out, top, bottom }
  }
  return out
}

function currentShot(): Shot | null {
  const now = performance.now()
  const lead = pool.find((w) => w.lead)
  const active = lead && !leadDone ? lead : null
  let pend: Shot | null = null
  if (waiting.size) {
    const rects = [...waiting].map((e) => e.el.getBoundingClientRect())
    const r = rects.reduce((a, b) => (b.top < a.top ? b : a))
    pend = { top: r.top + window.scrollY - LABEL_ROOM, bottom: r.bottom + window.scrollY, cursorY: null }
  }
  if (active?.watching && active.section) {
    // caméra fixe, section par section : calée sur le haut de la section en cours ; elle ne
    // descend d'un palier que si du travail de la section attend sous le bas de l'écran,
    // et ne remonte jamais dans la même section
    const sec = active.section
    if (sec !== camSection) {
      camSection = sec
      camAnchor = sec.getBoundingClientRect().top + window.scrollY
    }
    const m = Math.max(80, vh() * 0.18)
    const below = [...waiting]
      .filter((e) => sec.contains(e.el))
      .map((e) => e.el.getBoundingClientRect().top + window.scrollY)
      .filter((t) => t > camY + vh() - m)
    if (below.length) camAnchor = Math.max(camAnchor, Math.min(...below))
    const top = camAnchor - LABEL_ROOM
    return { top, bottom: top + vh() - 2 * m, cursorY: null }
  }
  if (active) {
    const own = shotOf(active)
    if (!pend) return own
    // le travail en attente rejoint le cadre s'il y tient avec celui du principal…
    const both = { top: Math.min(own.top, pend.top), bottom: Math.max(own.bottom, pend.bottom), cursorY: null }
    if (both.bottom - both.top <= vh() - 2 * Math.max(80, vh() * 0.18)) return both
    // …sinon seulement quand le principal est vraiment à l'arrêt
    return now - active.movedAt > 1500 ? pend : own
  }
  if (pend) return pend
  const moving = pool.filter((w) => w.load > 0 && now - w.movedAt < 350)
  if (!moving.length) return null
  return shotOf(moving.reduce((a, b) => (b.cur.y < a.cur.y ? b : a)))
}

/** Position de scroll voulue : la boîte entière avec de l'air autour, en bougeant le moins possible. */
function desiredScroll(s: Shot, y: number): number {
  const m = Math.max(80, vh() * 0.18)
  const h = s.bottom - s.top
  if (h > vh() - 2 * m) {
    // plus haute que l'écran : on suit le curseur sans dépasser les bords de la boîte (± marge)
    const c = s.cursorY ?? s.top
    return Math.max(s.top - m, Math.min(s.bottom - vh() + m, c - vh() * 0.55))
  }
  if (s.top < y + m) return s.top - m
  if (s.bottom > y + vh() - m) return s.bottom - vh() + m
  return y
}

// ressort amorti (critique) : départ et arrivée en douceur, trajet lent, pas de rebond
let camY = 0
let camV = 0
/** Section cadrée par la caméra fixe, et son palier courant (haut visé, coordonnées document). */
let camSection: Element | null = null
let camAnchor = 0

function camera() {
  const max = Math.max(0, document.documentElement.scrollHeight - vh())
  const shot = currentShot()
  const target = Math.max(0, Math.min(max, shot ? desiredScroll(shot, camY) : camY))
  const k = Math.min(0.2, 0.006 * speed.value * speed.value)
  const damping = 1 - 2 * Math.sqrt(k)
  camV = camV * damping + (target - camY) * k
  camY = Math.max(0, Math.min(max, camY + camV))
  if (Math.abs(camY - window.scrollY) > 0.5) window.scrollTo(0, camY)
}

/* ───────────── Nommage façon calques Figma ───────────── */

function pascal(s: string) {
  return s
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
}

function layoutGlyph(el: El) {
  const cs = getComputedStyle(el)
  if (cs.display.includes('grid')) return ' #'
  if (cs.display.includes('flex')) return cs.flexDirection.startsWith('column') ? ' ↓' : ' →'
  return ''
}

/** @nuxt/icon rend en mode CSS (`<span class="iconify i-lucide:…">`) ; un <svg> brut compte aussi. */
const isIcon = (el: Element) => el instanceof SVGSVGElement || el.classList.contains('iconify')

const baseName = (el: El) =>
  isIcon(el) ? 'Icon' : el.dataset.slot ? pascal(el.dataset.slot) : el.tagName.toLowerCase()

/** Instance Vue (dev) qui a rendu l'élément : on remonte jusqu'au composant le plus
 *  externe dont l'élément est la racine (Card → ProjectCard). */
type VueInst = {
  type: { __name?: string; name?: string; __file?: string }
  subTree?: { el?: unknown }
  parent: VueInst | null
}
function vueLabel(el: Element): string | null {
  if (isIcon(el)) return null
  let c = (el as unknown as { __vueParentComponent?: VueInst }).__vueParentComponent ?? null
  let label: string | null = null
  while (c && c.subTree?.el === el) {
    // seuls les composants de l'app comptent : pas les primitives (components/ui, libs, NuxtLink…)
    const f = c.type.__file
    if (f && f.includes('/app/components/') && !f.includes('/components/ui/'))
      label = `<${pascal(f.split('/').pop()!.replace(/\.vue$/, ''))}.vue>`
    c = c.parent
  }
  return label
}

const nameOf = (el: El) => (el.dataset.buildName ?? vueLabel(el) ?? baseName(el)) + layoutGlyph(el)

/* ───────────── Plan (arbre) ───────────── */

type FrameNode = { kind: 'frame' | 'silent'; el: El; depth: number; comp: boolean; children: PlanNode[]; size: number }
type CloneNode = {
  kind: 'clone'
  depth: number
  /** Liste imbriquée dans un composant : copier/coller seulement, pas de slugs ni de data. */
  comp: boolean
  items: HTMLElement[]
  name: string
  template: PlanNode
  /** Bloc de données (`data-build-data`) : chaque item est construit tel quel, sans
   *  copier/coller, puis ses textes arrivent par le panneau « data ». */
  parts?: PlanNode[]
  /** Zone de dépôt des données (par défaut : le parent des items). */
  container?: HTMLElement
  size: number
}
type PlanNode = FrameNode | CloneNode

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'CANVAS'])

function kids(el: Element): El[] {
  return [...el.children].filter(
    (c): c is El =>
      (c instanceof HTMLElement || c instanceof SVGSVGElement) &&
      !SKIP.has(c.tagName) &&
      !c.hasAttribute('data-build-skip') &&
      !c.querySelector(':scope > canvas'), // fond galaxie : toujours visible, jamais encadré
  )
}
function visible(el: Element) {
  const r = el.getBoundingClientRect()
  return r.width >= 2 && r.height >= 2
}
function sameBox(a: Element, b: Element) {
  const r1 = a.getBoundingClientRect()
  const r2 = b.getBoundingClientRect()
  return (
    Math.abs(r1.left - r2.left) < 1 &&
    Math.abs(r1.top - r2.top) < 1 &&
    Math.abs(r1.width - r2.width) < 1 &&
    Math.abs(r1.height - r2.height) < 1
  )
}
const signature = (el: El) =>
  `${el.tagName}|${el.getAttribute('data-slot') ?? ''}|${[...el.children].map((c) => c.tagName).join(',')}`

function planNode(el: El, depth: number, comp: boolean): PlanNode | null {
  if (!visible(el)) return null
  // icône ou atome (`data-build-atom`, ex. <ListItem>) : construit d'un bloc, sans ses enfants
  const atom = isIcon(el) || el.hasAttribute('data-build-atom')
  const children = atom ? [] : kids(el).filter(visible)
  const wrapper = children.length === 1 && sameBox(el, children[0]!)
  const planned = planChildren(el, children, wrapper ? depth : depth + 1, comp)
  const size = (wrapper ? 0 : 1) + planned.reduce((s, c) => s + c.size, 0)
  return { kind: wrapper ? 'silent' : 'frame', el, depth, comp, children: planned, size }
}

function cloneNode(items: El[], depth: number, name: string, comp: boolean): PlanNode | null {
  const template = planNode(items[0]!, depth, true)
  if (!template) return null
  return {
    kind: 'clone',
    depth,
    comp,
    items: items as HTMLElement[],
    name,
    template,
    size: template.size + items.length - 1,
  }
}

function planChildren(parent: El, children: El[], depth: number, comp: boolean): PlanNode[] {
  const single = (c: El) => planNode(c, depth, comp)
  const explicit = parent.getAttribute('data-build-clone')
  const dataBlock = parent.getAttribute('data-build-data')
  let out: (PlanNode | null)[]
  if (!comp && dataBlock !== null && children.length) {
    // les vrais blocs de texte peuvent être sous un wrapper (ex. la racine de <ContentRenderer>)
    let blocks = children
    while (blocks.length === 1 && kids(blocks[0]!).filter(visible).length > 1) blocks = kids(blocks[0]!).filter(visible)
    // chaque bloc de texte est une feuille : pas de frames pour ses <strong>, <a>…
    const parts = blocks
      .map(single)
      .filter((n): n is PlanNode => !!n)
      .map((n) => (n.kind === 'clone' ? n : { ...n, kind: 'frame' as const, children: [], size: 1 }))
    out = parts.length
      ? [
          {
            kind: 'clone',
            depth,
            comp: false,
            items: blocks as HTMLElement[],
            name: dataBlock || baseName(parent),
            template: parts[0]!,
            parts,
            size: parts.reduce((a, c) => a + c.size, 0),
          },
        ]
      : []
  } else if (!comp && explicit !== null && children.length > 1) {
    out = [cloneNode(children, depth, explicit || baseName(children[0]!), false)]
  } else if (!/flex|grid/.test(getComputedStyle(parent).display)) {
    out = children.map(single)
  } else {
    // découpe en suites de frères de même forme (ligne ou colonne)
    out = []
    for (let i = 0; i < children.length; ) {
      const sig = signature(children[i]!)
      let j = i + 1
      while (j < children.length && signature(children[j]!) === sig) j++
      const run = children.slice(i, j)
      if (run.length >= 2 && run[0] instanceof HTMLElement) out.push(cloneNode(run, depth, baseName(run[0]), comp))
      else out.push(...run.map(single))
      i = j
    }
  }
  return out.filter((n): n is PlanNode => !!n)
}

/* ───────────── Révélation ───────────── */

const reveal = (el: Element) => el.setAttribute('data-built', '')

async function fadeIn(el: El, ms: number) {
  const st = el.style
  st.opacity = '0'
  reveal(el)
  const o = { o: 0 }
  await tw(o, { o: 1 }, ms, Easing.Quadratic.Out, () => (st.opacity = String(o.o)))
  st.opacity = ''
}

/* ───────────── Gestes ───────────── */

const dur = (depth: number) => Math.max(240, 820 * Math.pow(0.8, depth))

async function frameWith(w: Worker, n: FrameNode) {
  await untilInView(w, n.el)
  const d = dur(n.depth)
  const b = boxOf(n.el)
  w.focus = b.h > vh() * 0.6 ? { ...b, h: vh() * 0.3 } : b

  // 1. le curseur va au coin haut-gauche
  hideSel(w)
  await moveCursor(w, b.x, b.y, d * 0.6)

  // 2. lasso jusqu'au coin bas-droit — posé, et plus long pour les très grands blocs
  const m = { w: 0, h: 0 }
  setSel(w, { x: b.x, y: b.y, w: 0, h: 0 }, 'marquee', nameOf(n.el), twLayout(n.el))
  const screenBottom = window.scrollY + vh() - stageTop() - 24
  const dragH = SCROLL_LOCK ? b.h : Math.max(Math.min(b.h, 40), Math.min(b.h, screenBottom - b.y))
  const dragMs = d * 1.6 * Math.min(2, Math.max(1, dragH / vh()))
  await tw(m, { w: b.w, h: dragH }, dragMs, Easing.Quadratic.InOut, () => {
    w.cur.x = b.x + m.w
    w.cur.y = b.y + m.h
    placeCursor(w)
    setSel(w, { x: b.x, y: b.y, w: m.w, h: m.h }, 'marquee')
  })
  // tenue au coin avant le lâcher
  await wait(d * 0.15)

  // 3. lâcher : frame, puis le contenu apparaît, avec ses cotes (padding, écarts)
  const vue = vueLabel(n.el)
  setSel(w, b, n.comp || vue ? 'component' : 'frame')
  if (vue) lingerTag(b, nameOf(n.el), twLayout(n.el))
  // feuille (atome, paragraphe…) : tout son contenu apparaît avec elle
  if (!n.children.length) n.el.querySelectorAll('*').forEach(reveal)
  fadeIn(n.el, d * 0.8).catch(noop)
  showSpacing(n.el, true)
  stats.done++
  await wait(d * 0.2)
}

/* ───────────── Étiquettes qui restent ─────────────
 * Le nom d'un composant reste affiché un moment après le lâcher, même quand le
 * curseur est reparti ; la caméra essaie de le garder dans le cadre. */

const TAG_HOLD = 2200
type Linger = { box: Box; until: number }
let lingers: Linger[] = []

function lingerTag(b: Box, name: string, cls: string) {
  const tag = document.createElement('div')
  tag.className = 'bt-tag'
  Object.assign(tag.style, { transform: `translate(${b.x}px, ${b.y}px)`, width: `${b.w}px`, height: `${b.h}px` })
  const label = mk('span', 'bt-label', tag)
  fillLabel(label, name, cls)
  overlay.value!.insertBefore(tag, overlay.value!.firstChild) // sous les curseurs
  placeLabel(label, b)
  claimText(label)
  const hold = TAG_HOLD / speed.value
  const entry: Linger = { box: b, until: performance.now() + hold }
  lingers.push(entry)
  const o = { o: 1 }
  wait(TAG_HOLD)
    .then(() => tw(o, { o: 0 }, 500, Easing.Quadratic.In, () => (tag.style.opacity = String(o.o))))
    .then(() => tag.remove())
    .catch(noop)
    .finally(() => (lingers = lingers.filter((l) => l !== entry)))
}

/* ───────────── Cotes d'espacement (façon outil de mesure) ─────────────
 * Padding : bandes hachurées à l'intérieur de la frame. Écarts (gap, space-x/y,
 * marges) : ligne pointillée entre deux frères construits, avec la valeur en px.
 * Mesuré sur la géométrie finale, qui ne bouge pas (seule la visibilité change). */

const SPACE_MIN = 2
const SPACE_HOLD = 1100

function padMeasure(g: HTMLElement, el: Element) {
  if (!(el instanceof HTMLElement)) return
  const cs = getComputedStyle(el)
  const px = (k: string) => parseFloat(cs.getPropertyValue(k)) || 0
  const b = boxOf(el)
  // boîte intérieure aux bordures
  const x = b.x + px('border-left-width')
  const y = b.y + px('border-top-width')
  const w = b.w - px('border-left-width') - px('border-right-width')
  const h = b.h - px('border-top-width') - px('border-bottom-width')
  const [t, r, bo, l] = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'].map(px) as [
    number,
    number,
    number,
    number,
  ]
  const band = (bx: number, by: number, bw: number, bh: number) => {
    if (bw < 4 || bh < 4) return
    const d = mk('div', 'bt-pad', g)
    Object.assign(d.style, { left: `${bx}px`, top: `${by}px`, width: `${bw}px`, height: `${bh}px` })
  }
  band(x, y, w, t)
  band(x, y + h - bo, w, bo)
  band(x, y + t, l, h - t - bo)
  band(x + w - r, y + t, r, h - t - bo)
}

function gapMeasure(g: HTMLElement, a: Element, c: Element) {
  let A = boxOf(a)
  let B = boxOf(c)
  const below = (p: Box, q: Box) => q.y >= p.y + p.h - 0.5
  const right = (p: Box, q: Box) => q.x >= p.x + p.w - 0.5
  if (below(B, A) || (!below(A, B) && right(B, A))) [A, B] = [B, A]
  if (below(A, B)) {
    // empilés : écart vertical
    const v = B.y - (A.y + A.h)
    if (v < SPACE_MIN) return
    const x0 = Math.max(A.x, B.x)
    const x1 = Math.min(A.x + A.w, B.x + B.w)
    const x = x1 > x0 ? (x0 + x1) / 2 : (A.x + A.w / 2 + B.x + B.w / 2) / 2
    const d = mk('div', 'bt-gap is-v', g)
    Object.assign(d.style, { left: `${x}px`, top: `${A.y + A.h}px`, height: `${v}px` })
  } else if (right(A, B)) {
    // côte à côte : écart horizontal
    const v = B.x - (A.x + A.w)
    if (v < SPACE_MIN) return
    const y0 = Math.max(A.y, B.y)
    const y1 = Math.min(A.y + A.h, B.y + B.h)
    const y = y1 > y0 ? (y0 + y1) / 2 : (A.y + A.h / 2 + B.y + B.h / 2) / 2
    const d = mk('div', 'bt-gap is-h', g)
    Object.assign(d.style, { left: `${A.x + A.w}px`, top: `${y}px`, width: `${v}px` })
  }
}

/** Frère visible le plus proche, dans un sens, s'il est déjà construit. */
function builtSibling(el: Element, dir: 'previousElementSibling' | 'nextElementSibling') {
  let s = el[dir]
  while (s && (SKIP.has(s.tagName) || !visible(s))) s = s[dir]
  return s?.hasAttribute('data-built') ? s : null
}

/** Affiche les cotes un moment puis les efface (sans bloquer le curseur). */
function flashMeasure(g: HTMLElement) {
  if (!g.childElementCount) return
  overlay.value!.insertBefore(g, overlay.value!.firstChild) // sous les curseurs
  const o = { o: 0 }
  const paint = () => (g.style.opacity = String(o.o))
  paint()
  tw(o, { o: 1 }, 180, Easing.Quadratic.Out, paint)
    .then(() => wait(SPACE_HOLD))
    .then(() => tw(o, { o: 0 }, 420, Easing.Quadratic.In, paint))
    .then(() => g.remove())
    .catch(noop)
}

function showSpacing(el: Element, withPadding: boolean, pairs: [Element, Element][] = []) {
  const g = document.createElement('div')
  g.className = 'bt-measure'
  if (withPadding) padMeasure(g, el)
  for (const s of [builtSibling(el, 'previousElementSibling'), builtSibling(el, 'nextElementSibling')])
    if (s) gapMeasure(g, s, el)
  for (const [a, b] of pairs) gapMeasure(g, a, b)
  flashMeasure(g)
}

/* ───────────── Stations : curseurs spécialisés + leurs bases ─────────────
 * Deux curseurs dédiés traitent chacun une file de travaux que les autres leur
 * confient sans les attendre : « lucid » (icônes) et « data » (données des listes).
 * Leurs bases sont des panneaux accrochés au coin haut-droit de l'écran, empilés. */

type Job = {
  el: Element
  run: (w: Worker) => Promise<void>
  /** Le travail ne peut commencer que quand ceci est vrai (ex. l'emplacement existe). */
  ready: () => boolean
  resolve: () => void
  reject: (e: unknown) => void
}
type Station = { worker: Worker | null; queue: Job[]; busy: boolean; helpers?: number }
const iconStation: Station = { worker: null, queue: [], busy: false }
const dataStation: Station = { worker: null, queue: [], busy: false }

function enqueue(
  st: Station,
  el: Element,
  run: (w: Worker) => Promise<void>,
  ready: () => boolean = () => true,
): Promise<void> {
  return new Promise((resolve, reject) => {
    st.queue.push({ el, run, ready, resolve, reject })
    pump(st)
  })
}

/** Emplacement d'une icône posé : son parent est construit. */
const slotReady = (el: Element) => () =>
  !!el.parentElement?.hasAttribute('data-built') &&
  // arrive avec les données de son composant : dès que le curseur de données les apporte
  (!el.closest('.bt-slug') || el.closest('.bt-slug')!.hasAttribute('data-bt-incoming')) &&
  isFilled(iconDb?.cells.get(iconKey(el)))

async function pump(st: Station) {
  const w = st.worker
  if (st.busy || !w) return
  st.busy = true
  const id = runId
  try {
    while (st.queue.length && id === runId) {
      // un travail prêt, de préférence déjà à l'écran ; sinon on patiente sur place
      let i = st.queue.findIndex((j) => j.ready() && inView(j.el))
      if (i < 0) i = st.queue.findIndex((j) => j.ready())
      if (i < 0) {
        await wait(60)
        continue
      }
      const job = st.queue.splice(i, 1)[0]!
      // encore du travail prêt derrière : le curseur se duplique pour le prendre en parallèle
      if (st.queue.some((j) => j.ready()) && (st.helpers ?? 0) < STATION_HELPERS && pool.length < MAX_CURSORS)
        helpStation(st, w).catch(noop)
      w.load++
      try {
        await job.run(w)
        job.resolve()
      } catch (e) {
        job.reject(e)
        throw e
      } finally {
        releaseLoad(w, id)
      }
    }
  } catch {
    /* annulé */
  } finally {
    if (id === runId) st.busy = false
  }
}

/** Duplicata maximum par curseur spécialisé. */
const STATION_HELPERS = 2

/** Duplicata d'un curseur spécialisé : prend les travaux prêts, puis disparaît quand il n'y en a plus. */
async function helpStation(st: Station, from: Worker) {
  const id = runId
  st.helpers = (st.helpers ?? 0) + 1
  const h = spawnFrom(from)
  h.special = from.special
  h.spawned = false // c'est cette boucle qui le fait disparaître, pas la fin de sa première tâche
  const color = from.cursor.style.getPropertyValue('--bt-c')
  h.cursor.style.setProperty('--bt-c', color)
  h.sel.style.setProperty('--bt-c', color)
  try {
    await h.ready
    while (id === runId) {
      const i = st.queue.findIndex((j) => j.ready())
      if (i < 0) break
      const job = st.queue.splice(i, 1)[0]!
      h.load++
      try {
        await job.run(h)
        job.resolve()
      } catch (e) {
        job.reject(e)
        throw e
      } finally {
        releaseLoad(h, id)
      }
    }
  } finally {
    st.helpers = Math.max(0, (st.helpers ?? 1) - 1)
    if (id === runId) despawn(h)
  }
}

/** Travaux des curseurs spécialisés : attendus seulement à la toute fin, jamais par une section. */
let stationJobs: Promise<void>[] = []

/** Icônes confiées dès le départ au curseur d'icônes (nœud du plan → sa promesse). */
let iconJobs = new Map<PlanNode, Promise<void>>()

function resetStations() {
  iconJobs = new Map()
  for (const st of [iconStation, dataStation]) {
    st.worker = null
    st.queue = []
    st.busy = false
  }
  dbPanels = []
  iconDb = null
  dataDb = new Map()
}

/* Panneaux de bases : suivent l'écran (l'overlay est en coordonnées document). */
let dbPanels: HTMLElement[] = []

function placeDbs() {
  if (!stage.value) return
  const right = stage.value.getBoundingClientRect().width - 16
  let y = window.scrollY - stageTop() + 84
  for (const p of dbPanels) {
    p.style.transform = `translate(${right - p.offsetWidth}px, ${y}px)`
    y += p.offsetHeight + 10
  }
}

function showPanel(panel: HTMLElement) {
  dbPanels.push(panel)
  placeDbs()
  const o = { o: 0 }
  tw(o, { o: 1 }, 300, Easing.Quadratic.Out, () => (panel.style.opacity = String(o.o))).catch(noop)
}

/* Icônes : base « lucid » */

let iconDb: { panel: HTMLElement; cells: Map<string, HTMLElement> } | null = null

/** Clé d'une icône : sa classe `i-<collection>:<nom>` en mode CSS, son contenu pour un svg. */
const iconKey = (el: Element) => [...el.classList].find((c) => c.startsWith('i-')) ?? el.innerHTML

/** Copie d'icône hors de la page, à une taille donnée (sans marges ni classes de taille). */
function iconCopy(el: Element, w: number, h: number): El {
  const copy = el.cloneNode(true) as El
  if (copy instanceof SVGSVGElement) {
    copy.removeAttribute('class')
  } else {
    copy.setAttribute('class', [...el.classList].filter((c) => c === 'iconify' || c.startsWith('i-')).join(' '))
  }
  copy.removeAttribute('data-built')
  copy.style.display = 'block'
  copy.style.margin = '0'
  copy.style.width = `${w}px`
  copy.style.height = `${h}px`
  return copy
}

/* Agents : pas de curseur, ils tapent. Chaque base est remplie au fil de l'eau par
 * son agent ; un curseur n'utilise une entrée qu'une fois qu'elle est remplie. */

const isFilled = (el?: HTMLElement | null) => !el || el.dataset.filled !== undefined

function dbHead(panel: HTMLElement, name: string) {
  mk('div', 'bt-data-head', panel).textContent = name
}

/** Frappe `text` dans `node`, caractère par caractère, avec un caret. */
async function typeInto(node: HTMLElement, text: string, msPerChar: number) {
  node.classList.add('is-typing')
  for (let i = 1; i <= text.length; i++) {
    node.textContent = text.slice(0, i)
    await wait(msPerChar * (0.6 + Math.random() * 0.8))
  }
  node.classList.remove('is-typing')
}

async function popIn(el: HTMLElement) {
  el.hidden = false
  const o = { s: 0.4, o: 0 }
  const paint = () => {
    el.style.transform = `scale(${o.s})`
    el.style.opacity = String(o.o)
  }
  paint()
  await tw(o, { s: 1, o: 1 }, 220, Easing.Back.Out, paint)
  el.style.transform = ''
  el.style.opacity = ''
}

/** Nom cherché dans lucid : `i-lucide:github` → « github ». */
const iconQuery = (key: string) => (key.startsWith('i-') ? key.slice(key.indexOf(':') + 1) : 'svg')

function buildIconDb() {
  const icons = [...root.value!.querySelectorAll('svg, .iconify')].filter(
    (el) => visible(el) && !el.parentElement?.closest('svg, .iconify'),
  )
  const cells = new Map<string, HTMLElement>()
  const panel = mk('div', 'bt-icondb', overlay.value!)
  dbHead(panel, 'lucid')
  const search = mk('div', 'bt-db-search', panel)
  const query = mk('span', 'bt-db-query', search)
  const hits = mk('span', 'bt-db-hits', search)
  const grid = mk('div', 'bt-icondb-grid', panel)
  for (const icon of icons) {
    const key = iconKey(icon)
    if (cells.has(key)) continue
    const cell = mk('div', 'bt-icondb-cell', grid)
    cell.appendChild(iconCopy(icon, 16, 16))
    cell.hidden = true
    cells.set(key, cell)
  }
  iconDb = { panel, cells }
  showPanel(panel)
  if (cells.size) iconAgent(cells, query, hits).catch(noop)
}

/** L'agent de lucid cherche chaque icône par son nom, puis l'ajoute à la base. */
async function iconAgent(cells: Map<string, HTMLElement>, query: HTMLElement, hits: HTMLElement) {
  for (const [key, cell] of cells) {
    hits.textContent = ''
    await typeInto(query, iconQuery(key), 55)
    await wait(140)
    hits.textContent = '→ 1'
    await popIn(cell)
    cell.dataset.filled = ''
    await wait(260)
    query.textContent = ''
  }
  hits.textContent = `${cells.size} ✓`
}

/* Données : base « data », un bloc par liste (aperçu de chaque item) */

let dataDb = new Map<CloneNode, HTMLElement>()
/** Textes en vrac de chaque section (nœud de section → bloc de données). */
let sectionData = new Map<PlanNode, CloneNode>()

function sectionName(el: HTMLElement) {
  if (el.id) return pascal(el.id)
  const v = vueLabel(el)
  return v ? v.replace(/^<|(\.vue)?>$/g, '') : pascal(el.tagName.toLowerCase())
}

/** Pour chaque section : les éléments qui portent du texte hors des listes / blocs de données. */
/** Liste (ou bloc de données) → la section qui la contient : ses données partent avec celles de la section. */
let cloneSection = new Map<PlanNode, PlanNode>()
/** Slugs posés sur chaque item, en attendant ses données. */
let itemSlots = new Map<HTMLElement, TextSlot[]>()

const docOrder = (a: Node, b: Node) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)

function planSectionData(tree: PlanNode) {
  sectionData = new Map()
  cloneSection = new Map()
  itemSlots = new Map()
  walkPlan(tree, (sec) => {
    if (!isSection(sec) || sec.kind === 'clone') return
    const handled: HTMLElement[] = []
    const dataItems: HTMLElement[] = []
    walkPlan(sec, (n) => {
      if (n.kind !== 'clone') return
      handled.push(...n.items)
      if (!n.comp && !cloneSection.has(n)) {
        cloneSection.set(n, sec)
        dataItems.push(...n.items)
      }
    })
    const hosts = new Set<HTMLElement>()
    const walker = document.createTreeWalker(sec.el, NodeFilter.SHOW_TEXT)
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const host = t.parentElement
      if (!host || !(t as Text).data.trim() || !visible(host)) continue
      if (handled.some((h) => h.contains(host)) || host.closest('svg, .iconify, [data-build-skip]')) continue
      hosts.add(host)
    }
    // toutes les données de la section : textes en vrac + listes + blocs, dans l'ordre de la page
    const items = [...hosts, ...dataItems].sort(docOrder)
    if (!items.length) return
    sectionData.set(sec, {
      kind: 'clone',
      depth: sec.depth,
      comp: false,
      items,
      name: sectionName(sec.el as HTMLElement),
      template: sec,
      parts: [],
      size: 0,
      container: sec.el as HTMLElement,
    })
  })
}

function walkPlan(n: PlanNode, fn: (n: PlanNode) => void) {
  fn(n)
  if (n.kind === 'clone') (n.parts ?? [n.template]).forEach((c) => walkPlan(c, fn))
  else n.children.forEach((c) => walkPlan(c, fn))
}

/** Aperçu d'un item, lu avant la pose des slugs : `{ title: "Yui", … }`. */
function previewOf(item: HTMLElement) {
  const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT)
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const v = (t as Text).data.trim()
    if (!v || !t.parentElement) continue
    const key = slugBase(t.parentElement, item)
    return `{ ${key}: "${v.length > 18 ? `${v.slice(0, 17)}…` : v}", … }`
  }
  return '{ }'
}

function buildDataDb(tree: PlanNode) {
  const lists: CloneNode[] = []
  // un bloc par section ; une liste hors section garde son propre bloc
  walkPlan(tree, (n) => {
    if (n.kind === 'clone' && !n.comp && !cloneSection.has(n)) lists.push(n)
  })
  lists.push(...sectionData.values())
  lists.sort((a, b) => docOrder(a.items[0]!, b.items[0]!))
  if (!lists.length) return
  const panel = mk('div', 'bt-datadb', overlay.value!)
  dbHead(panel, 'data')
  const todo: { block: HTMLElement; sub: string; rows: string[] }[] = []
  for (const n of lists) {
    const block = mk('div', 'bt-data-block', panel)
    todo.push({ block, sub: `${n.name}[${n.items.length}]`, rows: n.items.map(previewOf) })
    dataDb.set(n, block)
  }
  showPanel(panel)
  dataAgent(todo).catch(noop)
}

/** L'agent de data tape chaque liste : son nom, puis une ligne par item. */
async function dataAgent(todo: { block: HTMLElement; sub: string; rows: string[] }[]) {
  for (const { block, sub, rows } of todo) {
    await typeInto(mk('div', 'bt-data-sub', block), sub, 45)
    for (const r of rows) await typeInto(mk('div', 'bt-data-row', block), r, 14)
    block.dataset.filled = ''
    await wait(200)
  }
}

async function iconFromDb(w: Worker, n: FrameNode) {
  await untilInView(w, n.el)
  const d = dur(n.depth)
  const b = boxOf(n.el)
  w.focus = b
  const cell = iconDb?.cells.get(iconKey(n.el))
  hideSel(w)

  // 1. aller chercher l'icône dans la base
  if (cell) {
    const cb = boxOf(cell)
    await moveCursor(w, cb.x + cb.w * 0.5, cb.y + cb.h * 0.5, d * 0.9)
    cell.classList.add('is-picked')
  }

  const ghost = iconCopy(n.el, b.w, b.h)
  ghost.classList.add('bt-icon-ghost')
  ghost.style.color = getComputedStyle(n.el).color
  overlay.value!.appendChild(ghost)
  const g = { s: 0.6, o: 0 }
  const paint = () => {
    ghost.style.transform = `translate(${w.cur.x - b.w * 0.5}px, ${w.cur.y - b.h * 0.5}px) scale(${g.s})`
    ghost.style.opacity = String(g.o)
  }
  await tw(g, { s: 1.15, o: 1 }, 200, Easing.Back.Out, paint)
  cell?.classList.remove('is-picked')

  // 2. glisser jusqu'à sa place
  await tw(w.cur, { x: b.x + b.w * 0.5, y: b.y + b.h * 0.5 }, d * 1.2 * TRAVEL, Easing.Cubic.InOut, () => {
    placeCursor(w)
    paint()
  })
  await wait(d * 0.2)

  // 3. lâcher : l'icône se pose, la frame confirme
  await tw(g, { s: 1 }, 140, Easing.Quadratic.Out, paint)
  setSel(w, b, n.comp ? 'component' : 'frame', 'Icon')
  reveal(n.el)
  showSpacing(n.el, false)
  ghost.remove()
  stats.done++
  await wait(d * 0.3)
}

/* ───────────── Ordonnancement ─────────────
 * runNode(n, w, bag) rend la main quand le travail PROPRE de w sur n est fini ;
 * les sous-arbres confiés à d'autres curseurs sont déposés dans `bag`, que
 * l'appelant vide (drain) quand il a besoin que tout soit terminé. */

const LEAD_DEPTH = 2

async function drain(bag: Promise<void>[]) {
  while (bag.length) await Promise.all(bag.splice(0))
}

function releaseLoad(w: Worker, id: number) {
  if (id !== runId) return
  w.load--
  if (w.load > 0) return
  hideSel(w)
  if (w.spawned) despawn(w)
}

async function runNode(n: PlanNode, w: Worker, bag: Promise<void>[]): Promise<void> {
  if (n.kind === 'clone') return cloneRun(n, w, bag)
  if (n.kind === 'silent') reveal(n.el)
  else if (isIcon(n.el)) {
    // les icônes partent au curseur d'icônes ; on ne l'attend pas
    // déjà confiée au curseur d'icônes dès le départ : on rattache juste sa promesse
    if (!iconJobs.has(n)) stationJobs.push(enqueue(iconStation, n.el, (iw) => iconFromDb(iw, n), slotReady(n.el)))
    return
  } else await frameWith(w, n)
  await runChildren(n, w, bag)
}

/** Plafond de curseurs de construction actifs en même temps (hors principal et spécialisés). */
const MAX_CONCURRENT = 3

function takeWorker(w: Worker, c: PlanNode, force: boolean): Worker | null {
  // au plafond : le curseur garde le travail pour lui
  const active = pool.filter((p) => !p.lead && !p.special && p.load > 0).length
  if (active >= MAX_CONCURRENT) return null
  // un curseur libre d'abord ; sinon, si le morceau est assez gros, le curseur se duplique
  const idle = pool.find((p) => p.load === 0 && !p.spawned && !p.lead && !p.special)
  if (idle) return idle
  if ((force || c.size >= DUP_MIN_SIZE) && pool.length < maxPool()) return spawnFrom(w)
  return null
}

/** Une section démarre quand son haut est entré de 20 % dans le viewport (ou en bas de page). */
const SECTION_TRIGGER = 0.2
/** Délai minimum entre le début de deux sections (ms, à vitesse ×1). */
const MIN_SECTION_GAP = 700
let lastSectionAt = 0

function untilTriggered(el: Element): Promise<void> {
  const id = runId
  return new Promise((resolve, reject) => {
    const check = () => {
      if (id !== runId) {
        awaitingScroll.value = false
        return reject(CANCEL)
      }
      const r = el.getBoundingClientRect()
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (r.top <= vh() * (1 - SECTION_TRIGGER) || atBottom) {
        awaitingScroll.value = false
        return resolve()
      }
      awaitingScroll.value = true
      requestAnimationFrame(check)
    }
    check()
  })
}

/** Grandes parties de la page, construites l'une après l'autre. */
const isSection = (n: PlanNode) =>
  n.kind !== 'clone' && ['HEADER', 'FOOTER', 'SECTION'].includes(n.el.tagName)

/** Le principal confie une section entière à un curseur et attend qu'elle soit finie. */
async function runSection(c: PlanNode, w: Worker) {
  const id = runId
  const sectionBag: Promise<void>[] = []
  // textes « en vrac » de la section (hors listes et blocs) : slugs tout de suite
  const sd = sectionData.get(c)
  const handled = new Set([...cloneSection].filter(([, sec]) => sec === c).flatMap(([n]) => (n as CloneNode).items))
  if (sd) for (const h of sd.items) if (!handled.has(h)) itemSlots.set(h, applySlugs(h, false, true))
  const x = takeWorker(w, c, true)
  w.watching = true
  w.section = c.kind !== 'clone' ? c.el : undefined
  w.focus = null
  try {
    if (x) {
      x.load++
      await (x.ready ?? Promise.resolve()).then(() => runNode(c, x, sectionBag)).finally(() => releaseLoad(x, id))
    } else {
      w.watching = false
      await runNode(c, w, sectionBag)
    }
    await drain(sectionBag)
  } finally {
    w.watching = false
  }
  // section entièrement construite (composants posés et dupliqués) : toutes ses données
  // arrivent d'un coup, en un seul bloc
  const done = () => {
    if (c.kind !== 'clone') c.el.classList.add('bt-section-done')
  }
  if (!sd) done()
  if (sd) {
    stationJobs.push(
      enqueue(
        dataStation,
        sd.container!,
        (dw) =>
          dataFromDb(
            dw,
            sd,
            sd.items.map((it) => itemSlots.get(it) ?? []),
          ).then(done),
        () => isFilled(dataDb.get(sd)),
      ),
    )
  }
}

/** Clic : le curseur va sur l'élément, s'enfonce, une onde part, l'élément s'allume. */
async function clickOn(w: Worker, el: HTMLElement) {
  await untilInView(w, el)
  const b = boxOf(el)
  w.focus = b
  await moveCursor(w, b.x + b.w * 0.5, b.y + b.h * 0.6, 260)
  w.cursor.classList.add('is-press')
  const ripple = mk('i', 'bt-ripple', overlay.value!)
  const r = { s: 0.2, o: 0.7 }
  const paint = () => {
    ripple.style.transform = `translate(${w.cur.x}px, ${w.cur.y}px) translate(-50%, -50%) scale(${r.s})`
    ripple.style.opacity = String(r.o)
  }
  paint()
  el.setAttribute('data-clicked', '')
  await wait(90)
  w.cursor.classList.remove('is-press')
  tw(r, { s: 1, o: 0 }, 380, Easing.Quadratic.Out, paint)
    .then(() => ripple.remove())
    .catch(noop)
  await wait(120)
}

async function runChildren(n: FrameNode, w: Worker, bag: Promise<void>[]) {
  const children = n.children
  if (!children.length) return
  const id = runId

  // Le principal avance section par section (header, chaque section, footer) : il
  // pose la structure entre deux, et chaque section est finie avant la suivante.
  if (w.lead && children.some(isSection)) {
    for (const c of children) {
      // le header se construit en parallèle : les sections suivantes n'attendent pas sa fin
      if (isSection(c) && c.kind !== 'clone' && c.el.tagName === 'HEADER') {
        bag.push(runSection(c, w))
        continue
      }
      if (isSection(c)) {
        if (c.kind !== 'clone') await untilTriggered(c.el)
        const gap = MIN_SECTION_GAP / speed.value - (performance.now() - lastSectionAt)
        if (gap > 0) await wait(gap * speed.value)
        lastSectionAt = performance.now()
        await runSection(c, w)
      } else await runNode(c, w, bag)
    }
    return
  }

  // Le principal garde la structure et confie tout le détail ; un secondaire garde
  // son premier enfant et confie les autres (les plus gros d'abord).
  const delegable = w.lead
    ? children.filter((c) => c.depth > LEAD_DEPTH)
    : children.slice(1)
  const handoff = new Map<PlanNode, Worker>()
  // dans l'ordre de la page : la construction descend de haut en bas
  for (const c of delegable) {
    const x = takeWorker(w, c, w.lead)
    if (!x) continue
    x.load++ // réservé tout de suite : personne d'autre ne peut le prendre
    handoff.set(c, x)
  }
  for (const [c, x] of handoff) {
    bag.push((x.ready ?? Promise.resolve()).then(() => runNode(c, x, bag)).finally(() => releaseLoad(x, id)))
  }
  // hors sections : le principal enchaîne la structure sans
  // attendre que le détail confié aux autres soit fini
  for (const c of children) if (!handoff.has(c)) await runNode(c, w, bag)
}

/* Slugs */

type TextSlot = { node: Text; original: string; key: string }
let slots: TextSlot[] = []

const SLOT_NAMES: Record<string, string> = {
  'card-title': 'title',
  'card-description': 'description',
  badge: 'tag',
  button: 'label',
}
const CONTAINER_SLOTS = new Set(['card', 'card-header', 'card-content', 'card-footer'])

function slugBase(el: HTMLElement, item: HTMLElement): string {
  for (let e: HTMLElement | null = el; e; e = e.parentElement) {
    const s = e.dataset.slot
    if (s && !CONTAINER_SLOTS.has(s)) return SLOT_NAMES[s] ?? s
    if (e === item) break
  }
  const tag = el.tagName.toLowerCase()
  return tag === 'p' ? 'text' : tag === 'a' ? 'label' : tag
}

const LOREM =
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat '

/** Nombre de mots à partir duquel le slug est complété de lorem ipsum. */
const LOREM_MIN_WORDS = 6

/** Le slug, suivi de lorem ipsum jusqu'à la longueur de la vraie donnée si elle est
 *  assez longue (un paragraphe garde ainsi à peu près sa taille ; un titre garde le slug seul). */
function slugText(key: string, original: string) {
  const text = original.trim()
  if (text.split(/\s+/).length < LOREM_MIN_WORDS) return `{{ ${key} }}`
  // texte long : du lorem seul, à la longueur du vrai texte
  let fill = ''
  while (fill.length < text.length) fill += LOREM
  const lorem = fill.slice(0, text.length).trimEnd()
  return lorem.charAt(0).toUpperCase() + lorem.slice(1)
}

/**
 * Remplace les textes de `item` par des slugs `{{ clé }}`.
 * `single` : un seul slug pour tout le bloc (`{{ text }}`), les autres textes vidés.
 * `direct` : seulement les textes enfants directs (textes « en vrac » d'une section).
 */
function applySlugs(item: HTMLElement, single = false, direct = false): TextSlot[] {
  const found: { node: Text; original: string; base: string }[] = []
  const nodes = direct
    ? [...item.childNodes].filter((c): c is Text => c.nodeType === Node.TEXT_NODE)
    : (() => {
        const out: Text[] = []
        const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(n as Text)
        return out
      })()
  for (const node of nodes) {
    // « › », « · »… : pas une donnée, on n'y touche pas
    if (!/[\p{L}\p{N}]/u.test(node.data) || !node.parentElement) continue
    found.push({ node, original: node.data, base: slugBase(node.parentElement, item) })
  }
  if (single) {
    const list = found.map((f, i) => {
      f.node.data = i === 0 ? slugText('text', found.map((x) => x.original.trim()).join(' ')) : ''
      return { node: f.node, original: f.original, key: 'text' }
    })
    markSlugged(list)
    item.classList.add('bt-slug')
    slots.push(...list)
    return list
  }
  const total: Record<string, number> = {}
  found.forEach((f) => (total[f.base] = (total[f.base] ?? 0) + 1))
  const seen: Record<string, number> = {}
  const list = found.map((f) => {
    const i = (seen[f.base] = (seen[f.base] ?? -1) + 1)
    const key = total[f.base]! > 1 ? `${f.base}.${i}` : f.base
    f.node.data = slugText(key, f.original)
    return { node: f.node, original: f.original, key }
  })
  markSlugged(list)
  item.classList.add('bt-slug')
  slots.push(...list)
  return list
}

/** Marque les éléments qui affichent un slug `{{ clé }}` (police mono), pas ceux en lorem. */
function markSlugged(list: TextSlot[]) {
  for (const s of list) if (s.node.data.startsWith('{{')) s.node.parentElement?.setAttribute('data-bt-slugged', '')
}

// Remplissage : le slug se décode en vrai texte (voir fillTexts).
const NO_STYLE = '__none__'

/** Fige la boîte d'un élément (taille finale) ; l'ancien style est gardé pour restauration. */
function lockBox(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  el.dataset.btLock = el.getAttribute('style') ?? NO_STYLE
  el.style.boxSizing = 'border-box'
  el.style.width = `${r.width}px`
  el.style.height = `${r.height}px`
}
function unlockBox(el: HTMLElement) {
  const prev = el.dataset.btLock
  if (prev === undefined) return
  if (prev === NO_STYLE) el.removeAttribute('style')
  else el.setAttribute('style', prev)
  delete el.dataset.btLock
}

const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789{}<>/_=+*#'
const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!

/**
 * Décodage : le slug (et son lorem) se résout en vrai texte de gauche à droite, avec un
 * front de quelques caractères brouillés. La boîte garde sa taille finale pendant l'effet.
 */
async function fillTexts(item: HTMLElement, list: TextSlot[]) {
  const from = list.map((s) => s.node.data)
  item.classList.remove('bt-slug')
  // mesurée avec le vrai texte, la boîte ne bouge plus pendant le décodage
  for (const s of list) s.node.data = s.original
  const hosts = [...new Set(list.map((s) => s.node.parentElement).filter((h): h is HTMLElement => !!h))]
  hosts.forEach((h) => h.removeAttribute('data-bt-slugged'))
  hosts.forEach(lockBox)
  const FRONT = 4
  await Promise.all(
    list.map((s, i) => {
      const to = s.original
      const src = from[i]!
      const p = { p: 0 }
      return tw(p, { p: 1 }, Math.min(1100, 320 + to.length * 6), Easing.Quadratic.Out, () => {
        const n = Math.floor(p.p * to.length)
        const k = Math.min(FRONT, to.length - n)
        let front = ''
        for (let j = 0; j < k; j++) front += to[n + j] === ' ' ? ' ' : glyph()
        s.node.data = to.slice(0, n) + front + src.slice(n + k, Math.max(n + k, to.length))
      }).then(() => {
        s.node.data = to
      })
    }),
  )
  hosts.forEach(unlockBox)
}

/* Clonage : un seul curseur fait tout (modèle → copier/coller → données) */

/** Regroupe les items par ligne visuelle (même haut), lignes de haut en bas, items de gauche à droite. */
function rowsOf(items: HTMLElement[]): HTMLElement[][] {
  const rows: { top: number; items: HTMLElement[] }[] = []
  for (const it of items) {
    const top = it.getBoundingClientRect().top
    const row = rows.find((r) => Math.abs(r.top - top) < 4)
    if (row) row.items.push(it)
    else rows.push({ top, items: [it] })
  }
  rows.sort((a, b) => a.top - b.top)
  return rows.map((r) => r.items.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left))
}

function unionBox(els: HTMLElement[]): Box {
  const bs = els.map(boxOf)
  const x = Math.min(...bs.map((b) => b.x))
  const y = Math.min(...bs.map((b) => b.y))
  return {
    x,
    y,
    w: Math.max(...bs.map((b) => b.x + b.w)) - x,
    h: Math.max(...bs.map((b) => b.y + b.h)) - y,
  }
}

/** Copie flottante d'un élément (avec le nom de son composant), sous les curseurs. */
function makeGhost(source: HTMLElement) {
  const b = boxOf(source)
  const el = source.cloneNode(true) as HTMLElement
  // icônes pas encore posées dans la source : la copie montre le placeholder « <svg> », pas l'icône
  const srcIcons = [...source.querySelectorAll<El>('svg, .iconify')]
  ;[...el.querySelectorAll<El>('svg, .iconify')].forEach((icon, i) => {
    const src = srcIcons[i]
    if (!src || src.hasAttribute('data-built') || src.parentElement?.closest('svg, .iconify')) return
    const r = src.getBoundingClientRect()
    const hole = document.createElement('span')
    hole.className = 'bt-icon-hole is-inline'
    hole.textContent = '<svg>'
    hole.style.width = `${r.width}px`
    hole.style.height = `${r.height}px`
    icon.replaceWith(hole)
  })
  const name = source.dataset.buildName ?? (vueLabel(source) && `◇ ${vueLabel(source)}`)
  el.removeAttribute('data-build-name')
  el.removeAttribute('id')
  el.classList.add('bt-ghost')
  if (name) mk('span', 'bt-label bt-ghost-label', el).textContent = name
  overlay.value!.insertBefore(el, overlay.value!.firstChild)
  const g = { ...b }
  const paint = () => {
    el.style.transform = `translate(${g.x}px, ${g.y}px)`
    el.style.width = `${g.w}px`
    el.style.height = `${g.h}px`
  }
  paint()
  return { el, g, paint }
}

const boxUnion = (bs: Box[]): Box => {
  const x = Math.min(...bs.map((b) => b.x))
  const y = Math.min(...bs.map((b) => b.y))
  return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y }
}

/**
 * Slide to duplicate (alt + glisser) : le curseur saisit la sélection (`sources`) et la
 * fait glisser d'un seul geste jusqu'à la dernière étape ; à chaque étape franchie
 * (`waypoints[k]`, une cible par source), les copies sont posées au passage.
 */
async function slideDuplicate(w: Worker, sources: HTMLElement[], waypoints: HTMLElement[][]) {
  if (!waypoints.length) return
  const ghosts = sources.map(makeGhost)
  const src = sources.map(boxOf)
  // boîtes de chaque fantôme à chaque étape (0 = départ) ; une source sans cible suit le groupe
  const steps: Box[][] = [src]
  for (const row of waypoints) {
    const d0 = boxOf(row[0]!)
    const dx = d0.x - src[0]!.x
    const dy = d0.y - src[0]!.y
    steps.push(src.map((b, i) => (row[i] ? boxOf(row[i]!) : { ...b, x: b.x + dx, y: b.y + dy })))
  }
  const centers = steps.map((bs) => {
    const u = boxUnion(bs)
    return { x: u.x + u.w / 2, y: u.y + u.h / 2 }
  })
  const cum = [0]
  for (let k = 1; k < centers.length; k++)
    cum.push(cum[k - 1]! + Math.hypot(centers[k]!.x - centers[k - 1]!.x, centers[k]!.y - centers[k - 1]!.y))
  const total = cum[cum.length - 1]! || 1

  const drop = (k: number) => {
    for (const t of waypoints[k]!) {
      reveal(t)
      // tout le contenu de la copie, sauf ses icônes : elles arriveront avec ses données
      t.querySelectorAll('*').forEach((e) => {
        if (!e.closest('svg, .iconify')) reveal(e)
      })
      for (const icon of t.querySelectorAll<El>('svg, .iconify')) {
        if (icon.parentElement?.closest('svg, .iconify') || !visible(icon)) continue
        const node: FrameNode = { kind: 'frame', el: icon, depth: 9, comp: true, children: [], size: 1 }
        stationJobs.push(enqueue(iconStation, icon, (iw) => iconFromDb(iw, node), slotReady(icon)))
      }
      stats.done++
    }
  }
  // saisir la sélection
  hideSel(w)
  await moveCursor(w, centers[0]!.x, centers[0]!.y, 200)
  await wait(80)
  // glisser d'un trait
  let dropped = 0
  const k = { t: 0 }
  await tw(k, { t: 1 }, Math.min(1900, 300 + total * 0.7), Easing.Cubic.InOut, () => {
    const d = k.t * total
    let seg = 0
    while (seg < cum.length - 2 && d > cum[seg + 1]!) seg++
    while (dropped < seg) drop(dropped++)
    const len = cum[seg + 1]! - cum[seg]! || 1
    const f = Math.min(1, (d - cum[seg]!) / len)
    const lerp = (a: number, b: number) => a + (b - a) * f
    ghosts.forEach((gh, i) => {
      const a = steps[seg]![i]!
      const b = steps[seg + 1]![i]!
      Object.assign(gh.g, { x: lerp(a.x, b.x), y: lerp(a.y, b.y), w: lerp(a.w, b.w), h: lerp(a.h, b.h) })
      gh.paint()
    })
    w.cur.x = lerp(centers[seg]!.x, centers[seg + 1]!.x)
    w.cur.y = lerp(centers[seg]!.y, centers[seg + 1]!.y)
    placeCursor(w)
  })
  while (dropped < waypoints.length) drop(dropped++)
  ghosts.forEach((gh) => gh.el.remove())
  await wait(60)
}

/** Le curseur de données prend le bloc de la liste dans la base « data », le glisse
 *  d'un seul geste sur la liste, puis chaque ligne file vers son item. */
async function dataFromDb(w: Worker, n: CloneNode, lists: TextSlot[][]) {
  const ov = overlay.value!
  const items = n.items
  const container = n.container ?? items[0]!.parentElement!
  await untilInView(w, container)
  const cb = boxOf(container)
  w.focus = cb
  const block = dataDb.get(n)
  if (!block) {
    await Promise.all(items.map((item, i) => fillTexts(item, lists[i]!)))
    return
  }

  // 1. aller saisir le bloc au milieu de son en-tête, dans la base
  const head = block.firstElementChild as HTMLElement
  const hb = boxOf(head)
  const bb = boxOf(block)
  const grab = { dx: hb.x - bb.x + hb.w * 0.5, dy: hb.y - bb.y + hb.h * 0.5 }
  await moveCursor(w, bb.x + grab.dx, bb.y + grab.dy, 300)

  // le bloc quitte la base : une copie flottante suit la main, l'original s'estompe
  const float = mk('div', 'bt-data is-grabbed', ov)
  float.style.opacity = '1'
  float.style.width = `${bb.w}px`
  for (const c of block.children) float.appendChild(c.cloneNode(true))
  block.remove() // la donnée quitte la table
  // le curseur d'icônes peut partir en même temps vers ces composants
  items.forEach((it) => it.setAttribute('data-bt-incoming', ''))
  const p = { x: bb.x, y: bb.y, s: 1 }
  const paintFloat = () => {
    float.style.transform = `translate(${p.x}px, ${p.y}px) scale(${p.s})`
    w.cur.x = p.x + grab.dx * p.s
    w.cur.y = p.y + grab.dy * p.s
    placeCursor(w)
  }
  paintFloat()

  // 2. un seul glisser jusqu'à la liste (zone de dépôt) ; le bloc rétrécit en route
  //    pour tenir dans la cible, et s'y pose centré
  setSel(w, cb, 'drop', `◇ ${vueLabel(items[0]!) ?? n.name}[${items.length}]`)
  const fw = float.offsetWidth
  const fh = float.offsetHeight
  const s = Math.min(1, Math.max(0.35, Math.min((cb.w * 0.55) / fw, (cb.h * 0.55) / fh)))
  await tw(
    p,
    { x: cb.x + (cb.w - fw * s) * 0.5, y: cb.y + (cb.h - fh * s) * 0.5, s },
    430 * TRAVEL,
    Easing.Cubic.InOut,
    paintFloat,
  )

  // 3. lâcher : chaque ligne se détache et file vers son item, toutes en même temps
  hideSel(w)
  const po = { o: 1 }
  const rows = [...float.querySelectorAll<HTMLElement>('.bt-data-row')]
  const chips = rows.map((row) => {
    const rb = boxOf(row)
    const chip = row.cloneNode(true) as HTMLElement
    chip.className = 'bt-chip'
    ov.appendChild(chip)
    const c = { x: rb.x, y: rb.y, s: p.s, o: 1 }
    const paint = () => {
      chip.style.transform = `translate(${c.x}px, ${c.y}px) scale(${c.s})`
      chip.style.opacity = String(c.o)
    }
    paint()
    return { chip, c, paint, h: rb.h }
  })
  await tw(po, { o: 0 }, 160, Easing.Quadratic.In, () => (float.style.opacity = String(po.o)))
  float.remove()

  await Promise.all(
    items.map(async (item, i) => {
      const { chip, c, paint, h } = chips[i]!
      const ib = boxOf(item)
      await wait(i * 50)
      const cw = chip.offsetWidth
      const ch = h / p.s
      await tw(c, { x: ib.x + (ib.w - cw) * 0.5, y: ib.y + (ib.h - ch) * 0.5, s: 1 }, 360, Easing.Cubic.Out, paint)
      // 4. la pastille se résorbe dans l'item (vers son centre), ses slugs se remplissent
      await tw(c, { x: c.x + cw * 0.2, y: c.y + ch * 0.2, s: 0.6, o: 0 }, 160, Easing.Quadratic.In, paint)
      chip.remove()
      await fillTexts(item, lists[i]!)
    }),
  )
}

async function cloneRun(n: CloneNode, w: Worker, bag: Promise<void>[]) {
  const first = n.items[0]!
  if (n.parts) return dataBlockRun(n, w, bag)
  // dans un composant, les textes sont déjà des slugs du composant parent
  // (pas de map(applySlugs) : map passerait l'index et le tableau en options)
  const lists = n.comp ? [] : n.items.map((it) => applySlugs(it))

  // 1. le modèle (avec ses slugs) ; ses sous-parties confiées doivent être finies avant de copier
  const name = vueLabel(first) ?? n.name
  first.dataset.buildName = `◇ ${name}`
  const templateBag: Promise<void>[] = []
  await runNode(n.template, w, templateBag)
  await drain(templateBag)

  // 2. copier / coller, une dimension à la fois :
  //    a) le modèle est collé le long de sa ligne (horizontal) ;
  //    b) puis la ligne entière est copiée vers le bas, ligne par ligne (vertical).
  await untilInView(w, first)
  const rows = rowsOf(n.items)
  const select = async (els: HTMLElement[], label: string) => {
    const b = unionBox(els)
    w.focus = b
    await moveCursor(w, b.x + b.w * 0.5, b.y + b.h * 0.5, 220)
    setSel(w, b, 'component', label)
    await wait(90)
  }

  const pairs = <T,>(xs: T[]) => xs.slice(1).map((x, i) => [xs[i]!, x] as [T, T])
  await select([first], `◇ ${name}`)
  const line = rows[0]!.filter((it) => it !== first)
  // le long de la ligne : un seul glisser, les copies posées au passage
  await slideDuplicate(w, [first], line.map((it) => [it]))
  // cotes : écarts entre les copies de la ligne
  if (line.length) showSpacing(first, false, pairs(rows[0]!))

  // puis la première ligne entière glisse vers le bas, une copie posée à chaque ligne
  if (rows.length > 1) {
    await untilInView(w, rows[1]![0]!)
    await select(rows[0]!, rows[0]!.length > 1 ? `◇ ${name} ×${rows[0]!.length}` : `◇ ${name}`)
    await slideDuplicate(w, rows[0]!, rows.slice(1))
    for (let r = 1; r < rows.length; r++) {
      showSpacing(rows[r]![0]!, false, [[rows[r - 1]![0]!, rows[r]![0]!], ...pairs(rows[r]!)])
    }
  }
  delete first.dataset.buildName
  lingerTag(unionBox(n.items), `◇ ${name} ×${n.items.length}`, `v-for · ${n.items.length} items`)

  // 3. données : confiées au curseur de données, qu'on n'attend pas (pas pour une liste imbriquée)
  hideSel(w)
  n.items.forEach((it, i) => lists[i] && itemSlots.set(it, lists[i]!))
  if (!n.comp && !cloneSection.has(n))
    stationJobs.push(
      enqueue(
        dataStation,
        first.parentElement!,
        (dw) => dataFromDb(dw, n, lists),
        () => isFilled(dataDb.get(n)),
      ),
    )
}

/** Bloc de données : les parties sont construites une à une (slugs visibles), puis le
 *  curseur de données y glisse le bloc correspondant. */
async function dataBlockRun(n: CloneNode, w: Worker, bag: Promise<void>[]) {
  // un seul slug par bloc : {{ text }}
  const lists = n.items.map((it) => applySlugs(it, true))
  n.items.forEach((it) => (it.dataset.buildName = 'Text'))
  // le curseur garde le premier paragraphe et confie les autres (il se duplique au besoin)
  const id = runId
  const jobs: Promise<void>[] = []
  for (const [i, part] of n.parts!.entries()) {
    const x = i > 0 ? takeWorker(w, part, true) : null
    if (!x) {
      jobs.push(runNode(part, w, bag))
      continue
    }
    x.load++
    jobs.push((x.ready ?? Promise.resolve()).then(() => runNode(part, x, bag)).finally(() => releaseLoad(x, id)))
  }
  await Promise.all(jobs)
  hideSel(w)
  n.items.forEach((it, i) => itemSlots.set(it, lists[i]!))
  if (!cloneSection.has(n))
    stationJobs.push(
      enqueue(
      dataStation,
      n.items[0]!.parentElement!,
      (dw) => dataFromDb(dw, n, lists),
      () => isFilled(dataDb.get(n)),
    ),
  )
}

/* ───────────── Verrou de scroll utilisateur ───────────── */

const SCROLL_KEYS = new Set([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'])
const inDebug = (e: Event) => e.target instanceof Element && !!e.target.closest('.bt-debug')
const blockEvent = (e: Event) => {
  if (!inDebug(e)) e.preventDefault()
}
const blockKeys = (e: KeyboardEvent) => {
  if (e.key === 'Escape') return skip()
  if (SCROLL_KEYS.has(e.key) && !inDebug(e)) e.preventDefault()
}
/** Intro liée au scroll : le visiteur défile librement ; seul Échap (passer) est écouté.
 *  `SCROLL_LOCK` remet l'ancien mode (défilement bloqué, caméra automatique). */
const SCROLL_LOCK = false
function lockScroll(on: boolean) {
  if (on) {
    if (SCROLL_LOCK) {
      window.addEventListener('wheel', blockEvent, { passive: false })
      window.addEventListener('touchmove', blockEvent, { passive: false })
    }
    window.addEventListener('keydown', blockKeys)
  } else {
    window.removeEventListener('wheel', blockEvent)
    window.removeEventListener('touchmove', blockEvent)
    window.removeEventListener('keydown', blockKeys)
  }
}

/* ───────────── Cycle de vie ───────────── */

function finish() {
  for (const s of slots) if (s.node.isConnected) s.node.data = s.original
  slots = []
  waiting.clear()
  resetStations()
  const r = root.value
  if (r) {
    r.querySelectorAll<HTMLElement>('[data-bt-lock]').forEach(unlockBox)
    for (const el of [r, ...r.querySelectorAll<El>('[data-built], .bt-slug, [data-build-name], [data-bt-slugged], .bt-section-done')]) {
      el.removeAttribute('data-built')
      el.removeAttribute('data-build-name')
      el.removeAttribute('data-clicked')
      el.removeAttribute('data-bt-incoming')
      el.removeAttribute('data-bt-slugged')
      el.classList.remove('bt-slug', 'bt-section-done')
      el.style.opacity = ''
    }
  }
  overlay.value?.replaceChildren()
  iconHoles = new Map()
  lingers = []
  texts = new Set()
  stationJobs = []
  pool = []
  guidesShown.value = false
  awaitingScroll.value = false
  scrollHint.value = false
  pending.value = false
  running.value = false
  lockScroll(false)
}

async function play() {
  cancelTweens()
  finish()
  const id = runId
  pending.value = true
  running.value = true
  if (!raf) raf = requestAnimationFrame(loop)
  guidesShown.value = true
  leadDone = false
  await nextTick()
  window.scrollTo(0, 0)
  camY = 0
  camV = 0
  camSection = null
  lastSectionAt = 0
  lockScroll(true)
  setupWorkers(cursorCount.value)
  const tree = planNode(root.value!, 0, false)
  // la toute première frame (le flex global) n'est pas dessinée : elle apparaît direct
  if (tree?.kind === 'frame') {
    tree.kind = 'silent'
    tree.size--
  }
  stationJobs = []
  if (tree) planSectionData(tree)
  buildIconDb()
  if (tree) buildDataDb(tree)
  stats.done = 0
  stats.total = tree?.size ?? 0
  startedAt = performance.now()
  try {
    await cursorsEnter()
    // toutes les icônes partent au curseur d'icônes dès maintenant, sans attendre leur parent
    if (tree) {
      walkPlan(tree, (n) => {
        if (n.kind !== 'frame' || !isIcon(n.el)) return
        const job = enqueue(iconStation, n.el, (iw) => iconFromDb(iw, n), slotReady(n.el))
        job.catch(noop)
        iconJobs.set(n, job)
        stationJobs.push(job)
      })
      // compétences principales : le curseur de données clique dessus une fois remplies
      for (const el of root.value!.querySelectorAll<HTMLElement>('[data-build-click]')) {
        stationJobs.push(
          enqueue(dataStation, el, (dw) => clickOn(dw, el), () => el.hasAttribute('data-built') && !el.closest('.bt-slug')),
        )
      }
    }
    if (tree) {
      const lead = pool[0]!
      lead.load = 1
      const bag: Promise<void>[] = []
      await runNode(tree, lead, bag)
      leadDone = true
      releaseLoad(lead, id)
      await drain(bag)
      // derniers travaux des curseurs spécialisés (données, icônes, clics)
      while (stationJobs.length) {
        const jobs = stationJobs
        stationJobs = []
        await Promise.all(jobs)
      }
    }
    // sortie : les curseurs repartent, les bases et les guides s'effacent, puis on rend la main
    guidesShown.value = false
    await cursorsExit()
  } catch (e) {
    if (e !== CANCEL) console.error(e)
  }
  if (id === runId) finish()
}

function skip() {
  cancelTweens()
  finish()
}

/* ───────────── Réglages de debug (mémorisés localement) ───────────── */

const STORE_KEY = 'build-test:settings'
try {
  const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}')
  if (typeof saved.speed === 'number') speed.value = saved.speed
  if (typeof saved.cursors === 'number') cursorCount.value = saved.cursors
  if (typeof saved.max === 'number') maxCursors.value = saved.max
  if (typeof saved.guides === 'boolean') guides.value = saved.guides
  if (typeof saved.panel === 'boolean') panelOpen.value = saved.panel
} catch {
  /* stockage indisponible : valeurs par défaut */
}
watch([speed, cursorCount, maxCursors, guides, panelOpen], () => {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        speed: speed.value,
        cursors: cursorCount.value,
        max: maxCursors.value,
        guides: guides.value,
        panel: panelOpen.value,
      }),
    )
  } catch {
    /* ignoré */
  }
})

/** Attend que le DOM ne bouge plus (contenus async : Markdown de « À propos », données…),
 *  sinon ce qui arrive après le plan reste caché et n'est jamais construit. */
function domSettled(el: Element, quietMs = 350, maxMs = 5000): Promise<void> {
  return new Promise((resolve) => {
    let timer = setTimeout(done, quietMs)
    const cap = setTimeout(done, maxMs)
    const mo = new MutationObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(done, quietMs)
    })
    mo.observe(el, { childList: true, subtree: true, characterData: true })
    function done() {
      mo.disconnect()
      clearTimeout(timer)
      clearTimeout(cap)
      resolve()
    }
  })
}

onMounted(async () => {
  if (!shouldPlay) return
  // les messages i18n sont chargés à la volée : tant qu'ils manquent, les textes affichés
  // sont les clés (`app.name`), que l'intro capturerait puis restaurerait à la fin
  const since = performance.now()
  while (!te('app.name') && performance.now() - since < 4000) await new Promise((r) => setTimeout(r, 30))
  // la page doit être rendue et les polices chargées avant de mesurer quoi que ce soit
  await document.fonts?.ready
  await domSettled(root.value!)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  if (route.path === '/') play()
  else finish()
})

// quitter l'accueil ou changer de langue pendant l'intro : on la coupe
// (Vue réécrirait les textes que l'intro a remplacés par des slugs)
watch(
  () => route.path,
  (p) => {
    if (p !== '/' && running.value) skip()
  },
)
watch(locale, () => {
  if (running.value) skip()
})

onBeforeUnmount(() => {
  cancelTweens()
  cancelAnimationFrame(raf)
  lockScroll(false)
})
</script>

<template>
  <div ref="stage" class="bt-stage relative">
    <div
      ref="root"
      class="relative flex min-h-screen flex-col text-foreground"
      :class="{ 'build-pending': pending, 'bt-guides': guides && guidesShown }"
    >
      <slot />
    </div>

    <!-- Overlay de construction (coordonnées relatives au stage = au document). Rempli en JS. -->
    <div ref="overlay" class="bt-overlay" aria-hidden="true" />

    <!-- incitation à défiler : la section suivante attend le scroll -->
    <Transition name="bt-fade">
      <div v-if="running && scrollHint" class="bt-scroll-hint" aria-hidden="true">
        <Icon name="lucide:arrow-down" class="h-5 w-5" />
      </div>
    </Transition>

    <Button
      v-if="running && !debug"
      size="sm"
      variant="secondary"
      class="fixed right-4 bottom-4 z-[70]"
      @click="skip"
    >
      {{ t('intro.skip') }}
    </Button>

    <!-- Panneau de debug (dev, ?debug) -->
    <div v-if="debug" class="bt-debug fixed right-4 bottom-4 z-[70] w-64 rounded-lg border bg-card/90 text-sm shadow-lg backdrop-blur">
      <button
        class="flex w-full items-center justify-between px-3 py-2 font-mono text-xs text-muted-foreground"
        @click="panelOpen = !panelOpen"
      >
        <span>build · debug</span>
        <Icon :name="panelOpen ? 'lucide:chevron-down' : 'lucide:chevron-up'" class="h-4 w-4" />
      </button>
      <div v-show="panelOpen" class="space-y-3 border-t px-3 pt-3 pb-3">
        <label class="block">
          <span class="flex justify-between font-mono text-xs">
            <span>Vitesse</span><span class="text-primary">×{{ speed }}</span>
          </span>
          <input v-model.number="speed" type="range" min="0.25" max="6" step="0.25" class="w-full accent-primary">
        </label>
        <label class="block">
          <span class="flex justify-between font-mono text-xs">
            <span>Curseurs</span><span class="text-primary">{{ cursorCount }}</span>
          </span>
          <!-- relance au relâchement : le pool de curseurs est figé pendant un run -->
          <input
            v-model.number="cursorCount"
            type="range"
            min="1"
            :max="MAX_CURSORS - 2"
            step="1"
            class="w-full accent-primary"
            @change="play"
          >
        </label>
        <label class="block">
          <span class="flex justify-between font-mono text-xs">
            <span>Max curseurs (duplication)</span>
            <span class="text-primary">{{ maxPool() > cursorCount + 2 ? maxPool() - 2 : 'off' }}</span>
          </span>
          <input v-model.number="maxCursors" type="range" min="1" :max="MAX_CURSORS - 2" step="1" class="w-full accent-primary">
        </label>
        <label class="flex items-center justify-between font-mono text-xs">
          <span>Guides de placement</span>
          <input v-model="guides" type="checkbox" class="accent-primary">
        </label>
        <div class="flex justify-between font-mono text-xs text-muted-foreground">
          <span>nœuds {{ stats.done }}/{{ stats.total }}</span>
          <span>curseurs {{ stats.live }}</span>
          <span>{{ stats.elapsed.toFixed(1) }} s</span>
        </div>
        <div class="flex gap-2">
          <Button size="sm" class="flex-1" @click="play">Rejouer</Button>
          <Button size="sm" variant="secondary" class="flex-1" :disabled="!running" @click="skip">Passer</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Non scopé : l'overlay, les curseurs et les fantômes sont créés hors du rendu Vue. */
.bt-stage {
  --bt-component: oklch(0.63 0.24 300);
  --bt-handle: oklch(1 0 0);
  --bt-ink: oklch(0.15 0 0);
  --bt-shadow: oklch(0 0 0 / 0.45);
  --bt-guide-line: oklch(1 0 0 / 0.1);
  --bt-guide-fill: oklch(1 0 0 / 0.012);
  --bt-data-line: oklch(1 0 0 / 0.45);
  --bt-data-fill: oklch(1 0 0 / 0.04);
  --bt-data-border: oklch(1 0 0 / 0.14);
  --bt-space: oklch(0.68 0.21 15);
}

/* Tout est caché tant que non construit ; un nœud construit redevient visible
   sans révéler ses enfants (visibility est héritée mais surchargée par nœud). */
.build-pending,
.build-pending :where(*) {
  visibility: hidden;
}
.build-pending[data-built],
.build-pending [data-built],
.build-pending :where(div:has(> canvas), canvas) {
  visibility: visible;
}

/* Guides de placement : contour pointillé + voile blanc (qui s'empile avec la
   profondeur). La transition est posée pendant tout le run pour pouvoir s'effacer. */
.build-pending[data-built],
.build-pending [data-built] {
  outline: 1px dashed transparent;
  outline-offset: -1px;
  transition:
    outline-color 0.6s ease,
    box-shadow 0.6s ease;
}
.bt-guides[data-built]:not(.bt-section-done, .bt-section-done *),
.bt-guides [data-built]:not(.bt-section-done, .bt-section-done *) {
  outline-color: var(--bt-guide-line);
  box-shadow: inset 0 0 0 100vmax var(--bt-guide-fill);
}

/* police mono seulement sur les vrais slugs `{{ clé }}` : le lorem garde la police du texte,
   donc sa taille, et rien ne saute sous la caméra quand la vraie donnée arrive */
[data-bt-slugged] {
  font-family: var(--font-mono) !important;
  letter-spacing: 0 !important;
}

.bt-overlay {
  position: absolute;
  inset: 0;
  z-index: 60;
  pointer-events: none;
  overflow: clip;
}

.bt-sel {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  border: 1.5px solid var(--bt-c);
}
.bt-sel[data-mode='hidden'] {
  display: none;
}
.bt-sel[data-mode='marquee'] {
  border-width: 1px;
  background: color-mix(in oklch, var(--bt-c) 14%, transparent);
}
.bt-sel[data-mode='component'] {
  border-color: var(--bt-component);
}
.bt-sel[data-mode='drop'] {
  border: 1.5px dashed var(--bt-data-line);
  background: var(--bt-data-fill);
}
.bt-sel[data-mode='marquee'] .bt-h,
.bt-sel[data-mode='drop'] .bt-h,
.bt-sel[data-mode='drop'] .bt-size {
  display: none;
}

.bt-label {
  position: absolute;
  bottom: 100%;
  left: -1px;
  margin-bottom: 4px;
  color: var(--bt-c);
  font: 500 11px/1 var(--font-mono);
  white-space: nowrap;
}
.bt-sel[data-mode='component'] .bt-label,
.bt-tag .bt-label {
  color: var(--bt-component);
}
/* pas de place au-dessus (header en haut de page) : le label passe dedans */
.bt-label.is-inside {
  top: 4px;
  bottom: auto;
  left: 5px;
  margin-bottom: 0;
}
/* déborderait à droite : calé sur le bord droit de la boîte */
.bt-label.is-end {
  left: auto;
  right: -1px;
  text-align: right;
}
.bt-label.is-inside.is-end {
  right: 5px;
}
.bt-cls {
  display: block;
  margin-top: 2px;
  opacity: 0.6;
  font-size: 7.5px;
  font-weight: 400;
}
/* nom d'un composant posé, qui reste un moment : contour fin, sans poignées */
.bt-tag {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  border: 1px solid color-mix(in oklch, var(--bt-component) 55%, transparent);
}
.bt-sel[data-mode='drop'] .bt-label {
  color: var(--bt-handle);
}
.bt-size {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 6px;
  padding: 2px 5px;
  border-radius: 3px;
  background: var(--bt-c);
  color: var(--bt-handle);
  font: 500 10px/1.2 var(--font-mono);
  white-space: nowrap;
}
.bt-sel[data-mode='component'] .bt-size {
  background: var(--bt-component);
}
.bt-h {
  position: absolute;
  width: 7px;
  height: 7px;
  border: 1px solid var(--bt-c);
  background: var(--bt-handle);
}
.bt-sel[data-mode='component'] .bt-h {
  border-color: var(--bt-component);
}
.bt-tl { top: -4px; left: -4px; }
.bt-tr { top: -4px; right: -4px; }
.bt-bl { bottom: -4px; left: -4px; }
.bt-br { right: -4px; bottom: -4px; }

/* Compétence principale pas encore « cliquée » : neutre ; le clic l'allume en vert. */
.build-pending [data-build-click] {
  transition:
    background-color 0.25s ease,
    color 0.25s ease;
}
.build-pending [data-build-click]:not([data-clicked]),
.bt-ghost[data-build-click]:not([data-clicked]),
.bt-ghost [data-build-click]:not([data-clicked]) {
  background-color: var(--secondary) !important;
  color: var(--secondary-foreground) !important;
}
.bt-cursor.is-press svg {
  transform: scale(0.85);
  transform-origin: 0 0;
}
.bt-ripple {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  width: 34px;
  height: 34px;
  border: 2px solid var(--bt-c, oklch(0.8 0.17 150));
  border-radius: 50%;
  pointer-events: none;
}

.bt-icon-hole.is-inline {
  position: static;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  overflow: hidden;
  padding: 0;
}
.bt-icon-hole {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  padding: 0 2px;
  border: 1px dashed var(--bt-data-border);
  border-radius: 2px;
  color: oklch(1 0 0 / 0.45);
  font: 500 7px/1.4 var(--font-mono);
  white-space: nowrap;
  pointer-events: none;
}

.bt-scroll-hint {
  position: fixed;
  top: 50%;
  left: 3rem;
  z-index: 70;
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid color-mix(in oklch, var(--primary) 50%, transparent);
  border-radius: 9999px;
  background: color-mix(in oklch, var(--background) 70%, transparent);
  color: var(--primary);
  backdrop-filter: blur(4px);
  animation: bt-float 1.6s ease-in-out infinite;
  pointer-events: none;
}
@keyframes bt-float {
  0%,
  100% {
    transform: translateY(calc(-50% - 6px));
  }
  50% {
    transform: translateY(calc(-50% + 6px));
  }
}
.bt-fade-enter-active,
.bt-fade-leave-active {
  transition: opacity 0.3s ease;
}
.bt-fade-enter-from,
.bt-fade-leave-to {
  opacity: 0;
}

.bt-cursor {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 3;
  will-change: transform;
}
.bt-arrow path {
  fill: var(--bt-c);
  stroke: var(--bt-handle);
  stroke-width: 1.4;
  stroke-linejoin: round;
}

.bt-icon-ghost {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  transform-origin: center;
  filter: drop-shadow(0 6px 10px var(--bt-shadow));
}

.bt-ghost,
.bt-ghost * {
  /* les copies héritent de `transition-all` (ProjectCard…) : le CSS rejouerait chaque
     déplacement avec retard et partirait de (0,0) → saut. Le tween seul pilote. */
  transition: none !important;
}
/* dans la copie (les cartes coupent ce qui dépasse) : coin haut-gauche */
.bt-ghost .bt-ghost-label {
  top: 6px;
  bottom: auto;
  left: 8px;
  margin: 0;
  color: var(--bt-component);
  visibility: visible;
}
.bt-ghost {
  position: absolute !important;
  top: 0;
  left: 0;
  margin: 0 !important;
  opacity: 0.92;
  outline: 1.5px solid var(--bt-component);
  box-shadow: 0 14px 40px var(--bt-shadow);
}

/* Base d'icônes, accrochée au coin haut-droit de l'écran */
.bt-icondb {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  overflow: hidden;
  border: 1px solid var(--bt-data-border);
  border-radius: 6px;
  background: var(--bt-ink);
  box-shadow: 0 10px 30px var(--bt-shadow);
  color: var(--bt-handle);
  font: 500 10.5px/1.3 var(--font-mono);
  opacity: 0;
}
.bt-icondb-grid {
  display: grid;
  grid-template-columns: repeat(4, 28px);
  gap: 4px;
  padding: 6px;
}
.bt-icondb-cell {
  display: grid;
  place-items: center;
  height: 28px;
  border: 1px solid var(--bt-data-border);
  border-radius: 4px;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.bt-icondb-cell.is-picked {
  border-color: var(--bt-data-line);
  background: var(--bt-data-fill);
}

/* Base « data » : un bloc par liste, empilée sous « lucid » */
.bt-datadb {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  min-width: 190px;
  overflow: hidden;
  border: 1px solid var(--bt-data-border);
  border-radius: 6px;
  background: var(--bt-ink);
  box-shadow: 0 10px 30px var(--bt-shadow);
  color: var(--bt-handle);
  font: 500 10.5px/1.3 var(--font-mono);
  opacity: 0;
}
.bt-data-block {
  border-top: 1px solid var(--bt-data-border);
  transition: opacity 0.3s;
}
.bt-data-block.is-used {
  opacity: 0.3;
}
.bt-data-sub {
  padding: 4px 8px;
  font-weight: 600;
}
.bt-data-sub:empty::before,
.bt-data-row:empty::before {
  content: '\200b';
}
.is-typing::after {
  content: '▍';
  margin-left: 1px;
  opacity: 0.8;
}
.bt-db-search {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 8px;
  border-top: 1px solid var(--bt-data-border);
  min-height: 1.3em;
  white-space: nowrap;
  overflow: hidden;
}
.bt-db-query::before {
  content: '⌕ ';
  opacity: 0.6;
}
.bt-db-hits {
  opacity: 0.55;
}
.bt-icondb-cell[hidden] {
  display: none;
}

/* Bloc de données en vol, puis lignes détachées : texte blanc */
.bt-data {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  min-width: 190px;
  overflow: hidden;
  border: 1px solid var(--bt-data-border);
  border-radius: 6px;
  background: var(--bt-ink);
  box-shadow: 0 10px 30px var(--bt-shadow);
  color: var(--bt-handle);
  font: 500 10.5px/1.3 var(--font-mono);
  opacity: 0;
}
.bt-data.is-grabbed {
  box-shadow: 0 18px 44px var(--bt-shadow);
}
.bt-data-head {
  padding: 5px 8px;
  background: var(--bt-data-fill);
  font-weight: 600;
}
.bt-data.is-grabbed .bt-data-head {
  background: var(--bt-data-border);
}
.bt-data-row {
  padding: 4px 8px;
  border-top: 1px solid var(--bt-data-border);
  white-space: nowrap;
  transition:
    background 0.15s,
    opacity 0.3s;
}
.bt-data-row.is-used {
  opacity: 0.35;
}
.bt-chip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  padding: 4px 8px;
  color: var(--bt-handle);
  text-shadow: 0 2px 8px var(--bt-shadow);
  font: 600 10.5px/1.3 var(--font-mono);
  white-space: nowrap;
  transform-origin: 0 0;
}
.bt-data {
  transform-origin: 0 0;
}

/* Cotes d'espacement : padding hachuré, écarts en pointillé, valeur en pastille */
.bt-measure {
  position: absolute;
  inset: 0;
  z-index: 1;
}
.bt-pad {
  position: absolute;
  box-sizing: border-box;
  background: repeating-linear-gradient(
    -45deg,
    color-mix(in oklch, var(--bt-space) 22%, transparent) 0 1px,
    transparent 1px 6px
  );
  background-color: color-mix(in oklch, var(--bt-space) 8%, transparent);
}
.bt-gap {
  position: absolute;
  box-sizing: border-box;
}
.bt-gap.is-v {
  width: 7px;
  margin-left: -3.5px;
  border-top: 1.5px solid var(--bt-space);
  border-bottom: 1.5px solid var(--bt-space);
}
.bt-gap.is-h {
  height: 7px;
  margin-top: -3.5px;
  border-left: 1.5px solid var(--bt-space);
  border-right: 1.5px solid var(--bt-space);
}
/* le trait pointillé, au centre : tirets 3px / vides 2px, bien lisibles */
.bt-gap::after {
  content: '';
  position: absolute;
}
.bt-gap.is-v::after {
  top: 0;
  bottom: 0;
  left: 2.75px;
  width: 1.5px;
  background: repeating-linear-gradient(to bottom, var(--bt-space) 0 3px, transparent 3px 5px);
}
.bt-gap.is-h::after {
  left: 0;
  right: 0;
  top: 2.75px;
  height: 1.5px;
  background: repeating-linear-gradient(to right, var(--bt-space) 0 3px, transparent 3px 5px);
}
</style>
