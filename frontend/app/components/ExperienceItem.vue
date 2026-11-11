<script setup lang="ts">
import type { MessageFunction, VueMessageType } from 'vue-i18n'
import { Badge } from '~/components/ui/badge'
import ListItem from '~/components/ListItem.vue'
import type { CvExperience } from '~/data/cv'

// Une expérience de la frise de l'accueil (texte détaillé de l'accueil, sinon celui du CV).
defineProps<{ e: CvExperience }>()
const { t, te, tm, rt } = useI18n()

type Msg = MessageFunction<VueMessageType>
// te() répond false pour une clé qui contient une liste (paragraphes, chiffres…) : on teste
// donc le texte simple OU la présence d'un contenu via tm()
const has = (key: string) => {
  if (te(key)) return true
  const v = tm(key) as unknown
  return Array.isArray(v) ? v.length > 0 : !!v && typeof v === 'object' && Object.keys(v).length > 0
}
const detail = (key: string, field: string) =>
  has(`home.experience.details.${key}.${field}`) ? `home.experience.details.${key}.${field}` : `cv.experiences.${key}.${field}`
const paras = (key: string) => tm(detail(key, 'paragraphs')) as Msg[]
const bullets = (key: string) => tm(detail(key, 'bullets')) as Msg[]
// Lien d'ancre propre à l'accueil (ex. Astronix → la carte Aster), à la place des puces du CV
const link = (key: string) =>
  te(`home.experience.details.${key}.link`) ? t(`home.experience.details.${key}.link`) : null
</script>

<template>
  <li class="relative">
    <span
      class="absolute top-1.5 -left-[31px] h-3 w-3 rounded-full border-2 border-primary bg-background sm:-left-[39px]"
      aria-hidden="true"
    />
    <p class="font-mono text-xs text-muted-foreground">{{ t(`cv.experiences.${e.key}.date`) }}</p>
    <h3 class="mt-1 text-lg font-semibold tracking-tight">{{ t(detail(e.key, 'title')) }}</h3>
    <p v-if="e.subtitle" class="text-sm text-muted-foreground">{{ t(`cv.experiences.${e.key}.subtitle`) }}</p>

    <div class="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
      <p v-for="(p, i) in paras(e.key)" :key="i">{{ rt(p) }}</p>
    </div>
    <NuxtLink
      v-if="link(e.key)"
      :to="`/#project-${e.anchor}`"
      class="mt-3 inline-flex items-center gap-1.5 font-mono text-sm text-primary hover:underline"
    >
      {{ link(e.key) }} <Icon name="lucide:arrow-down-right" class="h-4 w-4" />
    </NuxtLink>
    <ul v-else-if="e.bullets" class="mt-3 space-y-1.5 text-sm">
      <ListItem v-for="(b, i) in bullets(e.key)" :key="i" :text="rt(b)" />
    </ul>

    <div class="mt-4 flex flex-wrap gap-2">
      <Badge v-for="tag in e.tags" :key="tag.label" variant="secondary" class="font-mono text-xs">
        {{ tag.label }}
      </Badge>
    </div>
  </li>
</template>
