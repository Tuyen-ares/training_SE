<script setup>
import { computed, h, onMounted, reactive, ref } from 'vue'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import StatusTag from '../../components/common/StatusTag.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import { listAssets } from '../../services/assets/asset.service'
import { createBorrowRequest } from '../../services/borrowing/borrowing.service'
import { useAuthStore } from '../../stores/auth'
import { DEFAULT_ASSET_IMAGE } from '../../constants/media'
import { displayAssetValue, formatAssetOption, normalizeAssetIdentity } from '../../utils/asset-identity'

const router = useRouter()
const authStore = useAuthStore()
const availableAssets = ref([])
const selectedAssetId = ref()
const loadingAssets = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const purposeError = ref('')
const form = reactive({ note: '', items: [] })
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
const selectedIds = computed(() => new Set(form.items.map((item) => item.asset.id)))
const assetOptions = computed(() => availableAssets.value
  .filter((asset) => !selectedIds.value.has(asset.id))
  .map((asset) => ({ value: asset.id, label: formatAssetOption(asset) })))

async function loadAssets() {
  try {
    const result = await listAssets(authStore.api, { status: 'AVAILABLE', page: 1, pageSize: 100 })
    availableAssets.value = result.items
  } catch (error) { errorMessage.value = error.message || 'Available assets could not be loaded.' }
  finally { loadingAssets.value = false }
}

function addAsset() {
  const asset = availableAssets.value.find((item) => item.id === selectedAssetId.value)
  if (!asset) return
  form.items.push({ asset, expectedReturnDate: '' })
  selectedAssetId.value = undefined
}

async function submit() {
  if (!form.items.length) return message.warning('Add at least one asset.')
  if (form.items.some((item) => !item.expectedReturnDate)) return message.warning('Choose an expected return date for every asset.')
  const note = form.note.trim()
  if (!note) {
    purposeError.value = 'Borrowing purpose is required.'
    return
  }
  purposeError.value = ''
  submitting.value = true
  try {
    const created = await createBorrowRequest(authStore.api, {
      note,
      items: form.items.map((item) => ({ assetId: item.asset.id, expectedReturnDate: item.expectedReturnDate })),
    })
    message.success('Borrow request submitted.')
    await router.push({ name: 'borrow-request-detail', params: { id: created.id } })
  } catch (error) { message.error(error.message || 'The borrow request could not be submitted.') }
  finally { submitting.value = false }
}

onMounted(loadAssets)
</script>

<template>
  <WorkspaceLayout>
    <template #context><strong>Create Borrow Request</strong></template>
    <main class="borrow-page borrow-page--create bigin-page-container">
      <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" />
      <div class="create-grid">
        <div class="create-main">
          <section class="panel general-panel">
            <h2>General Information</h2>
            <label>Borrowing Purpose <span class="required">*</span></label>
            <a-textarea
              v-model:value="form.note"
              :maxlength="300"
              :rows="4"
              :status="purposeError ? 'error' : undefined"
              placeholder="Describe why these assets are needed..."
              @input="purposeError = ''"
            />
            <div v-if="purposeError" class="field-error">{{ purposeError }}</div>
          </section>
          <section class="panel asset-selection">
            <header><h2>Asset List <a-tag>{{ form.items.length }}</a-tag></h2></header>
            <div class="asset-picker">
              <a-select v-model:value="selectedAssetId" show-search option-filter-prop="label" :loading="loadingAssets" :options="assetOptions" placeholder="Select an available asset" />
              <a-button class="bigin-touch-target" :icon="h(PlusOutlined)" :disabled="!selectedAssetId" @click="addAsset">Add Asset</a-button>
            </div>
            <a-empty v-if="!form.items.length" description="No assets added yet." />
            <article v-for="(item, index) in form.items" :key="item.asset.id" class="asset-row">
              <a-avatar shape="square" :size="52" :src="item.asset.imageUrl || DEFAULT_ASSET_IMAGE">{{ displayAssetValue(normalizeAssetIdentity(item.asset).modelName).slice(0, 1) }}</a-avatar>
              <div class="asset-copy"><strong>{{ displayAssetValue(normalizeAssetIdentity(item.asset).modelName) }}</strong><span>{{ item.asset.brand?.name || '—' }}</span><small>Code: {{ displayAssetValue(normalizeAssetIdentity(item.asset).assetCode) }} · Seri: {{ displayAssetValue(normalizeAssetIdentity(item.asset).serialNumber) }}</small><StatusTag status="AVAILABLE" /></div>
              <label class="date-field"><span>Expected return</span><input v-model="item.expectedReturnDate" type="date" :min="today"></label>
              <a-button class="bigin-touch-target" type="text" danger aria-label="Remove asset" :icon="h(DeleteOutlined)" @click="form.items.splice(index, 1)" />
            </article>
          </section>
        </div>
        <aside class="panel summary-panel">
          <h2>Request Summary</h2>
          <dl><dt>Requester</dt><dd>{{ authStore.user?.name }}</dd><dt>Department</dt><dd>{{ authStore.user?.department?.name || '—' }}</dd><dt>Asset quantity</dt><dd>{{ String(form.items.length).padStart(2, '0') }}</dd><dt>Request type</dt><dd><a-tag color="orange">Asset Borrow</a-tag></dd></dl>
          <a-button class="bigin-touch-target" type="primary" block :loading="submitting" @click="submit">Submit Request</a-button>
          <a-button class="bigin-touch-target" block @click="router.push({ name: 'my-requests' })">Cancel</a-button>
        </aside>
      </div>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.borrow-page{min-height:calc(100vh - 68px);min-width:0;padding:24px}.screen-code{color:var(--bigin-text-tertiary)}.create-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px;max-width:1280px;margin:auto;min-width:0}.create-main{display:grid;gap:20px;min-width:0}.panel{background:var(--bigin-surface-panel);border:1px solid var(--bigin-border-secondary);border-radius:8px;padding:22px;min-width:0}.panel h2{font-size:18px;margin:0 0 18px}.general-panel label{display:block;font-weight:600;margin-bottom:8px}.required{color:var(--bigin-color-error)}.field-error{color:var(--bigin-color-error);font-size:12px;margin-top:6px}.asset-selection{padding:0}.asset-selection header{padding:18px 22px 0}.asset-picker{display:flex;gap:10px;padding:0 22px 18px}.asset-picker :deep(.ant-select){flex:1;min-width:0}.asset-row{display:grid;grid-template-columns:auto minmax(0,1fr) 170px auto;gap:14px;align-items:center;border-top:1px solid var(--bigin-border-secondary);padding:16px 22px}.asset-copy{display:grid;gap:3px;min-width:0}.asset-copy span{color:var(--bigin-text-secondary);font-size:12px;overflow-wrap:anywhere}.asset-copy :deep(.ant-tag){justify-self:start}.date-field{display:grid;gap:5px;font-size:12px;color:var(--bigin-text-secondary)}.date-field input{border:1px solid var(--bigin-border-default);border-radius:6px;height:32px;padding:0 9px;background:var(--bigin-surface-panel);color:var(--bigin-text-primary);max-width:100%}.summary-panel{align-self:start}.summary-panel dl{display:grid;grid-template-columns:1fr auto;gap:14px;margin:0 0 22px;padding:18px 0;border-block:1px solid var(--bigin-border-secondary)}.summary-panel dt{color:var(--bigin-text-secondary)}.summary-panel dd{margin:0;text-align:right;overflow-wrap:anywhere}.summary-panel :deep(.ant-btn){margin-top:10px}@media(max-width:900px){.create-grid{grid-template-columns:1fr}.summary-panel{order:-1}.asset-row{grid-template-columns:auto 1fr auto}.date-field{grid-column:2/3}}@media(max-width:767px){.borrow-page{padding:16px}.asset-picker{flex-direction:column}.asset-row{grid-template-columns:1fr}.date-field{grid-column:auto}}@media(max-width:575px){.borrow-page{padding:12px}.summary-panel :deep(.ant-btn){width:100%}}
</style>
