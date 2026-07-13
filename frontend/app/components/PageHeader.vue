<script setup lang="ts">
defineProps<{ title: string; eyebrow?: string; subtitle?: string }>()
</script>

<template>
  <header class="mb-10">
    <p v-if="eyebrow" class="mb-3 font-mono text-sm uppercase tracking-widest text-muted-foreground">
      {{ eyebrow }}
    </p>
    <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">{{ title }}</h1>
    <p v-if="subtitle" class="mt-2 text-muted-foreground">{{ subtitle }}</p>
  </header>
</template>
