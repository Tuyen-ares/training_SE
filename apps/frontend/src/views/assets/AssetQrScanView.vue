<script setup>
import { h, ref } from 'vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'

import WorkspaceLayout from '../../components/layout/WorkspaceLayout.vue'
import AssetQrScanner from '../../components/assets/AssetQrScanner.vue'
import { parseAssetQrPayload } from '../../utils/asset-qr'

const router = useRouter()
const errorMessage = ref('')

async function handleDecoded(rawValue) {
  try {
    errorMessage.value = ''
    const qrCode = parseAssetQrPayload(rawValue)
    await router.push({ name: 'qr-entry', params: { qrCode } })
  } catch (error) {
    errorMessage.value = error.message || 'This QR code could not be opened.'
  }
}
</script>

<template>
  <WorkspaceLayout>
    <template #context><a-typography-text strong>Asset QR Scan</a-typography-text></template>
    <main class="asset-scan-page">
      <a-button type="link" :icon="h(ArrowLeftOutlined)" @click="router.push({ name: 'assets' })">Back to Asset List</a-button>
      <a-card title="Scan Asset QR Code" :bordered="false">
        <p>Use your camera or upload a QR image to open the asset details.</p>
        <a-alert v-if="errorMessage" type="error" show-icon :message="errorMessage" />
        <AssetQrScanner @decoded="handleDecoded" />
      </a-card>
    </main>
  </WorkspaceLayout>
</template>

<style scoped>
.asset-scan-page { max-width: 720px; margin: 0 auto; padding: 24px; }
.asset-scan-page p { color: var(--bigin-text-secondary); }
</style>
