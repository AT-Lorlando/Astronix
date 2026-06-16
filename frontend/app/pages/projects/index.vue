<script setup lang="ts">
import { site } from '~/data/site'

const { t } = useI18n()
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 pt-16 pb-8">
    <h1 class="mb-2 text-3xl font-bold tracking-tight">{{ t('projects.title') }}</h1>
    <p class="mb-10 text-muted-foreground">{{ t('projects.subtitle') }}</p>
    <div class="grid gap-6 sm:grid-cols-2">
      <ProjectCard v-for="project in site.projects" :key="project.id" :project="project" />
    </div>
  </div>
</template>
