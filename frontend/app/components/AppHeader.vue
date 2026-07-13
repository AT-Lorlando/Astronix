<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '~/components/ui/sheet'
import { site } from '~/data/site'

const { t } = useI18n()
const route = useRoute()
const open = ref(false)

const links = [
  { to: '/about', label: 'nav.about' },
  { to: '/projects', label: 'nav.projects' },
  { to: '/cv', label: 'nav.cv' },
  { to: '/recommendations', label: 'nav.recommendations' },
  { to: '/contact', label: 'nav.contact' },
]

const isActive = (to: string) => route.path === to || route.path.startsWith(`${to}/`)

// Ferme le panneau mobile après navigation.
watch(() => route.path, () => { open.value = false })
</script>

<template>
  <header class="border-b">
    <div class="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4 sm:px-8">
      <NuxtLink to="/" class="font-mono text-sm font-semibold tracking-tight">
        {{ t('app.name') }}
      </NuxtLink>

      <!-- Nav desktop -->
      <nav class="hidden items-center gap-1 md:flex">
        <Button v-for="l in links" :key="l.to" variant="ghost" size="sm" as-child>
          <NuxtLink :to="l.to" :class="isActive(l.to) ? 'text-primary' : ''">{{ t(l.label) }}</NuxtLink>
        </Button>
        <Button variant="ghost" size="icon" as-child>
          <a :href="site.github" target="_blank" rel="noopener noreferrer" :aria-label="t('nav.github')">
            <Icon name="lucide:github" class="h-4 w-4" />
          </a>
        </Button>
        <LanguageToggle />
      </nav>

      <!-- Mobile : langue + hamburger -->
      <div class="flex items-center gap-1 md:hidden">
        <LanguageToggle />
        <Sheet v-model:open="open">
          <SheetTrigger as-child>
            <Button variant="ghost" size="icon" :aria-label="t('nav.menu')">
              <Icon name="lucide:menu" class="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" class="w-72">
            <SheetTitle class="font-mono text-sm">{{ t('app.name') }}</SheetTitle>
            <nav class="mt-8 flex flex-col gap-1">
              <SheetClose v-for="l in links" :key="l.to" as-child>
                <NuxtLink
                  :to="l.to"
                  class="rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                  :class="isActive(l.to) ? 'text-primary' : 'text-foreground'"
                >{{ t(l.label) }}</NuxtLink>
              </SheetClose>
              <SheetClose as-child>
                <a
                  :href="site.github"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >{{ t('nav.github') }}</a>
              </SheetClose>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </header>
</template>
