<script setup>
import { computed, h, onMounted, ref, watch } from 'vue'
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined, HistoryOutlined, QrcodeOutlined } from '@ant-design/icons-vue'
import { Modal, message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getAsset, retireAsset } from '../../services/asset.service'
import ReportIssueDialog from '../../components/assets/ReportIssueDialog.vue'
import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const asset = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const notFound = ref(false)
const forbidden = ref(false)
const showReportDialog = ref(false)
const retiring = ref(false)
const qrOpen = ref(false)
const activeTab = ref('overview')
const canEdit = computed(() => authStore.hasPermission('asset.update'))
const canRequestRetire = computed(() => authStore.hasPermission('asset.delete'))
const canRetireStatus = computed(() => ['AVAILABLE', 'DAMAGED', 'IN_REPAIR'].includes(asset.value?.status))
const statusColor = computed(() => ({ AVAILABLE: 'success', RESERVED: 'processing', BORROWED: 'blue', DAMAGED: 'error', IN_REPAIR: 'warning', RETIRED: 'default' })[asset.value?.status])

async function loadAsset() {
  loading.value = true
  errorMessage.value = ''
  notFound.value = false
  forbidden.value = false
  try { asset.value = await getAsset(authStore.api, route.params.id) }
  catch (error) {
    if (error.status === 404) notFound.value = true
    else if (error.status === 403) forbidden.value = true
    else errorMessage.value = error.message || 'The asset details could not be loaded.'
  } finally { loading.value = false }
}

async function issueReported() { await loadAsset() }
function confirmRetire() {
  Modal.confirm({
    title: 'Retire this asset?',
    content: 'The asset will no longer participate in borrowing or repair workflows.',
    okText: 'Retire asset',
    okType: 'danger',
    cancelText: 'Cancel',
    async onOk() {
      retiring.value = true
      try {
        await retireAsset(authStore.api, asset.value.id)
        message.success('Asset retired successfully.')
        await loadAsset()
      } catch (error) {
        message.error(error.message || 'The asset could not be retired.')
        throw error
      } finally { retiring.value = false }
    },
  })
}
watch(() => route.params.id, loadAsset)
onMounted(loadAsset)
</script>

<template>
  <WorkspaceLayout>
    <template #context><a-typography-text strong>Asset Details</a-typography-text></template>
    <main class="asset-page-content">
      <a-breadcrumb>
        <a-breadcrumb-item><a @click="router.push({ name: 'assets' })">Assets</a></a-breadcrumb-item>
        <a-breadcrumb-item>Details</a-breadcrumb-item>
      </a-breadcrumb>
      <a-button class="back-button" type="link" :icon="h(ArrowLeftOutlined)" @click="router.push({ name: 'assets' })">Back to Asset List</a-button>

      <a-skeleton v-if="loading" active :paragraph="{ rows: 10 }" />
      <a-result v-else-if="forbidden" status="403" title="You do not have access to this asset." />
      <a-result v-else-if="notFound" status="404" title="The requested asset was not found." />
      <a-alert v-else-if="errorMessage" type="error" show-icon :message="errorMessage">
        <template #action><a-button size="small" @click="loadAsset">Retry</a-button></template>
      </a-alert>
      <template v-else-if="asset">
        <div class="page-heading">
          <div>
            <a-typography-title :level="1">{{ asset.serialNumber || asset.model.name }}</a-typography-title>
            <a-typography-text type="secondary">{{ asset.model.name }} · {{ asset.brand.name }}</a-typography-text>
          </div>
          <a-space>
            <a-tag :color="statusColor">{{ asset.status }}</a-tag>
            <a-button :icon="h(QrcodeOutlined)" @click="qrOpen = true">Asset QR</a-button>
            <a-button v-if="canEdit" :icon="h(EditOutlined)" @click="router.push({ name: 'asset-edit', params: { id: asset.id } })">Edit</a-button>
            <a-tooltip v-if="canRequestRetire" :title="canRetireStatus ? 'Retire this asset' : `Assets in ${asset.status} cannot be retired`">
              <span><a-button danger :disabled="!canRetireStatus" :loading="retiring" :icon="h(DeleteOutlined)" @click="confirmRetire">Retire</a-button></span>
            </a-tooltip>
            <a-button v-if="asset.actions.canReportIssue" type="primary" :icon="h(ExclamationCircleOutlined)" @click="showReportDialog = true">Report Issue</a-button>
          </a-space>
        </div>

        <a-tabs v-model:active-key="activeTab" class="asset-tabs">
          <a-tab-pane key="overview" tab="Overview" />
          <a-tab-pane v-if="authStore.hasPermission('borrow_history.view_own') || authStore.hasPermission('borrow_history.view_all')" key="borrowing" tab="Borrowing Activity" />
        </a-tabs>
        <section v-if="activeTab === 'overview'" class="detail-layout">
          <div class="detail-main">
            <a-card title="Detailed Information" :bordered="false">
              <div class="asset-overview">
                <a-image v-if="asset.imageUrl" class="asset-image" :src="asset.imageUrl" :alt="asset.model.name" />
                <a-descriptions :column="{ xs: 1, sm: 2 }" size="small">
                  <a-descriptions-item label="Serial number">{{ asset.serialNumber || 'Not assigned' }}</a-descriptions-item>
                  <a-descriptions-item label="QR code">{{ asset.qrCode }}</a-descriptions-item>
                  <a-descriptions-item label="Category">{{ asset.type.name }}</a-descriptions-item>
                  <a-descriptions-item label="Brand">{{ asset.brand.name }}</a-descriptions-item>
                  <a-descriptions-item label="Model">{{ asset.model.name }}</a-descriptions-item>
                  <a-descriptions-item label="Managing department">{{ asset.department?.name || 'Unassigned' }}</a-descriptions-item>
                  <a-descriptions-item label="Current status"><a-tag :color="statusColor">{{ asset.status }}</a-tag></a-descriptions-item>
                </a-descriptions>
              </div>
            </a-card>
          </div>
          <a-card class="status-card" title="Current Asset Status" :bordered="false">
            <a-tag :color="statusColor">{{ asset.status }}</a-tag>
            <p>Status is derived from the active asset workflow.</p>
          </a-card>
        </section>
        <a-card v-else title="Borrowing Activity" :bordered="false">
          <a-empty description="Borrowing Activity is the main screen for current borrowing and history.">
            <a-button type="primary" :icon="h(HistoryOutlined)" @click="router.push({ name: 'borrowing-activity' })">Open Borrowing Activity</a-button>
          </a-empty>
        </a-card>
      </template>

      <ReportIssueDialog v-if="showReportDialog && asset" :asset-id="asset.id" @close="showReportDialog = false" @reported="issueReported" />
      <a-drawer v-if="asset" v-model:open="qrOpen" title="Asset Tag QR Code" width="360">
        <div class="qr-drawer"><QrcodeOutlined /><strong>{{ asset.qrCode }}</strong><span>{{ asset.serialNumber || asset.model.name }}</span><a-button type="primary" block>Print QR Label</a-button></div>
      </a-drawer>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.asset-page-content { max-width: 1320px; width: 100%; margin: 0 auto; padding: 20px 24px 32px; }.back-button { padding-inline: 0; margin: 4px 0 12px; }.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 8px; }.page-heading :deep(.ant-typography) { margin-bottom: 4px; }.asset-tabs{margin-bottom:16px}.detail-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:18px}.asset-overview{display:grid;grid-template-columns:220px minmax(0,1fr);gap:24px}.asset-image{max-height:190px;object-fit:contain}.status-card{align-self:start}.status-card p{color:#8c8c8c;margin-top:12px}.qr-drawer{display:grid;gap:18px;text-align:center}.qr-drawer :deep(.anticon){font-size:160px}.qr-drawer strong{word-break:break-all}.qr-drawer span{color:#8c8c8c}@media(max-width:800px){.detail-layout{grid-template-columns:1fr}.asset-overview{grid-template-columns:1fr}}@media (max-width: 640px) { .asset-page-content { padding: 16px; }.page-heading { align-items: flex-start; flex-direction: column; } }
</style>
