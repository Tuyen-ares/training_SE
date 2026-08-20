import { onBeforeUnmount, ref } from 'vue'

import {
  cancelMedia,
  completeMedia,
  presignMedia,
  putMediaObject,
  validateMediaFile,
} from '../services/media.service'

export function useMediaUpload(api) {
  const loading = ref(false)
  const error = ref('')
  const mediaId = ref(null)
  const media = ref(null)
  const previewUrl = ref('')
  const selectedFile = ref(null)
  const retryMode = ref('fresh')
  const selectedPurpose = ref('')

  function clearPreview() {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }

  function setPreview(file) {
    clearPreview()
    previewUrl.value = URL.createObjectURL(file)
  }

  async function bestEffortCancel(id) {
    if (!id) return
    try { await cancelMedia(api, id) } catch { /* cleanup command handles stale rows */ }
  }

  async function upload(file, purpose) {
    validateMediaFile(file)
    selectedFile.value = file
    selectedPurpose.value = purpose
    setPreview(file)
    error.value = ''
    media.value = null
    loading.value = true

    try {
      const presigned = await presignMedia(api, {
        purpose,
        mimeType: file.type,
        sizeBytes: file.size,
      })
      mediaId.value = presigned.mediaId
      retryMode.value = 'fresh'
      try {
        await putMediaObject(presigned, file)
      } catch (putError) {
        // A 412 means the key may already own an object. Do not issue a
        // blind DeleteObject through cancel; leave the PENDING row for
        // stale cleanup and require a fresh key.
        if (putError.kind !== 'CONDITIONAL_COLLISION') {
          await bestEffortCancel(presigned.mediaId)
        }
        mediaId.value = null
        retryMode.value = 'fresh'
        throw putError
      }

      // Keep this media ID when complete fails: a transient verification error
      // is retried with POST /complete, never with another PUT to the same key.
      retryMode.value = 'complete'
      media.value = await completeMedia(api, presigned.mediaId)
      retryMode.value = 'fresh'
      return media.value
    } catch (uploadError) {
      error.value = uploadError.message || 'The image could not be uploaded.'
      throw uploadError
    } finally {
      loading.value = false
    }
  }

  async function retry() {
    if (retryMode.value === 'complete' && mediaId.value) return retryComplete()
    if (!selectedFile.value || !selectedPurpose.value) throw new Error('Không có ảnh để thử lại.')
    return upload(selectedFile.value, selectedPurpose.value)
  }

  async function retryComplete() {
    if (!mediaId.value) throw new Error('There is no upload waiting for verification.')
    loading.value = true
    error.value = ''
    try {
      media.value = await completeMedia(api, mediaId.value)
      retryMode.value = 'fresh'
      return media.value
    } catch (completeError) {
      error.value = completeError.message || 'The upload could not be verified.'
      throw completeError
    } finally {
      loading.value = false
    }
  }

  async function cancel() {
    await bestEffortCancel(mediaId.value)
    mediaId.value = null
    media.value = null
    selectedFile.value = null
    retryMode.value = 'fresh'
    clearPreview()
  }

  function reset() {
    mediaId.value = null
    media.value = null
    selectedFile.value = null
    retryMode.value = 'fresh'
    selectedPurpose.value = ''
    error.value = ''
    clearPreview()
  }

  onBeforeUnmount(clearPreview)

  return {
    loading,
    error,
    mediaId,
    media,
    previewUrl,
    selectedFile,
    upload,
    retry,
    retryComplete,
    cancel,
    reset,
    bestEffortCancel,
  }
}
