<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

import { MEDIA_LIMITS } from '../../constants/media'
import { duplicateKey, processImageFile } from '../../utils/image-processing'
import CameraCaptureModal from './CameraCaptureModal.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  label: { type: String, default: 'Ảnh minh chứng (không bắt buộc)' },
  max: { type: Number, default: MEDIA_LIMITS.maxEvidenceImages },
})

const emit = defineEmits(['update:modelValue', 'processing-change'])
const pickerInput = ref(null)
const cameraOpen = ref(false)
const processing = ref(false)
const notice = ref('')
const revokedUrls = new Set()

function revokeItem(item) {
  if (!item?.previewUrl || revokedUrls.has(item.previewUrl)) return
  revokedUrls.add(item.previewUrl)
  URL.revokeObjectURL(item.previewUrl)
}

function updateItems(items) {
  emit('update:modelValue', items)
}

function removeItem(localId) {
  if (props.disabled || processing.value) return
  revokeItem(props.modelValue.find((candidate) => candidate.localId === localId))
  updateItems(props.modelValue.filter((candidate) => candidate.localId !== localId))
}

function reset() {
  cameraOpen.value = false
  props.modelValue.forEach(revokeItem)
  updateItems([])
  notice.value = ''
}

async function processFiles(rawFiles) {
  if (!rawFiles.length || props.disabled || processing.value) return

  notice.value = ''
  const seen = new Set(props.modelValue.map((item) => item.duplicateKey))
  const uniqueFiles = []
  let duplicateCount = 0
  for (const file of rawFiles) {
    const key = duplicateKey(file)
    if (seen.has(key)) {
      duplicateCount += 1
      continue
    }
    seen.add(key)
    uniqueFiles.push({ file, key })
  }

  const slots = props.max - props.modelValue.length
  if (uniqueFiles.length > slots) {
    notice.value = `Bạn chỉ còn ${slots} vị trí. Vui lòng chọn tối đa ${slots} ảnh.`
    return
  }

  processing.value = true
  emit('processing-change', true)
  const accepted = []
  const failures = []
  try {
    for (const candidate of uniqueFiles) {
      try {
        const file = await processImageFile(candidate.file)
        accepted.push({
          localId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${accepted.length}`,
          file,
          previewUrl: URL.createObjectURL(file),
          duplicateKey: candidate.key,
        })
      } catch (error) {
        failures.push(`${candidate.file.name}: ${error.message || 'Không thể xử lý ảnh.'}`)
      }
    }
    if (accepted.length) updateItems([...props.modelValue, ...accepted])
    const messages = []
    if (duplicateCount) messages.push(`Đã bỏ qua ${duplicateCount} ảnh trùng.`)
    if (failures.length) messages.push(`Không thể thêm ${failures.length} ảnh: ${failures.join('; ')}`)
    notice.value = messages.join(' ')
  } finally {
    processing.value = false
    emit('processing-change', false)
  }
}

async function addFiles(event) {
  const rawFiles = Array.from(event.target.files || [])
  event.target.value = ''
  await processFiles(rawFiles)
}

async function handleCameraCaptured(file) {
  cameraOpen.value = false
  await processFiles(file ? [file] : [])
}

watch(() => props.modelValue, (next, previous) => {
  const retained = new Set(next.map((item) => item.localId))
  previous.filter((item) => !retained.has(item.localId)).forEach(revokeItem)
})

onBeforeUnmount(() => props.modelValue.forEach(revokeItem))
defineExpose({ reset })
</script>

<template>
  <section class="evidence-picker" :aria-busy="processing">
    <div class="evidence-heading">
      <span>{{ label }}</span>
      <strong>{{ modelValue.length }}/{{ max }}</strong>
    </div>
    <div v-if="modelValue.length" class="evidence-grid">
      <figure v-for="item in modelValue" :key="item.localId" class="evidence-item">
        <img :src="item.previewUrl" :alt="item.file.name" />
        <button type="button" :disabled="disabled || processing" :aria-label="`Xóa ${item.file.name}`" @click="removeItem(item.localId)">Xóa</button>
      </figure>
    </div>
    <div class="evidence-actions">
      <button type="button" :disabled="disabled || processing || modelValue.length >= max" @click="cameraOpen = true">Chụp ảnh</button>
      <button type="button" :disabled="disabled || processing || modelValue.length >= max" @click="pickerInput?.click()">Chọn ảnh</button>
    </div>
    <small>{{ processing ? 'Đang xử lý ảnh lần lượt…' : 'JPEG, PNG hoặc WebP; tối đa 10 ảnh, mỗi ảnh không quá 10 MB.' }}</small>
    <p v-if="notice" class="evidence-notice" role="status">{{ notice }}</p>
    <input ref="pickerInput" class="evidence-input" type="file" accept="image/jpeg,image/png,image/webp" multiple @change="addFiles" />
    <CameraCaptureModal
      v-model:open="cameraOpen"
      default-facing="environment"
      title="Chụp ảnh minh chứng"
      @captured="handleCameraCaptured"
    />
  </section>
</template>

<style scoped>
.evidence-picker { display: grid; gap: 10px; }.evidence-heading { align-items: center; display: flex; justify-content: space-between; }.evidence-heading span { font-size: 13px; font-weight: 600; }.evidence-heading strong { color: var(--bigin-text-secondary); font-size: 12px; }.evidence-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); }.evidence-item { border: 1px solid var(--bigin-border-secondary); border-radius: 7px; margin: 0; overflow: hidden; }.evidence-item img { aspect-ratio: 1; display: block; object-fit: cover; width: 100%; }.evidence-item button { background: var(--bigin-surface-subtle); border: 0; border-top: 1px solid var(--bigin-border-secondary); color: var(--bigin-color-error); cursor: pointer; padding: 6px; width: 100%; }.evidence-actions { display: flex; flex-wrap: wrap; gap: 8px; }.evidence-actions button { background: var(--bigin-surface-subtle); border: 1px solid var(--bigin-border-secondary); border-radius: 6px; color: var(--bigin-text-primary); cursor: pointer; padding: 7px 12px; }.evidence-actions button:disabled,.evidence-item button:disabled { cursor: not-allowed; opacity: .6; }.evidence-picker small { color: var(--bigin-text-tertiary); }.evidence-notice { color: var(--bigin-color-warning-text, #8a6116); font-size: 12px; margin: 0; overflow-wrap: anywhere; }.evidence-input { display: none; }
</style>
