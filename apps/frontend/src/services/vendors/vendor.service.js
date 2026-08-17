function queryString(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  const value = query.toString()
  return value ? `?${value}` : ''
}

export const listVendors = (api, params) => api(`/vendors${queryString(params)}`)
export const getVendor = (api, vendorId) => api(`/vendors/${vendorId}`)
export const createVendor = (api, body) => api('/vendors', { method: 'POST', body })
export const updateVendor = (api, vendorId, body) => api(`/vendors/${vendorId}`, { method: 'PATCH', body })
export const updateVendorStatus = (api, vendorId, isActive) => api(`/vendors/${vendorId}/status`, { method: 'PATCH', body: { isActive } })
