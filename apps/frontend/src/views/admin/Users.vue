<script setup>
import { computed, onMounted, ref } from 'vue'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'

import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
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
const canDeactivate = computed(() => authStore.hasPermission('user.delete'))

const filteredUsers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return users.value.filter((user) => {
    const matchesQuery = !query || [user.name, user.email, user.phone]
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
    if (user.isActive) await authStore.api(`/users/${user.id}`, { method: 'DELETE' })
    else await authStore.api(`/users/${user.id}/activate`, { method: 'PATCH' })
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
      <strong>User List</strong>
    </template>

    <main class="user-list-page">
      <section class="user-toolbar" aria-label="User filters">
        <a-input v-model:value="searchQuery" class="user-search" placeholder="Search name, email, phone..." allow-clear>
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
        <a-table
          :data-source="filteredUsers"
          :loading="loading"
          row-key="id"
          :pagination="{ pageSize: 8, showSizeChanger: false, position: ['bottomRight'] }"
          :locale="{ emptyText: 'No users match the current filters.' }"
        >
          <a-table-column title="No." key="number" :width="64">
            <template #default="{ index }">{{ index + 1 }}</template>
          </a-table-column>
          <a-table-column title="Full Name" key="identity" :width="250">
            <template #default="{ record }">
              <button class="identity-link" type="button" @click="router.push({ name: 'user-detail', params: { id: record.id } })">
                <a-avatar :size="36" :src="record.avatarUrl">{{ initials(record.name) }}</a-avatar>
                <span><strong>{{ record.name }}</strong><small>ID: EMP-{{ String(record.id).padStart(4, '0') }}</small></span>
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
                <a-button type="link" size="small" @click="router.push({ name: 'user-detail', params: { id: record.id } })">View</a-button>
                <a-dropdown v-if="canUpdate || canDeactivate">
                  <a-button type="text" size="small" aria-label="More user actions">•••</a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item v-if="canUpdate" @click="router.push({ name: 'user-edit', params: { id: record.id } })">Edit user</a-menu-item>
                      <a-menu-item v-if="(record.isActive && canDeactivate) || (!record.isActive && canUpdate)" :danger="record.isActive" @click="changeStatus(record)">
                        {{ record.isActive ? 'Deactivate' : 'Reactivate' }}
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </a-space>
            </template>
          </a-table-column>
        </a-table>
      </section>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.user-list-page { padding: 24px 28px; }
.screen-code { color: #8c8c8c; }.context-divider { color: #bfbfbf; }
.user-toolbar { align-items: center; background: #fff; border: 1px solid #f0f0f0; border-radius: 8px; display: flex; gap: 12px; margin-bottom: 16px; padding: 16px; }
.user-search { width: min(360px, 100%); }.toolbar-select { min-width: 150px; }.primary-action { background: #ff6b00; margin-left: auto; }
.page-alert { margin-bottom: 16px; }.user-table-panel { background: #fff; border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden; }
.identity-link { align-items: center; background: transparent; border: 0; color: inherit; cursor: pointer; display: flex; gap: 10px; padding: 0; text-align: left; }
.identity-link span { display: grid; }.identity-link small { color: #8c8c8c; font-size: 11px; margin-top: 2px; }
:deep(.ant-table-thead > tr > th) { background: #fafafa; font-size: 12px; text-transform: uppercase; }
:deep(.ant-pagination-item-active) { border-color: #ff6b00; }:deep(.ant-pagination-item-active a) { color: #ff6b00; }
@media (max-width: 900px) { .user-toolbar { align-items: stretch; flex-wrap: wrap; }.primary-action { margin-left: 0; }.user-list-page { padding: 16px; } }
</style>
