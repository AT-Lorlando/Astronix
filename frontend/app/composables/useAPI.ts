export const useAPI = () => {
  const { $api } = useNuxtApp()
  // `$api` is provided by the optional `plugins/api.client.ts` plugin, which ships
  // commented out so the template can be used without auth. Typed here so the auth
  // store/composables still type-check; uncomment the plugin to enable it at runtime.
  return $api as typeof $fetch
}
