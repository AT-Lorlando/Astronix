<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'

const { user } = useAuth()
const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <div>
    <Breadcrumbs />

    <div class="mx-auto flex w-full max-w-md flex-col px-6 py-8">
      <div class="mb-8 text-center">
        <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border">
          <Icon name="lucide:smartphone" class="h-10 w-10 text-primary" />
        </div>
        <h1 class="mb-3 text-4xl font-bold">{{ t('app.title') }}</h1>
        <p class="text-lg text-muted-foreground">{{ t('app.subtitle') }}</p>
      </div>

      <Card v-if="user">
        <CardContent class="p-8 text-center">
          <Avatar class="mx-auto mb-4 h-16 w-16">
            <AvatarFallback class="text-2xl">
              {{ (user.fullName || user.email).charAt(0).toUpperCase() }}
            </AvatarFallback>
          </Avatar>
          <h3 class="mb-1 text-xl font-semibold">{{ user.fullName || t('home.welcome') }}</h3>
          <p class="mb-6 text-sm text-muted-foreground">{{ user.email }}</p>
          <Button class="w-full" @click="router.push('/profile')">{{ t('home.viewProfile') }}</Button>
        </CardContent>
      </Card>

      <Card v-else>
        <CardContent class="space-y-6 p-8 text-center">
          <div>
            <h3 class="mb-2 text-2xl font-bold">{{ t('home.getStarted') }}</h3>
            <p class="text-muted-foreground">{{ t('home.getStartedSubtitle') }}</p>
          </div>
          <div class="space-y-3">
            <Button class="w-full" @click="router.push('/signup')">{{ t('home.createAccount') }}</Button>
            <Button variant="secondary" class="w-full" @click="router.push('/login')">{{ t('nav.signIn') }}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
