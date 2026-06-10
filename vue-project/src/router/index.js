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
      path: '/create',
      name: 'create',
      component: () => import('../views/Admin/AsssetCreate.vue')
    },
     {
      path: '/assets',
      name: 'assets',
      component: () => import('../views/Admin/AssetsView.vue')
    },
      {
      path: '/assets/:id',
      name: 'assetDetail',
      component: () => import('../views/Admin/AssetDetailView.vue')
    },
  ],
})

export default router
