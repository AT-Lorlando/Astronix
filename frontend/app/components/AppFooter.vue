<script setup lang="ts">
import { site } from '~/data/site'

const { t } = useI18n()
</script>

<template>
  <footer class="shrink-0 border-t">
    <div
      class="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-6 py-4 text-center sm:flex-row sm:justify-between sm:gap-4 sm:px-8 sm:text-left"
    >
      <p class="font-mono text-xs text-muted-foreground">{{ t('footer.madeWith') }}</p>
      <div class="flex items-center gap-6 text-sm">
        <a
          :href="site.github"
          target="_blank"
          rel="noopener noreferrer"
          class="text-muted-foreground transition-colors hover:text-primary"
        >
          {{ t('footer.github') }}
        </a>
        <a
          :href="`mailto:${site.email}`"
          class="text-muted-foreground transition-colors hover:text-primary"
        >
          {{ t('footer.email') }}
        </a>
      </div>
    </div>
  </footer>
</template>
