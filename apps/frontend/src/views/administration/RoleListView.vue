<script setup>
import { computed, onMounted, ref } from 'vue'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import AdministrationTabs from '../../components/administration/AdministrationTabs.vue'
import { listRoles } from '../../services/rbac.service'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const roles = ref([])
const searchQuery = ref('')
const typeFilter = ref('all')
const loading = ref(true)
const errorMessage = ref('')
const canCreate = computed(() => authStore.hasPermission('role.create'))
const canView = computed(() => authStore.hasPermission('role.view'))
const filteredRoles = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return roles.value.filter((role) => {
    const matchesSearch = !query || role.name.toLowerCase().includes(query)
    const matchesType = typeFilter.value === 'all'
      || (typeFilter.value === 'system' && role.isSystem)
      || (typeFilter.value === 'custom' && !role.isSystem)
    return matchesSearch && matchesType
  })
})

const columns = [
  { title: 'Role', dataIndex: 'name', key: 'name', width: 260 },
  { title: 'Permissions', dataIndex: 'permissionCount', key: 'permissionCount', width: 130 },
  { title: 'Users', dataIndex: 'userCount', key: 'userCount', width: 100 },
  { title: '', key: 'action', width: 100, align: 'right' },
]

async function loadRoles() {
  loading.value = true
  errorMessage.value = ''
  try { roles.value = await listRoles(authStore.api) }
  catch { errorMessage.value = 'We could not load roles. Please try again.' }
  finally { loading.value = false }
}
onMounted(loadRoles)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Administration</strong></template>
    <AdministrationTabs />
    <main class="admin-page bigin-page-container">
      <header class="page-heading">
        <div><h1>Roles</h1><p>Create roles and review their current permission sets. Roles cannot be deleted in this version.</p></div>
        <a-button v-if="canCreate" type="primary" class="primary-action bigin-touch-target" @click="router.push({ name: 'role-create' })"><template #icon><PlusOutlined /></template>Create Role</a-button>
      </header>
      <section class="role-toolbar" aria-label="Role filters">
        <a-input v-model:value="searchQuery" class="role-search" allow-clear placeholder="Search roles">
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-segmented v-model:value="typeFilter" :options="[{ label: 'All', value: 'all' }, { label: 'System', value: 'system' }, { label: 'Custom', value: 'custom' }]" />
        <span class="result-count">{{ filteredRoles.length }} role{{ filteredRoles.length === 1 ? '' : 's' }}</span>
      </section>
      <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" action="Retry" @click="loadRoles" />
      <div v-else class="bigin-table-scroll-wrapper"><a-table class="role-table" :columns="columns" :data-source="filteredRoles" :loading="loading" row-key="id" :pagination="false" :scroll="{ x: 'max-content' }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="role-name">
              <strong>{{ record.name }}</strong>
              <a-tag v-if="record.isSystem" class="system-tag">System</a-tag>
            </div>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button v-if="canView" class="bigin-touch-target" type="link" @click="router.push({ name: 'role-detail', params: { id: record.id } })">Open</a-button>
          </template>
        </template>
        <template #emptyText><a-empty description="No roles found" /></template>
      </a-table></div>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.admin-page { padding: 24px 28px 48px; }.page-heading { align-items: flex-end; display: flex; justify-content: space-between; margin-bottom: 18px; }
.page-heading h1 { font-size: 22px; margin: 0 0 5px; }.page-heading p { color: var(--bigin-text-muted); margin: 0; }.primary-action { background: var(--bigin-color-primary); }
.role-toolbar { align-items: center; background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; display: flex; gap: 12px; margin-bottom: 16px; padding: 14px 16px; }.role-search { max-width: 360px; }.result-count { color: var(--bigin-text-muted); font-size: 13px; margin-left: auto; }
.role-table { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; overflow: hidden; }.role-name { align-items: center; display: flex; gap: 8px; }.system-tag { background: var(--bigin-surface-inset); border-color: var(--bigin-border-default); color: var(--bigin-text-secondary); margin-inline-end: 0; }
@media (max-width: 767px) { .admin-page { padding: 16px; }.page-heading { align-items: flex-start; flex-direction: column; gap: 14px; }.role-toolbar { align-items: stretch; flex-direction: column; }.role-search { max-width: none; }.result-count { margin-left: 0; } }
@media (max-width: 575px) { .admin-page { padding: 12px; }.page-heading :deep(.ant-btn) { width: 100%; }.role-toolbar { padding: 12px; } }
</style>
