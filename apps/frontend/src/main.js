import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

import App from './App.vue'
import router from './router'

const storedTheme = window.localStorage.getItem('theme')
const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/'
const normalizedBasePath = import.meta.env.BASE_URL.replace(/\/+$/, '')
const routePath = normalizedBasePath && normalizedBasePath !== '/'
  ? normalizedPath === normalizedBasePath
    ? '/'
    : normalizedPath.startsWith(`${normalizedBasePath}/`)
      ? normalizedPath.slice(normalizedBasePath.length) || '/'
      : normalizedPath
  : normalizedPath
const isAuthenticationPath = routePath === '/' || routePath === '/register'
const initialTheme = isAuthenticationPath ? 'light' : storedTheme

if (initialTheme === 'dark' || initialTheme === 'light') {
  document.documentElement.dataset.theme = initialTheme
  document.documentElement.style.colorScheme = initialTheme
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Antd)

app.mount('#app')
