<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { EyeInvisibleOutlined, EyeOutlined, SaveOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'

import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import AdministrationTabs from '../../components/administration/AdministrationTabs.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const isEdit = computed(() => route.name === 'user-edit')
const screenTitle = computed(() => isEdit.value ? 'Edit User' : 'Add New User')
const departments = ref([])
const roles = ref([])
const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const changingStatus = ref(false)
const form = reactive({ name: '', email: '', phone: '', departmentId: undefined, avatarUrl: '', password: '', confirmPassword: '', roleIds: [], isActive: true })

const roleOptions = computed(() => roles.value.map((role) => ({
  value: role.id,
  label: role.name.replaceAll('_', ' '),
})))
const canToggleStatus = computed(() => form.isActive
  ? authStore.hasPermission('user.delete')
  : authStore.hasPermission('user.update'))

async function loadPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [departmentData, roleData, userData] = await Promise.all([
      authStore.api('/departments'),
      authStore.hasPermission('role.assign') ? authStore.api('/rbac/roles') : Promise.resolve([]),
      isEdit.value ? authStore.api(`/users/${route.params.id}`) : Promise.resolve(null),
    ])
    departments.value = departmentData
    roles.value = roleData
    if (userData) Object.assign(form, { name: userData.name, email: userData.email, phone: userData.phone, departmentId: userData.departmentId, avatarUrl: userData.avatarUrl || '', password: '', confirmPassword: '', roleIds: userData.roles.map((role) => role.id), isActive: userData.isActive })
  } catch {
    errorMessage.value = 'We could not load the information required for this form.'
  } finally {
    loading.value = false
  }
}

async function submit() {
  errorMessage.value = ''
  if (form.password !== form.confirmPassword) {
    errorMessage.value = 'The password confirmation does not match.'
    return
  }
  if (!isEdit.value && !form.password) {
    errorMessage.value = 'Password is required for a new user.'
    return
  }
  if (isEdit.value && authStore.hasPermission('role.assign') && !form.roleIds.length) {
    errorMessage.value = 'Every user must keep at least one role.'
    return
  }
  submitting.value = true
  try {
    const payload = {
      name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), departmentId: Number(form.departmentId),
      avatarUrl: form.avatarUrl.trim() || null,
      ...(form.password ? { password: form.password } : {}),
      ...(authStore.hasPermission('role.assign') && (isEdit.value || form.roleIds.length) ? { roleIds: [...form.roleIds] } : {}),
    }
    const saved = await authStore.api(isEdit.value ? `/users/${route.params.id}` : '/users', {
      method: isEdit.value ? 'PATCH' : 'POST', body: payload,
    })
    router.push({ name: 'user-detail', params: { id: saved.id } })
  } catch (error) {
    if (error.status === 409) errorMessage.value = error.message || 'Email or phone number is already in use.'
    else if (error.status === 400) errorMessage.value = 'Review the required fields, department, role selection, and URL format.'
    else if (error.status === 403) errorMessage.value = 'You do not have permission to apply the selected roles.'
    else errorMessage.value = 'We could not save this user. Please try again.'
  } finally {
    submitting.value = false
  }
}

function changeStatus(nextIsActive) {
  if (!isEdit.value || changingStatus.value || !canToggleStatus.value) return
  if (!nextIsActive) {
    Modal.confirm({
      title: 'Deactivate this user?',
      content: 'The user will not be able to sign in. Existing business history will be preserved.',
      okText: 'Deactivate',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => updateStatus(nextIsActive),
    })
    return
  }
  updateStatus(nextIsActive)
}

async function updateStatus(nextIsActive) {
  changingStatus.value = true
  try {
    await authStore.api(`/users/${route.params.id}/status`, {
      method: 'PATCH',
      body: { isActive: nextIsActive },
    })
    form.isActive = nextIsActive
    message.success(nextIsActive ? 'User activated successfully.' : 'User deactivated successfully.')
  } catch (error) {
    message.error(error.message || 'The user status could not be changed.')
  } finally {
    changingStatus.value = false
  }
}

onMounted(loadPage)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Administration</strong></template>
    <AdministrationTabs />
    <main class="form-page">
      <div class="form-heading"><div><a-breadcrumb v-if="isEdit"><a-breadcrumb-item>Admin</a-breadcrumb-item><a-breadcrumb-item>Employee</a-breadcrumb-item><a-breadcrumb-item>Edit</a-breadcrumb-item></a-breadcrumb><h1>{{ screenTitle }}</h1><p>{{ isEdit ? 'Update information and assigned roles for this employee.' : 'Create an account and assign system access permissions.' }}</p></div></div>
      <a-skeleton v-if="loading" active :paragraph="{ rows: 10 }" />
      <a-alert v-else-if="errorMessage" class="form-alert" type="error" show-icon :message="errorMessage" />
      <form v-if="!loading" class="user-form-card" @submit.prevent="submit">
        <section>
          <h2>{{ isEdit ? 'Basic Information' : 'Personal Information' }}</h2>
          <div class="field-grid">
            <label class="full-width"><span>Full Name <b>*</b></span><a-input v-model:value="form.name" required :maxlength="30" placeholder="Enter full name" /></label>
            <label><span>Email <b>*</b></span><a-input v-model:value="form.email" required type="email" :maxlength="40" placeholder="mail@company.com" /></label>
            <label><span>Phone Number <b>*</b></span><a-input v-model:value="form.phone" required :maxlength="10" placeholder="10 digits" /></label>
            <label><span>Department <b>*</b></span><a-select v-model:value="form.departmentId" class="full-control" placeholder="Select department"><a-select-option v-for="department in departments" :key="department.id" :value="department.id">{{ department.name }}</a-select-option></a-select></label>
            <label><span>Avatar URL</span><a-input v-model:value="form.avatarUrl" type="url" :maxlength="500" placeholder="https://example.com/avatar.jpg" /></label>
          </div>
          <a-divider />
          <h2>{{ isEdit ? 'Change Password' : 'Security' }} <small v-if="isEdit">Optional</small></h2>
          <p v-if="isEdit" class="helper">Leave blank if you do not want to change the password.</p>
          <div class="field-grid">
            <label><span>{{ isEdit ? 'New Password' : 'Password' }} <b v-if="!isEdit">*</b></span><a-input v-model:value="form.password" :required="!isEdit" :type="showPassword ? 'text' : 'password'" :maxlength="72" placeholder="Minimum 6 characters"><template #suffix><button type="button" class="visibility-button" @click="showPassword = !showPassword"><EyeOutlined v-if="showPassword" /><EyeInvisibleOutlined v-else /></button></template></a-input></label>
            <label><span>Confirm {{ isEdit ? 'New ' : '' }}Password <b v-if="!isEdit">*</b></span><a-input v-model:value="form.confirmPassword" :required="!isEdit" :type="showConfirmPassword ? 'text' : 'password'" :maxlength="72" placeholder="Re-enter password"><template #suffix><button type="button" class="visibility-button" @click="showConfirmPassword = !showConfirmPassword"><EyeOutlined v-if="showConfirmPassword" /><EyeInvisibleOutlined v-else /></button></template></a-input></label>
          </div>
        </section>

        <aside>
          <h2>{{ isEdit ? 'Role Assignment' : 'System Roles' }}</h2><p class="helper">Select one or more existing roles for this user.</p>
          <div v-if="authStore.hasPermission('role.assign')" class="role-picker">
            <a-select
              v-model:value="form.roleIds"
              class="role-select"
              mode="multiple"
              show-search
              option-filter-prop="label"
              :options="roleOptions"
              :max-tag-count="'responsive'"
              :list-height="256"
              placeholder="Select one or more roles"
            />
            <small class="role-count">{{ form.roleIds.length }} role{{ form.roleIds.length === 1 ? '' : 's' }} selected</small>
          </div>
          <a-alert v-else type="info" message="The default employee role will be assigned." />
          <section v-if="isEdit" class="account-status-section">
            <a-divider />
            <div class="account-status-heading">
              <div>
                <h2>Account Status</h2>
                <p class="helper">Control whether this user can sign in.</p>
              </div>
              <StatusTag :status="form.isActive ? 'ACTIVE' : 'INACTIVE'" />
            </div>
            <div class="account-status-control">
              <span>{{ form.isActive ? 'Active' : 'Inactive' }}</span>
              <a-switch
                :checked="form.isActive"
                :disabled="!canToggleStatus"
                :loading="changingStatus"
                checked-children="Active"
                un-checked-children="Inactive"
                @change="changeStatus"
              />
            </div>
            <small v-if="!canToggleStatus" class="status-permission-help">You do not have permission to change this status.</small>
          </section>
        </aside>

        <footer class="bigin-responsive-footer"><a-button class="bigin-touch-target" @click="router.back()">Cancel</a-button><a-button type="primary" html-type="submit" class="primary-action bigin-touch-target" :loading="submitting"><template #icon><SaveOutlined /></template>{{ isEdit ? 'Save Changes' : 'Save User' }}</a-button></footer>
      </form>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.form-page { margin: 0 auto; max-width: 1160px; padding: 24px 28px 48px; }.muted,.helper { color: var(--bigin-text-tertiary); }.divider { color: var(--bigin-text-disabled); }.form-heading h1 { font-size: 20px; margin: 10px 0 4px; }.form-heading p { color: var(--bigin-text-tertiary); margin: 0 0 18px; }.form-alert { margin-bottom: 16px; }
.user-form-card { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(280px, .8fr); overflow: hidden; }.user-form-card section,.user-form-card aside { padding: 24px; }.user-form-card aside { border-left: 1px solid var(--bigin-border-secondary); }.user-form-card h2 { font-size: 15px; margin: 0 0 16px; }.user-form-card h2 small { color: var(--bigin-text-tertiary); float: right; font-size: 11px; font-weight: 400; }
.field-grid { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }.field-grid label { display: grid; gap: 7px; }.field-grid label > span { font-size: 13px; font-weight: 600; }.field-grid b { color: var(--bigin-color-error); }.full-width { grid-column: 1 / -1; }.full-control { width: 100%; }.helper { font-size: 12px; margin: -8px 0 14px; }.visibility-button { background: transparent; border: 0; color: var(--bigin-icon-muted); cursor: pointer; padding: 0; }
.role-picker { display: grid; gap: 7px; }.role-select { width: 100%; }.role-count { color: var(--bigin-text-tertiary); }
.account-status-section { margin-top: 4px; }.account-status-heading { align-items: flex-start; display: flex; gap: 12px; justify-content: space-between; }.account-status-heading h2 { margin-bottom: 4px; }.account-status-heading .helper { margin: 0; }.account-status-control { align-items: center; background: var(--bigin-surface-subtle); border: 1px solid var(--bigin-border-secondary); border-radius: 6px; display: flex; justify-content: space-between; margin-top: 14px; padding: 12px; }.account-status-control > span { font-size: 13px; font-weight: 600; }.status-permission-help { color: var(--bigin-text-tertiary); display: block; margin-top: 8px; }
.user-form-card footer { border-top: 1px solid var(--bigin-border-secondary); display: flex; gap: 10px; grid-column: 1 / -1; justify-content: flex-end; padding: 14px 24px; }.primary-action { background: var(--bigin-color-primary); }
@media (max-width: 800px) { .user-form-card { grid-template-columns: 1fr; }.user-form-card aside { border-left: 0; border-top: 1px solid var(--bigin-border-secondary); }.form-page { padding: 16px; } }
@media (max-width: 767px) { .field-grid { grid-template-columns: 1fr; }.full-width { grid-column: auto; } }
@media (max-width: 575px) { .form-page { padding: 12px; }.user-form-card section, .user-form-card aside { padding: 16px; }.user-form-card footer { align-items: stretch; flex-direction: column; margin-inline: -16px; padding-inline: 16px; }.user-form-card footer :deep(.ant-btn) { width: 100%; } }
</style>
