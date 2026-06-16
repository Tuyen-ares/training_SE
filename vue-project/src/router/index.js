import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // {
    //   path: '/',
    //   name: 'home',
    //   component: HomeView,
    // },
       {
      path :'/',
      name : 'login',
      component : () => import('../views/Login/Login.vue')
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/Admin/Dashboard.vue')
    },
     {
      path: '/register',
      name: 'register',
      component: () => import('../views/Login/register.vue')
    },
      {
      path: '/assets/:id',
      name: 'assetDetail',
      component: () => import('../views/Admin/AssetDetailView.vue')
    },
  ],
})

export default router
