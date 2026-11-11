<script setup lang="ts">
// Logo Astronix en SVG inline : la lettre et l'anneau suivent `currentColor` (classe text-*),
// l'étoile suit `--astronix-star` (repli sur currentColor). Les ids des clip/mask sont
// préfixés par instance pour que plusieurs logos coexistent dans la page.
const uid = `astx-${useId()}`
const u = (name: string) => `url(#${uid}-${name})`
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
    <defs>
      <clipPath :id="`${uid}-front`">
        <rect x="-220" y="0" width="440" height="220" />
      </clipPath>
      <clipPath :id="`${uid}-back`">
        <rect x="-220" y="-220" width="440" height="221" />
      </clipPath>
      <clipPath :id="`${uid}-leftHalf`">
        <rect x="0" y="0" width="200" height="400" />
      </clipPath>
      <mask :id="`${uid}-cutLeft`" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
        <rect width="400" height="400" fill="#fff" />
        <g transform="translate(200 180) rotate(-24)" :clip-path="u('front')" fill="#000">
          <path
            :clip-path="u('leftHalf')"
            fill-rule="evenodd"
            d="M-157,0 a157,59 0 1 0 314,0 a157,59 0 1 0 -314,0 Z M-132,-3 a132,36 0 1 0 264,0 a132,36 0 1 0 -264,0 Z"
          />
        </g>
      </mask>
      <mask :id="`${uid}-cutRight`" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
        <rect width="400" height="400" fill="#fff" />
        <g transform="translate(200 180) rotate(-24)" :clip-path="u('front')" fill="#000">
          <path
            :clip-path="u('front')"
            fill-rule="evenodd"
            d="M-157,0 a157,59 0 1 0 314,0 a157,59 0 1 0 -314,0 Z M-136,-3 a136,36 0 1 0 264,0 a132,36 0 1 0 -264,0 Z"
          />
        </g>
      </mask>
      <mask :id="`${uid}-cutRing`" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
        <rect width="400" height="400" fill="#fff" />
        <circle cx="286" cy="107" r="15" fill="#000" />
      </mask>
    </defs>

    <!-- anneau : partie arrière -->
    <g fill="currentColor" :mask="u('cutRing')">
      <g transform="translate(200 180) rotate(-24)" :clip-path="u('back')">
        <path
          fill-rule="evenodd"
          d="M-150,0 a150,52 0 1 0 300,0 a150,52 0 1 0 -300,0 Z M-139,-3 a139,43 0 1 0 278,0 a132,43 0 1 0 -278,0 Z"
        />
      </g>
    </g>
    <!-- lettre A -->
    <g fill="currentColor">
      <polygon points="184,60 216,60 313,320 274,320 200,111" :mask="u('cutLeft')" />
      <polygon points="184,60 216,60 126,320 87,320" :mask="u('cutRight')" />
    </g>
    <!-- anneau : partie avant -->
    <g fill="currentColor">
      <g transform="translate(200 180) rotate(-24)" :clip-path="u('front')">
        <path
          fill-rule="evenodd"
          d="M-150,0 a150,52 0 1 0 300,0 a150,52 0 1 0 -300,0 Z M-139,-3 a139,43 0 1 0 278,0 a139,43 0 1 0 -278,0 Z"
        />
      </g>
    </g>
    <!-- étoile -->
    <g style="fill: var(--astronix-star, currentColor)" transform="translate(286 107) rotate(-45)">
      <path d="M0,-18 C0,-4 4,0 18,0 C4,0 0,4 0,18 C0,4 -4,0 -18,0 C-4,0 0,-4 0,-18 Z" />
    </g>
  </svg>
</template>
