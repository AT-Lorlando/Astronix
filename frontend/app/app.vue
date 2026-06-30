<script setup lang="ts">
useHead({
  titleTemplate: (title) => (title ? `${title} · Astronix` : 'Astronix'),
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
