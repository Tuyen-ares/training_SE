import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAppStore } from '../stores/app'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('../views/login/Login.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/login/register.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/main',
      name: 'main',
      component: () => import('../views/train/Main.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/admin/Dashboard.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/admin/Users.vue'),
      meta: { requiresAuth: true, permission: 'user.view' },
    },
    {
      path: '/CartItem',
      name: 'CartItem',
      component: () => import('../views/train/components/SearchBar.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const appStore = useAppStore()
  const authStore = useAuthStore()
  appStore.setLoading(true)
  await authStore.restoreSession()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  if (to.meta.permission && !authStore.hasPermission(to.meta.permission)) {
    return { name: 'dashboard' }
  }

  return true
})

router.afterEach(() => {
  const appStore = useAppStore()
  appStore.setLoading(false)
})

export default router
