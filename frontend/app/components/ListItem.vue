<script setup lang="ts">
// Puce « › » + texte. `data-build-atom` : l'intro la construit d'un bloc, sans encadrer ses deux spans.
defineProps<{ text: string }>()
</script>

<template>
  <li class="flex gap-2" data-build-atom>
    <span class="font-mono text-primary">›</span>
    <span>{{ text }}</span>
  </li>
</template>
