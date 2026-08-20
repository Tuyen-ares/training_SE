<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'
import AppTable from '../../../components/common/AppTable.vue'
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout.vue'
import StatusTag from '../../../components/common/StatusTag.vue'
import { listRegistrationRequests } from '../../../services/administration/registration-request.service'
import { useAuthStore } from '../../../stores/auth'
import { actionColumn } from '../../../utils/table'

const authStore = useAuthStore()
const router = useRouter()
const loading = ref(true)
const errorMessage = ref('')
const pendingCount = ref(null)
const pageData = reactive({ items: [], page: 1, pageSize: 20, total: 0 })
const filters = reactive({ status: 'PENDING', q: '', page: 1, pageSize: 20 })
let searchTimer

const columns = [
  { title: 'Applicant', key: 'applicant', width: 300 },
  { title: 'Submitted', dataIndex: 'createdAt', key: 'createdAt', width: 190 },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 125 },
  { title: 'Reviewed by', key: 'reviewer', width: 170 },
  actionColumn({ key: 'action', size: 'compact', fixed: true }),
]

const statusTabs = computed(() => [
  { key: 'PENDING', label: pendingCount.value === null ? 'Pending' : `Pending (${pendingCount.value})` },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
])

function formatDate(value) { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
async function loadRequests() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await listRegistrationRequests(authStore.api, filters)
    Object.assign(pageData, result)
    if (filters.status === 'PENDING') pendingCount.value = result.total
    else if (pendingCount.value === null) {
      const pendingResult = await listRegistrationRequests(authStore.api, { ...filters, status: 'PENDING', page: 1, pageSize: 1 })
      pendingCount.value = pendingResult.total
    }
  }
  catch { errorMessage.value = 'We could not load registration requests.' }
  finally { loading.value = false }
}
function changePage(page) { filters.page = page; loadRequests() }
function changeStatus(status) { filters.status = status }
watch(() => filters.status, () => { filters.page = 1; loadRequests() })
watch(() => filters.q, () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { filters.page = 1; loadRequests() }, 300) })
onMounted(loadRequests)
onUnmounted(() => clearTimeout(searchTimer))
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Administration</strong></template>
    <main class="admin-page bigin-page-container">
      <header class="page-heading">
        <div>
          <a-breadcrumb>
            <a-breadcrumb-item>Administration</a-breadcrumb-item>
            <a-breadcrumb-item>Registration Requests</a-breadcrumb-item>
          </a-breadcrumb>
          <h1>Registration Requests</h1>
          <p>Review pending applicants before an active account is created.</p>
        </div>
      </header>
      <section class="request-surface">
        <div class="filter-row" aria-label="Registration request filters">
          <a-input v-model:value="filters.q" class="request-search" allow-clear placeholder="Search name, email, or phone">
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-button class="bigin-touch-target" type="text" aria-label="Refresh registration requests" :loading="loading" @click="loadRequests">
            <template #icon><ReloadOutlined /></template>
          </a-button>
          <span class="pending-summary">{{ pendingCount === null ? '—' : pendingCount }} pending requests</span>
        </div>
        <a-tabs class="status-tabs" :active-key="filters.status" @change="changeStatus">
          <a-tab-pane key="PENDING">
            <template #tab>Pending<span v-if="pendingCount !== null"> ({{ pendingCount }})</span></template>
          </a-tab-pane>
          <a-tab-pane key="APPROVED" tab="Approved" />
          <a-tab-pane key="REJECTED" tab="Rejected" />
        </a-tabs>
        <a-alert v-if="errorMessage" class="page-alert" type="error" show-icon :message="errorMessage"><template #action><a-button size="small" @click="loadRequests">Retry</a-button></template></a-alert>
        <AppTable
          v-else
          class="request-table"
          :columns="columns"
          :data-source="pageData.items"
          :loading="loading"
          row-key="id"
          :empty-description="filters.status === 'PENDING' ? 'No pending registrations' : 'No requests match these filters'"
          :pagination="{ current: pageData.page, pageSize: pageData.pageSize, total: pageData.total, label: 'requests' }"
          @page-change="changePage"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'applicant'"><div class="applicant"><strong>{{ record.name }}</strong><small>{{ record.email }} · {{ record.phone || 'No phone' }}</small></div></template>
            <template v-else-if="column.key === 'createdAt'">{{ formatDate(record.createdAt) }}</template>
            <template v-else-if="column.key === 'status'"><StatusTag :status="record.status" /></template>
            <template v-else-if="column.key === 'reviewer'">{{ record.reviewer?.name || '—' }}</template>
            <template v-else-if="column.key === 'action'">
              <div class="action-cell">
                <a-button
                  class="review-action bigin-touch-target"
                  v-if="record.status === 'PENDING'"
                  type="primary"
                  size="small"
                  @click="router.push({ name: 'registration-request-detail', params: { id: record.id } })"
                >Review</a-button>
                <a-button v-else class="bigin-touch-target" type="link" size="small" @click="router.push({ name: 'registration-request-detail', params: { id: record.id } })">View</a-button>
              </div>
            </template>
          </template>
          <template #mobileRow="{ record }">
            <div class="registration-mobile-row"><div class="applicant"><strong>{{ record.name }}</strong><small>{{ record.email }} · {{ record.phone || 'No phone' }}</small></div><div class="registration-mobile-meta"><StatusTag :status="record.status" /><span>{{ formatDate(record.createdAt) }}</span></div><a-button v-if="record.status === 'PENDING'" class="review-action bigin-touch-target" type="primary" @click="router.push({ name: 'registration-request-detail', params: { id: record.id } })">Review</a-button><a-button v-else class="bigin-touch-target" type="link" @click="router.push({ name: 'registration-request-detail', params: { id: record.id } })">View</a-button></div>
          </template>
        </AppTable>
      </section>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.admin-page { margin: 0; max-width: none; min-width: 0; padding: 28px 36px 48px; }.page-heading { margin-bottom: 24px; }.page-heading h1 { font-size: 22px; margin: 12px 0 5px; }.page-heading p { color: var(--bigin-text-muted); margin: 0; }.request-surface { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; overflow: hidden; }.filter-row { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 16px 0; }.request-search { max-width: 360px; }.pending-summary { color: var(--bigin-text-secondary); font-size: 13px; margin-left: auto; }.status-tabs { padding: 0 16px; }.status-tabs :deep(.ant-tabs-nav) { margin: 0; }.applicant { display: grid; gap: 2px; }.applicant small { color: var(--bigin-text-muted); font-size: 12px; overflow-wrap: anywhere; }.action-cell { align-items: center; display: flex; justify-content: flex-end; width: 100%; }.review-action { background: var(--bigin-color-primary); border-color: var(--bigin-color-primary); }.review-action:hover { background: var(--bigin-color-primary-hover); border-color: var(--bigin-color-primary-hover); }.page-alert { margin: 16px; }.registration-mobile-row { display: grid; gap: 12px; }.registration-mobile-meta { align-items: center; color: var(--bigin-text-secondary); display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
@media (max-width: 767px) { .admin-page { padding: 20px 16px 36px; }.filter-row { align-items: center; }.request-search { flex: 1 1 180px; max-width: 280px; }.pending-summary { flex-basis: 100%; margin-left: 0; } }
@media (max-width: 575px) { .admin-page { padding: 14px 12px 28px; }.request-search { max-width: 280px; width: auto; }.pending-summary { align-self: flex-start; }.status-tabs { padding-inline: 10px; } }
</style>
