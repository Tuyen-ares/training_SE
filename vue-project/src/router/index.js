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
      path :'/main',
      name : 'main',
      component : () => import('../views/train/Main.vue')
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/Admin/Dashboard.vue')
    },
     {
      path: '/register',
      name: 'register',
      component: () => import('../views/Login/Register.vue')
    },
      {
      path: '/assets/:id',
      name: 'assetDetail',
      component: () => import('../views/Admin/AssetDetailView.vue')
    },
    {
      path: '/reactivity',
      name: 'reactivity',
      component: () => import('../views/train/reactivity.vue')
    },
     {
      path: '/hookTrain',
      name: 'hookTrain',
      component: () => import('../views/train/Component/hookTrain.vue')
    },
      {
      path: '/dashboardTest',
      name: 'dashboardTest',
      component: () => import('../views/train/Component/dashboardTest.vue')
    },
      {
      path: '/app2',
      name: 'app2',
      component: () => import('../views/train/app4.vue')
    },
      {
      path: '/CartItem',
      name: 'CartItem',
      component: () => import('../views/train/Component/SearchBar.vue')
    },
  ],
})

export default router
