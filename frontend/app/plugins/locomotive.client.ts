import LocomotiveScroll from 'locomotive-scroll'
import 'locomotive-scroll/locomotive-scroll.css'

/**
 * Défilement lissé (Locomotive Scroll v5, basé sur Lenis) sur tout le site. Le scroll reste
 * natif (window.scrollY, ancres, getBoundingClientRect) : l'intro de l'accueil s'y lie telle quelle.
 * Coupé en reduced-motion. Un conteneur qui défile lui-même doit porter `data-lenis-prevent`.
 */
export default defineNuxtPlugin(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const scroll = new LocomotiveScroll({ lenisOptions: { lerp: 0.1, smoothWheel: true } })
  return { provide: { scroll } }
})
