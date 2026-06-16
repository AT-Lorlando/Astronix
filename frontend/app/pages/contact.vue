<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form'

const { t } = useI18n()
const config = useRuntimeConfig()

const status = ref<'idle' | 'success' | 'error' | 'rateLimited'>('idle')
const submitting = ref(false)

const schema = computed(() =>
  toTypedSchema(
    z.object({
      name: z.string().min(2, t('contact.errors.name')),
      email: z.string().email(t('contact.errors.email')),
      message: z.string().min(10, t('contact.errors.message')),
      website: z.string().optional(),
    })
  )
)

const { handleSubmit, resetForm } = useForm({ validationSchema: schema })

const onSubmit = handleSubmit(async (values) => {
  submitting.value = true
  status.value = 'idle'
  try {
    await $fetch(`${config.public.apiBase}/contact`, { method: 'POST', body: values })
    status.value = 'success'
    resetForm()
  } catch (err) {
    const httpStatus = (err as { response?: { status?: number } }).response?.status
    status.value = httpStatus === 429 ? 'rateLimited' : 'error'
  } finally {
    submitting.value = false
  }
})
</script>

<template>
  <div class="mx-auto max-w-xl px-6 pt-16 pb-8">
    <h1 class="mb-2 text-3xl font-bold tracking-tight">{{ t('contact.title') }}</h1>
    <p class="mb-10 text-muted-foreground">{{ t('contact.subtitle') }}</p>

    <p
      v-if="status === 'success'"
      class="mb-6 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary"
      role="status"
    >
      {{ t('contact.success') }}
    </p>
    <p
      v-else-if="status === 'error' || status === 'rateLimited'"
      class="mb-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
      role="alert"
    >
      {{ status === 'rateLimited' ? t('contact.rateLimited') : t('contact.error') }}
    </p>

    <form class="space-y-6" novalidate @submit="onSubmit">
      <FormField v-slot="{ componentField }" name="name">
        <FormItem>
          <FormLabel>{{ t('contact.name') }}</FormLabel>
          <FormControl>
            <Input type="text" autocomplete="name" v-bind="componentField" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="email">
        <FormItem>
          <FormLabel>{{ t('contact.email') }}</FormLabel>
          <FormControl>
            <Input type="email" autocomplete="email" v-bind="componentField" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="message">
        <FormItem>
          <FormLabel>{{ t('contact.message') }}</FormLabel>
          <FormControl>
            <Textarea rows="10" class="min-h-48" v-bind="componentField" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <!-- Honeypot: hidden from users, must stay empty. -->
      <FormField v-slot="{ componentField }" name="website">
        <input
          type="text"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
          class="hidden"
          v-bind="componentField"
        >
      </FormField>

      <Button type="submit" :disabled="submitting">
        {{ submitting ? t('contact.submitting') : t('contact.submit') }}
      </Button>
    </form>
  </div>
</template>
