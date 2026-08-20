<script setup>
import { h, onMounted, ref } from 'vue'
import { EyeOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'

import AppTable from '../../components/common/AppTable.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import { listAllBorrowHistory, listMyBorrowHistory } from '../../services/borrowing/borrowing.service'
import { useAuthStore } from '../../stores/auth'
import { DEFAULT_ASSET_IMAGE } from '../../constants/media'
import { actionWidth } from '../../utils/table'
import { displayAssetValue, normalizeAssetIdentity } from '../../utils/asset-identity'

const authStore = useAuthStore()
const router = useRouter()
const loading = ref(true)
const errorMessage = ref('')
const result = ref({ items: [], page: 1, pageSize: 20, total: 0 })
const activeTab = ref('CURRENT')
const canViewAll = authStore.hasPermission('borrow_history.view_all')

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-GB').format(new Date(value))
  : '—'
const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—'

async function load(page = 1) {
  loading.value = true
  errorMessage.value = ''
  try {
    result.value = await (canViewAll ? listAllBorrowHistory : listMyBorrowHistory)(authStore.api, {
      page,
      pageSize: 20,
      state: activeTab.value,
    })
  } catch (error) {
    errorMessage.value = error.message || 'Borrowing activity could not be loaded.'
  } finally {
    loading.value = false
  }
}

function tabChange(state) {
  activeTab.value = state
  void load(1)
}

function viewDetails(historyId) {
  router.push({ name: 'borrowing-activity-detail', params: { id: historyId } })
}

onMounted(() => load())
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Borrowing Activity</strong></template>

    <main class="history-page bigin-page-container">
      <header>
        <h1>Borrowing Activity</h1>
        <p>{{ canViewAll ? 'Company borrowing history available to your permissions.' : 'Your current and previous borrowed assets.' }}</p>
      </header>

      <section class="panel">
        <a-tabs :active-key="activeTab" @change="tabChange">
          <a-tab-pane key="CURRENT" tab="Currently Borrowed" />
          <a-tab-pane key="RETURNED" tab="Returned History" />
        </a-tabs>

        <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" />
        <AppTable
          v-else
          :loading="loading"
          :data-source="result.items"
          row-key="id"
          scroll-mode="intentional"
          empty-description="No borrowing activity found."
          :pagination="{ current: result.page, pageSize: result.pageSize, total: result.total, label: 'records' }"
          @page-change="load"
        >
          <a-table-column title="Asset" key="asset" :width="300">
            <template #default="{ record }">
              <div class="asset-cell"><a-avatar shape="square" :size="40" :src="record.asset.imageUrl || DEFAULT_ASSET_IMAGE">{{ displayAssetValue(normalizeAssetIdentity(record.asset).modelName).slice(0, 1) }}</a-avatar><div><strong>{{ displayAssetValue(normalizeAssetIdentity(record.asset).modelName) }}</strong><span>Code: {{ displayAssetValue(normalizeAssetIdentity(record.asset).assetCode) }}</span><span>Seri: {{ displayAssetValue(normalizeAssetIdentity(record.asset).serialNumber) }}</span></div></div>
            </template>
          </a-table-column>
          <a-table-column v-if="canViewAll" title="Borrower" key="borrower" :width="200">
            <template #default="{ record }"><div class="person-cell"><strong>{{ record.borrower.name }}</strong><span>{{ record.borrower.userCode }}</span></div></template>
          </a-table-column>
          <a-table-column title="Borrowing" key="borrowing" :width="220">
            <template #default="{ record }"><div class="person-cell"><strong>{{ formatDateTime(record.borrowedAt) }}</strong><span>Expected {{ formatDate(record.expectedReturnDate) }}</span></div></template>
          </a-table-column>
          <a-table-column v-if="activeTab === 'RETURNED'" title="Return" key="return" :width="220">
            <template #default="{ record }"><div class="person-cell"><strong>{{ formatDateTime(record.returnedAt) }}</strong><span>Condition: {{ record.returnCondition || '—' }}</span></div></template>
          </a-table-column>
          <a-table-column title="Status" key="status" :width="130"><template #default><StatusTag :status="activeTab === 'RETURNED' ? 'RETURNED' : 'CURRENT'" /></template></a-table-column>
          <a-table-column title="Action" key="action" fixed="right" :width="actionWidth('normal')" align="right">
            <template #default="{ record }"><a-button class="bigin-touch-target" type="link" :icon="h(EyeOutlined)" @click="viewDetails(record.id)">View details</a-button></template>
          </a-table-column>
          <template #mobileRow="{ record }">
            <div class="history-mobile-row"><div class="asset-cell"><a-avatar shape="square" :size="40" :src="record.asset.imageUrl || DEFAULT_ASSET_IMAGE">{{ displayAssetValue(normalizeAssetIdentity(record.asset).modelName).slice(0, 1) }}</a-avatar><div><strong>{{ displayAssetValue(normalizeAssetIdentity(record.asset).modelName) }}</strong><span>{{ canViewAll ? record.borrower.name : 'Your borrowing record' }}</span><small>Code: {{ displayAssetValue(normalizeAssetIdentity(record.asset).assetCode) }} · Seri: {{ displayAssetValue(normalizeAssetIdentity(record.asset).serialNumber) }} · {{ formatDate(record.borrowedAt) }}</small></div></div><div class="history-mobile-meta"><StatusTag :status="activeTab === 'RETURNED' ? 'RETURNED' : 'CURRENT'" /><span>Expected {{ formatDate(record.expectedReturnDate) }}</span></div><div v-if="activeTab === 'RETURNED'" class="history-mobile-meta"><span>Returned {{ formatDate(record.returnedAt) }}</span><span>{{ record.returnCondition || 'No condition' }}</span></div><a-button class="bigin-touch-target" type="link" :icon="h(EyeOutlined)" @click="viewDetails(record.id)">View details</a-button></div>
          </template>
        </AppTable>
      </section>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.history-page { margin: 0; max-width: none; padding: 24px; }
.history-page header h1 { font-size: 26px; margin: 0; }
.history-page header p { color: var(--bigin-text-tertiary); margin: 4px 0 18px; }
.panel { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; min-height: 600px; padding: 16px; }
.asset-cell, .person-cell, .asset-cell > div { display: grid; gap: 4px; min-width: 0; }
.asset-cell { align-items: center; display: flex; gap: 10px; }
.asset-cell strong, .person-cell strong { color: var(--bigin-text-primary); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset-cell span, .asset-cell small, .person-cell span { color: var(--bigin-text-secondary); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset-cell small, .person-cell span { color: var(--bigin-text-tertiary); font-size: 11px; }
.history-mobile-row { display: grid; gap: 12px; }
.history-mobile-meta { align-items: center; color: var(--bigin-text-secondary); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-size: 12px; }
@media (max-width: 600px) { .history-page { padding: 12px; } }
</style>
