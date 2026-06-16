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

const { data: doc } = await useAsyncData('about-page', () => loadAbout(locale.value), {
  watch: [locale],
})

useHead(() => ({ title: doc.value?.title ?? t('about.title') }))
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 pt-16 pb-8">
    <article
      v-if="doc"
      class="prose prose-invert max-w-none prose-a:text-primary prose-headings:tracking-tight"
    >
      <ContentRenderer :value="doc" />
    </article>
  </div>
</template>
