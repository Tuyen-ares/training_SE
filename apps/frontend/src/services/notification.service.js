function queryString(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  const value = query.toString()
  return value ? `?${value}` : ''
}

export const listNotifications = (api, params) => api(`/notifications${queryString(params)}`)
export const getUnreadNotificationCount = (api) => api('/notifications/unread-count')
export const markNotificationRead = (api, notificationId) =>
  api(`/notifications/${notificationId}/read`, { method: 'PATCH' })
export const markAllNotificationsRead = (api) =>
  api('/notifications/read-all', { method: 'PATCH' })
