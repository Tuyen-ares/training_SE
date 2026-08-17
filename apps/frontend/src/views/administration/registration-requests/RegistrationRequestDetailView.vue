<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout.vue'
import AdministrationTabs from '../../../components/administration/AdministrationTabs.vue'
import StatusTag from '../../../components/common/StatusTag.vue'
import { approveRegistrationRequest, getRegistrationRequest, rejectRegistrationRequest } from '../../../services/administration/registration-request.service'
import { listRoles } from '../../../services/administration/rbac.service'
import { useAuthStore } from '../../../stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const request = ref(null)
const departments = ref([])
const roles = ref([])
const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const rejectOpen = ref(false)
const form = reactive({ departmentId: undefined, roleIds: [], rejectionReason: '' })
const isPending = computed(() => request.value?.status === 'PENDING')
function formatDate(value) { return value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—' }

async function loadPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [requestData, departmentData, roleData] = await Promise.all([
      getRegistrationRequest(authStore.api, route.params.id),
      authStore.api('/departments'),
      listRoles(authStore.api),
    ])
    request.value = requestData
    departments.value = departmentData.filter((department) => department.isActive)
    roles.value = roleData
  } catch (error) { errorMessage.value = error.status === 404 ? 'This registration request no longer exists.' : 'We could not load the review details.' }
  finally { loading.value = false }
}

async function approve() {
  errorMessage.value = ''
  if (!form.departmentId) return (errorMessage.value = 'Select a department before approval.')
  submitting.value = true
  try {
    request.value = await approveRegistrationRequest(authStore.api, request.value.id, {
      departmentId: Number(form.departmentId),
      ...(form.roleIds.length ? { roleIds: form.roleIds } : {}),
    })
  } catch (error) { errorMessage.value = error.message || 'Approval failed; the request remains pending.' }
  finally { submitting.value = false }
}

async function reject() {
  submitting.value = true
  errorMessage.value = ''
  try {
    request.value = await rejectRegistrationRequest(authStore.api, request.value.id, form.rejectionReason.trim())
    rejectOpen.value = false
  } catch (error) { errorMessage.value = error.message || 'Rejection failed; the request remains pending.' }
  finally { submitting.value = false }
}
onMounted(loadPage)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Administration</strong></template>
    <AdministrationTabs />
    <main class="detail-page bigin-page-container">
      <a-skeleton v-if="loading" active :paragraph="{ rows: 10 }" />
      <a-result v-else-if="!request" status="error" title="Unable to open request" :sub-title="errorMessage"><template #extra><a-button @click="router.push({ name: 'registration-requests' })">Back to Queue</a-button></template></a-result>
      <template v-else>
        <header class="page-heading"><div><a-breadcrumb><a-breadcrumb-item>Administration</a-breadcrumb-item><a-breadcrumb-item>Registration Requests</a-breadcrumb-item><a-breadcrumb-item>#{{ request.id }}</a-breadcrumb-item></a-breadcrumb><h1>Registration Request</h1><p>Submitted {{ formatDate(request.createdAt) }}</p></div><StatusTag :status="request.status" /></header>
        <a-alert v-if="errorMessage" class="alert" type="error" show-icon :message="errorMessage" />
        <div class="detail-grid">
          <div class="detail-main">
            <section class="card"><h2>Applicant Summary</h2><a-descriptions :column="1" bordered><a-descriptions-item label="Full name">{{ request.name }}</a-descriptions-item><a-descriptions-item label="Email">{{ request.email }}</a-descriptions-item><a-descriptions-item label="Phone">{{ request.phone }}</a-descriptions-item></a-descriptions></section>
            <section class="card"><h2>Registration Context</h2><a-descriptions :column="{ xs: 1, sm: 2 }" bordered><a-descriptions-item label="Request ID">#{{ request.id }}</a-descriptions-item><a-descriptions-item label="Submitted">{{ formatDate(request.createdAt) }}</a-descriptions-item><a-descriptions-item label="Current status" :span="2"><StatusTag :status="request.status" /></a-descriptions-item></a-descriptions></section>
            <section v-if="isPending" class="card"><h2>Account Impact</h2><p class="impact-copy">Approval creates an active user, assigns a user code and department, and applies the initial role set in one transaction.</p><p v-if="form.roleIds.length" class="impact-copy">Selected initial roles: <strong>{{ form.roleIds.length }}</strong>. The new user receives their effective permissions on the next login or token refresh.</p><p v-else class="impact-copy impact-copy--fallback">When no initial role is selected, the backend assigns the default Employee role.</p></section>
          </div>
          <section class="card decision-card">
            <h2>{{ isPending ? 'Approval setup' : 'Review outcome' }}</h2>
            <template v-if="isPending">
              <label><span>Department <b>*</b></span><a-select v-model:value="form.departmentId" placeholder="Select department"><a-select-option v-for="department in departments" :key="department.id" :value="department.id">{{ department.name }}</a-select-option></a-select></label>
              <label><span>Initial roles <small>Optional</small></span><a-select v-model:value="form.roleIds" mode="multiple" placeholder="Select existing roles"><a-select-option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</a-select-option></a-select><small>{{ form.roleIds.length }} role{{ form.roleIds.length === 1 ? '' : 's' }} selected. Leave empty to use the default Employee role.</small></label>
              <div class="actions bigin-responsive-footer"><a-button class="bigin-touch-target" danger @click="rejectOpen = true">Reject</a-button><a-button type="primary" class="primary-action bigin-touch-target" :loading="submitting" @click="approve">Approve & Create User</a-button></div>
            </template>
            <a-descriptions v-else :column="1" bordered><a-descriptions-item label="Reviewed by">{{ request.reviewer?.name || 'Unknown reviewer' }}</a-descriptions-item><a-descriptions-item label="Reviewed at">{{ formatDate(request.reviewedAt) }}</a-descriptions-item><a-descriptions-item v-if="request.createdUser" label="Created user">{{ request.createdUser.name }} (#{{ request.createdUser.id }})</a-descriptions-item><a-descriptions-item v-if="request.status === 'REJECTED'" label="Reason">{{ request.rejectionReason || 'No reason provided' }}</a-descriptions-item></a-descriptions>
          </section>
        </div>
      </template>
    </main>
    <a-modal v-model:open="rejectOpen" wrap-class-name="bigin-modal-content" title="Reject registration request" ok-text="Reject" ok-type="danger" :confirm-loading="submitting" @ok="reject"><p>The password hash will be cleared and the applicant can submit a new request later.</p><a-textarea v-model:value="form.rejectionReason" :maxlength="1000" :rows="4" placeholder="Optional rejection reason" show-count /></a-modal>
  </WorkspaceLayout>
</template>

<style scoped>
.detail-page { margin: 0 auto; max-width: 1180px; min-width: 0; padding: 24px 28px 48px; }.page-heading { align-items: flex-end; display: flex; gap: 16px; justify-content: space-between; }.page-heading > div { min-width: 0; }.page-heading h1 { font-size: 22px; margin: 10px 0 4px; }.page-heading p { color: var(--bigin-text-muted); margin: 0; }.alert { margin-top: 16px; }.detail-grid { align-items: start; display: grid; gap: 20px; grid-template-columns: minmax(0, 1fr) minmax(340px, .78fr); margin-top: 18px; }.detail-main { display: grid; gap: 20px; min-width: 0; }.card { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; padding: 24px; min-width: 0; }.card h2 { font-size: 16px; margin: 0 0 18px; }.card label { display: grid; gap: 7px; margin-bottom: 16px; }.card label > span { font-size: 13px; font-weight: 600; }.card label b { color: var(--bigin-color-error); }.card label small { color: var(--bigin-text-muted); font-size: 12px; font-weight: 400; }.impact-copy { color: var(--bigin-text-secondary); margin: 0 0 10px; overflow-wrap: anywhere; }.impact-copy:last-child { margin-bottom: 0; }.impact-copy--fallback { background: var(--bigin-surface-warning); border: 1px solid var(--bigin-border-warning); border-radius: 6px; color: var(--bigin-color-warning-text); padding: 10px 12px; }.decision-card { position: sticky; top: 18px; }.actions { border-top: 1px solid var(--bigin-border-secondary); display: flex; gap: 10px; justify-content: flex-end; margin: 24px -24px -24px; padding: 14px 24px; }.primary-action { background: var(--bigin-color-primary); }
@media (max-width: 767px) { .detail-page { padding: 20px 16px 36px; }.detail-grid { grid-template-columns: 1fr; }.decision-card { position: static; }.page-heading { align-items: flex-start; flex-direction: column; } }
@media (max-width: 575px) { .detail-page { padding: 14px 12px 28px; }.card { padding: 16px; }.actions { align-items: stretch; flex-direction: column; margin-inline: -16px; padding-inline: 16px; }.actions :deep(.ant-btn) { width: 100%; } }
</style>
