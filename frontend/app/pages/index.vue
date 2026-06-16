<script setup lang="ts">
import { site } from '~/data/site'

const { t } = useI18n()
</script>

<template>
  <div>
    <HeroSection />

    <section class="mx-auto max-w-5xl px-6 pb-16">
      <h2 class="mb-2 font-mono text-sm uppercase tracking-widest text-muted-foreground">
        {{ t('projects.title') }}
      </h2>
      <p class="mb-8 text-muted-foreground">{{ t('projects.subtitle') }}</p>
      <div class="grid gap-6 sm:grid-cols-2">
        <ProjectCard v-for="project in site.projects" :key="project.id" :project="project" />
      </div>
    </section>
  </div>
</template>
