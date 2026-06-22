import {defineStore} from 'pinia'
import {ref} from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const login = () =>{
    isAuthenticated.value = true
  }
  const logout = () =>{
    isAuthenticated.value = false
  }
  return {isAuthenticated, login, logout}
})