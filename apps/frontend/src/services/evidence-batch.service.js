import { cancelMedia, completeMedia, presignMedia, putMediaObject } from './media.service'

export class EvidenceBatchError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'EvidenceBatchError'
    this.createdMediaIds = options.createdMediaIds || []
    this.completedMediaIds = options.completedMediaIds || []
    this.cleanup = options.cleanup || { linked: [], unknown: [], failed: [] }
    this.reconcileRequired = this.cleanup.linked.length > 0
    this.retryBlocked = this.cleanup.unknown.length > 0
  }
}

async function cleanupAttempt(api, mediaIds, excludedIds) {
  const result = { linked: [], unknown: [], failed: [] }
  for (const mediaId of mediaIds) {
    if (excludedIds.has(mediaId)) continue
    try {
      await cancelMedia(api, mediaId)
    } catch (error) {
      if (error.status === 404) continue
      if (error.status === 409) result.linked.push(mediaId)
      else if (!error.status || error.status === 503 || error.status >= 500) result.unknown.push(mediaId)
      else result.failed.push(mediaId)
    }
  }
  return result
}

function failureMessage(error, cleanup) {
  if (cleanup.linked.length) return 'Yêu cầu trước có thể đã hoàn tất. Dữ liệu sẽ được tải lại để đối chiếu trước khi thao tác tiếp.'
  if (cleanup.unknown.length) return 'Không xác định được trạng thái dọn dẹp ảnh. Hãy tải lại màn hình để đối chiếu trước khi thử lại.'
  if (cleanup.failed.length) return 'Thao tác thất bại và một số ảnh chưa được dọn dẹp. Bạn có thể thử lại; hệ thống sẽ dùng media ID mới.'
  return error.message || 'Không thể hoàn tất thao tác. Ảnh đã chọn vẫn được giữ để thử lại.'
}

export async function submitEvidenceBatch({ api, items, purpose, submitBusiness }) {
  if (!items.length) return submitBusiness([])

  const createdMediaIds = []
  const completedMediaIds = []
  const collisionIds = new Set()
  try {
    for (const item of items) {
      const presigned = await presignMedia(api, {
        purpose,
        mimeType: item.file.type,
        sizeBytes: item.file.size,
      })
      createdMediaIds.push(presigned.mediaId)
      try {
        await putMediaObject(presigned, item.file)
      } catch (error) {
        if (error.kind === 'CONDITIONAL_COLLISION') collisionIds.add(presigned.mediaId)
        throw error
      }
      await completeMedia(api, presigned.mediaId)
      completedMediaIds.push(presigned.mediaId)
    }
    return await submitBusiness(completedMediaIds)
  } catch (error) {
    const cleanup = await cleanupAttempt(api, createdMediaIds, collisionIds)
    throw new EvidenceBatchError(failureMessage(error, cleanup), {
      cause: error,
      createdMediaIds,
      completedMediaIds,
      cleanup,
    })
  }
}
