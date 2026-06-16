<script setup lang="ts">
import type { MessageFunction, VueMessageType } from 'vue-i18n'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { getProject } from '~/data/site'

const route = useRoute()
const { t, tm, rt } = useI18n()

const id = computed(() => String(route.params.id))
const project = computed(() => getProject(id.value))

watchEffect(() => {
  if (!project.value) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }
})

const features = computed(() => tm(`projects.${id.value}.features`) as MessageFunction<VueMessageType>[])
</script>

<template>
  <article v-if="project" class="mx-auto max-w-3xl px-6 pt-16 pb-8">
    <NuxtLink to="/projects" class="mb-8 inline-flex items-center font-mono text-sm text-muted-foreground hover:text-primary">
      <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />{{ t('projects.back') }}
    </NuxtLink>

    <h1 class="mb-2 text-4xl font-bold tracking-tight">{{ project.name }}</h1>
    <p class="mb-6 text-lg text-muted-foreground">{{ t(`projects.${id}.tagline`) }}</p>

    <div class="mb-8 flex flex-wrap gap-2">
      <Badge v-for="tech in project.stack" :key="tech" variant="secondary" class="font-mono text-xs">
        {{ tech }}
      </Badge>
    </div>

    <video
      v-if="project.video"
      :src="project.video"
      controls
      class="mb-10 w-full rounded-lg border"
      :aria-label="`Demo ${project.name}`"
    />

    <section class="mb-10">
      <h2 class="mb-3 font-mono text-sm uppercase tracking-widest text-muted-foreground">
        {{ t('projects.architecture') }}
      </h2>
      <p class="text-muted-foreground">{{ t(`projects.${id}.architecture`) }}</p>
    </section>

    <section class="mb-10">
      <h2 class="mb-3 font-mono text-sm uppercase tracking-widest text-muted-foreground">
        {{ t('projects.features') }}
      </h2>
      <ul class="space-y-2">
        <li v-for="(feature, i) in features" :key="i" class="flex items-start text-muted-foreground">
          <Icon name="lucide:check" class="mr-2 mt-1 h-4 w-4 shrink-0 text-primary" />
          <span>{{ rt(feature) }}</span>
        </li>
      </ul>
    </section>

    <Button as-child>
      <a :href="project.repo" target="_blank" rel="noopener noreferrer">
        <Icon name="lucide:github" class="mr-2 h-4 w-4" />{{ t('projects.viewGithub') }}
      </a>
    </Button>
  </article>
</template>
