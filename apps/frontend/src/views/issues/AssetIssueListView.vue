<script setup>
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import StatusTag from '../../components/common/StatusTag.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import { ASSET_ISSUE_STATUSES, statusLabel } from '../../constants/status-meta'
import { listAssetIssues } from '../../services/asset-issue.service'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const loading = ref(true)
const errorMessage = ref('')
const result = reactive({ items: [], page: 1, pageSize: 10, total: 0 })
const filters = reactive({ status: undefined, assetId: '' })

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await listAssetIssues(authStore.api, {
      page: result.page,
      pageSize: result.pageSize,
      status: filters.status,
      assetId: filters.assetId || undefined,
    })
    Object.assign(result, page)
  } catch (error) {
    errorMessage.value = error.message || 'Asset issues could not be loaded.'
  } finally {
    loading.value = false
  }
}

function applyFilters() { result.page = 1; void load() }
function clearFilters() { filters.status = undefined; filters.assetId = ''; result.page = 1; void load() }
function changePage(page) { result.page = page; void load() }

onMounted(load)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Asset Issues &amp; Repairs</strong></template>
    <main class="issue-list-page bigin-page-container">
      <header>
        <div><h1>Asset Issues &amp; Repairs</h1><p>Review reported issues and track repair progress.</p></div>
        <a-button :icon="h(ReloadOutlined)" :loading="loading" @click="load">Refresh</a-button>
      </header>
      <section class="filter-panel">
        <a-select v-model:value="filters.status" allow-clear placeholder="All statuses" style="width: 210px">
          <a-select-option v-for="status in ASSET_ISSUE_STATUSES" :key="status" :value="status">{{ statusLabel(status) }}</a-select-option>
        </a-select>
        <a-input-number v-model:value="filters.assetId" :min="1" placeholder="Asset ID" style="width: 160px" @press-enter="applyFilters" />
        <a-button type="primary" @click="applyFilters">Apply filters</a-button>
        <a-button @click="clearFilters">Clear</a-button>
      </section>
      <section class="table-panel">
        <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage">
          <template #action><a-button size="small" @click="load">Retry</a-button></template>
        </a-alert>
        <div v-else class="bigin-table-scroll-wrapper"><a-table :loading="loading" :data-source="result.items" row-key="id" :pagination="false" :scroll="{ x: 'max-content' }">
          <a-table-column title="Issue" key="issue" :width="110"><template #default="{ record }"><strong>#ISS-{{ String(record.id).padStart(4, '0') }}</strong></template></a-table-column>
          <a-table-column title="Asset" key="asset" :width="220"><template #default="{ record }"><div class="entity-cell"><strong>{{ record.asset?.modelName || `Asset ${record.assetId}` }}</strong><span>{{ record.asset?.serialNumber || `ID ${record.assetId}` }}</span></div></template></a-table-column>
          <a-table-column title="Reported by" key="reporter" :width="170"><template #default="{ record }">{{ record.reporter?.name || 'Unknown user' }}</template></a-table-column>
          <a-table-column title="Status" key="status" :width="150"><template #default="{ record }"><StatusTag :status="record.status" /></template></a-table-column>
          <a-table-column title="Reported" key="createdAt" :width="180"><template #default="{ record }">{{ formatDate(record.createdAt) }}</template></a-table-column>
          <a-table-column title="Handler" key="handler" :width="170"><template #default="{ record }">{{ record.handledBy?.name || 'Unassigned' }}</template></a-table-column>
          <a-table-column title="Action" key="action" fixed="right" :width="130"><template #default="{ record }"><a-button class="bigin-touch-target" type="link" :icon="h(EyeOutlined)" @click="router.push({ name: 'asset-issue-detail', params: { id: record.id } })">View details</a-button></template></a-table-column>
        </a-table></div>
        <footer class="bigin-responsive-footer"><span>Showing {{ result.items.length }} of {{ result.total }} issues</span><a-pagination class="bigin-touch-target" :current="result.page" :page-size="result.pageSize" :total="result.total" :show-size-changer="false" @change="changePage" /></footer>
      </section>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.issue-list-page { margin: 0 auto; max-width: 1320px; padding: 28px 32px 48px; }
.issue-list-page > header { align-items: flex-start; display: flex; justify-content: space-between; margin-bottom: 18px; }
.issue-list-page h1 { font-size: 28px; margin: 0; }
.issue-list-page header p { color: var(--bigin-text-secondary); margin: 6px 0 0; }
.filter-panel { align-items: center; background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; padding: 16px; }
.table-panel { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; overflow: hidden; padding: 16px; }
.filter-panel :deep(.ant-select), .filter-panel :deep(.ant-input-number) { max-width: 100%; }
.entity-cell { display: grid; gap: 3px; }
.entity-cell span { color: var(--bigin-text-tertiary); font-size: 12px; }
.table-panel footer { align-items: center; color: var(--bigin-text-tertiary); display: flex; justify-content: space-between; padding-top: 16px; }
@media (max-width: 700px) { .issue-list-page { padding: 18px 14px 32px; }.issue-list-page > header { gap: 12px; flex-direction: column; }.table-panel footer { align-items: flex-start; flex-direction: column; gap: 12px; } }
@media (max-width: 575px) { .issue-list-page { padding: 14px 12px 28px; }.filter-panel { align-items: stretch; flex-direction: column; }.filter-panel :deep(.ant-select), .filter-panel :deep(.ant-input-number), .filter-panel :deep(.ant-btn) { width: 100% !important; } }
</style>
