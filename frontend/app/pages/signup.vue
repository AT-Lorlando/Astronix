<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

const auth = useAuth()
const router = useRouter()
const { t } = useI18n()

const email = ref('')
const password = ref('')
const fullName = ref('')
const error = ref('')
const loading = ref(false)

const handleSignup = async () => {
  error.value = ''
  loading.value = true
  try {
    await auth.signup(email.value, password.value, fullName.value)
    router.push('/profile')
  } catch (err) {
    error.value =
      (err as { data?: { message?: string } }).data?.message ||
      t('signup.error')
  } finally {
    loading.value = false
  }
}

definePageMeta({
  layout: false,
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <Breadcrumbs />

    <div class="flex min-h-screen items-center justify-center px-6 py-8">
      <div class="w-full max-w-md">
        <div class="mb-8 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border">
            <Icon name="lucide:user-plus" class="h-8 w-8 text-primary" />
          </div>
          <h1 class="mb-2 text-3xl font-bold">{{ t('signup.title') }}</h1>
          <p class="text-muted-foreground">{{ t('signup.subtitle') }}</p>
        </div>

        <p v-if="error" class="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {{ error }}
        </p>

        <Card>
          <CardContent class="p-6">
            <form class="space-y-6" @submit.prevent="handleSignup">
              <div class="space-y-2">
                <Label for="fullName">{{ t('common.fullName') }}</Label>
                <Input id="fullName" v-model="fullName" type="text" placeholder="Jane Doe" required />
              </div>
              <div class="space-y-2">
                <Label for="email">{{ t('common.email') }}</Label>
                <Input id="email" v-model="email" type="email" placeholder="you@example.com" required />
              </div>
              <div class="space-y-2">
                <Label for="password">{{ t('common.password') }}</Label>
                <Input id="password" v-model="password" type="password" placeholder="••••••••" required />
              </div>
              <Button type="submit" class="w-full" :disabled="loading">
                {{ loading ? t('signup.submitting') : t('signup.submit') }}
              </Button>
              <div class="text-center">
                <Button variant="link" type="button" @click="router.push('/login')">
                  {{ t('signup.hasAccount') }}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
