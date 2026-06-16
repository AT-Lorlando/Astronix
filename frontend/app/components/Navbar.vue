<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'

const { isAuthenticated } = useAuth()
const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <header class="flex items-center justify-between border-b px-4 py-3">
    <Button variant="ghost" class="text-lg font-semibold" @click="router.push('/')">
      {{ t('app.name') }}
    </Button>

    <Button v-if="isAuthenticated" variant="ghost" size="icon" @click="router.push('/profile')">
      <Avatar class="h-8 w-8">
        <AvatarFallback>
          <Icon name="lucide:user" class="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    </Button>
    <Button v-else @click="router.push('/login')">{{ t('nav.signIn') }}</Button>
  </header>
</template>
