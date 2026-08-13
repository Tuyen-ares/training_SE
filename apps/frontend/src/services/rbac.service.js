export function listRoles(api) {
  return api('/rbac/roles')
}

export function getRole(api, roleId) {
  return api(`/rbac/roles/${roleId}`)
}

export function listPermissions(api) {
  return api('/rbac/permissions')
}

export function createRole(api, payload) {
  return api('/rbac/roles', { method: 'POST', body: payload })
}

export function updateRoleName(api, roleId, name) {
  return api(`/rbac/roles/${roleId}`, { method: 'PATCH', body: { name } })
}

export function replaceRolePermissions(api, roleId, permissionIds) {
  return api(`/rbac/roles/${roleId}/permissions`, { method: 'PUT', body: { permissionIds } })
}

export function replaceUserRoles(api, userId, roleIds) {
  return api(`/rbac/users/${userId}/roles`, { method: 'PUT', body: { roleIds } })
}
