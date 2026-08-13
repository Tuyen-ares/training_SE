<script setup>
import { Html5Qrcode } from 'html5-qrcode'
import { onBeforeUnmount, ref } from 'vue'

const emit = defineEmits(['decoded', 'error'])
const scanner = ref(null)
const imageInput = ref(null)
const running = ref(false)
const imageScanning = ref(false)
const locked = ref(false)
const scannerError = ref('')

async function stop() {
  if (!scanner.value) return
  try {
    if (running.value) await scanner.value.stop()
    await scanner.value.clear()
  } catch (error) {
    console.warn('Could not fully stop QR scanner.', error)
  } finally {
    scanner.value = null
    running.value = false
  }
}

async function start() {
  if (running.value || imageScanning.value || locked.value) return
  scannerError.value = ''
  locked.value = false
  scanner.value = new Html5Qrcode('asset-qr-reader')
  running.value = true

  try {
    await scanner.value.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        if (locked.value) return
        locked.value = true
        await stop()
        emit('decoded', decodedText)
      },
      () => {},
    )
  } catch (error) {
    scannerError.value = 'Camera could not be started. Check browser camera permission.'
    emit('error', error)
    await stop()
  }
}

async function scanImage(file) {
  if (!file || running.value || imageScanning.value) return
  scannerError.value = ''
  locked.value = false
  imageScanning.value = true
  scanner.value = new Html5Qrcode('asset-qr-reader')

  try {
    const decodedText = await scanner.value.scanFile(file, true)
    locked.value = true
    await stop()
    emit('decoded', decodedText)
  } catch (error) {
    scannerError.value = 'Could not read a QR code from this image. Choose a clearer image and try again.'
    emit('error', error)
    await stop()
  } finally {
    imageScanning.value = false
  }
}

function openImagePicker() {
  imageInput.value?.click()
}

function handleImageSelected(event) {
  const [file] = event.target.files || []
  event.target.value = ''
  void scanImage(file)
}

function reset() {
  locked.value = false
  scannerError.value = ''
  void start()
}

defineExpose({ start, stop, reset })
onBeforeUnmount(stop)
</script>

<template>
  <div class="asset-qr-scanner">
    <div id="asset-qr-reader" class="asset-qr-scanner__reader" />
    <a-alert v-if="scannerError" type="error" show-icon :message="scannerError" />
    <div class="asset-qr-scanner__actions">
      <a-button v-if="!running" class="bigin-touch-target" type="primary" :loading="imageScanning" :disabled="locked" @click="start">Start camera</a-button>
      <a-button v-else class="bigin-touch-target" @click="stop">Stop camera</a-button>
      <a-button class="bigin-touch-target" :disabled="running || imageScanning || locked" @click="openImagePicker">Upload QR image</a-button>
      <input ref="imageInput" class="asset-qr-scanner__file" type="file" accept="image/*" @change="handleImageSelected" />
    </div>
    <a-button v-if="locked || scannerError" class="bigin-touch-target" @click="reset">Scan again</a-button>
  </div>
</template>

<style scoped>
.asset-qr-scanner { display: grid; gap: 16px; min-width: 0; }
.asset-qr-scanner__reader { min-height: 300px; max-width: 100%; overflow: hidden; border: 1px solid var(--bigin-border-secondary); border-radius: 8px; background: var(--bigin-surface-inset); }
.asset-qr-scanner__actions { display: flex; flex-wrap: wrap; gap: 10px; }
.asset-qr-scanner__file { display: none; }
@media (max-width: 575px) { .asset-qr-scanner__reader { min-height: min(300px, calc(100vw - 48px)); }.asset-qr-scanner__actions { flex-direction: column; }.asset-qr-scanner__actions :deep(.ant-btn) { width: 100%; } }
</style>
