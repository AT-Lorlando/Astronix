<script setup lang="ts">
import { site } from '~/data/site'

const { t } = useI18n()
</script>

<template>
  <div>
    <HeroSection />
    <AboutSection />
    <ExperienceSection />

    <HomeSection id="projects" :title="t('projects.title')" :subtitle="t('projects.subtitle')">
      <div class="grid gap-6 sm:grid-cols-2" data-build-clone="ProjectCard">
        <ProjectCard v-for="project in site.projects" :key="project.id" :project="project" />
      </div>
    </HomeSection>

    <SkillsSection />
    <EducationSection />
  </div>
</template>
