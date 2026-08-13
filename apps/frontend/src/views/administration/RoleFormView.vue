<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { SaveOutlined } from '@ant-design/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import AdministrationTabs from '../../components/administration/AdministrationTabs.vue'
import PermissionSelector from '../../components/administration/PermissionSelector.vue'
import { createRole, getRole, listPermissions, replaceRolePermissions, updateRoleName } from '../../services/rbac.service'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const isCreate = computed(() => route.name === 'role-create')
const canUpdate = computed(() => isCreate.value ? authStore.hasPermission('role.create') : authStore.hasPermission('role.update'))
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const permissions = ref([])
const originalName = ref('')
const form = reactive({ name: '', permissionIds: [], isSystem: false, userCount: 0 })

async function loadPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [permissionData, role] = await Promise.all([
      listPermissions(authStore.api),
      isCreate.value ? Promise.resolve(null) : getRole(authStore.api, route.params.id),
    ])
    permissions.value = permissionData
    if (role) {
      Object.assign(form, { name: role.name, permissionIds: role.permissions.map((item) => item.id), isSystem: role.isSystem, userCount: role.userCount })
      originalName.value = role.name
    }
  } catch (error) {
    errorMessage.value = error.status === 404 ? 'This role no longer exists.' : 'We could not load the role configuration.'
  } finally { loading.value = false }
}

async function save() {
  errorMessage.value = ''
  if (!form.name.trim()) return (errorMessage.value = 'Role name is required.')
  if (!form.permissionIds.length) return (errorMessage.value = 'Select at least one permission.')
  saving.value = true
  try {
    if (isCreate.value) {
      const role = await createRole(authStore.api, { name: form.name.trim(), permissionIds: form.permissionIds })
      return router.replace({ name: 'role-detail', params: { id: role.id } })
    }
    if (!form.isSystem && form.name.trim() !== originalName.value) {
      await updateRoleName(authStore.api, route.params.id, form.name.trim())
    }
    await replaceRolePermissions(authStore.api, route.params.id, form.permissionIds)
    await loadPage()
  } catch (error) {
    if (error.status === 409) errorMessage.value = error.message
    else if (error.status === 400) errorMessage.value = 'Select a valid role name and at least one existing permission.'
    else errorMessage.value = 'We could not save this role. No partial permission set was kept.'
  } finally { saving.value = false }
}
onMounted(loadPage)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Administration</strong></template>
    <AdministrationTabs />
    <main class="role-page">
      <a-skeleton v-if="loading" active :paragraph="{ rows: 12 }" />
      <template v-else>
        <header class="page-heading"><div><a-breadcrumb><a-breadcrumb-item>Administration</a-breadcrumb-item><a-breadcrumb-item>Roles</a-breadcrumb-item><a-breadcrumb-item>{{ isCreate ? 'Create' : form.name }}</a-breadcrumb-item></a-breadcrumb><h1>{{ isCreate ? 'Create Role' : 'Role Details' }}</h1><p>Permissions become effective for assigned users on their next login or token refresh.</p></div></header>
        <a-alert v-if="errorMessage" class="alert" type="error" show-icon :message="errorMessage" />
        <section class="role-card">
          <div class="role-fields">
            <label><span>Role name <b>*</b></span><a-input v-model:value="form.name" :disabled="form.isSystem || !canUpdate" :maxlength="30" /></label>
            <div v-if="!isCreate" class="role-meta"><a-tag :color="form.isSystem ? 'blue' : 'default'">{{ form.isSystem ? 'System role' : 'Custom role' }}</a-tag><span>{{ form.userCount }} assigned users</span></div>
          </div>
          <a-alert v-if="form.isSystem" type="info" show-icon message="System role names are protected, but their permission set can be updated." />
          <div class="permission-heading"><div><h2>Permissions</h2><p>Use the descriptions to understand the capability before assigning it.</p></div><strong>{{ form.permissionIds.length }} selected</strong></div>
          <PermissionSelector v-model="form.permissionIds" :permissions="permissions" :disabled="!canUpdate" />
          <footer class="bigin-responsive-footer"><a-button class="bigin-touch-target" @click="router.push({ name: 'roles' })">Cancel</a-button><a-button v-if="canUpdate" type="primary" class="primary-action bigin-touch-target" :loading="saving" @click="save"><template #icon><SaveOutlined /></template>{{ isCreate ? 'Create Role' : 'Save Changes' }}</a-button></footer>
        </section>
      </template>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.role-page { margin: 0 auto; max-width: 1180px; min-width: 0; padding: 24px 28px 48px; }.page-heading h1 { font-size: 22px; margin: 10px 0 5px; }.page-heading p,.permission-heading p { color: var(--bigin-text-muted); margin: 0; }.alert { margin: 16px 0; }
.role-card { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; margin-top: 18px; padding: 24px; }.role-fields { align-items: flex-end; display: flex; gap: 24px; margin-bottom: 16px; }.role-fields label { display: grid; flex: 1; gap: 7px; max-width: 480px; }.role-fields label span { font-size: 13px; font-weight: 600; }.role-fields b { color: var(--bigin-color-error); }.role-meta { color: var(--bigin-text-muted); display: flex; gap: 12px; padding-bottom: 5px; }
.permission-heading { align-items: flex-end; display: flex; justify-content: space-between; margin: 28px 0 14px; }.permission-heading h2 { font-size: 16px; margin: 0 0 4px; }.role-card footer { border-top: 1px solid var(--bigin-border-secondary); display: flex; gap: 10px; justify-content: flex-end; margin: 24px -24px -24px; padding: 14px 24px; }.primary-action { background: var(--bigin-color-primary); }
@media (max-width: 767px) { .role-page { padding: 16px; }.role-fields,.permission-heading { align-items: flex-start; flex-direction: column; }.role-fields label { max-width: none; width: 100%; } }
@media (max-width: 575px) { .role-page { padding: 12px; }.role-card { padding: 16px; }.role-card footer { align-items: stretch; flex-direction: column; margin-inline: -16px; padding-inline: 16px; }.role-card footer :deep(.ant-btn) { width: 100%; } }
</style>
