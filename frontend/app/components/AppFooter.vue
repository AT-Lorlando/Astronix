<script setup lang="ts">
import { site } from '~/data/site'

const { t } = useI18n()
</script>

<template>
  <footer class="flex h-16 shrink-0 items-center border-t px-6">
    <div class="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
      <p class="min-w-0 truncate font-mono text-xs text-muted-foreground">{{ t('footer.tagline') }}</p>
      <div class="flex shrink-0 items-center gap-6 text-sm">
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
