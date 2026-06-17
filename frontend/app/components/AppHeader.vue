<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { site } from '~/data/site'

const { t } = useI18n()
</script>

<template>
  <header class="flex items-center justify-between border-b px-6 py-4">
    <NuxtLink to="/" class="font-mono text-sm font-semibold tracking-tight">
      {{ t('app.name') }}
    </NuxtLink>

    <nav class="flex items-center gap-1">
      <Button variant="ghost" size="sm" as-child>
        <NuxtLink to="/about">{{ t('nav.about') }}</NuxtLink>
      </Button>
      <Button variant="ghost" size="sm" as-child>
        <NuxtLink to="/projects">{{ t('nav.projects') }}</NuxtLink>
      </Button>
      <Button variant="ghost" size="sm" as-child>
        <NuxtLink to="/cv">{{ t('nav.cv') }}</NuxtLink>
      </Button>
      <Button variant="ghost" size="sm" as-child>
        <NuxtLink to="/contact">{{ t('nav.contact') }}</NuxtLink>
      </Button>
      <Button variant="ghost" size="icon" as-child>
        <a :href="site.github" target="_blank" rel="noopener noreferrer" :aria-label="t('nav.github')">
          <Icon name="lucide:github" class="h-4 w-4" />
        </a>
      </Button>
      <LanguageToggle />
    </nav>
  </header>
</template>
