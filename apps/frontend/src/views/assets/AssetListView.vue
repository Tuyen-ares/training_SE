<script setup>
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  QrcodeOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import StatusTag from '../../components/common/StatusTag.vue'
import AssetIdentity from '../../components/assets/AssetIdentity.vue'
import AppTable from '../../components/common/AppTable.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import { ASSET_STATUSES, statusLabel } from '../../constants/status-meta'
import { listAssets, listAssetLookups } from '../../services/assets/asset.service'
import { useAuthStore } from '../../stores/auth'
import { actionColumn } from '../../utils/table'
import { displayAssetValue, normalizeAssetIdentity } from '../../utils/asset-identity'

const router = useRouter()
const authStore = useAuthStore()
const filters = reactive({
  q: '',
  status: undefined,
  modelId: undefined,
  typeId: undefined,
  brandId: undefined,
  departmentId: undefined,
  page: 1,
  pageSize: 20,
})
const result = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const forbidden = ref(false)
const lookups = ref({ brands: [], types: [], models: [], departments: [] })
const canCreateAsset = computed(() => authStore.hasPermission('asset.create'))
const canUpdateAsset = computed(() => authStore.hasPermission('asset.update'))
const columns = [
  { title: 'Asset', key: 'asset', width: 220 },
  { title: 'Category', key: 'category', width: 120 },
  { title: 'Brand', key: 'brand', width: 110 },
  { title: 'Seri', key: 'serialNumber', width: 145 },
  { title: 'Department', key: 'department', width: 150, responsive: ['xxl'] },
  { title: 'Status', key: 'status', width: 100 },
  actionColumn({ key: 'actions', size: 'wide', fixed: true }),
]

const statusOptions = computed(() => ASSET_STATUSES.map((value) => ({ value, label: statusLabel(value) })))
const modelOptions = computed(() => lookups.value.models.map((item) => ({ value: item.id, label: item.name })))
const typeOptions = computed(() => lookups.value.types.map((item) => ({ value: item.id, label: item.name })))
const brandOptions = computed(() => lookups.value.brands.map((item) => ({ value: item.id, label: item.name })))
const departmentOptions = computed(() => lookups.value.departments.map((item) => ({ value: item.id, label: item.name })))

function filterPayload() {
  return {
    q: filters.q,
    status: filters.status,
    modelId: filters.modelId,
    typeId: filters.typeId,
    brandId: filters.brandId,
    departmentId: filters.departmentId,
    page: filters.page,
    pageSize: filters.pageSize,
  }
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  forbidden.value = false
  try {
    result.value = await listAssets(authStore.api, filterPayload())
  } catch (error) {
    if (error.status === 403) forbidden.value = true
    else errorMessage.value = error.message || 'The asset list could not be loaded.'
  } finally {
    loading.value = false
  }
}

async function loadLookups() {
  try { lookups.value = await listAssetLookups(authStore.api) } catch { /* optional filters stay empty */ }
}

function applyFilters() {
  filters.page = 1
  void load()
}

function clearFilters() {
  Object.assign(filters, {
    q: '', status: undefined, modelId: undefined, typeId: undefined, brandId: undefined, departmentId: undefined, page: 1,
  })
  void load()
}

function changePage(page) {
  filters.page = page
  void load()
}

function openAsset(asset) {
  router.push({ name: 'asset-detail', params: { id: asset.id } })
}

onMounted(() => {
  void load()
  void loadLookups()
})
</script>

<template>
  <WorkspaceLayout>
    <template #context>
      <a-typography-text strong>Asset List</a-typography-text>
    </template>

    <main class="asset-page">
      <section class="asset-page__filters" aria-label="Asset filters">
        <div class="asset-page__filter-topline">
          <a-input v-model:value="filters.q" class="asset-page__search" allow-clear placeholder="Search assets..." @press-enter="applyFilters">
            <template #prefix><SearchOutlined /></template>
          </a-input>
          <a-button :icon="h(QrcodeOutlined)" @click="router.push({ name: 'asset-qr-scan' })">Scan QR</a-button>
          <div class="asset-page__toolbar-actions">
            <a-button @click="clearFilters">Clear filters</a-button>
            <a-button v-if="canCreateAsset" type="primary" :icon="h(PlusOutlined)" @click="router.push({ name: 'asset-create' })">Add New Asset</a-button>
          </div>
        </div>

        <div class="asset-page__filter-grid">
          <label>
            <span>Status</span>
            <a-select v-model:value="filters.status" :options="statusOptions" placeholder="All" allow-clear @change="applyFilters" />
          </label>
          <label>
            <span>Model</span>
            <a-select v-model:value="filters.modelId" :options="modelOptions" placeholder="All" allow-clear @change="applyFilters" />
          </label>
          <label>
            <span>Asset Category</span>
            <a-select v-model:value="filters.typeId" :options="typeOptions" placeholder="All" allow-clear @change="applyFilters" />
          </label>
          <label>
            <span>Brand</span>
            <a-select v-model:value="filters.brandId" :options="brandOptions" placeholder="All" allow-clear @change="applyFilters" />
          </label>
          <label>
            <span>Department</span>
            <a-select v-model:value="filters.departmentId" :options="departmentOptions" placeholder="All" allow-clear @change="applyFilters" />
          </label>
        </div>
      </section>

      <section class="asset-page__table-surface" aria-label="Asset list">
        <a-result v-if="forbidden" status="403" title="You do not have access to the asset list." />
        <a-alert v-else-if="errorMessage" type="error" show-icon :message="errorMessage">
          <template #action><a-button size="small" @click="load">Retry</a-button></template>
        </a-alert>
        <AppTable
          v-else
          :columns="columns"
          :data-source="result?.items || []"
          :loading="loading"
          row-key="id"
          empty-description="No assets match the current filters."
          :pagination="{ current: result?.page || 1, pageSize: result?.pageSize || filters.pageSize, total: result?.total || 0, label: 'assets' }"
          @page-change="changePage"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'asset'">
              <AssetIdentity :identity="normalizeAssetIdentity(record)" variant="inventory" show-image />
            </template>
            <a-typography-text v-else-if="column.key === 'category'">{{ record.type?.name || 'Uncategorized' }}</a-typography-text>
            <a-typography-text v-else-if="column.key === 'brand'">{{ record.brand?.name || 'Unbranded' }}</a-typography-text>
            <a-typography-text v-else-if="column.key === 'serialNumber'">{{ displayAssetValue(normalizeAssetIdentity(record).serialNumber) }}</a-typography-text>
            <a-typography-text v-else-if="column.key === 'department'">{{ record.department?.name || 'Unassigned' }}</a-typography-text>
            <StatusTag v-else-if="column.key === 'status'" :status="record.status" />
            <a-space v-else-if="column.key === 'actions'" :size="4">
              <a-button class="bigin-table-action-link bigin-touch-target" type="link" :icon="h(EyeOutlined)" aria-label="View asset details" @click="openAsset(record)">View</a-button>
              <a-button v-if="canUpdateAsset" class="bigin-table-action-link bigin-touch-target" type="link" :icon="h(EditOutlined)" aria-label="Edit asset" @click="router.push({ name: 'asset-edit', params: { id: record.id } })">Edit</a-button>
            </a-space>
          </template>
          <template #mobileRow="{ record }">
            <div class="asset-page__mobile-row">
              <AssetIdentity :identity="normalizeAssetIdentity(record)" variant="inventory" show-image />
              <div class="asset-page__mobile-meta"><span>{{ record.type?.name || 'Uncategorized' }}</span><span>{{ record.brand?.name || 'Unbranded' }}</span><span>Seri: {{ displayAssetValue(normalizeAssetIdentity(record).serialNumber) }}</span><span>{{ record.department?.name || 'Unassigned' }}</span><StatusTag :status="record.status" /></div>
              <div class="asset-page__mobile-actions">
                <a-button class="bigin-table-action-link bigin-touch-target" type="link" :icon="h(EyeOutlined)" aria-label="View asset details" @click="openAsset(record)">View</a-button>
                <a-button v-if="canUpdateAsset" class="bigin-table-action-link bigin-touch-target" type="link" :icon="h(EditOutlined)" aria-label="Edit asset" @click="router.push({ name: 'asset-edit', params: { id: record.id } })">Edit</a-button>
              </div>
            </div>
          </template>
        </AppTable>
      </section>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.asset-page { min-height: calc(100vh - 64px); padding: 20px; }
.asset-page__screen-id { color: var(--bigin-text-tertiary); }
.asset-page__filters, .asset-page__table-surface { border: 1px solid var(--bigin-border-secondary); border-radius: 8px; background: var(--bigin-surface-panel); box-shadow: var(--bigin-shadow-panel); }
.asset-page__filters { margin-bottom: 16px; padding: 14px; }
.asset-page__filter-topline { align-items: center; display: flex; gap: 12px; }
.asset-page__search { width: 224px; }
.asset-page__toolbar-actions { display: flex; gap: 10px; margin-left: auto; }
.asset-page__filter-grid { display: grid; gap: 14px; grid-template-columns: repeat(5, minmax(0, 1fr)); margin-top: 16px; max-width: 860px; }
.asset-page__filter-grid label { display: grid; gap: 5px; color: var(--bigin-text-primary); font-size: 12px; font-weight: 600; }
.asset-page__table-surface { min-height: 600px; overflow: hidden; }
.asset-page__mobile-row { display: grid; gap: 12px; }
.asset-page__mobile-meta, .asset-page__mobile-actions { align-items: center; display: flex; justify-content: space-between; gap: 8px; }
.asset-page__mobile-actions { border-top: 1px solid var(--bigin-border-secondary); justify-content: flex-end; padding-top: 8px; }
@media (max-width: 900px) { .asset-page__filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: none; }.asset-page__filter-topline { align-items: stretch; flex-wrap: wrap; }.asset-page__toolbar-actions { margin-left: 0; }.asset-page__search { flex: 1 1 220px; } }
@media (max-width: 640px) { .asset-page { padding: 12px; }.asset-page__filter-grid { grid-template-columns: 1fr; }.asset-page__toolbar-actions { width: 100%; }.asset-page__toolbar-actions :deep(.ant-btn) { flex: 1; } }
</style>
