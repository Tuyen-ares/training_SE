export function listCatalog(api, resource) {
  return api(`/${resource}`)
}

export function createCatalogItem(api, resource, payload) {
  return api(`/${resource}`, { method: 'POST', body: payload })
}

export function updateCatalogItem(api, resource, itemId, payload) {
  return api(`/${resource}/${itemId}`, { method: 'PATCH', body: payload })
}
