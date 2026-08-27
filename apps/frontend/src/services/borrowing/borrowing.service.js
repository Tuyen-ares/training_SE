function queryString(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const encoded = search.toString()
  return encoded ? `?${encoded}` : ''
}

export const createBorrowRequest = (api, payload) => api('/borrow-requests', { method: 'POST', body: payload })
export const listMyBorrowRequests = (api, params) => api(`/borrow-requests/me${queryString(params)}`)
export const getMyBorrowRequest = (api, requestId) => api(`/borrow-requests/${requestId}`)
export const withdrawBorrowRequest = (api, requestId) => api(`/borrow-requests/${requestId}/cancel`, { method: 'POST' })

export const listReviewQueue = (api, params) => api(`/borrow-request-details/review-queue${queryString(params)}`)
export const getReviewRequest = (api, requestId) => api(`/borrow-request-details/review-queue/${requestId}`)
export const approveBorrowDetail = (api, detailId) => api(`/borrow-request-details/${detailId}/approve`, { method: 'POST' })
export const approveAllBorrowDetails = (api, requestId) => api(`/borrow-requests/${requestId}/approve-all`, { method: 'POST' })
export const rejectBorrowDetail = (api, detailId, rejectionReason) => api(`/borrow-request-details/${detailId}/reject`, {
  method: 'POST',
  body: { rejectionReason },
})
export const handoverBorrowDetail = (api, detailId, mediaIds = []) => api(`/borrow-request-details/${detailId}/handover`, {
  method: 'POST',
  body: mediaIds.length ? { mediaIds } : {},
})
export const listHandoverQueue = (api, params) => api(`/borrow-request-details/handover-queue${queryString(params)}`)
export const getHandoverRequestDetail = (api, requestId) => api(`/borrow-request-details/handover-queue/${requestId}`)
export const getReturnRequestDetail = (api, requestId) => api(`/borrow-histories/return-queue/${requestId}`)

export const listCurrentBorrowing = (api, params) => api(`/borrow-histories/current${queryString(params)}`)
export const listMyBorrowHistory = (api, params) => api(`/borrow-histories/me${queryString(params)}`)
export const listAllBorrowHistory = (api, params) => api(`/borrow-histories${queryString(params)}`)
export const listMyBorrowingActivity = (api, params) => api(`/borrow-histories/activity/me${queryString(params)}`)
export const listAllBorrowingActivity = (api, params) => api(`/borrow-histories/activity${queryString(params)}`)
export const listReturnQueue = (api, params) => api(`/borrow-histories/return-queue${queryString(params)}`)
export const getBorrowHistoryDetail = (api, historyId) => api(`/borrow-histories/${historyId}`)
export const receiveNormalReturn = (api, historyId, mediaIds = []) => api(`/borrow-histories/${historyId}/return`, {
  method: 'POST',
  body: mediaIds.length ? { mediaIds } : {},
})
export const receiveDamagedReturn = (api, historyId, description, mediaIds = []) => api(`/borrow-histories/${historyId}/return-damaged`, {
  method: 'POST',
  body: { description, ...(mediaIds.length ? { mediaIds } : {}) },
})
