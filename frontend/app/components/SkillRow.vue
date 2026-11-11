<script setup lang="ts">
import { Badge } from '~/components/ui/badge'

// Une ligne de compétences : domaine à gauche, pastilles à droite.
// `fav` = compétence principale (pastille verte ; l'intro « clique » dessus pour l'allumer).
defineProps<{ label: string; items: { text: string; fav?: boolean }[]; outline?: boolean }>()
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-[10rem_1fr] sm:gap-x-8">
    <dt class="font-mono text-sm text-foreground sm:pt-1">{{ label }}</dt>
    <dd class="flex flex-wrap gap-2">
      <Badge
        v-for="s in items"
        :key="s.text"
        :variant="outline ? 'outline' : s.fav ? 'default' : 'secondary'"
        :data-build-click="s.fav ? '' : undefined"
        class="font-mono text-xs"
      >
        {{ s.text }}
      </Badge>
    </dd>
  </div>
</template>
