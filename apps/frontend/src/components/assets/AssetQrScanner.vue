<script setup>
import { Html5Qrcode } from 'html5-qrcode'
import { onBeforeUnmount, ref } from 'vue'

import { CAMERA_OWNERS, cameraSession } from '../../services/camera-session'

const emit = defineEmits(['decoded', 'error'])
const scanner = ref(null)
const imageInput = ref(null)
const running = ref(false)
const imageScanning = ref(false)
const locked = ref(false)
const scannerError = ref('')
let qrSession = null

async function teardownSession(session, reason) {
  if (!session) return
  if (session.teardownPromise) return session.teardownPromise

  session.teardownPromise = (async () => {
    session.intentional = true
    let stopError = null
    const instance = session.scanner
    if (instance && (session.started || session.starting || running.value)) {
      try {
        await instance.stop()
      } catch (error) {
        // html5-qrcode may reject stop while start is still settling. The
        // pending start handler gets one final cleanup opportunity below.
        if (session.started) stopError = error
      }
    }
    if (instance && !session.starting) {
      try { await instance.clear() } catch (error) { stopError ||= error }
    }
    session.tornDown = true
    if (qrSession === session) qrSession = null
    if (scanner.value === instance) scanner.value = null
    running.value = false
    if (reason === 'preempted') scannerError.value = 'The camera is being used by another workflow.'
    if (stopError) throw stopError
  })()

  return session.teardownPromise
}

async function cleanupStandaloneScanner() {
  const instance = scanner.value
  if (!instance) return
  try { await instance.clear() } catch (error) { console.warn('Could not fully clear QR scanner.', error) }
  scanner.value = null
  running.value = false
}

async function stop() {
  const session = qrSession
  if (!session) {
    await cleanupStandaloneScanner()
    return
  }
  try {
    await teardownSession(session, 'stop')
    cameraSession.release(CAMERA_OWNERS.QR_SCANNER, session.token)
  } catch (error) {
    scannerError.value = 'The camera could not be stopped safely. Try again.'
    emit('error', error)
  }
}

async function start() {
  if (running.value || imageScanning.value || locked.value) return
  scannerError.value = ''
  locked.value = false
  let session

  try {
    const lease = await cameraSession.acquire(CAMERA_OWNERS.QR_SCANNER, (reason) => teardownSession(session, reason))
    session = { token: lease.token, scanner: null, starting: true, started: false, intentional: false, tornDown: false, teardownPromise: null }
    qrSession = session
    session.scanner = new Html5Qrcode('asset-qr-reader')
    scanner.value = session.scanner
    running.value = true
    let startPromise
    try {
      startPromise = session.scanner.start(
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
    } catch (startError) {
      session.starting = false
      throw startError
    }
    const trackedStart = Promise.resolve(startPromise).then(async () => {
      session.starting = false
      if (session.tornDown || !cameraSession.isCurrent(CAMERA_OWNERS.QR_SCANNER, session.token)) {
        try { await session.scanner.stop() } catch { /* start may have been preempted */ }
        try { await session.scanner.clear() } catch { /* owner teardown already attempted */ }
        return false
      }
      session.started = true
      return true
    })
    cameraSession.trackPending(CAMERA_OWNERS.QR_SCANNER, session.token, trackedStart)
    await trackedStart
  } catch (error) {
    scannerError.value = 'Camera could not be started. Check browser camera permission.'
    emit('error', error)
    if (session) {
      try {
        await teardownSession(session, 'start-error')
        cameraSession.release(CAMERA_OWNERS.QR_SCANNER, session.token)
      } catch (cleanupError) {
        emit('error', cleanupError)
      }
    }
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
    await cleanupStandaloneScanner()
    emit('decoded', decodedText)
  } catch (error) {
    scannerError.value = 'Could not read a QR code from this image. Choose a clearer image and try again.'
    emit('error', error)
    await cleanupStandaloneScanner()
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
onBeforeUnmount(() => { void stop() })
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
