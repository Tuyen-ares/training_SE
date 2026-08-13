<script setup>
import { computed, h, onMounted, ref, watch } from 'vue'
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined, QrcodeOutlined } from '@ant-design/icons-vue'
import { Modal, message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getAsset, retireAsset } from '../../services/asset.service'
import ReportIssueDialog from '../../components/assets/ReportIssueDialog.vue'
import StatusTag from '../../components/common/StatusTag.vue'
import { statusLabel } from '../../constants/status-meta'
import { DEFAULT_ASSET_IMAGE } from '../../constants/media'
import { downloadAssetQr, generateAssetQr, printAssetQr } from '../../utils/asset-qr'
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
const qrImage = ref('')
const qrLoading = ref(false)
const qrError = ref('')
const canEdit = computed(() => authStore.hasPermission('asset.update'))
const canRequestRetire = computed(() => authStore.hasPermission('asset.delete'))
const canRetireStatus = computed(() => ['AVAILABLE', 'DAMAGED', 'IN_REPAIR'].includes(asset.value?.status))

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
async function openQr() {
  qrOpen.value = true
  qrError.value = ''
  qrLoading.value = true
  try { qrImage.value = await generateAssetQr(asset.value) } catch (error) { qrError.value = error.message || 'The QR image could not be generated.' } finally { qrLoading.value = false }
}
function downloadQr() {
  if (asset.value && qrImage.value) downloadAssetQr(asset.value, qrImage.value)
}
function printQr() {
  if (!asset.value || !qrImage.value) return
  try { printAssetQr(asset.value, qrImage.value) } catch (error) { qrError.value = error.message || 'The QR label could not be printed.' }
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
            <StatusTag :status="asset.status" />
            <a-button :icon="h(QrcodeOutlined)" @click="openQr">Asset QR</a-button>
            <a-button v-if="canEdit" :icon="h(EditOutlined)" @click="router.push({ name: 'asset-edit', params: { id: asset.id } })">Edit</a-button>
            <a-tooltip v-if="canRequestRetire" :title="canRetireStatus ? 'Retire this asset' : `Assets in ${statusLabel(asset.status)} cannot be retired`">
              <span><a-button danger :disabled="!canRetireStatus" :loading="retiring" :icon="h(DeleteOutlined)" @click="confirmRetire">Retire</a-button></span>
            </a-tooltip>
            <a-button v-if="asset.actions.canReportIssue" type="primary" :icon="h(ExclamationCircleOutlined)" @click="showReportDialog = true">Report Issue</a-button>
          </a-space>
        </div>

        <section class="detail-layout">
          <div class="detail-main">
            <a-card title="Detailed Information" :bordered="false">
              <div class="asset-overview">
                <div class="asset-image-frame">
                  <a-image class="asset-image" :src="asset.imageUrl || DEFAULT_ASSET_IMAGE" :fallback="DEFAULT_ASSET_IMAGE" :alt="asset.model.name" />
                </div>
                <a-descriptions :column="{ xs: 1, sm: 2 }" size="small">
                  <a-descriptions-item label="Serial number">{{ asset.serialNumber || 'Not assigned' }}</a-descriptions-item>
                  <a-descriptions-item label="QR code">{{ asset.qrCode }}</a-descriptions-item>
                  <a-descriptions-item label="Category">{{ asset.type.name }}</a-descriptions-item>
                  <a-descriptions-item label="Brand">{{ asset.brand.name }}</a-descriptions-item>
                  <a-descriptions-item label="Model">{{ asset.model.name }}</a-descriptions-item>
                  <a-descriptions-item label="Managing department">{{ asset.department?.name || 'Unassigned' }}</a-descriptions-item>
                  <a-descriptions-item label="Current status"><StatusTag :status="asset.status" /></a-descriptions-item>
                </a-descriptions>
              </div>
            </a-card>
          </div>
          <a-card class="status-card" title="Current Asset Status" :bordered="false">
            <StatusTag :status="asset.status" />
            <p>Status is derived from the active asset workflow.</p>
          </a-card>
        </section>
      </template>

      <ReportIssueDialog v-if="showReportDialog && asset" :asset-id="asset.id" @close="showReportDialog = false" @reported="issueReported" />
      <a-drawer v-if="asset" v-model:open="qrOpen" title="Asset QR Label" width="360">
        <div class="qr-drawer">
          <a-spin v-if="qrLoading" />
          <a-alert v-else-if="qrError" type="error" show-icon :message="qrError" />
          <template v-else-if="qrImage">
            <img class="qr-drawer__image" :src="qrImage" alt="Asset QR Code" />
            <strong>{{ asset.serialNumber || asset.model.name }}</strong>
            <span>{{ asset.model.name }}</span>
            <a-space direction="vertical" block>
              <a-button type="primary" block @click="downloadQr">Download QR Label</a-button>
              <a-button block @click="printQr">Print QR Label</a-button>
            </a-space>
          </template>
        </div>
      </a-drawer>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.asset-page-content { max-width: 1320px; width: 100%; margin: 0 auto; padding: 20px 24px 32px; }.back-button { padding-inline: 0; margin: 4px 0 12px; }.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 8px; }.page-heading :deep(.ant-typography) { margin-bottom: 4px; }.detail-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:18px}.asset-overview{display:grid;grid-template-columns:220px minmax(0,1fr);gap:24px}.asset-image-frame{width:220px;height:190px;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:8px;background:var(--bigin-surface-inset)}.asset-image-frame :deep(.ant-image){width:100%;height:100%;display:flex;align-items:center;justify-content:center}.asset-image-frame :deep(.ant-image-img){width:100%;height:100%;object-fit:contain}.status-card{align-self:start}.status-card p{color:var(--bigin-text-tertiary);margin-top:12px}.qr-drawer{display:grid;gap:18px;text-align:center}.qr-drawer__image{width:256px;height:256px;max-width:100%;object-fit:contain;margin-inline:auto}.qr-drawer strong{word-break:break-all}.qr-drawer span{color:var(--bigin-text-tertiary)}@media(max-width:800px){.detail-layout{grid-template-columns:1fr}.asset-overview{grid-template-columns:1fr}.asset-image-frame{width:100%;max-width:220px}}@media (max-width: 640px) { .asset-page-content { padding: 16px; }.page-heading { align-items: flex-start; flex-direction: column; } }
</style>
