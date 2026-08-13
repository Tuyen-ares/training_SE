<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'

import StatusTag from '../../components/common/StatusTag.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import { createAsset, getAsset, listAssetLookups, updateAsset } from '../../services/asset.service'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const formRef = ref()
const loading = ref(true)
const saving = ref(false)
const forbidden = ref(false)
const notFound = ref(false)
const errorMessage = ref('')
const lookups = ref({ models: [], departments: [] })
const form = reactive({ assetModelId: undefined, serialNumber: '', imageUrl: '', departmentId: undefined })
const isEdit = computed(() => route.name === 'asset-edit')
const pageTitle = computed(() => isEdit.value ? 'Edit Asset' : 'Add New Asset')

const rules = {
  assetModelId: [{ required: true, message: 'Select an asset model.' }],
  serialNumber: [{ max: 100, message: 'Serial number must be 100 characters or fewer.' }],
  imageUrl: [
    { max: 500, message: 'Image URL must be 500 characters or fewer.' },
    { type: 'url', warningOnly: false, message: 'Enter a valid image URL.' },
  ],
}

async function load() {
  loading.value = true
  forbidden.value = false
  notFound.value = false
  errorMessage.value = ''
  try {
    const [lookupData, asset] = await Promise.all([
      listAssetLookups(authStore.api),
      isEdit.value ? getAsset(authStore.api, route.params.id) : Promise.resolve(null),
    ])
    lookups.value = lookupData
    if (asset) {
      Object.assign(form, {
        assetModelId: asset.model.id,
        serialNumber: asset.serialNumber || '',
        imageUrl: asset.imageUrl || '',
        departmentId: asset.department?.id,
      })
    }
  } catch (error) {
    if (error.status === 403) forbidden.value = true
    else if (error.status === 404) notFound.value = true
    else errorMessage.value = error.message || 'The asset form could not be loaded.'
  } finally { loading.value = false }
}

async function submit() {
  try { await formRef.value.validate() } catch { return }
  saving.value = true
  try {
    const payload = {
      assetModelId: form.assetModelId,
      serialNumber: form.serialNumber.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      departmentId: form.departmentId ?? null,
    }
    const saved = isEdit.value
      ? await updateAsset(authStore.api, route.params.id, payload)
      : await createAsset(authStore.api, payload)
    message.success(isEdit.value ? 'Asset updated successfully.' : 'Asset created successfully.')
    await router.push({ name: 'asset-detail', params: { id: saved.id } })
  } catch (error) {
    if (error.status === 403) forbidden.value = true
    else message.error(error.message || 'The asset could not be saved.')
  } finally { saving.value = false }
}

onMounted(load)
</script>

<template>
  <WorkspaceLayout>
    <template #context><a-typography-text strong>{{ pageTitle }}</a-typography-text></template>
    <main class="asset-form-page">
      <a-breadcrumb><a-breadcrumb-item><a @click="router.push({ name: 'assets' })">Assets</a></a-breadcrumb-item><a-breadcrumb-item>{{ pageTitle }}</a-breadcrumb-item></a-breadcrumb>
      <a-skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
      <a-result v-else-if="forbidden" status="403" title="You do not have permission to use this asset form." />
      <a-result v-else-if="notFound" status="404" title="The requested asset was not found." />
      <a-alert v-else-if="errorMessage" type="error" show-icon :message="errorMessage"><template #action><a-button size="small" @click="load">Retry</a-button></template></a-alert>
      <template v-else>
      <header class="asset-form-heading"><a-typography-title :level="2">{{ pageTitle }}</a-typography-title><a-typography-paragraph type="secondary">Fill in the details for the asset. A QR code is generated automatically after saving.</a-typography-paragraph></header>
      <section class="asset-form-panel">
        <h3>General Information</h3>
        <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" @finish="submit">
          <a-form-item name="assetModelId" label="Asset model">
            <a-select v-model:value="form.assetModelId" show-search option-filter-prop="label" placeholder="Select a model" :options="lookups.models.map(item => ({ value: item.id, label: item.name }))" />
          </a-form-item>
          <a-form-item name="serialNumber" label="Serial number">
            <a-input v-model:value="form.serialNumber" allow-clear :maxlength="100" placeholder="Optional unique serial number" />
          </a-form-item>
          <a-form-item name="imageUrl" label="Image URL">
            <a-input v-model:value="form.imageUrl" allow-clear :maxlength="500" placeholder="https://example.com/asset.png" />
          </a-form-item>
          <a-form-item name="departmentId" label="Managing department">
            <a-select v-model:value="form.departmentId" allow-clear show-search option-filter-prop="label" placeholder="Unassigned" :options="lookups.departments.map(item => ({ value: item.id, label: item.name }))" />
          </a-form-item>
          <div class="initial-status"><span>Initial Status</span><StatusTag status="AVAILABLE" /><small>New assets are available by default.</small></div>
          <a-alert type="info" show-icon message="Auto Generate QR Code" description="A unique QR code is generated automatically after you save this asset." />
          <a-space class="form-actions bigin-responsive-footer"><a-button class="bigin-touch-target" @click="router.back()">Cancel</a-button><a-button class="bigin-touch-target" type="primary" html-type="submit" :loading="saving">{{ isEdit ? 'Save changes' : 'Create asset' }}</a-button></a-space>
        </a-form>
      </section>
      </template>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.asset-form-page { margin: 0 auto; max-width: 920px; min-width: 0; padding: 24px 16px 40px; }.asset-form-heading{margin:20px 0 14px}.asset-form-heading :deep(.ant-typography){margin-bottom:4px}.asset-form-panel { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; padding: 24px; }.asset-form-panel h3{border-bottom:1px solid var(--bigin-border-secondary);padding-bottom:14px}.asset-form-panel :deep(.ant-form) { max-width: 760px; }.initial-status{display:grid;gap:6px;margin-bottom:18px}.initial-status>span{font-weight:600}.initial-status :deep(.ant-tag){justify-self:start}.initial-status small{color:var(--bigin-text-tertiary)}.form-actions{display:flex;justify-content:flex-end;margin-top:22px}.form-actions :deep(.ant-btn) { min-width: 116px; }@media (max-width: 575px) { .asset-form-page { padding: 16px 12px 32px; }.asset-form-panel { padding: 16px; }.form-actions { align-items: stretch; flex-direction: column; width: 100%; }.form-actions :deep(.ant-btn) { width: 100%; } }
</style>
