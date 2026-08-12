<script setup>
import { computed, watch } from 'vue'
import { theme as antTheme } from 'ant-design-vue'
import { useRoute } from 'vue-router'
import { useAppStore } from './stores/app'

const appStore = useAppStore()
const route = useRoute()
const effectiveTheme = computed(() => route.meta.guestOnly === true ? 'light' : appStore.theme)
const themeTokens = computed(() => effectiveTheme.value === 'dark'
  ? {
      colorBgLayout: '#141414',
      colorBgContainer: '#1F1F1F',
      colorBgElevated: '#262626',
      colorText: '#F5F5F5',
      colorTextSecondary: '#BFBFBF',
      colorTextTertiary: '#8C8C8C',
      colorTextQuaternary: '#737373',
      colorTextPlaceholder: '#737373',
      colorTextDisabled: '#737373',
      colorBorder: '#434343',
      colorBorderSecondary: '#303030',
      colorFillAlter: '#262626',
      colorFillSecondary: '#262626',
      colorFillTertiary: '#303030',
      colorBgTextHover: '#2A2018',
      colorBgTextActive: '#3A2618',
      colorPrimaryBg: '#3A2618',
      colorPrimaryBgHover: '#4A2D1A',
      colorPrimaryBorder: '#873800',
      colorSuccess: '#73D13D',
      colorWarning: '#FFC53D',
      colorError: '#FF7875',
      colorInfo: '#69B1FF',
      colorLink: '#69B1FF',
      colorLinkHover: '#91CAFF',
      colorLinkActive: '#4096FF',
      boxShadow: '0 2px 8px rgb(0 0 0 / 24%)',
      boxShadowSecondary: '0 8px 24px rgb(0 0 0 / 36%)',
    }
  : {
      colorBgLayout: '#F5F5F5',
      colorBgContainer: '#FFFFFF',
      colorBgElevated: '#FFFFFF',
      colorText: '#1F1F1F',
      colorTextSecondary: '#595959',
      colorTextTertiary: '#8C8C8C',
      colorTextQuaternary: '#BFBFBF',
      colorTextPlaceholder: '#8C8C8C',
      colorTextDisabled: '#BFBFBF',
      colorBorder: '#D9D9D9',
      colorBorderSecondary: '#F0F0F0',
      colorFillAlter: '#FAFAFA',
      colorFillSecondary: '#FAFAFA',
      colorFillTertiary: '#F5F5F5',
      colorBgTextHover: '#FFF7E6',
      colorBgTextActive: '#FFF2E6',
      colorPrimaryBg: '#FFF2E6',
      colorPrimaryBgHover: '#FFF7E6',
      colorPrimaryBorder: '#FFBB96',
      colorSuccess: '#52C41A',
      colorWarning: '#FAAD14',
      colorError: '#FF4D4F',
      colorInfo: '#007BFF',
      colorLink: '#0958D9',
      colorLinkHover: '#1677FF',
      colorLinkActive: '#003EB3',
      boxShadow: '0 2px 8px rgb(0 0 0 / 4%)',
      boxShadowSecondary: '0 8px 24px rgb(0 0 0 / 8%)',
    })

const antThemeConfig = computed(() => ({
  algorithm: effectiveTheme.value === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#FF6B00',
    ...themeTokens.value,
    borderRadius: 6,
    borderRadiusLG: 8,
    controlHeight: 32,
    fontSize: 14,
    fontWeightStrong: 600,
  },
  components: {
    Layout: {
      headerBg: themeTokens.value.colorBgContainer,
      siderBg: themeTokens.value.colorBgContainer,
      bodyBg: themeTokens.value.colorBgLayout,
    },
    Menu: {
      itemBg: themeTokens.value.colorBgContainer,
      subMenuItemBg: themeTokens.value.colorBgContainer,
      itemColor: themeTokens.value.colorTextSecondary,
      itemHoverBg: themeTokens.value.colorBgTextHover,
      itemHoverColor: themeTokens.value.colorText,
      itemSelectedBg: themeTokens.value.colorPrimaryBg,
      itemSelectedColor: '#FF6B00',
      itemActiveBg: themeTokens.value.colorBgTextActive,
    },
    Table: {
      headerBg: themeTokens.value.colorFillAlter,
      headerColor: themeTokens.value.colorTextSecondary,
      rowHoverBg: themeTokens.value.colorBgTextHover,
      borderColor: themeTokens.value.colorBorderSecondary,
    },
    Tabs: {
      itemSelectedColor: '#FF6B00',
      itemHoverColor: themeTokens.value.colorText,
      inkBarColor: '#FF6B00',
    },
    Dropdown: {
      controlItemBgHover: themeTokens.value.colorBgTextHover,
    },
    Modal: {
      contentBg: themeTokens.value.colorBgElevated,
      headerBg: themeTokens.value.colorBgElevated,
    },
  },
}))

function syncDocumentTheme(theme) {
  const resolvedTheme = theme === 'dark' ? 'dark' : 'light'
  document.documentElement.dataset.theme = resolvedTheme
  document.documentElement.style.colorScheme = resolvedTheme
}

watch(() => effectiveTheme.value, syncDocumentTheme, { immediate: true })
</script>

<template>
  <a-config-provider :theme="antThemeConfig">
    <router-view />
  </a-config-provider>
</template>
