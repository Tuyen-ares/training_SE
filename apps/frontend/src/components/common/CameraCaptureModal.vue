<script setup>
import { nextTick, onMounted, watch } from 'vue'

import { CAMERA_PHASES, useCameraCapture } from '../../composables/useCameraCapture'

const props = defineProps({
  open: { type: Boolean, default: false },
  defaultFacing: { type: String, default: 'environment', validator: (value) => ['user', 'environment'].includes(value) },
  title: { type: String, default: 'Chụp ảnh' },
  accept: { type: String, default: 'image/jpeg,image/png,image/webp' },
})

const emit = defineEmits(['update:open', 'captured', 'cancel'])
const {
  availableDevices,
  capture,
  acceptReview,
  close,
  error,
  phase,
  previewMirrored,
  ready,
  requestedFacing,
  reset,
  reviewUrl,
  retake,
  start,
  switchCamera,
  videoRef,
} = useCameraCapture({ defaultFacing: props.defaultFacing })

const isStarting = () => phase.value === CAMERA_PHASES.STARTING
const isCapturing = () => phase.value === CAMERA_PHASES.CAPTURING

async function handleOpenChange(open) {
  if (open) {
    requestedFacing.value = props.defaultFacing
    await nextTick()
    await start()
    return
  }
  await close()
}

async function handleCancel() {
  await close()
  emit('update:open', false)
  emit('cancel')
}

async function handleCapture() {
  await capture()
}

async function handleUseReview() {
  const file = acceptReview()
  if (!file) return
  emit('captured', file)
  emit('update:open', false)
}

async function handleRetake() {
  await retake()
}

async function handleRetry() {
  await start()
}

async function handleFileSelected(event) {
  const [file] = event.target.files || []
  event.target.value = ''
  if (!file) return
  await close()
  emit('captured', file)
  emit('update:open', false)
}

watch(() => props.open, (open) => {
  void handleOpenChange(open)
})

onMounted(() => {
  if (props.open) void nextTick().then(start)
})

defineExpose({ reset, close })
</script>

<template>
  <a-modal
    :open="open"
    :title="title"
    :footer="null"
    :mask-closable="!isStarting() && !isCapturing()"
    :keyboard="!isStarting() && !isCapturing()"
    :closable="!isStarting() && !isCapturing()"
    width="560px"
    wrap-class-name="bigin-camera-modal"
    @cancel="handleCancel"
  >
    <div class="camera-capture-modal">
      <div v-if="phase === CAMERA_PHASES.REVIEW" class="camera-review">
        <img :src="reviewUrl" alt="Ảnh vừa chụp" />
        <p>Kiểm tra ảnh trước khi dùng.</p>
        <p v-if="error" class="camera-error" role="alert">{{ error.message }}</p>
        <div class="camera-actions">
          <a-button class="bigin-touch-target" :disabled="isStarting()" @click="handleRetake">Chụp lại</a-button>
          <a-button class="bigin-touch-target" @click="$refs.fileInput?.click()">Chọn ảnh</a-button>
          <a-button class="bigin-touch-target" @click="handleCancel">Hủy</a-button>
          <a-button class="bigin-touch-target" type="primary" @click="handleUseReview">Dùng ảnh</a-button>
        </div>
      </div>

      <template v-else>
        <div class="camera-preview-shell">
          <video ref="videoRef" class="camera-preview" :class="{ 'camera-preview--mirrored': previewMirrored }" autoplay muted playsinline aria-label="Camera preview" />
          <div v-if="isStarting()" class="camera-preview-status">Đang mở camera…</div>
          <div v-else-if="phase === CAMERA_PHASES.IDLE" class="camera-preview-status">Camera chưa mở.</div>
        </div>

        <p v-if="error" class="camera-error" role="alert">{{ error.message }}</p>
        <p v-else class="camera-help">Ảnh sẽ được xử lý và kiểm tra trước khi lưu.</p>

        <div class="camera-actions">
          <a-button class="bigin-touch-target" type="primary" :disabled="!ready" :loading="isCapturing()" @click="handleCapture">Chụp ảnh</a-button>
          <a-button class="bigin-touch-target" :disabled="!ready || availableDevices.length < 2" @click="switchCamera">Đổi camera</a-button>
          <a-button class="bigin-touch-target" :disabled="isStarting() || isCapturing()" @click="$refs.fileInput?.click()">Chọn ảnh</a-button>
          <a-button v-if="error || phase === CAMERA_PHASES.IDLE" class="bigin-touch-target" :disabled="isCapturing()" @click="handleRetry">Thử lại</a-button>
          <a-button class="bigin-touch-target" :disabled="isStarting() || isCapturing()" @click="handleCancel">Hủy</a-button>
        </div>
      </template>
      <input ref="fileInput" class="camera-file-input" type="file" :accept="accept" @change="handleFileSelected" />
    </div>
  </a-modal>
</template>

<style scoped>
.camera-capture-modal { display: grid; gap: 14px; }
.camera-preview-shell { position: relative; overflow: hidden; min-height: 280px; border: 1px solid var(--bigin-border-secondary); border-radius: 8px; background: #111; }
.camera-preview { display: block; height: min(58vh, 440px); min-height: 280px; object-fit: contain; width: 100%; }
.camera-preview--mirrored { transform: scaleX(-1); }
.camera-preview-status { align-items: center; color: #fff; display: flex; inset: 0; justify-content: center; padding: 20px; position: absolute; text-align: center; }
.camera-help { color: var(--bigin-text-secondary); margin: 0; }
.camera-error { color: var(--bigin-color-error-text); margin: 0; }
.camera-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.camera-review { display: grid; gap: 14px; }
.camera-review img { display: block; max-height: 58vh; max-width: 100%; object-fit: contain; width: 100%; }
.camera-review p { color: var(--bigin-text-secondary); margin: 0; }
.camera-file-input { display: none; }
@media (max-width: 575px) {
  .camera-preview-shell { min-height: min(58vh, 360px); }
  .camera-preview { height: min(58vh, 360px); min-height: 240px; }
  .camera-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .camera-actions :deep(.ant-btn) { width: 100%; }
}
</style>
