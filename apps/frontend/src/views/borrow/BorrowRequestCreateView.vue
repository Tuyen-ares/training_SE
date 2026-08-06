<script setup>
import { computed, h, onMounted, reactive, ref } from 'vue'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import { listAssets } from '../../services/asset.service'
import { createBorrowRequest } from '../../services/borrow.service'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const availableAssets = ref([])
const selectedAssetId = ref()
const loadingAssets = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const form = reactive({ note: '', items: [] })
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
const selectedIds = computed(() => new Set(form.items.map((item) => item.asset.id)))
const assetOptions = computed(() => availableAssets.value
  .filter((asset) => !selectedIds.value.has(asset.id))
  .map((asset) => ({ value: asset.id, label: `${asset.model.name} · ${asset.serialNumber || asset.qrCode}` })))

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
  submitting.value = true
  try {
    const created = await createBorrowRequest(authStore.api, {
      note: form.note.trim() || null,
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
    <main class="borrow-page borrow-page--create">
      <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" />
      <div class="create-grid">
        <div class="create-main">
          <section class="panel general-panel">
            <h2>General Information</h2>
            <label>Borrowing Purpose <span class="required">*</span></label>
            <a-textarea v-model:value="form.note" :maxlength="2000" :rows="4" placeholder="Describe why these assets are needed..." />
          </section>
          <section class="panel asset-selection">
            <header><h2>Asset List <a-tag>{{ form.items.length }}</a-tag></h2></header>
            <div class="asset-picker">
              <a-select v-model:value="selectedAssetId" show-search option-filter-prop="label" :loading="loadingAssets" :options="assetOptions" placeholder="Select an available asset" />
              <a-button :icon="h(PlusOutlined)" :disabled="!selectedAssetId" @click="addAsset">Add Asset</a-button>
            </div>
            <a-empty v-if="!form.items.length" description="No assets added yet." />
            <article v-for="(item, index) in form.items" :key="item.asset.id" class="asset-row">
              <a-avatar shape="square" :size="52" :src="item.asset.imageUrl">{{ item.asset.model.name.slice(0, 1) }}</a-avatar>
              <div class="asset-copy"><strong>{{ item.asset.model.name }}</strong><span>{{ item.asset.brand.name }} · SN: {{ item.asset.serialNumber || 'Not assigned' }}</span><a-tag color="success">Available</a-tag></div>
              <label class="date-field"><span>Expected return</span><input v-model="item.expectedReturnDate" type="date" :min="today"></label>
              <a-button type="text" danger aria-label="Remove asset" :icon="h(DeleteOutlined)" @click="form.items.splice(index, 1)" />
            </article>
          </section>
        </div>
        <aside class="panel summary-panel">
          <h2>Request Summary</h2>
          <dl><dt>Requester</dt><dd>{{ authStore.user?.name }}</dd><dt>Department</dt><dd>{{ authStore.user?.department?.name || '—' }}</dd><dt>Asset quantity</dt><dd>{{ String(form.items.length).padStart(2, '0') }}</dd><dt>Request type</dt><dd><a-tag color="orange">Asset Borrow</a-tag></dd></dl>
          <a-button type="primary" block :loading="submitting" @click="submit">Submit Request</a-button>
          <a-button block @click="router.push({ name: 'my-requests' })">Cancel</a-button>
        </aside>
      </div>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.borrow-page{padding:24px;min-height:calc(100vh - 68px)}.screen-code{color:#8c8c8c}.create-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px;max-width:1280px;margin:auto}.create-main{display:grid;gap:20px}.panel{background:#fff;border:1px solid #f0f0f0;border-radius:8px;padding:22px}.panel h2{font-size:18px;margin:0 0 18px}.general-panel label{display:block;font-weight:600;margin-bottom:8px}.required{color:#ff4d4f}.asset-selection{padding:0}.asset-selection header{padding:18px 22px 0}.asset-picker{display:flex;gap:10px;padding:0 22px 18px}.asset-picker :deep(.ant-select){flex:1}.asset-row{display:grid;grid-template-columns:auto minmax(0,1fr) 170px auto;gap:14px;align-items:center;border-top:1px solid #f0f0f0;padding:16px 22px}.asset-copy{display:grid;gap:3px}.asset-copy span{color:#595959;font-size:12px}.asset-copy :deep(.ant-tag){justify-self:start}.date-field{display:grid;gap:5px;font-size:12px;color:#595959}.date-field input{border:1px solid #d9d9d9;border-radius:6px;height:32px;padding:0 9px}.summary-panel{align-self:start}.summary-panel dl{display:grid;grid-template-columns:1fr auto;gap:14px;margin:0 0 22px;padding:18px 0;border-block:1px solid #f0f0f0}.summary-panel dt{color:#595959}.summary-panel dd{margin:0;text-align:right}.summary-panel :deep(.ant-btn){margin-top:10px}@media(max-width:900px){.create-grid{grid-template-columns:1fr}.summary-panel{order:-1}.asset-row{grid-template-columns:auto 1fr auto}.date-field{grid-column:2/3}}@media(max-width:600px){.borrow-page{padding:12px}.asset-picker{flex-direction:column}.asset-row{grid-template-columns:1fr}.date-field{grid-column:auto}}
</style>
