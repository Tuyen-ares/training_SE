import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  
  // Trạng thái Loading toàn cục
  const isLoading = ref(false)
  const setLoading = (status) => {
    isLoading.value = status
  }

  // Trạng thái Sáng/Tối
  const theme = ref(localStorage.getItem('theme') || 'light')
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', theme.value)
  }

  return { isLoading, setLoading, theme, toggleTheme }
})