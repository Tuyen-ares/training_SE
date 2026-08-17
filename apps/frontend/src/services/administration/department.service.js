export const listDepartments = (api) => api('/departments')
export const createDepartment = (api, body) => api('/departments', { method: 'POST', body })
export const updateDepartment = (api, departmentId, body) => api(`/departments/${departmentId}`, { method: 'PATCH', body })
export const updateDepartmentStatus = (api, departmentId, isActive) => api(`/departments/${departmentId}/status`, { method: 'PATCH', body: { isActive } })
