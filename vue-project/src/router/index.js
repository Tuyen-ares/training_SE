import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAppStore } from '../stores/app'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
       {
      path :'/',
      name : 'login',
      component : () => import('../views/Login/Login.vue')
    },
      {
      path :'/main',
      name : 'main',
      component : () => import('../views/train/Main.vue')
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/Admin/Dashboard.vue'),
      meta : { requiresAuth: true }
    },
     {
      path: '/register',
      name: 'egister',
      component: () => import('../views/Login/Register.vue')},
      {
      path: '/CartItem',
      name: 'CartItem',
      component: () => import('../views/train/Component/SearchBar.vue')
    },
  ],
})


router.beforeEach((to, _, next) => {
  const appStore = useAppStore();
  const authStore = useAuthStore()
  appStore.setLoading(true);
  if (to.name !== 'login' && !authStore.isAuthenticated) next({ name: 'login' })
  else {
    next()
  }
})

// router.afterEach((to, from) => {
//   const appStore = useAppStore();
//   appStore.setLoading(false);
// })

export default router
