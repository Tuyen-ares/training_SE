<script setup>
import { ref } from 'vue'

import { useAuthStore } from '../../stores/auth'
import { useMediaUpload } from '../../composables/useMediaUpload'
import { processImageFile } from '../../utils/image-processing'
import CameraCaptureModal from './CameraCaptureModal.vue'

const props = defineProps({
  modelValue: { type: Number, default: null },
  purpose: { type: String, required: true },
  captureFacing: { type: String, default: 'environment', validator: (value) => ['user', 'environment'].includes(value) },
  label: { type: String, default: 'Image' },
  help: { type: String, default: 'JPEG, PNG hoặc WebP, tối đa 10 MB.' },
  accept: { type: String, default: 'image/jpeg,image/png,image/webp' },
})

const emit = defineEmits(['update:modelValue', 'uploaded'])
const authStore = useAuthStore()
const pickerInput = ref(null)
const cameraOpen = ref(false)
const processing = ref(false)
const { loading, error, previewUrl, upload, retry, bestEffortCancel } = useMediaUpload(authStore.api)

async function processAndUpload(file) {
  if (!file) return

  processing.value = true
  const previousMediaId = props.modelValue
  try {
    const processed = await processImageFile(file)
    const result = await upload(processed, props.purpose)
    emit('update:modelValue', result.mediaId)
    emit('uploaded', result)
    if (previousMediaId && previousMediaId !== result.mediaId) void bestEffortCancel(previousMediaId)
  } catch (uploadError) {
    if (!error.value) error.value = uploadError.message || 'Không thể xử lý ảnh.'
  } finally {
    processing.value = false
  }
}

async function handleFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  await processAndUpload(file)
}

async function handleCameraCaptured(file) {
  cameraOpen.value = false
  await processAndUpload(file)
}

async function retryUpload() {
  const previousMediaId = props.modelValue
  try {
    const result = await retry()
    emit('update:modelValue', result.mediaId)
    emit('uploaded', result)
    if (previousMediaId && previousMediaId !== result.mediaId) void bestEffortCancel(previousMediaId)
  } catch {
    // The composable exposes the safe error message below.
  }
}
</script>

<template>
  <div class="media-uploader">
    <span class="media-label">{{ label }}</span>
    <div class="media-picker-row">
      <div v-if="previewUrl" class="media-preview">
        <img :src="previewUrl" :alt="label" />
      </div>
      <button type="button" class="media-picker" :disabled="loading || processing" @click="cameraOpen = true">Chụp ảnh</button>
      <button type="button" class="media-picker" :disabled="loading || processing" @click="pickerInput?.click()">Chọn ảnh</button>
    </div>
    <small class="media-help">{{ processing ? 'Đang xử lý ảnh…' : loading ? 'Đang tải ảnh lên…' : help }}</small>
    <p v-if="error" class="media-error">{{ error }}</p>
    <button v-if="error && !loading && !processing && previewUrl" type="button" class="media-retry" @click="retryUpload">Thử lại</button>
    <input ref="pickerInput" class="media-input" type="file" :accept="accept" @change="handleFile" />
    <CameraCaptureModal
      v-model:open="cameraOpen"
      :default-facing="captureFacing"
      :title="label"
      :accept="accept"
      @captured="handleCameraCaptured"
    />
  </div>
</template>

<style scoped>
.media-uploader { display: grid; gap: 7px; }.media-label { font-size: 13px; font-weight: 600; }.media-picker-row { align-items: center; display: flex; flex-wrap: wrap; gap: 10px; }.media-picker,.media-retry { background: var(--bigin-surface-subtle); border: 1px solid var(--bigin-border-secondary); border-radius: 6px; color: var(--bigin-text-primary); cursor: pointer; padding: 7px 12px; }.media-picker:disabled { cursor: wait; opacity: .7; }.media-retry { background: transparent; border: 0; color: var(--bigin-color-primary); justify-self: start; padding-inline: 0; }.media-preview { border: 1px solid var(--bigin-border-secondary); border-radius: 6px; height: 56px; overflow: hidden; width: 56px; }.media-preview img { height: 100%; object-fit: cover; width: 100%; }.media-help { color: var(--bigin-text-tertiary); }.media-error { color: var(--bigin-color-error); margin: 0; }.media-input { display: none; }
</style>
