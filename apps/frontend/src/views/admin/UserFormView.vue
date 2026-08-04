<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { EyeInvisibleOutlined, EyeOutlined, SaveOutlined } from '@ant-design/icons-vue'
import { useRoute, useRouter } from 'vue-router'

import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
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
const form = reactive({ name: '', email: '', phone: '', departmentId: undefined, avatarUrl: '', password: '', confirmPassword: '', roleIds: [], isActive: true })

function toggleRole(roleId) {
  const index = form.roleIds.indexOf(roleId)
  if (index >= 0) form.roleIds.splice(index, 1)
  else form.roleIds.push(roleId)
}

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
  submitting.value = true
  try {
    const payload = {
      name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), departmentId: Number(form.departmentId),
      avatarUrl: form.avatarUrl.trim() || null,
      ...(form.password ? { password: form.password } : {}),
      ...(authStore.hasPermission('role.assign') && form.roleIds.length ? { roleIds: [...form.roleIds] } : {}),
    }
    const saved = await authStore.api(isEdit.value ? `/users/${route.params.id}` : '/users', {
      method: isEdit.value ? 'PATCH' : 'POST', body: JSON.stringify(payload),
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

onMounted(loadPage)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>{{ screenTitle }}</strong></template>
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
          <div v-if="authStore.hasPermission('role.assign')" class="role-list">
            <button v-for="role in roles" :key="role.id" type="button" class="role-option" :class="{ 'role-option--selected': form.roleIds.includes(role.id) }" @click="toggleRole(role.id)">
              <span class="role-radio">{{ form.roleIds.includes(role.id) ? '●' : '○' }}</span><span><strong>{{ role.name.replaceAll('_', ' ') }}</strong><small>Use the effective permissions assigned to this role.</small></span>
            </button>
          </div>
          <a-alert v-else type="info" message="The default employee role will be assigned." />
          <template v-if="isEdit"><a-divider /><h2>Account Status</h2><a-badge :status="form.isActive ? 'success' : 'default'" :text="form.isActive ? 'Active' : 'Inactive'" /><p class="helper">Account status is changed from User Details.</p></template>
        </aside>

        <footer><a-button @click="router.back()">Cancel</a-button><a-button type="primary" html-type="submit" class="primary-action" :loading="submitting"><template #icon><SaveOutlined /></template>{{ isEdit ? 'Save Changes' : 'Save User' }}</a-button></footer>
      </form>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.form-page { margin: 0 auto; max-width: 1160px; padding: 24px 28px 48px; }.muted,.helper { color: #8c8c8c; }.divider { color: #bfbfbf; }.form-heading h1 { font-size: 20px; margin: 10px 0 4px; }.form-heading p { color: #8c8c8c; margin: 0 0 18px; }.form-alert { margin-bottom: 16px; }
.user-form-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 8px; display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(280px, .8fr); overflow: hidden; }.user-form-card section,.user-form-card aside { padding: 24px; }.user-form-card aside { border-left: 1px solid #f0f0f0; }.user-form-card h2 { font-size: 15px; margin: 0 0 16px; }.user-form-card h2 small { color: #8c8c8c; float: right; font-size: 11px; font-weight: 400; }
.field-grid { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }.field-grid label { display: grid; gap: 7px; }.field-grid label > span { font-size: 13px; font-weight: 600; }.field-grid b { color: #ff4d4f; }.full-width { grid-column: 1 / -1; }.full-control { width: 100%; }.helper { font-size: 12px; margin: -8px 0 14px; }.visibility-button { background: transparent; border: 0; color: #8c8c8c; cursor: pointer; padding: 0; }
.role-list { display: grid; gap: 10px; }.role-option { align-items: flex-start; background: #fff; border: 1px solid #f0f0f0; border-radius: 6px; cursor: pointer; display: flex; gap: 10px; padding: 12px; text-align: left; }.role-option--selected { background: #fff7e6; border-color: #ffbb96; }.role-radio { color: #ff6b00; }.role-option span:last-child { display: grid; gap: 3px; text-transform: capitalize; }.role-option small { color: #8c8c8c; line-height: 1.35; text-transform: none; }
.user-form-card footer { border-top: 1px solid #f0f0f0; display: flex; gap: 10px; grid-column: 1 / -1; justify-content: flex-end; padding: 14px 24px; }.primary-action { background: #ff6b00; }
@media (max-width: 800px) { .user-form-card { grid-template-columns: 1fr; }.user-form-card aside { border-left: 0; border-top: 1px solid #f0f0f0; }.field-grid { grid-template-columns: 1fr; }.full-width { grid-column: auto; }.form-page { padding: 16px; } }
</style>
