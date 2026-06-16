<script setup lang="ts">
const { locale, t } = useI18n()

// Load the about doc for the active locale; fall back to the other locale
// so the page never renders blank if one file is still an empty stub.
const loadAbout = async (loc: string) => {
  const doc = await queryCollection('about').path(`/about/${loc}`).first()
  if (doc) return doc
  const other = loc === 'fr' ? 'en' : 'fr'
  return await queryCollection('about').path(`/about/${other}`).first()
}

// Reactive per-locale key: re-fetches and caches separately on locale switch.
const { data: doc } = await useAsyncData(() => `about-${locale.value}`, () =>
  loadAbout(locale.value)
)

useHead(() => ({ title: doc.value?.title ?? t('about.title') }))
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 pt-16 pb-8">
    <article
      v-if="doc"
      class="prose prose-invert max-w-none prose-headings:text-foreground prose-headings:tracking-tight prose-a:text-primary"
    >
      <ContentRenderer :value="doc" />
    </article>
    <p v-else class="text-muted-foreground">{{ t('about.title') }}</p>
  </div>
</template>
