<script setup lang="ts">
import { Button } from '~/components/ui/button'

const { t, locale, setLocale } = useI18n()
const localeCookie = useCookie<'fr' | 'en' | null>('i18n_locale')

const toggle = async () => {
  const next = locale.value === 'fr' ? 'en' : 'fr'
  await setLocale(next)
  localeCookie.value = next
}

onMounted(async () => {
  if (localeCookie.value && localeCookie.value !== locale.value) {
    await setLocale(localeCookie.value)
  }
})
</script>

<template>
  <Button
    variant="ghost"
    size="sm"
    class="font-mono uppercase"
    :aria-label="t('nav.toggleLanguage', { locale })"
    @click="toggle"
  >
    {{ locale }}
  </Button>
</template>
