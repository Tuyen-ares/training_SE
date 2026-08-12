import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  
  // Trạng thái Loading toàn cục
  const isLoading = ref(false)
  const setLoading = (status) => {
    isLoading.value = status
  }

  // Explicit user preference; the operating system never overrides it.
  const storedTheme = localStorage.getItem('theme')
  const theme = ref(storedTheme === 'dark' ? 'dark' : 'light')
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', theme.value)
  }

  return { isLoading, setLoading, theme, toggleTheme }
})
