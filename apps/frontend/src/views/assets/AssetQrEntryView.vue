<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { findAssetByQr } from '../../services/asset.service'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const errorMessage = ref('')
const errorStatus = ref('404')

onMounted(async () => {
  try {
    const asset = await findAssetByQr(authStore.api, route.params.qrCode)
    await router.replace({ name: 'asset-detail', params: { id: asset.id } })
  } catch (error) {
    errorStatus.value = error.status === 403 ? '403' : error.status === 404 ? '404' : 'error'
    errorMessage.value = error.status === 404
      ? 'The asset for this QR code was not found.'
      : error.status === 403
        ? 'You do not have permission to view this asset.'
        : (error.message || 'The asset could not be opened.')
  }
})
</script>

<template>
  <main class="qr-entry-page">
    <a-spin v-if="!errorMessage" size="large" />
    <a-result v-else :status="errorStatus" :title="errorStatus === '403' ? 'Access denied' : errorStatus === '404' ? 'Asset not found' : 'Could not open asset'" :sub-title="errorMessage">
      <template #extra><a-button type="primary" @click="router.push({ name: 'dashboard' })">Back to Dashboard</a-button></template>
    </a-result>
  </main>
</template>

<style scoped>
.qr-entry-page { display: grid; min-height: 100vh; place-items: center; padding: 24px; }
</style>
