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
    if (mediaId.value) await bestEffortCancel(mediaId.value)
    selectedFile.value = file
    setPreview(file)
    error.value = ''
    media.value = null
    mediaId.value = null
    loading.value = true

    try {
      const presigned = await presignMedia(api, {
        purpose,
        mimeType: file.type,
        sizeBytes: file.size,
      })
      mediaId.value = presigned.mediaId
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
        throw putError
      }

      // Keep this media ID when complete fails: a transient verification error
      // is retried with POST /complete, never with another PUT to the same key.
      media.value = await completeMedia(api, presigned.mediaId)
      return media.value
    } catch (uploadError) {
      error.value = uploadError.message || 'The image could not be uploaded.'
      throw uploadError
    } finally {
      loading.value = false
    }
  }

  async function retryComplete() {
    if (!mediaId.value) throw new Error('There is no upload waiting for verification.')
    loading.value = true
    error.value = ''
    try {
      media.value = await completeMedia(api, mediaId.value)
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
    clearPreview()
  }

  function reset() {
    mediaId.value = null
    media.value = null
    selectedFile.value = null
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
    retryComplete,
    cancel,
    reset,
  }
}
