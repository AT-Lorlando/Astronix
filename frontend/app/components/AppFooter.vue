<script setup lang="ts">
import { site } from '~/data/site'

const { t } = useI18n()
</script>

<template>
  <footer class="mt-24 border-t px-6 py-10">
    <div class="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <p class="font-mono text-xs text-muted-foreground">{{ t('footer.tagline') }}</p>
      <div class="flex items-center gap-6 text-sm">
        <a :href="site.github" target="_blank" rel="noopener noreferrer" class="text-muted-foreground transition-colors hover:text-primary">
          {{ t('footer.github') }}
        </a>
        <a :href="`mailto:${site.email}`" class="text-muted-foreground transition-colors hover:text-primary">
          {{ t('footer.email') }}
        </a>
      </div>
    </div>
  </footer>
</template>
