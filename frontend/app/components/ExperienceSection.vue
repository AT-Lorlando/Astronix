<script setup lang="ts">
import ExperienceItem from '~/components/ExperienceItem.vue'
import { experiences } from '~/data/cv'

const { t } = useI18n()
</script>

<template>
  <HomeSection id="experience" :title="t('home.experience.title')">
    <ol class="relative space-y-12 border-l border-border pl-6 sm:pl-8" data-build-clone="ExperienceItem">
      <ExperienceItem v-for="e in experiences" :key="e.key" :e="e" />
    </ol>
  </HomeSection>
</template>
