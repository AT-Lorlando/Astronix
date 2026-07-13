<script setup lang="ts">
const props = withDefaults(
  defineProps<{ width?: 'prose' | 'list' | 'form'; as?: string }>(),
  { width: 'list', as: 'div' }
)

// Largeur max par type de page — source unique, fini les max-w recopiés.
const maxWidth = computed(
  () => ({ prose: 'max-w-3xl', list: 'max-w-5xl', form: 'max-w-xl' })[props.width]
)
</script>

<template>
  <component :is="as" :class="['mx-auto w-full px-6 pt-12 pb-16 sm:px-8 sm:pt-16', maxWidth]">
    <slot />
  </component>
</template>
