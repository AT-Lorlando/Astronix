<script setup lang="ts">
// Section de l'accueil : ancre (lien de nav `/#id`), titre mono et sous-titre.
defineProps<{ id: string; title: string; subtitle?: string }>()
</script>

<template>
  <PageSection :id="id" width="list" as="section" class="scroll-mt-6 !pt-0">
    <h2 class="mb-2 font-mono text-sm uppercase tracking-widest text-muted-foreground">{{ title }}</h2>
    <p v-if="subtitle" class="mb-8 text-muted-foreground">{{ subtitle }}</p>
    <div :class="subtitle ? '' : 'mt-6'">
      <slot />
    </div>
  </PageSection>
</template>
