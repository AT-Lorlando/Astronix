<script setup lang="ts">
import { education } from '~/data/cv'

const { t } = useI18n()
</script>

<template>
  <HomeSection id="education" :title="t('home.education.title')">
    <div class="grid gap-4 sm:grid-cols-2">
      <div v-for="e in education" :key="e.key" class="flex gap-4 rounded-lg border bg-card/50 p-5">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/40 text-primary">
          <Icon :name="e.icon" class="h-5 w-5" />
        </span>
        <div>
          <p class="font-mono text-xs text-muted-foreground">{{ t(`cv.education.${e.key}.date`) }}</p>
          <h3 class="mt-1 font-semibold tracking-tight">{{ t(`cv.education.${e.key}.degree`) }}</h3>
          <p class="mt-1 text-sm text-muted-foreground">{{ e.school }}</p>
        </div>
      </div>
    </div>
  </HomeSection>
</template>
