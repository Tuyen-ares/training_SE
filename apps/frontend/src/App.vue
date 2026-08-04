<script setup>
import { computed } from 'vue'
import { theme as antTheme } from 'ant-design-vue'
import { useAppStore } from './stores/app'

const appStore = useAppStore()
const antThemeConfig = computed(() => ({
  algorithm: appStore.theme === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#FF6B00',
    colorSuccess: '#52C41A',
    colorWarning: '#FAAD14',
    colorError: '#FF4D4F',
    colorInfo: '#007BFF',
    ...(appStore.theme === 'light'
      ? {
          colorBgLayout: '#F5F5F5',
          colorBgContainer: '#FFFFFF',
          colorText: '#1F1F1F',
          colorTextSecondary: '#595959',
          colorBorder: '#D9D9D9',
          colorBorderSecondary: '#F0F0F0',
        }
      : {}),
    borderRadius: 6,
    borderRadiusLG: 8,
    controlHeight: 32,
    fontSize: 14,
    fontWeightStrong: 600,
  },
}))
</script>

<template>
  <a-config-provider :theme="antThemeConfig">
    <router-view />
  </a-config-provider>
</template>
