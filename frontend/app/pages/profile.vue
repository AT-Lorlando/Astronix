<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'

const { user, fetchProfile, logout } = useAuth()
const router = useRouter()
const { t } = useI18n()

const loading = ref(true)

onMounted(async () => {
  if (!user.value) {
    try {
      await fetchProfile()
    } catch {
      router.push('/login')
      return
    }
  }
  loading.value = false
})

const handleLogout = async () => {
  await logout()
  router.push('/login')
}
</script>

<template>
  <div>
    <Breadcrumbs />

    <div class="px-6 py-8">
      <div v-if="loading" class="py-16 text-center">
        <Icon name="lucide:loader-2" class="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
        <p class="text-muted-foreground">{{ t('common.loading') }}</p>
      </div>

      <div v-else-if="user" class="mx-auto w-full max-w-md space-y-4">
        <Card>
          <CardContent class="p-8 text-center">
            <Avatar class="mx-auto mb-4 h-20 w-20">
              <AvatarFallback class="text-3xl">
                {{ (user.fullName || user.email).charAt(0).toUpperCase() }}
              </AvatarFallback>
            </Avatar>
            <h2 class="mb-1 text-2xl font-bold">{{ user.fullName || t('profile.fallbackName') }}</h2>
            <p class="mb-6 text-sm text-muted-foreground">{{ user.email }}</p>
            <div class="text-xs text-muted-foreground">{{ t('profile.id') }}: #{{ user.id }}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent class="space-y-3 p-4">
            <Button variant="outline" class="w-full justify-between">
              <span class="flex items-center">
                <Icon name="lucide:edit" class="mr-3 h-5 w-5" />
                {{ t('profile.editProfile') }}
              </span>
              <Icon name="lucide:chevron-right" class="h-5 w-5" />
            </Button>
            <Button variant="outline" class="w-full justify-between">
              <span class="flex items-center">
                <Icon name="lucide:settings" class="mr-3 h-5 w-5" />
                {{ t('profile.settings') }}
              </span>
              <Icon name="lucide:chevron-right" class="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>

        <div class="space-y-3 pt-4">
          <Button variant="secondary" class="w-full" @click="router.push('/')">{{ t('profile.backToHome') }}</Button>
          <Button variant="destructive" class="w-full" @click="handleLogout">{{ t('profile.signOut') }}</Button>
        </div>
      </div>
    </div>
  </div>
</template>
