<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const items = computed(() => [
  { key: 'users', label: 'Users', route: 'users', visible: authStore.hasPermission('user.view') },
  { key: 'registration', label: 'Registration Requests', route: 'registration-requests', visible: authStore.hasPermission('user_registration.review') },
  { key: 'roles', label: 'Roles', route: 'roles', visible: ['role.view', 'role.assign', 'user_registration.review'].some((permission) => authStore.hasPermission(permission)) },
  { key: 'departments', label: 'Departments', route: 'departments', visible: ['department.view', 'user_registration.review'].some((permission) => authStore.hasPermission(permission)) },
].filter((item) => item.visible))

const activeKey = computed(() => {
  if (String(route.name).startsWith('registration-request')) return 'registration'
  if (String(route.name).startsWith('role')) return 'roles'
  if (String(route.name).startsWith('user')) return 'users'
  if (String(route.name).startsWith('department')) return 'departments'
  return items.value[0]?.key
})

function changeTab(key) {
  const item = items.value.find((candidate) => candidate.key === key)
  if (item && route.name !== item.route) router.push({ name: item.route })
}
</script>

<template>
  <a-tabs class="administration-tabs" :active-key="activeKey" :items="items" @change="changeTab" />
</template>

<style scoped>
.administration-tabs { background: var(--bigin-surface-panel); border-bottom: 1px solid var(--bigin-border-secondary); padding: 0 28px; }
.administration-tabs :deep(.ant-tabs-nav) { margin: 0; }
.administration-tabs :deep(.ant-tabs-nav-wrap) { min-width: 0; overflow-x: auto; }
.administration-tabs :deep(.ant-tabs-tab) { flex: 0 0 auto; }
@media (max-width: 640px) { .administration-tabs { padding: 0 16px; } }
</style>
