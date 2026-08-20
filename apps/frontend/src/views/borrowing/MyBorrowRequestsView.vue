<script setup>
import { h, onMounted, reactive, ref } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'

import AppTable from '../../components/common/AppTable.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import { BORROW_REQUEST_STATUSES, statusLabel } from '../../constants/status-meta'
import { listMyBorrowRequests } from '../../services/borrowing/borrowing.service'
import { useAuthStore } from '../../stores/auth'
import { actionWidth } from '../../utils/table'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(true)
const errorMessage = ref('')
const result = ref({ items: [], page: 1, pageSize: 10, total: 0 })
const filters = reactive({ status: undefined, page: 1, pageSize: 10 })
const statusOptions = BORROW_REQUEST_STATUSES.map((value) => ({ value, label: statusLabel(value) }))
const formatDateTime = (value) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    result.value = await listMyBorrowRequests(authStore.api, filters)
  } catch (error) {
    errorMessage.value = error.message || 'Requests could not be loaded.'
  } finally {
    loading.value = false
  }
}

function changePage(page) {
  filters.page = page
  void load()
}

function statusChange() {
  filters.page = 1
  void load()
}

onMounted(load)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>My Requests</strong></template>

    <main class="request-list-page bigin-page-container">
      <header class="page-title">
        <div><h1>My Borrow Requests</h1><p>Manage your asset borrowing requests.</p></div>
        <a-button v-if="authStore.hasPermission('borrow_request.create')" class="bigin-touch-target" type="primary" :icon="h(PlusOutlined)" @click="router.push({ name: 'borrow-request-create' })">Create Borrow Request</a-button>
      </header>

      <section class="panel">
        <div class="filters"><a-select v-model:value="filters.status" allow-clear placeholder="All statuses" :options="statusOptions" @change="statusChange" /></div>
        <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage"><template #action><a-button size="small" @click="load">Retry</a-button></template></a-alert>
        <AppTable
          v-else
          :loading="loading"
          :data-source="result.items"
          row-key="id"
          empty-description="No borrowing requests found."
          :pagination="{ current: result.page, pageSize: result.pageSize, total: result.total, label: 'requests' }"
          @page-change="changePage"
        >
          <a-table-column title="Request" key="request" :width="190"><template #default="{ record }"><a-button class="bigin-touch-target" type="link" @click="router.push({ name: 'borrow-request-detail', params: { id: record.id } })">REQ-{{ String(record.id).padStart(4, '0') }}</a-button></template></a-table-column>
          <a-table-column title="Created" key="created" :width="170"><template #default="{ record }">{{ formatDateTime(record.createdAt) }}</template></a-table-column>
          <a-table-column title="Assets" data-index="detailCount" :width="110" />
          <a-table-column title="Approved" data-index="approvedCount" :width="110" />
          <a-table-column title="Rejected" data-index="rejectedCount" :width="110" />
          <a-table-column title="Status" key="status" :width="140"><template #default="{ record }"><StatusTag :status="record.status" /></template></a-table-column>
          <a-table-column title="Action" key="action" fixed="right" :width="actionWidth('normal')" align="right"><template #default="{ record }"><a-button class="bigin-touch-target" type="link" @click="router.push({ name: 'borrow-request-detail', params: { id: record.id } })">View details</a-button></template></a-table-column>
          <template #mobileRow="{ record }"><div class="request-mobile-row"><div class="request-cell"><strong>REQ-{{ String(record.id).padStart(4, '0') }}</strong><span>Created {{ formatDateTime(record.createdAt) }}</span></div><div class="request-mobile-meta"><span>{{ record.detailCount }} assets · {{ record.approvedCount }} approved · {{ record.rejectedCount }} rejected</span><StatusTag :status="record.status" /></div><a-button class="bigin-touch-target" type="link" @click="router.push({ name: 'borrow-request-detail', params: { id: record.id } })">View details</a-button></div></template>
        </AppTable>
      </section>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.request-list-page { margin: 0; max-width: none; padding: 24px; }
.page-title { align-items: flex-start; display: flex; gap: 16px; justify-content: space-between; margin-bottom: 20px; }
.page-title h1 { font-size: 26px; margin: 0; }.page-title p { color: var(--bigin-text-tertiary); margin: 4px 0; }
.panel { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; min-height: 560px; padding: 16px; }
.filters { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; }.filters :deep(.ant-select) { max-width: 100%; width: 220px; }
.request-cell { display: grid; gap: 3px; }.request-cell span { color: var(--bigin-text-tertiary); font-size: 12px; }.request-mobile-row { display: grid; gap: 12px; }.request-mobile-meta { align-items: center; color: var(--bigin-text-secondary); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-size: 12px; }
@media (max-width: 767px) { .request-list-page { padding: 16px; }.page-title { flex-direction: column; }.page-title :deep(.ant-btn) { width: 100%; } }
@media (max-width: 575px) { .request-list-page { padding: 12px; }.filters :deep(.ant-select) { width: 100%; } }
</style>
