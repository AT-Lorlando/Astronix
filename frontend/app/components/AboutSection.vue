<script setup lang="ts">
const { locale, t } = useI18n()

// Texte « À propos » en Markdown (content/about/{fr,en}.md) ; repli sur l'autre langue.
const loadAbout = async (loc: string) => {
  const doc = await queryCollection('about').path(`/about/${loc}`).first()
  if (doc) return doc
  const other = loc === 'fr' ? 'en' : 'fr'
  return await queryCollection('about').path(`/about/${other}`).first()
}
// awaité : la page (Suspense) attend le texte, et l'intro le trouve déjà là
const { data: doc } = await useAsyncData(() => `about-${locale.value}`, () => loadAbout(locale.value))
</script>

<template>
  <HomeSection id="about" :title="t('home.about.title')">
    <article
      v-if="doc"
      class="prose prose-invert max-w-3xl prose-headings:text-foreground prose-headings:tracking-tight prose-a:text-primary"
    >
      <!-- data-build-data : pendant l'intro, ce texte arrive par le panneau « data » -->
      <div data-build-data="About">
        <ContentRenderer :value="doc" />
      </div>
    </article>
  </HomeSection>
</template>
