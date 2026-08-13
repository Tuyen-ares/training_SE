<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { EditOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import { createCatalogItem, listCatalog, updateCatalogItem } from '../../services/asset-catalog.service'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const loading = ref(true)
const errorMessage = ref('')
const activeTab = ref('brands')
const data = reactive({ brands: [], types: [], models: [] })
const dialog = reactive({ open: false, saving: false, resource: 'brands', item: null, name: '', brandId: undefined, assetTypeId: undefined })

const tabs = computed(() => [
  { key: 'brands', label: 'Brands', resource: 'brands', view: 'brand.view', create: 'brand.create', update: 'brand.update' },
  { key: 'types', label: 'Asset Types', resource: 'asset-types', view: 'asset_type.view', create: 'asset_type.create', update: 'asset_type.update' },
  { key: 'models', label: 'Asset Models', resource: 'asset-models', view: 'asset_model.view', create: 'asset_model.create', update: 'asset_model.update' },
].filter((tab) => [tab.view, tab.create, tab.update].some((code) => authStore.hasPermission(code))))
const currentTab = computed(() => tabs.value.find((tab) => tab.key === activeTab.value) || tabs.value[0])
const currentItems = computed(() => data[currentTab.value?.key] || [])
const canCreate = computed(() => currentTab.value && authStore.hasPermission(currentTab.value.create))

function canUpdate(tab) { return authStore.hasPermission(tab.update) }
function brandName(id) { return data.brands.find((item) => item.id === id)?.name || `Brand #${id}` }
function typeName(id) { return data.types.find((item) => item.id === id)?.name || `Type #${id}` }

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const requests = [
      authStore.hasPermission('brand.view') ? listCatalog(authStore.api, 'brands') : Promise.resolve([]),
      authStore.hasPermission('asset_type.view') ? listCatalog(authStore.api, 'asset-types') : Promise.resolve([]),
      authStore.hasPermission('asset_model.view') ? listCatalog(authStore.api, 'asset-models') : Promise.resolve([]),
    ]
    const [brands, types, models] = await Promise.all(requests)
    Object.assign(data, { brands, types, models })
    if (!tabs.value.some((tab) => tab.key === activeTab.value)) activeTab.value = tabs.value[0]?.key
  } catch (error) { errorMessage.value = error.message || 'The asset catalog could not be loaded.' }
  finally { loading.value = false }
}

function openDialog(item = null) {
  const tab = currentTab.value
  Object.assign(dialog, {
    open: true,
    resource: tab.resource,
    item,
    name: item?.name || '',
    brandId: item?.brandId,
    assetTypeId: item?.assetTypeId,
  })
}

async function saveDialog() {
  const name = dialog.name.trim()
  if (!name) return message.error('Name is required.')
  if (name.length > 30) return message.error('Name must be 30 characters or fewer.')
  if (dialog.resource === 'asset-models' && (!dialog.brandId || !dialog.assetTypeId)) return message.error('Brand and asset type are required.')
  dialog.saving = true
  try {
    const payload = dialog.resource === 'asset-models'
      ? { name, brandId: dialog.brandId, assetTypeId: dialog.assetTypeId }
      : { name }
    if (dialog.item) await updateCatalogItem(authStore.api, dialog.resource, dialog.item.id, payload)
    else await createCatalogItem(authStore.api, dialog.resource, payload)
    message.success(dialog.item ? 'Catalog item updated.' : 'Catalog item created.')
    dialog.open = false
    await load()
  } catch (error) { message.error(error.message || 'The catalog item could not be saved.') }
  finally { dialog.saving = false }
}

onMounted(load)
</script>

<template>
  <WorkspaceLayout>
    <template #context><a-typography-text strong>Asset Catalog</a-typography-text></template>
    <main class="catalog-page bigin-page-container">
      <header class="catalog-page__header"><div><a-typography-title :level="1">Asset Catalog</a-typography-title><a-typography-paragraph type="secondary">Manage brands, asset types and models. Catalog deletion is not available in this MVP.</a-typography-paragraph></div><a-button v-if="canCreate" class="bigin-touch-target" type="primary" @click="openDialog()"><template #icon><PlusOutlined /></template>Add {{ currentTab?.label.slice(0, -1) }}</a-button></header>
      <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage"><template #action><a-button size="small" @click="load">Retry</a-button></template></a-alert>
      <a-card v-else :bordered="false">
        <a-tabs v-model:active-key="activeTab">
          <a-tab-pane v-for="tab in tabs" :key="tab.key" :tab="tab.label" />
        </a-tabs>
        <a-skeleton v-if="loading" active :paragraph="{ rows: 7 }" />
        <a-empty v-else-if="!currentItems.length" description="No catalog items yet." />
        <div v-else class="bigin-table-scroll-wrapper"><a-table :data-source="currentItems" row-key="id" :pagination="false" :scroll="{ x: 'max-content' }">
          <a-table-column title="ID" data-index="id" width="90" />
          <a-table-column title="Name" data-index="name" :width="240" />
          <a-table-column v-if="currentTab?.key === 'models'" title="Brand" :width="180"><template #default="{ record }">{{ brandName(record.brandId) }}</template></a-table-column>
          <a-table-column v-if="currentTab?.key === 'models'" title="Asset Type" :width="180"><template #default="{ record }">{{ typeName(record.assetTypeId) }}</template></a-table-column>
          <a-table-column title="Action" width="120"><template #default="{ record }"><a-button v-if="canUpdate(currentTab)" class="bigin-touch-target" type="link" @click="openDialog(record)"><template #icon><EditOutlined /></template>Edit</a-button></template></a-table-column>
        </a-table></div>
      </a-card>
    </main>

    <a-modal v-model:open="dialog.open" wrap-class-name="bigin-modal-content" :title="dialog.item ? 'Edit catalog item' : 'Create catalog item'" :confirm-loading="dialog.saving" ok-text="Save" @ok="saveDialog">
      <a-form layout="vertical">
        <a-form-item label="Name" required><a-input v-model:value="dialog.name" :maxlength="30" @press-enter="saveDialog" /></a-form-item>
        <template v-if="dialog.resource === 'asset-models'">
          <a-form-item label="Brand" required><a-select v-model:value="dialog.brandId" show-search option-filter-prop="label" :options="data.brands.map(item => ({ value: item.id, label: item.name }))" /></a-form-item>
          <a-form-item label="Asset type" required><a-select v-model:value="dialog.assetTypeId" show-search option-filter-prop="label" :options="data.types.map(item => ({ value: item.id, label: item.name }))" /></a-form-item>
        </template>
      </a-form>
    </a-modal>
  </WorkspaceLayout>
</template>

<style scoped>
.catalog-page { margin: 0 auto; max-width: 1160px; min-width: 0; padding: 24px 16px 40px; }.catalog-page__header { align-items: flex-start; display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; }.catalog-page__header > div { min-width: 0; }.catalog-page__header :deep(.ant-typography) { margin-bottom: 4px; overflow-wrap: anywhere; }@media (max-width: 767px) { .catalog-page { padding: 16px 12px 32px; }.catalog-page__header { flex-direction: column; }.catalog-page__header :deep(.ant-btn) { width: 100%; } }
</style>
