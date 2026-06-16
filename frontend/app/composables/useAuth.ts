import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'

export const useAuth = () => {
  const store = useAuthStore()
  const { user, isAuthenticated } = storeToRefs(store)

  return {
    user,
    isAuthenticated,
    login: store.login.bind(store),
    signup: store.signup.bind(store),
    logout: store.logout.bind(store),
    fetchProfile: store.fetchProfile.bind(store),
  }
}

