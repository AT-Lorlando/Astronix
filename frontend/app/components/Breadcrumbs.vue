<script setup lang="ts">
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'

const route = useRoute()
const { t } = useI18n()

const breadcrumbs = computed(() => {
  const paths = route.path.split('/').filter(p => p)
  const crumbs = [{ name: t('common.home'), path: '/' }]

  paths.forEach((path, index) => {
    const fullPath = '/' + paths.slice(0, index + 1).join('/')
    const name = path.charAt(0).toUpperCase() + path.slice(1)
    crumbs.push({ name, path: fullPath })
  })

  return crumbs
})
</script>

<template>
  <Breadcrumb class="px-6 py-4">
    <BreadcrumbList>
      <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
        <BreadcrumbItem>
          <BreadcrumbLink v-if="index < breadcrumbs.length - 1" as-child>
            <NuxtLink :to="crumb.path">{{ crumb.name }}</NuxtLink>
          </BreadcrumbLink>
          <BreadcrumbPage v-else>{{ crumb.name }}</BreadcrumbPage>
        </BreadcrumbItem>
        <BreadcrumbSeparator v-if="index < breadcrumbs.length - 1" />
      </template>
    </BreadcrumbList>
  </Breadcrumb>
</template>
