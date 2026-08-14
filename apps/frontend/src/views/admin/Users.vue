<script setup>
import { computed, onMounted, ref } from 'vue'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'

import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import AdministrationTabs from '../../components/administration/AdministrationTabs.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const users = ref([])
const departments = ref([])
const roles = ref([])
const loading = ref(true)
const errorMessage = ref('')
const searchQuery = ref('')
const departmentFilter = ref('all')
const roleFilter = ref('all')
const statusFilter = ref('all')

const canCreate = computed(() => authStore.hasPermission('user.create'))
const canUpdate = computed(() => authStore.hasPermission('user.update'))
const canManageStatus = computed(() => authStore.hasPermission('user.manage_status'))

const filteredUsers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return users.value.filter((user) => {
    const matchesQuery = !query || [user.userCode, user.name, user.email, user.phone]
      .some((value) => value?.toLowerCase().includes(query))
    const matchesDepartment = departmentFilter.value === 'all'
      || user.departmentId === Number(departmentFilter.value)
    const matchesRole = roleFilter.value === 'all'
      || user.roles.some((role) => role.id === Number(roleFilter.value))
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'active' ? user.isActive : !user.isActive)
    return matchesQuery && matchesDepartment && matchesRole && matchesStatus
  })
})

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase()
}

async function loadPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    const requests = [
      authStore.api('/users?status=all'),
      authStore.api('/departments'),
      authStore.hasPermission('role.assign') ? authStore.api('/rbac/roles') : Promise.resolve([]),
    ]
    const [userData, departmentData, roleData] = await Promise.all(requests)
    users.value = userData
    departments.value = departmentData
    roles.value = roleData
  } catch {
    errorMessage.value = 'We could not load the user directory. Please try again.'
  } finally {
    loading.value = false
  }
}

async function changeStatus(user) {
  const action = user.isActive ? 'deactivate' : 'activate'
  const confirmed = window.confirm(
    user.isActive
      ? `Deactivate ${user.name}? Existing business history will be preserved.`
      : `Reactivate ${user.name}?`,
  )
  if (!confirmed) return

  try {
    await authStore.api(`/users/${user.id}/status`, {
      method: 'PATCH',
      body: { isActive: !user.isActive },
    })
    await loadPage()
  } catch {
    errorMessage.value = `We could not ${action} this account. Please try again.`
  }
}

onMounted(loadPage)
</script>

<template>
  <WorkspaceLayout>
    <template #context>
      <strong>Administration</strong>
    </template>
    <AdministrationTabs />

    <main class="user-list-page">
      <section class="user-toolbar" aria-label="User filters">
        <a-input v-model:value="searchQuery" class="user-search" placeholder="Search user code, name, email..." allow-clear>
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select v-model:value="departmentFilter" class="toolbar-select">
          <a-select-option value="all">Department</a-select-option>
          <a-select-option v-for="department in departments" :key="department.id" :value="String(department.id)">
            {{ department.name }}
          </a-select-option>
        </a-select>
        <a-select v-model:value="roleFilter" class="toolbar-select">
          <a-select-option value="all">Role</a-select-option>
          <a-select-option v-for="role in roles" :key="role.id" :value="String(role.id)">{{ role.name }}</a-select-option>
        </a-select>
        <a-select v-model:value="statusFilter" class="toolbar-select">
          <a-select-option value="all">All statuses</a-select-option>
          <a-select-option value="active">Active</a-select-option>
          <a-select-option value="inactive">Inactive</a-select-option>
        </a-select>
        <a-button v-if="canCreate" type="primary" class="primary-action" @click="router.push({ name: 'user-create' })">
          <template #icon><PlusOutlined /></template>Add User
        </a-button>
      </section>

      <a-alert v-if="errorMessage" class="page-alert" type="error" show-icon :message="errorMessage">
        <template #action><a-button size="small" @click="loadPage">Retry</a-button></template>
      </a-alert>

      <section class="user-table-panel">
        <div class="bigin-table-scroll-wrapper"><a-table
          :data-source="filteredUsers"
          :loading="loading"
          row-key="id"
          :pagination="{ pageSize: 8, showSizeChanger: false, position: ['bottomRight'] }"
          :locale="{ emptyText: 'No users match the current filters.' }"
          :scroll="{ x: 'max-content' }"
        >
          <a-table-column title="No." key="number" :width="64">
            <template #default="{ index }">{{ index + 1 }}</template>
          </a-table-column>
          <a-table-column title="Full Name" key="identity" :width="250">
            <template #default="{ record }">
              <button class="identity-link bigin-touch-target" type="button" @click="router.push({ name: 'user-detail', params: { id: record.id } })">
                <a-avatar :size="36" :src="record.avatarUrl">{{ initials(record.name) }}</a-avatar>
                <span><strong>{{ record.name }}</strong><small>{{ record.userCode || 'User code unavailable' }}</small></span>
              </button>
            </template>
          </a-table-column>
          <a-table-column title="Email" data-index="email" key="email" />
          <a-table-column title="Phone Number" data-index="phone" key="phone" :width="150" />
          <a-table-column title="Department" key="department" :width="160">
            <template #default="{ record }">{{ record.department?.name || 'Unassigned' }}</template>
          </a-table-column>
          <a-table-column title="Role" key="roles" :width="190">
            <template #default="{ record }">
              <a-space :size="4" wrap>
                <a-tag v-for="role in record.roles" :key="role.id" :color="role.name === 'admin' ? 'volcano' : role.name.includes('manager') ? 'orange' : 'default'">
                  {{ role.name.replaceAll('_', ' ') }}
                </a-tag>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column title="Status" key="status" :width="110">
            <template #default="{ record }"><StatusTag :status="record.isActive ? 'ACTIVE' : 'INACTIVE'" /></template>
          </a-table-column>
          <a-table-column title="Actions" key="actions" align="right" :width="160">
            <template #default="{ record }">
              <a-space>
                  <a-button class="bigin-touch-target" type="link" size="small" @click="router.push({ name: 'user-detail', params: { id: record.id } })">View</a-button>
                <a-dropdown v-if="canUpdate || canManageStatus">
                  <a-button class="bigin-touch-target" type="text" size="small" aria-label="More user actions">•••</a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item v-if="canUpdate" @click="router.push({ name: 'user-edit', params: { id: record.id } })">Edit user</a-menu-item>
                      <a-menu-item v-if="canManageStatus" :danger="record.isActive" @click="changeStatus(record)">
                        {{ record.isActive ? 'Deactivate' : 'Reactivate' }}
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </a-space>
            </template>
          </a-table-column>
        </a-table></div>
      </section>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.user-list-page { padding: 24px 28px; }
.screen-code { color: var(--bigin-text-tertiary); }.context-divider { color: var(--bigin-text-disabled); }
.user-toolbar { align-items: center; background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; display: flex; gap: 12px; margin-bottom: 16px; padding: 16px; }
.user-search { width: min(360px, 100%); }.toolbar-select { max-width: 100%; width: 150px; }.primary-action { background: var(--bigin-color-primary); margin-left: auto; }
.page-alert { margin-bottom: 16px; }.user-table-panel { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; overflow: hidden; }
.identity-link { align-items: center; background: transparent; border: 0; color: inherit; cursor: pointer; display: flex; gap: 10px; padding: 0; text-align: left; }
.identity-link span { display: grid; }.identity-link small { color: var(--bigin-text-tertiary); font-size: 11px; margin-top: 2px; }
:deep(.ant-table-thead > tr > th) { background: var(--bigin-surface-subtle); font-size: 12px; text-transform: uppercase; }
:deep(.ant-pagination-item-active) { border-color: var(--bigin-color-primary); }:deep(.ant-pagination-item-active a) { color: var(--bigin-color-primary); }
@media (max-width: 900px) { .user-toolbar { align-items: stretch; flex-wrap: wrap; }.primary-action { margin-left: 0; }.user-list-page { padding: 16px; } }
@media (max-width: 575px) { .user-list-page { padding: 12px; }.user-toolbar { flex-direction: column; }.user-search, .toolbar-select, .primary-action { width: 100%; } }
</style>
