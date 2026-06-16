// export default defineNuxtPlugin(() => {
//   const config = useRuntimeConfig()

//   const apiClient = $fetch.create({
//     baseURL: config.public.apiBase,
//     credentials: 'include',
//     onResponseError({ response }) {
//       if (response.status === 401 || response.status === 419) {
//         if (import.meta.client) {
//           navigateTo('/login')
//         }
//       }
//     },
//   })

//   return {
//     provide: {
//       api: apiClient,
//     },
//   }
// })

