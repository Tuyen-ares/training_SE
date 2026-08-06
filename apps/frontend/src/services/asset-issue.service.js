function queryString(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  const value = query.toString()
  return value ? `?${value}` : ''
}

export const listAssetIssues = (api, params) => api(`/asset-issues${queryString(params)}`)
export const getAssetIssue = (api, issueId) => api(`/asset-issues/${issueId}`)
export const confirmAssetIssue = (api, issueId) =>
  api(`/asset-issues/${issueId}/confirm`, { method: 'POST' })
export const rejectAssetIssue = (api, issueId, note) =>
  api(`/asset-issues/${issueId}/reject`, { method: 'POST', body: note ? { note } : {} })
export const startAssetRepair = (api, issueId, body) =>
  api(`/asset-issues/${issueId}/start-repair`, { method: 'POST', body })
export const updateAssetRepair = (api, issueId, body) =>
  api(`/asset-issues/${issueId}/repair`, { method: 'PATCH', body })
export const completeAssetRepair = (api, issueId, body) =>
  api(`/asset-issues/${issueId}/complete`, { method: 'POST', body })
export const failAssetRepair = (api, issueId, body) =>
  api(`/asset-issues/${issueId}/fail`, { method: 'POST', body })
