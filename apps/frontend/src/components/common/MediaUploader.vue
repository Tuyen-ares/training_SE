<script setup>
import { ref } from 'vue'

import { useAuthStore } from '../../stores/auth'
import { useMediaUpload } from '../../composables/useMediaUpload'

const props = defineProps({
  modelValue: { type: Number, default: null },
  purpose: { type: String, required: true },
  label: { type: String, default: 'Image' },
  help: { type: String, default: 'JPEG, PNG or WebP. Maximum 10 MB.' },
  accept: { type: String, default: 'image/jpeg,image/png,image/webp' },
})

const emit = defineEmits(['update:modelValue', 'uploaded'])
const authStore = useAuthStore()
const input = ref(null)
const {
  loading,
  error,
  mediaId,
  media,
  previewUrl,
  upload,
  retryComplete: retryCompleteUpload,
  cancel: cancelUploadMedia,
} = useMediaUpload(authStore.api)

async function chooseFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const result = await upload(file, props.purpose)
    emit('update:modelValue', result.mediaId)
    emit('uploaded', result)
  } catch {
    // The composable exposes a user-safe error message in the template.
  }
}

async function retryComplete() {
  try {
    const result = await retryCompleteUpload()
    emit('update:modelValue', result.mediaId)
    emit('uploaded', result)
  } catch {
    // Keep the same media ID for another verification retry.
  }
}

async function cancelUpload() {
  await cancelUploadMedia()
  emit('update:modelValue', null)
}
</script>

<template>
  <div class="media-uploader">
    <span class="media-label">{{ label }}</span>
    <div class="media-picker-row">
      <div v-if="previewUrl" class="media-preview">
        <img :src="previewUrl" :alt="label" />
      </div>
      <button type="button" class="media-picker" :disabled="loading" @click="input?.click()">
        {{ loading ? 'Uploading…' : (modelValue ? 'Replace image' : 'Choose image') }}
      </button>
      <button v-if="mediaId && !modelValue" type="button" class="media-cancel" @click="cancelUpload">Cancel</button>
    </div>
    <small class="media-help">{{ help }}</small>
    <p v-if="error" class="media-error">{{ error }}</p>
    <button v-if="mediaId && !media && !loading" type="button" class="media-retry" @click="retryComplete">Retry verification</button>
    <input ref="input" class="media-input" type="file" :accept="accept" @change="chooseFile" />
  </div>
</template>

<style scoped>
.media-uploader { display: grid; gap: 7px; }.media-label { font-size: 13px; font-weight: 600; }.media-picker-row { align-items: center; display: flex; flex-wrap: wrap; gap: 10px; }.media-picker,.media-cancel,.media-retry { background: var(--bigin-surface-subtle); border: 1px solid var(--bigin-border-secondary); border-radius: 6px; color: var(--bigin-text-primary); cursor: pointer; padding: 7px 12px; }.media-picker:disabled { cursor: wait; opacity: .7; }.media-cancel,.media-retry { background: transparent; border: 0; color: var(--bigin-color-primary); padding-inline: 0; }.media-preview { border: 1px solid var(--bigin-border-secondary); border-radius: 6px; height: 48px; overflow: hidden; width: 48px; }.media-preview img { height: 100%; object-fit: cover; width: 100%; }.media-help { color: var(--bigin-text-tertiary); }.media-error { color: var(--bigin-color-error); margin: 0; }.media-input { display: none; }
</style>
