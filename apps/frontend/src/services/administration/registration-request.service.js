import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

function queryString(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const encoded = search.toString()
  return encoded ? `?${encoded}` : ''
}

export async function submitRegistration(payload) {
  try {
    const response = await axios.post(`${API_BASE_URL}/registration-requests`, payload, { withCredentials: true })
    return response.data?.data
  } catch (error) {
    const appError = new Error(error.response?.data?.error || 'The registration request could not be submitted.')
    appError.status = error.response?.status
    appError.details = error.response?.data?.details
    throw appError
  }
}

export function listRegistrationRequests(api, params) {
  return api(`/registration-requests${queryString(params)}`)
}

export function getRegistrationRequest(api, requestId) {
  return api(`/registration-requests/${requestId}`)
}

export function approveRegistrationRequest(api, requestId, payload) {
  return api(`/registration-requests/${requestId}/approve`, { method: 'POST', body: payload })
}

export function rejectRegistrationRequest(api, requestId, rejectionReason) {
  return api(`/registration-requests/${requestId}/reject`, {
    method: 'POST',
    body: rejectionReason ? { rejectionReason } : {},
  })
}
