<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { site } from '~/data/site'

const { t } = useI18n()
</script>

<template>
  <section class="mx-auto max-w-5xl px-6 pt-24 pb-16">
    <p class="mb-6 font-mono text-sm text-primary">{{ t('hero.statusLine') }}</p>
    <h1 class="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">{{ t('app.name') }}</h1>
    <p class="mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
      {{ t('hero.positioning') }}
    </p>
    <div class="flex flex-wrap gap-3">
      <Button as-child>
        <NuxtLink to="/projects">{{ t('hero.ctaProjects') }}</NuxtLink>
      </Button>
      <Button variant="secondary" as-child>
        <NuxtLink to="/contact">{{ t('hero.ctaContact') }}</NuxtLink>
      </Button>
      <Button variant="ghost" as-child>
        <a :href="site.github" target="_blank" rel="noopener noreferrer">
          <Icon name="lucide:github" class="mr-2 h-4 w-4" />{{ t('hero.ctaGithub') }}
        </a>
      </Button>
    </div>
  </section>
</template>
