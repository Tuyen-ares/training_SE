export function getMyProfile(api) {
  return api('/users/me')
}

export function updateMyProfile(api, payload) {
  return api('/users/me', { method: 'PATCH', body: payload })
}

export function changeMyPassword(api, payload) {
  return api('/users/me/password', { method: 'PATCH', body: payload })
}
