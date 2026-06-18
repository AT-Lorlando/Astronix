<script setup lang="ts">
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import type { SiteProject } from '~/data/site'

defineProps<{ project: SiteProject }>()
const { t } = useI18n()

</script>

<template>
  <Card :class="['h-full', project.featured ? 'border-primary/50' : '']">
    <CardHeader>
      <div class="flex items-center gap-3">
        <CardTitle>{{ project.name }}</CardTitle>
        <Badge v-if="project.featured" class="font-mono text-xs">{{ t('projects.featured') }}</Badge>
      </div>
      <CardDescription class="line-clamp-2 min-h-[2.5rem]">{{ t(`projects.${project.id}.tagline`) }}</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-1 flex-col gap-4">
      <p class="line-clamp-3 text-sm text-muted-foreground">{{ t(`projects.${project.id}.pitch`) }}</p>
      <div class="mt-auto flex flex-wrap gap-2">
        <Badge v-for="tech in project.stack" :key="tech" variant="secondary" class="font-mono text-xs">
          {{ tech }}
        </Badge>
      </div>
    </CardContent>
    <CardFooter class="gap-3">
      <Button size="sm" as-child>
        <NuxtLink :to="`/projects/${project.id}`">{{ t('projects.viewProject') }}</NuxtLink>
      </Button>
      <Button size="sm" variant="ghost" as-child>
        <a :href="project.repo" target="_blank" rel="noopener noreferrer">
          <Icon name="lucide:github" class="mr-2 h-4 w-4" />{{ t('projects.viewGithub') }}
        </a>
      </Button>
    </CardFooter>
  </Card>
</template>
