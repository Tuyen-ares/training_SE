import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

async function readResponse(response) {
  if (response.status === 204) return null
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(payload?.error || 'Yêu cầu không thành công')
    error.status = response.status
    error.details = payload?.details
    throw error
  }
  return payload?.data
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(null)
  const user = ref(null)
  const initialized = ref(false)
  let refreshPromise = null

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value))

  const hasPermission = (permissionCode) =>
    user.value?.permissionCodes?.includes(permissionCode) ?? false

  const clearSession = () => {
    accessToken.value = null
    user.value = null
  }

  const login = async ({ email, password }) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await readResponse(response)
    accessToken.value = data.accessToken
    user.value = data.user
    initialized.value = true
  }

  const performRefresh = async () => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    const data = await readResponse(response)
    accessToken.value = data.accessToken
    user.value = data.user
  }

  const refresh = () => {
    if (!refreshPromise) {
      refreshPromise = performRefresh().finally(() => {
        refreshPromise = null
      })
    }
    return refreshPromise
  }

  const restoreSession = async () => {
    if (initialized.value) return
    initialized.value = true

    try {
      await refresh()
    } catch {
      clearSession()
    }
  }

  const api = async (path, options = {}, retryAfterRefresh = true) => {
    const headers = new Headers(options.headers)
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (accessToken.value) {
      headers.set('Authorization', `Bearer ${accessToken.value}`)
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    })

    if (response.status === 401 && retryAfterRefresh) {
      try {
        await refresh()
        return api(path, options, false)
      } catch {
        clearSession()
      }
    }

    return readResponse(response)
  }

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      clearSession()
      initialized.value = true
    }
  }

  return {
    accessToken,
    user,
    initialized,
    isAuthenticated,
    hasPermission,
    login,
    logout,
    restoreSession,
    api,
  }
})
