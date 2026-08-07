<script setup>
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  QrcodeOutlined,
  ScanOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import StatusTag from '../../components/common/StatusTag.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import { ASSET_STATUSES, statusLabel } from '../../constants/status-meta'
import { DEFAULT_ASSET_IMAGE } from '../../constants/media'
import { findAssetByQr, listAssets, listAssetLookups } from '../../services/asset.service'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const filters = reactive({
  q: '',
  scanCode: '',
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
  { title: 'Asset Name/ID', key: 'asset', width: 220 },
  { title: 'Model & Brand', key: 'modelBrand', width: 190 },
  { title: 'Department', key: 'department', width: 170 },
  { title: 'Serial Number', key: 'serial', width: 170 },
  { title: 'QR Code', key: 'qr', width: 105 },
  { title: 'Status', key: 'status', width: 130 },
  { title: 'Action', key: 'actions', width: 120 },
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
    q: '', scanCode: '', status: undefined, modelId: undefined, typeId: undefined, brandId: undefined, departmentId: undefined, page: 1,
  })
  void load()
}

async function openQrCode() {
  const qrCode = filters.scanCode.trim()
  if (!qrCode) return
  try {
    const asset = await findAssetByQr(authStore.api, qrCode)
    await router.push({ name: 'asset-detail', params: { id: asset.id } })
  } catch (error) {
    errorMessage.value = error.status === 404 ? 'No asset was found for this QR code.' : (error.message || 'The QR code could not be opened.')
  }
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
          <a-input-search v-model:value="filters.scanCode" class="asset-page__scan" allow-clear enter-button="Open QR" placeholder="Enter or paste QR code" @search="openQrCode">
            <template #prefix><ScanOutlined /></template>
          </a-input-search>
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
        <a-skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
        <a-result v-else-if="forbidden" status="403" title="You do not have access to the asset list." />
        <a-alert v-else-if="errorMessage" type="error" show-icon :message="errorMessage">
          <template #action><a-button size="small" @click="load">Retry</a-button></template>
        </a-alert>
        <a-empty v-else-if="!result?.items?.length" description="No assets match the current filters." />
        <template v-else>
          <a-table :columns="columns" :data-source="result.items" :pagination="false" row-key="id" :scroll="{ x: 1080 }">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'asset'">
                <div class="asset-page__asset-cell">
                  <a-avatar shape="square" :size="42" :src="record.imageUrl || DEFAULT_ASSET_IMAGE">{{ record.model.name.slice(0, 1) }}</a-avatar>
                  <div>
                    <a-typography-text strong>{{ record.model.name }}</a-typography-text>
                    <br><a-typography-text type="secondary">AST-{{ String(record.id).padStart(4, '0') }}</a-typography-text>
                  </div>
                </div>
              </template>
              <a-typography-text v-else-if="column.key === 'modelBrand'">{{ record.model.name }} / {{ record.brand.name }}</a-typography-text>
              <a-typography-text v-else-if="column.key === 'department'">{{ record.department?.name || 'Unassigned' }}</a-typography-text>
              <a-typography-text v-else-if="column.key === 'serial'">{{ record.serialNumber || '—' }}</a-typography-text>
              <a-tooltip v-else-if="column.key === 'qr'" :title="record.qrCode"><QrcodeOutlined class="asset-page__qr-icon" /></a-tooltip>
              <StatusTag v-else-if="column.key === 'status'" :status="record.status" />
              <a-space v-else-if="column.key === 'actions'" :size="2">
                <a-tooltip title="View details"><a-button type="text" :icon="h(EyeOutlined)" @click="openAsset(record)" /></a-tooltip>
                <a-tooltip v-if="canUpdateAsset" title="Edit asset"><a-button type="text" :icon="h(EditOutlined)" @click="router.push({ name: 'asset-edit', params: { id: record.id } })" /></a-tooltip>
              </a-space>
            </template>
          </a-table>
          <footer class="asset-page__footer">
            <a-typography-text type="secondary">Showing {{ (result.page - 1) * result.pageSize + 1 }}-{{ Math.min(result.page * result.pageSize, result.total) }} of {{ result.total }} assets</a-typography-text>
            <a-pagination :current="result.page" :page-size="result.pageSize" :total="result.total" :show-size-changer="false" @change="changePage" />
          </footer>
        </template>
      </section>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.asset-page { min-height: calc(100vh - 64px); padding: 20px; }
.asset-page__screen-id { color: #8c8c8c; }
.asset-page__filters, .asset-page__table-surface { border: 1px solid #f0f0f0; border-radius: 8px; background: #fff; box-shadow: 0 2px 8px rgb(0 0 0 / 4%); }
.asset-page__filters { margin-bottom: 16px; padding: 14px; }
.asset-page__filter-topline { align-items: center; display: flex; gap: 12px; }
.asset-page__search, .asset-page__scan { width: 224px; }
.asset-page__toolbar-actions { display: flex; gap: 10px; margin-left: auto; }
.asset-page__filter-grid { display: grid; gap: 14px; grid-template-columns: repeat(5, minmax(0, 1fr)); margin-top: 16px; max-width: 860px; }
.asset-page__filter-grid label { display: grid; gap: 5px; color: #1f1f1f; font-size: 12px; font-weight: 600; }
.asset-page__table-surface { min-height: 600px; overflow: hidden; }
.asset-page__table-surface :deep(.ant-table) { font-size: 13px; }
.asset-page__table-surface :deep(.ant-table-thead > tr > th) { color: #595959; font-size: 11px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; }
.asset-page__table-surface :deep(.ant-table-tbody > tr > td) { padding-block: 14px; }
.asset-page__asset-cell { align-items: center; display: flex; gap: 10px; }
.asset-page__asset-cell :deep(.ant-avatar) { flex: 0 0 auto; background: #fff7e6; border: 1px solid #f0f0f0; }
.asset-page__qr-icon { color: #262626; font-size: 16px; }
.asset-page__footer { align-items: center; display: flex; justify-content: space-between; padding: 12px 14px; }
@media (max-width: 900px) { .asset-page__filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: none; }.asset-page__filter-topline { align-items: stretch; flex-wrap: wrap; }.asset-page__toolbar-actions { margin-left: 0; }.asset-page__search, .asset-page__scan { flex: 1 1 220px; } }
@media (max-width: 640px) { .asset-page { padding: 12px; }.asset-page__filter-grid { grid-template-columns: 1fr; }.asset-page__toolbar-actions { width: 100%; }.asset-page__toolbar-actions :deep(.ant-btn) { flex: 1; }.asset-page__footer { align-items: flex-start; flex-direction: column; gap: 12px; } }
</style>
