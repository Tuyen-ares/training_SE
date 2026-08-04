<script setup>
import {
  AppstoreOutlined,
  BellOutlined,
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
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const collapsed = ref(false)

const hasAnyPermission = (...permissionCodes) => permissionCodes.some((code) => authStore.hasPermission(code))

const navigationItems = computed(() => [
  { key: 'dashboard', label: 'Dashboard', icon: DashboardOutlined, routeName: 'dashboard', visible: authStore.hasPermission('dashboard.view') },
  { key: 'assets', label: 'Assets', icon: AppstoreOutlined, routeName: 'assets', visible: authStore.hasPermission('asset.view') },
  { key: 'my-requests', label: 'My Requests', icon: InboxOutlined, routeName: 'my-requests', visible: hasAnyPermission('borrow_request.create', 'borrow_request.view_own') },
  { key: 'approval-queue', label: 'Approval Queue', icon: CheckSquareOutlined, routeName: 'approval-queue', visible: hasAnyPermission('borrow_request.approve', 'borrow_request.reject') },
  { key: 'handover-return', label: 'Handover & Return', icon: SettingOutlined, routeName: 'handover-return', visible: hasAnyPermission('asset.checkout', 'asset.checkin') },
  { key: 'borrowing-activity', label: 'Borrowing Activity', icon: HistoryOutlined, routeName: 'borrowing-activity', visible: hasAnyPermission('borrow_history.view_own', 'borrow_history.view_all') },
  { key: 'asset-issues', label: 'Asset Issues & Repairs', icon: ToolOutlined, visible: hasAnyPermission('asset_issue.report', 'repair_log.view', 'repair_log.create', 'repair_log.update', 'repair_log.close') },
  { key: 'asset-catalog', label: 'Asset Catalog', icon: AppstoreOutlined, routeName: 'asset-catalog', visible: hasAnyPermission('brand.create', 'brand.update', 'asset_type.create', 'asset_type.update', 'asset_model.create', 'asset_model.update') },
  { key: 'users', label: 'User Management', icon: TeamOutlined, routeName: 'users', visible: authStore.hasPermission('user.view') },
  { key: 'notifications', label: 'Notifications', icon: BellOutlined, visible: authStore.isAuthenticated },
].filter((item) => item.visible))

const selectedKeys = computed(() => [
  ['asset-detail', 'asset-create', 'asset-edit'].includes(route.name) ? 'assets'
      : ['user-detail', 'user-create', 'user-edit'].includes(route.name) ? 'users'
        : ['borrow-request-create', 'borrow-request-detail'].includes(route.name) ? 'my-requests'
      : route.name === 'approval-detail' ? 'approval-queue' : route.name,
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
  if (item?.routeName && item.routeName !== route.name) router.push({ name: item.routeName })
}

async function logout() {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <a-layout class="workspace-layout">
    <a-layout-sider
      v-model:collapsed="collapsed"
      class="workspace-layout__sider"
      :width="296"
      :collapsed-width="72"
      collapsible
      theme="light"
      :trigger="null"
    >
      <RouterLink class="workspace-layout__brand" :to="{ name: 'dashboard' }">
        <span v-if="!collapsed">BigIn Asset<span class="workspace-layout__brand-dot">.</span></span>
      </RouterLink>

      <a-menu
        class="workspace-layout__menu"
        mode="inline"
        :inline-collapsed="collapsed"
        :selected-keys="selectedKeys"
        @click="navigate"
      >
        <a-menu-item v-for="item in navigationItems" :key="item.key">
          <template #icon><component :is="item.icon" /></template>
          <span>{{ item.label }}</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>

    <a-layout>
      <a-layout-header class="workspace-layout__header">
        <div class="workspace-layout__context">
          <a-button
            class="workspace-layout__collapse-control"
            type="text"
            :aria-label="collapsed ? 'Expand navigation' : 'Collapse navigation'"
            @click="collapsed = !collapsed"
          >
            <template #icon><MenuUnfoldOutlined v-if="collapsed" /><MenuFoldOutlined v-else /></template>
          </a-button>
          <slot name="context" />
        </div>

        <a-space class="workspace-layout__header-actions" :size="12">
          <a-tooltip title="Notifications">
            <a-button type="text" aria-label="Notifications">
              <template #icon><BellOutlined /></template>
            </a-button>
          </a-tooltip>
          <a-dropdown placement="bottomRight">
            <a-button type="text" class="workspace-layout__account">
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
.workspace-layout { min-height: 100vh; min-height: 100svh; }
.workspace-layout__sider { background: #fff !important; border-right: 1px solid #f0f0f0; flex: 0 0 296px !important; max-width: 296px !important; min-width: 296px !important; width: 296px !important; }
.workspace-layout__sider.ant-layout-sider-collapsed { flex-basis: 72px !important; max-width: 72px !important; min-width: 72px !important; width: 72px !important; }
.workspace-layout__brand { align-items: center; color: #1f1f1f; display: flex; font-size: 22px; font-weight: 700; height: 68px; padding: 0 28px; text-decoration: none; white-space: nowrap; }
.workspace-layout__brand-dot { color: #ff6b00; }
.workspace-layout__menu { border-inline-end: 0; padding: 18px 12px; }
.workspace-layout__menu :deep(.ant-menu-item) { height: 44px; line-height: 44px; margin-block: 4px; }
.workspace-layout__header { align-items: center; background: #fff; border-bottom: 1px solid #f0f0f0; display: flex; flex: 0 0 68px; height: 68px; justify-content: space-between; line-height: normal; padding: 0 28px; }
.workspace-layout__context { align-items: center; display: flex; gap: 12px; min-width: 0; }
.workspace-layout__collapse-control { display: none; }
.workspace-layout__content { background: #f5f5f5; min-width: 0; }
.workspace-layout__header-actions { align-items: center; }
.workspace-layout__account { align-items: center; display: inline-flex; gap: 10px; height: 40px; }
.workspace-layout__account-copy { display: grid; line-height: 1.2; text-align: right; }
.workspace-layout__account-name { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.workspace-layout__account-role { color: #8c8c8c; font-size: 12px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 640px) { .workspace-layout__header { padding: 0 16px; }.workspace-layout__collapse-control { display: inline-flex; }.workspace-layout__account-copy { display: none; } }
</style>
