<script setup lang="ts">
import type { MessageFunction, VueMessageType } from 'vue-i18n'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import ListItem from '~/components/ListItem.vue'
import type { SiteProject } from '~/data/site'

const props = defineProps<{ project: SiteProject }>()
const { t, tm, rt } = useI18n()

const features = computed(() => tm(`projects.${props.project.id}.features`) as MessageFunction<VueMessageType>[])
</script>

<template>
  <Card
    :id="`project-${project.id}`"
    :class="[
      'scroll-mt-6',
      'group h-full transition-all duration-200 hover:-translate-y-1 hover:border-primary/50',
      project.featured ? 'border-primary/50' : '',
    ]"
  >
    <CardHeader>
      <div class="flex items-center gap-3">
        <CardTitle>{{ project.name }}</CardTitle>
        <Badge v-if="project.featured" class="font-mono text-xs">{{ t('projects.featured') }}</Badge>
      </div>
      <CardDescription>{{ t(`projects.${project.id}.tagline`) }}</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-1 flex-col gap-4">
      <p class="text-sm text-muted-foreground">{{ t(`projects.${project.id}.pitch`) }}</p>
      <ul class="space-y-1.5 text-sm">
        <ListItem v-for="(f, i) in features" :key="i" :text="rt(f)" />
      </ul>
      <div class="mt-auto flex flex-wrap gap-2">
        <Badge v-for="tech in project.stack" :key="tech" variant="secondary" class="font-mono text-xs">
          {{ tech }}
        </Badge>
      </div>
    </CardContent>
  </Card>
</template>
