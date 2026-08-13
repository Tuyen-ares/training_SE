<script setup>
import {
  AppstoreOutlined,
  BellOutlined,
  BulbOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  HistoryOutlined,
  InboxOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons-vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '../../stores/auth'
import { useAppStore } from '../../stores/app'
import { getUnreadNotificationCount } from '../../services/notification.service'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const collapsed = ref(false)
const isMobileViewport = ref(false)
const mobileNavOpen = ref(false)
const unreadNotificationCount = ref(0)

function updateViewport() {
  isMobileViewport.value = window.innerWidth < 992
  if (!isMobileViewport.value) mobileNavOpen.value = false
}

function closeMobileNav() {
  mobileNavOpen.value = false
}

function toggleMobileNav() {
  mobileNavOpen.value = !mobileNavOpen.value
}

function handleEscape(event) {
  if (event.key === 'Escape') closeMobileNav()
}

const hasAnyPermission = (...permissionCodes) => permissionCodes.some((code) => authStore.hasPermission(code))
const administrationRoute = computed(() => {
  return 'administration'
})
const administrationOpen = ref([
  'administration',
  'users', 'user-detail', 'user-create', 'user-edit',
  'registration-requests', 'registration-request-detail',
  'roles', 'role-create', 'role-detail',
].includes(route.name))

const administrationItems = computed(() => [
  { key: 'administration-users', label: 'Users', routeName: 'users', visible: authStore.hasPermission('user.view') },
  { key: 'administration-registration', label: 'Registration Requests', routeName: 'registration-requests', visible: authStore.hasPermission('user_registration.review') },
  { key: 'administration-roles', label: 'Roles', routeName: 'roles', visible: hasAnyPermission('role.view', 'role.assign', 'user_registration.review') },
].filter((item) => item.visible))

const navigationItems = computed(() => [
  { key: 'dashboard', label: 'Dashboard', icon: DashboardOutlined, routeName: 'dashboard', visible: authStore.hasPermission('dashboard.view') },
  { key: 'assets', label: 'Assets', icon: AppstoreOutlined, routeName: 'assets', visible: authStore.hasPermission('asset.view') },
  { key: 'my-requests', label: 'My Requests', icon: InboxOutlined, routeName: 'my-requests', visible: hasAnyPermission('borrow_request.create', 'borrow_request.view_own') },
  { key: 'approval-queue', label: 'Approval Queue', icon: CheckSquareOutlined, routeName: 'approval-queue', visible: hasAnyPermission('borrow_request.approve', 'borrow_request.reject') },
  { key: 'handover-return', label: 'Handover & Return', icon: SettingOutlined, routeName: 'handover-return', visible: hasAnyPermission('asset.checkout', 'asset.checkin') },
  { key: 'borrowing-activity', label: 'Borrowing Activity', icon: HistoryOutlined, routeName: 'borrowing-activity', visible: hasAnyPermission('borrow_history.view_own', 'borrow_history.view_all') },
  { key: 'asset-issues', label: 'Asset Issues & Repairs', icon: ToolOutlined, routeName: 'asset-issues', visible: authStore.hasPermission('asset_issue.view') },
  { key: 'asset-catalog', label: 'Asset Catalog', icon: AppstoreOutlined, routeName: 'asset-catalog', visible: hasAnyPermission('brand.create', 'brand.update', 'asset_type.create', 'asset_type.update', 'asset_model.create', 'asset_model.update') },
  {
    key: 'administration',
    label: 'Administration',
    icon: TeamOutlined,
    routeName: administrationRoute.value,
    visible: administrationItems.value.length > 0,
    children: administrationItems.value,
  },
  { key: 'notifications', label: 'Notifications', icon: BellOutlined, routeName: 'notifications', visible: authStore.isAuthenticated },
].filter((item) => item.visible))

const selectedKeys = computed(() => [
  ['asset-detail', 'asset-create', 'asset-edit'].includes(route.name) ? 'assets'
      : ['users', 'user-detail', 'user-create', 'user-edit'].includes(route.name) ? 'administration-users'
        : ['registration-requests', 'registration-request-detail'].includes(route.name) ? 'administration-registration'
          : ['roles', 'role-create', 'role-detail'].includes(route.name) ? 'administration-roles'
            : route.name === 'administration' ? 'administration'
        : ['borrow-request-create', 'borrow-request-detail'].includes(route.name) ? 'my-requests'
      : route.name === 'approval-detail' ? 'approval-queue'
        : route.name === 'asset-issue-detail' ? 'asset-issues' : route.name,
])
const userInitials = computed(() => authStore.user?.name
  ?.split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((name) => name[0])
  .join('')
  .toUpperCase() || 'U')

const accountRoleLabel = computed(() => authStore.user?.roles
  ?.map((role) => role.name.replace(/(^|_)([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`))
  .join(', ') || '')

function navigate({ key }) {
  const item = navigationItems.value.find((navigationItem) => navigationItem.key === key)
  const child = administrationItems.value.find((administrationItem) => administrationItem.key === key)
  const target = child || item
  if (target?.routeName && target.routeName !== route.name) router.push({ name: target.routeName })
  closeMobileNav()
}

function handleOpenChange(keys) {
  administrationOpen.value = keys.includes('administration')
}

async function logout() {
  await authStore.logout()
  router.push({ name: 'login' })
}

async function loadUnreadNotifications() {
  try {
    const result = await getUnreadNotificationCount(authStore.api)
    unreadNotificationCount.value = result?.unreadCount || 0
  } catch {
    unreadNotificationCount.value = 0
  }
}

function openNotifications() {
  if (route.name !== 'notifications') router.push({ name: 'notifications' })
}

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
  loadUnreadNotifications()
  window.addEventListener('notifications:changed', loadUnreadNotifications)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
  window.removeEventListener('notifications:changed', loadUnreadNotifications)
  document.removeEventListener('keydown', handleEscape)
  document.body.classList.remove('bigin-mobile-nav-open')
})

watch(mobileNavOpen, (open) => {
  document.body.classList.toggle('bigin-mobile-nav-open', open)
  if (open) document.addEventListener('keydown', handleEscape)
  else document.removeEventListener('keydown', handleEscape)
})
watch(() => route.name, closeMobileNav)
</script>

<template>
  <a-layout class="workspace-layout mobile-shell">
    <div v-if="mobileNavOpen" class="workspace-layout__backdrop" aria-hidden="true" @click="closeMobileNav" />
    <a-layout-sider
      id="workspace-navigation"
      :collapsed="isMobileViewport ? false : collapsed"
      class="workspace-layout__sider mobile-drawer"
      :class="{ 'workspace-layout__sider--mobile-open': mobileNavOpen }"
      :width="296"
      :collapsed-width="72"
      collapsible
      :theme="appStore.theme"
      :trigger="null"
      @collapse="collapsed = $event"
    >
      <RouterLink class="workspace-layout__brand" :to="{ name: 'dashboard' }">
        <span v-if="isMobileViewport || !collapsed">BigIn Asset<span class="workspace-layout__brand-dot">.</span></span>
      </RouterLink>

      <a-menu
        class="workspace-layout__menu"
        mode="inline"
        :inline-collapsed="isMobileViewport ? false : collapsed"
        :selected-keys="selectedKeys"
        :open-keys="administrationOpen ? ['administration'] : []"
        @open-change="handleOpenChange"
        @click="navigate"
      >
        <template v-for="item in navigationItems" :key="item.key">
          <a-sub-menu v-if="item.children" :key="item.key">
            <template #icon><component :is="item.icon" /></template>
            <template #title>{{ item.label }}</template>
            <a-menu-item v-for="child in item.children" :key="child.key">
              {{ child.label }}
            </a-menu-item>
          </a-sub-menu>
          <a-menu-item v-if="!item.children" :key="item.key">
            <template #icon><component :is="item.icon" /></template>
            <span>{{ item.label }}</span>
          </a-menu-item>
        </template>
      </a-menu>
    </a-layout-sider>

    <a-layout>
      <a-layout-header class="workspace-layout__header">
        <div class="workspace-layout__context">
          <a-button
            class="workspace-layout__collapse-control workspace-layout__collapse-control--desktop bigin-touch-target"
            type="text"
            :aria-label="collapsed ? 'Expand navigation' : 'Collapse navigation'"
            @click="collapsed = !collapsed"
          >
            <template #icon><MenuUnfoldOutlined v-if="collapsed" /><MenuFoldOutlined v-else /></template>
          </a-button>
          <a-button
            class="workspace-layout__collapse-control workspace-layout__collapse-control--mobile bigin-touch-target"
            type="text"
            aria-label="Open navigation"
            :aria-expanded="mobileNavOpen"
            aria-controls="workspace-navigation"
            @click="toggleMobileNav"
          >
            <template #icon><MenuUnfoldOutlined /></template>
          </a-button>
          <slot name="context" />
        </div>

        <a-space class="workspace-layout__header-actions" :size="12">
          <a-tooltip :title="appStore.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
            <a-button
              class="bigin-touch-target"
              type="text"
              :aria-label="appStore.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
              @click="appStore.toggleTheme"
            >
              <template #icon><BulbOutlined /></template>
            </a-button>
          </a-tooltip>
          <a-tooltip title="Notifications">
            <a-badge :count="unreadNotificationCount" :overflow-count="99" size="small">
              <a-button class="bigin-touch-target" type="text" aria-label="Open notifications" @click="openNotifications">
                <template #icon><BellOutlined /></template>
              </a-button>
            </a-badge>
          </a-tooltip>
          <a-dropdown placement="bottomRight">
            <a-button type="text" class="workspace-layout__account bigin-touch-target">
              <span class="workspace-layout__account-copy">
                <span class="workspace-layout__account-name">{{ authStore.user?.name }}</span>
                <span v-if="accountRoleLabel" class="workspace-layout__account-role">{{ accountRoleLabel }}</span>
              </span>
              <a-avatar :size="32" :src="authStore.user?.avatarUrl">{{ userInitials }}</a-avatar>
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item key="logout" @click="logout">
                  <LogoutOutlined /> Sign out
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-space>
      </a-layout-header>

      <a-layout-content class="workspace-layout__content">
        <slot />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.workspace-layout { background: var(--bigin-surface-page); min-height: 100vh; min-height: 100dvh; }
.mobile-shell { min-height: 100vh; min-height: 100dvh; }
.workspace-layout :deep(.ant-layout) { background: var(--bigin-surface-page); }
.workspace-layout__sider { background: var(--bigin-surface-panel) !important; border-right: 1px solid var(--bigin-border-secondary); flex: 0 0 296px !important; max-width: 296px !important; min-height: 100vh; min-height: 100dvh; min-width: 296px !important; width: 296px !important; }
.workspace-layout__sider.ant-layout-sider-collapsed { flex-basis: 72px !important; max-width: 72px !important; min-width: 72px !important; width: 72px !important; }
.workspace-layout__brand { align-items: center; color: var(--bigin-text-primary); display: flex; font-size: 22px; font-weight: 700; height: 68px; padding: 0 28px; text-decoration: none; white-space: nowrap; }
.workspace-layout__brand-dot { color: var(--bigin-color-primary); }
.workspace-layout__menu { background: transparent; border-inline-end: 0; color: var(--bigin-text-secondary); padding: 18px 12px; }
.workspace-layout__menu :deep(.ant-menu-item) { height: 44px; line-height: 44px; margin-block: 4px; }
.workspace-layout__menu :deep(.ant-menu-item), .workspace-layout__menu :deep(.ant-menu-submenu-title) { color: var(--bigin-text-secondary); }
.workspace-layout__menu :deep(.ant-menu-item:hover), .workspace-layout__menu :deep(.ant-menu-submenu-title:hover) { background: var(--bigin-surface-hover); color: var(--bigin-text-primary); }
.workspace-layout__menu :deep(.ant-menu-item-selected) { background: var(--bigin-surface-selected); color: var(--bigin-color-primary); }
.workspace-layout__menu :deep(.ant-menu-item-selected .ant-menu-item-icon), .workspace-layout__menu :deep(.ant-menu-item-selected .anticon) { color: var(--bigin-color-primary); }
.workspace-layout__menu :deep(.ant-menu-submenu-selected > .ant-menu-submenu-title) { color: var(--bigin-color-primary); }
.workspace-layout__header { align-items: center; background: var(--bigin-surface-panel); border-bottom: 1px solid var(--bigin-border-secondary); display: flex; flex: 0 0 68px; height: 68px; justify-content: space-between; line-height: normal; padding: 0 28px; position: relative; z-index: var(--bigin-z-header); }
.workspace-layout__context { align-items: center; display: flex; gap: 12px; min-width: 0; overflow: hidden; }
.workspace-layout__context :deep(strong), .workspace-layout__context :deep(.ant-typography) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.workspace-layout__collapse-control { align-items: center; display: inline-flex; justify-content: center; }
.workspace-layout__collapse-control--mobile { display: none; }
.workspace-layout__content { background: var(--bigin-surface-page); color: var(--bigin-text-primary); min-width: 0; }
.workspace-layout__header-actions { align-items: center; flex: 0 0 auto; }
.workspace-layout__header-actions :deep(.ant-btn:hover) { background: var(--bigin-surface-hover); color: var(--bigin-color-primary); }
.workspace-layout__header-actions :deep(.ant-btn:focus-visible) { box-shadow: var(--bigin-focus-ring); }
.workspace-layout__account { align-items: center; display: inline-flex; gap: 10px; height: 40px; }
.workspace-layout__account-copy { display: grid; line-height: 1.2; text-align: right; }
.workspace-layout__account-name { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.workspace-layout__account-role { color: var(--bigin-text-tertiary); font-size: 12px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.workspace-layout__backdrop { background: rgb(0 0 0 / 48%); inset: 0; position: fixed; z-index: var(--bigin-z-nav-backdrop); }

@media (max-width: 991px) {
  .workspace-layout__sider,
  .workspace-layout__sider.ant-layout-sider-collapsed { bottom: 0; flex: 0 0 auto !important; height: 100dvh; left: 0; max-height: 100dvh; max-width: min(296px, 82vw) !important; min-height: 100dvh; min-width: min(296px, 82vw) !important; position: fixed !important; top: 0; transform: translateX(-105%); transition: transform 180ms ease; width: min(296px, 82vw) !important; z-index: var(--bigin-z-nav-drawer); }
  .workspace-layout__sider--mobile-open { transform: translateX(0) !important; }
  .workspace-layout__sider :deep(.ant-layout-sider-children) { min-height: 100dvh; overflow-y: auto; }
  .workspace-layout__collapse-control--desktop { display: none; }
  .workspace-layout__collapse-control--mobile { display: inline-flex; }
  .workspace-layout__header { padding: 0 16px; }
  .workspace-layout__account-copy { display: none; }
  .workspace-layout__context { gap: 8px; }
  .workspace-layout__header-actions { gap: 4px !important; }
}

@media (max-width: 575px) {
  .workspace-layout__header { padding-inline: 12px; }
}
</style>
