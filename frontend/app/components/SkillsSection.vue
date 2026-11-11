<script setup lang="ts">
import SkillRow from '~/components/SkillRow.vue'
import { skillDomains } from '~/data/cv'

const { t } = useI18n()

const rows = computed(() => [
  ...skillDomains.map((d) => ({
    key: d.key,
    label: t(`cv.skillDomains.${d.key}`),
    outline: false,
    items: d.skills.map((s) => ({ text: s.label ?? t(`cv.softSkills.${s.tKey}`), fav: s.fav })),
  })),
  {
    key: 'languages',
    label: t('home.skills.languages'),
    outline: true,
    items: ['fr', 'en'].map((l) => ({ text: `${t(`cv.languages.${l}.name`)} · ${t(`cv.languages.${l}.level`)}` })),
  },
])
</script>

<template>
  <HomeSection id="skills" :title="t('home.skills.title')">
    <dl class="flex flex-col gap-6" data-build-clone="SkillRow">
      <SkillRow v-for="r in rows" :key="r.key" :label="r.label" :items="r.items" :outline="r.outline" />
    </dl>
    <p class="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
      <span class="inline-block h-3 w-3 rounded-sm bg-primary" aria-hidden="true" />
      {{ t('home.skills.legend') }}
    </p>
  </HomeSection>
</template>
