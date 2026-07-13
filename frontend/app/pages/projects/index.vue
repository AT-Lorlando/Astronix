<script setup lang="ts">
import { site } from '~/data/site'

const { t } = useI18n()
</script>

<template>
  <PageSection width="list">
    <PageHeader :title="t('projects.title')" :subtitle="t('projects.subtitle')" />
    <div class="grid gap-6 sm:grid-cols-2">
      <ProjectCard v-for="project in site.projects" :key="project.id" :project="project" />
    </div>
  </PageSection>
</template>
