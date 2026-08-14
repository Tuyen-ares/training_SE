<script setup>
import { computed, onMounted, ref } from 'vue'
import { EditOutlined, MailOutlined, PhoneOutlined, PoweroffOutlined } from '@ant-design/icons-vue'
import { useRoute, useRouter } from 'vue-router'

import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import AdministrationTabs from '../../components/administration/AdministrationTabs.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import { listRoles, replaceUserRoles } from '../../services/rbac.service'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const user = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const mutating = ref(false)
const roleModalOpen = ref(false)
const roleOptions = ref([])
const selectedRoleIds = ref([])
const canUpdate = computed(() => authStore.hasPermission('user.update'))
const canManageStatus = computed(() => authStore.hasPermission('user.manage_status'))
const canAssignRoles = computed(() => authStore.hasPermission('role.assign'))

const initials = computed(() => user.value?.name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase() || 'U')

async function loadUser() {
  loading.value = true
  errorMessage.value = ''
  try {
    user.value = await authStore.api(`/users/${route.params.id}`)
    selectedRoleIds.value = user.value.roles.map((role) => role.id)
    if (canAssignRoles.value && !roleOptions.value.length) roleOptions.value = await listRoles(authStore.api)
  } catch (error) {
    errorMessage.value = error.status === 404 ? 'This user no longer exists.' : 'We could not load this user. Please try again.'
  } finally {
    loading.value = false
  }
}

async function saveRoles() {
  if (!selectedRoleIds.value.length) {
    errorMessage.value = 'Every user must keep at least one role.'
    return
  }
  mutating.value = true
  try {
    await replaceUserRoles(authStore.api, user.value.id, selectedRoleIds.value)
    roleModalOpen.value = false
    await loadUser()
  } catch (error) {
    errorMessage.value = error.message || 'We could not update this role set.'
  } finally { mutating.value = false }
}

async function changeStatus() {
  const active = user.value.isActive
  if (!window.confirm(active ? `Deactivate ${user.value.name}? Existing business history will be preserved.` : `Reactivate ${user.value.name}?`)) return
  mutating.value = true
  try {
    await authStore.api(`/users/${user.value.id}/status`, {
      method: 'PATCH',
      body: { isActive: !active },
    })
    await loadUser()
  } catch {
    errorMessage.value = `We could not ${active ? 'deactivate' : 'reactivate'} this account.`
  } finally {
    mutating.value = false
  }
}

onMounted(loadUser)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Administration</strong></template>
    <AdministrationTabs />
    <main class="detail-page bigin-page-container">
      <a-skeleton v-if="loading" active :paragraph="{ rows: 10 }" />
      <a-result v-else-if="errorMessage" status="error" title="Unable to open user" :sub-title="errorMessage">
        <template #extra><a-button @click="loadUser">Try Again</a-button><a-button type="primary" @click="router.push({ name: 'users' })">Back to User List</a-button></template>
      </a-result>
      <template v-else-if="user">
        <div class="detail-heading">
          <div><a-breadcrumb><a-breadcrumb-item>Admin</a-breadcrumb-item><a-breadcrumb-item>Users</a-breadcrumb-item><a-breadcrumb-item>User Details</a-breadcrumb-item></a-breadcrumb><h1>User Details</h1></div>
          <a-space class="bigin-mobile-action-stack">
            <a-button class="bigin-touch-target" v-if="canManageStatus" :danger="user.isActive" :loading="mutating" @click="changeStatus">
              <template #icon><PoweroffOutlined /></template>{{ user.isActive ? 'Deactivate' : 'Reactivate' }}
            </a-button>
            <a-button v-if="canUpdate" class="primary-action bigin-touch-target" type="primary" @click="router.push({ name: 'user-edit', params: { id: user.id } })"><template #icon><EditOutlined /></template>Edit</a-button>
          </a-space>
        </div>

        <div class="detail-grid">
          <aside class="profile-card">
            <a-avatar :size="92" :src="user.avatarUrl">{{ initials }}</a-avatar>
            <h2>{{ user.name }}</h2><p>{{ user.userCode || 'User code unavailable' }}</p>
            <StatusTag :status="user.isActive ? 'ACTIVE' : 'INACTIVE'" />
            <a-divider />
            <dl>
              <dt>Department</dt><dd>{{ user.department?.name || 'Unassigned' }}</dd>
              <dt>Contact</dt><dd><MailOutlined /> {{ user.email }}</dd><dd><PhoneOutlined /> {{ user.phone }}</dd>
            </dl>
          </aside>

          <section class="detail-content">
            <div class="content-card">
              <div class="section-title"><span class="section-icon">♙</span><h2>Assigned Roles</h2><a-button v-if="canAssignRoles" class="manage-roles" type="link" @click="roleModalOpen = true">Manage roles</a-button></div>
              <p class="section-copy">Access is determined by the effective permissions of all assigned roles.</p>
              <a-space wrap>
                <a-tag v-for="role in user.roles" :key="role.id" color="orange" class="role-tag">{{ role.name.replaceAll('_', ' ') }}</a-tag>
                <span v-if="!user.roles.length" class="muted">No roles assigned</span>
              </a-space>
            </div>
            <div class="content-card">
              <div class="section-title"><h2>Account Information</h2></div>
              <a-descriptions bordered :column="{ xs: 1, sm: 2 }">
                <a-descriptions-item label="Full name">{{ user.name }}</a-descriptions-item>
                <a-descriptions-item label="Department">{{ user.department?.name || 'Unassigned' }}</a-descriptions-item>
                <a-descriptions-item label="Email">{{ user.email }}</a-descriptions-item>
                <a-descriptions-item label="Phone number">{{ user.phone }}</a-descriptions-item>
                <a-descriptions-item label="Account status" :span="2"><StatusTag :status="user.isActive ? 'ACTIVE' : 'INACTIVE'" /></a-descriptions-item>
              </a-descriptions>
            </div>
          </section>
        </div>
      </template>
    </main>
    <a-modal v-model:open="roleModalOpen" wrap-class-name="bigin-modal-content" title="Assign roles" ok-text="Save role set" :confirm-loading="mutating" @ok="saveRoles">
      <p class="section-copy">Select one or more existing roles. Authorization uses the union of their permissions.</p>
      <a-checkbox-group v-model:value="selectedRoleIds" class="role-checkboxes">
        <a-checkbox v-for="role in roleOptions" :key="role.id" :value="role.id">{{ role.name }}</a-checkbox>
      </a-checkbox-group>
    </a-modal>
  </WorkspaceLayout>
</template>

<style scoped>
.detail-page { min-width: 0; padding: 22px 28px 40px; }.muted { color: var(--bigin-text-tertiary); }.divider { color: var(--bigin-text-disabled); }
.detail-heading { align-items: flex-end; display: flex; justify-content: space-between; margin-bottom: 18px; }.detail-heading h1 { font-size: 20px; margin: 10px 0 0; }.primary-action { background: var(--bigin-color-primary); }
.detail-grid { display: grid; gap: 20px; grid-template-columns: 300px minmax(0, 1fr); }.profile-card,.content-card { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; padding: 24px; }
.profile-card { align-items: center; display: flex; flex-direction: column; }.profile-card h2 { font-size: 20px; margin: 16px 0 4px; }.profile-card p { color: var(--bigin-text-tertiary); margin: 0 0 10px; }.profile-card dl { align-self: stretch; margin: 0; }.profile-card dt { color: var(--bigin-text-tertiary); font-size: 12px; margin-top: 16px; text-transform: uppercase; }.profile-card dd { margin: 7px 0 0; }
.detail-content { display: grid; gap: 20px; }.section-title { align-items: center; display: flex; gap: 8px; }.section-title h2 { font-size: 16px; margin: 0; }.section-icon { color: var(--bigin-color-primary); }.section-copy { color: var(--bigin-text-tertiary); margin: 8px 0 18px; }.role-tag { font-size: 13px; padding: 5px 10px; text-transform: capitalize; }
.manage-roles { margin-left: auto; }.role-checkboxes { display: grid; gap: 10px; }
@media (max-width: 820px) { .detail-grid { grid-template-columns: 1fr; }.detail-heading { align-items: flex-start; gap: 16px; }.detail-page { padding: 16px; } }
@media (max-width: 767px) { .detail-heading { flex-direction: column; }.detail-heading .bigin-mobile-action-stack { width: 100%; }.detail-heading .bigin-mobile-action-stack :deep(.ant-btn) { flex: 1 1 auto; } }
@media (max-width: 575px) { .detail-page { padding: 12px; }.detail-heading .bigin-mobile-action-stack { align-items: stretch; flex-direction: column; }.detail-heading .bigin-mobile-action-stack :deep(.ant-btn) { width: 100%; } }
</style>
