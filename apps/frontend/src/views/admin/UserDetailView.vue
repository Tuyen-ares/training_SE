<script setup>
import { computed, onMounted, ref } from 'vue'
import { DeleteOutlined, EditOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons-vue'
import { useRoute, useRouter } from 'vue-router'

import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const user = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const mutating = ref(false)
const canUpdate = computed(() => authStore.hasPermission('user.update'))
const canDeactivate = computed(() => authStore.hasPermission('user.delete'))

const initials = computed(() => user.value?.name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase() || 'U')

async function loadUser() {
  loading.value = true
  errorMessage.value = ''
  try {
    user.value = await authStore.api(`/users/${route.params.id}`)
  } catch (error) {
    errorMessage.value = error.status === 404 ? 'This user no longer exists.' : 'We could not load this user. Please try again.'
  } finally {
    loading.value = false
  }
}

async function changeStatus() {
  const active = user.value.isActive
  if (!window.confirm(active ? `Deactivate ${user.value.name}? Existing business history will be preserved.` : `Reactivate ${user.value.name}?`)) return
  mutating.value = true
  try {
    if (active) await authStore.api(`/users/${user.value.id}`, { method: 'DELETE' })
    else await authStore.api(`/users/${user.value.id}/activate`, { method: 'PATCH' })
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
    <template #context><strong>User Details</strong></template>
    <main class="detail-page">
      <a-skeleton v-if="loading" active :paragraph="{ rows: 10 }" />
      <a-result v-else-if="errorMessage" status="error" title="Unable to open user" :sub-title="errorMessage">
        <template #extra><a-button @click="loadUser">Try Again</a-button><a-button type="primary" @click="router.push({ name: 'users' })">Back to User List</a-button></template>
      </a-result>
      <template v-else-if="user">
        <div class="detail-heading">
          <div><a-breadcrumb><a-breadcrumb-item>Admin</a-breadcrumb-item><a-breadcrumb-item>Users</a-breadcrumb-item><a-breadcrumb-item>User Details</a-breadcrumb-item></a-breadcrumb><h1>User Details</h1></div>
          <a-space>
            <a-button v-if="(user.isActive && canDeactivate) || (!user.isActive && canUpdate)" :danger="user.isActive" :loading="mutating" @click="changeStatus">
              <template #icon><DeleteOutlined v-if="user.isActive" /></template>{{ user.isActive ? 'Deactivate' : 'Reactivate' }}
            </a-button>
            <a-button v-if="canUpdate" type="primary" class="primary-action" @click="router.push({ name: 'user-edit', params: { id: user.id } })"><template #icon><EditOutlined /></template>Edit</a-button>
          </a-space>
        </div>

        <div class="detail-grid">
          <aside class="profile-card">
            <a-avatar :size="92" :src="user.avatarUrl">{{ initials }}</a-avatar>
            <h2>{{ user.name }}</h2><p>ID: EMP-{{ String(user.id).padStart(4, '0') }}</p>
            <a-tag :color="user.isActive ? 'green' : 'default'">{{ user.isActive ? 'Active' : 'Inactive' }}</a-tag>
            <a-divider />
            <dl>
              <dt>Organization</dt><dd>{{ user.department?.name || 'Unassigned' }}</dd>
              <dt>Contact</dt><dd><MailOutlined /> {{ user.email }}</dd><dd><PhoneOutlined /> {{ user.phone }}</dd>
            </dl>
          </aside>

          <section class="detail-content">
            <div class="content-card">
              <div class="section-title"><span class="section-icon">♙</span><h2>Assigned Roles</h2></div>
              <p class="section-copy">Access is determined by the effective permissions of all assigned roles.</p>
              <a-space wrap>
                <a-tag v-for="role in user.roles" :key="role.id" color="orange" class="role-tag">{{ role.name.replaceAll('_', ' ') }}</a-tag>
                <span v-if="!user.roles.length" class="muted">No roles assigned</span>
              </a-space>
            </div>
            <div class="content-card">
              <div class="section-title"><h2>Account Information</h2></div>
              <a-descriptions bordered :column="2">
                <a-descriptions-item label="Full name">{{ user.name }}</a-descriptions-item>
                <a-descriptions-item label="Department">{{ user.department?.name || 'Unassigned' }}</a-descriptions-item>
                <a-descriptions-item label="Email">{{ user.email }}</a-descriptions-item>
                <a-descriptions-item label="Phone number">{{ user.phone }}</a-descriptions-item>
                <a-descriptions-item label="Account status" :span="2"><a-badge :status="user.isActive ? 'success' : 'default'" :text="user.isActive ? 'Active' : 'Inactive'" /></a-descriptions-item>
              </a-descriptions>
            </div>
          </section>
        </div>
      </template>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.detail-page { padding: 22px 28px 40px; }.muted { color: #8c8c8c; }.divider { color: #bfbfbf; }
.detail-heading { align-items: flex-end; display: flex; justify-content: space-between; margin-bottom: 18px; }.detail-heading h1 { font-size: 20px; margin: 10px 0 0; }.primary-action { background: #ff6b00; }
.detail-grid { display: grid; gap: 20px; grid-template-columns: 300px minmax(0, 1fr); }.profile-card,.content-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 8px; padding: 24px; }
.profile-card { align-items: center; display: flex; flex-direction: column; }.profile-card h2 { font-size: 20px; margin: 16px 0 4px; }.profile-card p { color: #8c8c8c; margin: 0 0 10px; }.profile-card dl { align-self: stretch; margin: 0; }.profile-card dt { color: #8c8c8c; font-size: 12px; margin-top: 16px; text-transform: uppercase; }.profile-card dd { margin: 7px 0 0; }
.detail-content { display: grid; gap: 20px; }.section-title { align-items: center; display: flex; gap: 8px; }.section-title h2 { font-size: 16px; margin: 0; }.section-icon { color: #ff6b00; }.section-copy { color: #8c8c8c; margin: 8px 0 18px; }.role-tag { font-size: 13px; padding: 5px 10px; text-transform: capitalize; }
@media (max-width: 820px) { .detail-grid { grid-template-columns: 1fr; }.detail-heading { align-items: flex-start; gap: 16px; }.detail-page { padding: 16px; } }
</style>
