import axios from 'axios'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

function toAppError(error) {
  if (!axios.isAxiosError(error)) return error

  const appError = new Error(error.response?.data?.error || 'The request could not be completed.')
  appError.status = error.response?.status
  appError.details = error.response?.data?.details
  appError.code = error.response?.data?.code
  appError.retryable = error.response?.data?.retryable
  return appError
}

async function unwrap(request) {
  try {
    const response = await request
    return response.status === 204 ? null : response.data?.data
  } catch (error) {
    throw toAppError(error)
  }
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

  const setCurrentUser = (nextUser) => {
    user.value = { ...user.value, ...nextUser }
  }

  const login = async ({ email, password }) => {
    const data = await unwrap(http.post('/auth/login', { email, password }))
    accessToken.value = data.accessToken
    user.value = data.user
    initialized.value = true
  }

  const performRefresh = async () => {
    const data = await unwrap(http.post('/auth/refresh'))
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
    try {
      return await unwrap(http.request({
        url: path,
        method: options.method || 'GET',
        data: options.body,
        headers: {
          ...options.headers,
          ...(accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {}),
        },
      }))
    } catch (error) {
      if (error.status !== 401 || !retryAfterRefresh) throw error

      try {
        await refresh()
        return api(path, options, false)
      } catch {
        clearSession()
        throw error
      }
    }
  }

  const logout = async () => {
    try {
      await unwrap(http.post('/auth/logout'))
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
    setCurrentUser,
    login,
    logout,
    restoreSession,
    api,
  }
})
