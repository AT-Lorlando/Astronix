<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form'

interface Recommendation {
  id: number
  name: string
  content: string
  createdAt: string
}

const { t, locale } = useI18n()
const config = useRuntimeConfig()

const { data, error: loadError } = await useAsyncData('recommendations', () =>
  $fetch<{ recommendations: Recommendation[] }>(`${config.public.apiBase}/recommendations`)
)
const recommendations = computed(() => data.value?.recommendations ?? [])

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(locale.value, { year: 'numeric', month: 'long' })
}

const status = ref<'idle' | 'success' | 'error' | 'rateLimited'>('idle')
const submitting = ref(false)

const schema = computed(() =>
  toTypedSchema(
    z.object({
      name: z.string().min(2, t('recommendations.errors.name')),
      contact: z.string().min(2, t('recommendations.errors.contact')),
      content: z.string().min(10, t('recommendations.errors.content')),
      website: z.string().optional(),
    })
  )
)

const { handleSubmit, resetForm } = useForm({ validationSchema: schema })

const onSubmit = handleSubmit(async (values) => {
  submitting.value = true
  status.value = 'idle'
  try {
    await $fetch(`${config.public.apiBase}/recommendations`, { method: 'POST', body: values })
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
  <div class="mx-auto max-w-2xl px-6 pt-16 pb-8">
    <h1 class="mb-2 text-3xl font-bold tracking-tight">{{ t('recommendations.title') }}</h1>
    <p class="mb-10 text-muted-foreground">{{ t('recommendations.subtitle') }}</p>

    <!-- Liste des recommandations approuvées -->
    <p v-if="loadError" class="mb-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
      {{ t('recommendations.loadError') }}
    </p>
    <p v-else-if="recommendations.length === 0" class="mb-12 text-muted-foreground">
      {{ t('recommendations.empty') }}
    </p>
    <ul v-else class="mb-14 space-y-4">
      <li
        v-for="reco in recommendations"
        :key="reco.id"
        class="rounded-lg border bg-card p-5"
      >
        <p class="whitespace-pre-wrap leading-relaxed">{{ reco.content }}</p>
        <p class="mt-3 font-mono text-sm text-muted-foreground">
          — {{ reco.name }} · {{ formatDate(reco.createdAt) }}
        </p>
      </li>
    </ul>

    <!-- Formulaire de soumission -->
    <div class="border-t pt-10">
      <h2 class="mb-1 text-xl font-semibold tracking-tight">{{ t('recommendations.formTitle') }}</h2>
      <p class="mb-8 text-sm text-muted-foreground">{{ t('recommendations.formSubtitle') }}</p>

      <p
        v-if="status === 'success'"
        class="mb-6 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary"
        role="status"
      >
        {{ t('recommendations.success') }}
      </p>
      <p
        v-else-if="status === 'error' || status === 'rateLimited'"
        class="mb-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        role="alert"
      >
        {{ status === 'rateLimited' ? t('recommendations.rateLimited') : t('recommendations.error') }}
      </p>

      <form class="space-y-6" novalidate @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="name">
          <FormItem>
            <FormLabel>{{ t('recommendations.name') }}</FormLabel>
            <FormControl>
              <Input type="text" autocomplete="name" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="contact">
          <FormItem>
            <FormLabel>{{ t('recommendations.contact') }}</FormLabel>
            <FormControl>
              <Input type="text" v-bind="componentField" />
            </FormControl>
            <FormDescription>{{ t('recommendations.contactHint') }}</FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="content">
          <FormItem>
            <FormLabel>{{ t('recommendations.content') }}</FormLabel>
            <FormControl>
              <Textarea rows="8" class="min-h-40" v-bind="componentField" />
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
          {{ submitting ? t('recommendations.submitting') : t('recommendations.submit') }}
        </Button>
      </form>
    </div>
  </div>
</template>
