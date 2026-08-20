import { afterEach, describe, expect, it, vi } from 'vitest'

import { EvidenceBatchError, submitEvidenceBatch } from './evidence-batch.service'

const items = Array.from({ length: 5 }, (_, index) => ({
  localId: `${index}`,
  file: new File([new Uint8Array([index])], `${index}.jpg`, { type: 'image/jpeg' }),
}))

function mediaApi({ firstId = 1, cancelFailures = {} } = {}) {
  let nextId = firstId
  const calls = []
  const api = vi.fn(async (path, options = {}) => {
    calls.push([path, options])
    if (path === '/media/presign') return { mediaId: nextId++, uploadUrl: `https://upload/${nextId - 1}`, requiredHeaders: {} }
    const cancelId = Number(path.match(/^\/media\/(\d+)$/)?.[1])
    if (options.method === 'DELETE' && cancelFailures[cancelId]) throw cancelFailures[cancelId]
    if (path.endsWith('/complete')) return { mediaId: Number(path.split('/')[2]) }
    return null
  })
  return { api, calls }
}

describe('submitEvidenceBatch', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('stops at the first failed PUT, cleans every created ID, and keeps local items untouched', async () => {
    const { api, calls } = mediaApi()
    let putCount = 0
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: ++putCount < 3, status: putCount === 3 ? 500 : 200 })))
    const submitBusiness = vi.fn()
    await expect(submitEvidenceBatch({ api, items, purpose: 'HANDOVER', submitBusiness })).rejects.toMatchObject({
      createdMediaIds: [1, 2, 3],
      completedMediaIds: [1, 2],
    })
    expect(submitBusiness).not.toHaveBeenCalled()
    expect(calls.filter(([, options]) => options.method === 'DELETE').map(([path]) => path)).toEqual(['/media/1', '/media/2', '/media/3'])
    expect(items).toHaveLength(5)
  })

  it('does not cancel a 412 collision ID', async () => {
    const { api, calls } = mediaApi()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 412 })))
    await expect(submitEvidenceBatch({ api, items: items.slice(0, 1), purpose: 'RETURN', submitBusiness: vi.fn() })).rejects.toBeInstanceOf(EvidenceBatchError)
    expect(calls.some(([, options]) => options.method === 'DELETE')).toBe(false)
  })

  it('cleans all completed media after a business failure and continues after cleanup errors', async () => {
    const cleanupError = Object.assign(new Error('cancel failed'), { status: 400 })
    const { api, calls } = mediaApi({ cancelFailures: { 1: cleanupError } })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200 })))
    await expect(submitEvidenceBatch({
      api,
      items: items.slice(0, 3),
      purpose: 'AFTER_REPAIR',
      submitBusiness: vi.fn(async () => { throw Object.assign(new Error('conflict'), { status: 409 }) }),
    })).rejects.toMatchObject({ cleanup: { failed: [1], linked: [], unknown: [] } })
    expect(calls.filter(([, options]) => options.method === 'DELETE')).toHaveLength(3)
  })

  it('marks linked cleanup for reconciliation and unknown cleanup as retry-blocking', async () => {
    const linked = Object.assign(new Error('linked'), { status: 409 })
    const unavailable = Object.assign(new Error('unavailable'), { status: 503 })
    const { api } = mediaApi({ cancelFailures: { 1: linked, 2: unavailable } })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200 })))
    try {
      await submitEvidenceBatch({ api, items: items.slice(0, 2), purpose: 'RETURN', submitBusiness: vi.fn(async () => { throw new Error('network') }) })
      expect.fail('expected batch failure')
    } catch (error) {
      expect(error.reconcileRequired).toBe(true)
      expect(error.retryBlocked).toBe(true)
    }
  })

  it('creates fresh media IDs for a retry', async () => {
    const first = mediaApi({ firstId: 10 })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200 })))
    await expect(submitEvidenceBatch({ api: first.api, items: items.slice(0, 1), purpose: 'HANDOVER', submitBusiness: vi.fn(async () => { throw new Error('first') }) })).rejects.toBeInstanceOf(EvidenceBatchError)
    const second = mediaApi({ firstId: 20 })
    const result = await submitEvidenceBatch({ api: second.api, items: items.slice(0, 1), purpose: 'HANDOVER', submitBusiness: vi.fn(async (ids) => ids) })
    expect(result).toEqual([20])
  })
})
