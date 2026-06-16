<script setup lang="ts">
import { Button } from '~/components/ui/button'

const { locale, setLocale } = useI18n()
const localeCookie = useCookie('i18n_locale')

const toggle = () => {
  const next = locale.value === 'fr' ? 'en' : 'fr'
  setLocale(next)
  localeCookie.value = next
}

onMounted(() => {
  if (localeCookie.value && localeCookie.value !== locale.value) {
    setLocale(localeCookie.value as 'fr' | 'en')
  }
})
</script>

<template>
  <Button
    variant="ghost"
    size="sm"
    class="font-mono uppercase"
    :aria-label="`Switch language, current ${locale}`"
    @click="toggle"
  >
    {{ locale }}
  </Button>
</template>
