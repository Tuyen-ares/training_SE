import { MEDIA_LIMITS } from '../constants/media'

const MEDIA_CACHE_CONTROL = 'public,max-age=31536000,immutable'

export function presignMedia(api, payload) {
  return api('/media/presign', { method: 'POST', body: payload })
}

export function completeMedia(api, mediaId) {
  return api(`/media/${mediaId}/complete`, { method: 'POST' })
}

export function cancelMedia(api, mediaId) {
  return api(`/media/${mediaId}`, { method: 'DELETE' })
}

export function validateMediaFile(file) {
  if (!file || !MEDIA_LIMITS.allowedMimeTypes.includes(file.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP image.')
  }
  if (file.size <= 0 || file.size > MEDIA_LIMITS.maxImageSizeBytes) {
    throw new Error('Images must be smaller than 10 MB.')
  }
}

export async function putMediaObject(presigned, file) {
  const response = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: presigned.requiredHeaders,
    body: file,
  })
  if (response.ok) return

  const error = new Error(response.status === 412
    ? 'This upload key was already used. A new upload is required.'
    : 'The image upload failed. Please try again.')
  error.status = response.status
  error.kind = response.status === 412 ? 'CONDITIONAL_COLLISION' : 'PUT_FAILED'
  throw error
}

export { MEDIA_CACHE_CONTROL }
