function queryString(params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  const encoded = search.toString()
  return encoded ? `?${encoded}` : ''
}

export function listAssets(api, params) {
  return api(`/assets${queryString(params)}`)
}

export function getAsset(api, assetId) {
  return api(`/assets/${assetId}`)
}

export function createAsset(api, payload) {
  return api('/assets', {
    method: 'POST',
    body: payload,
  })
}

export function updateAsset(api, assetId, payload) {
  return api(`/assets/${assetId}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function retireAsset(api, assetId) {
  return api(`/assets/${assetId}/retire`, { method: 'POST' })
}

export function findAssetByQr(api, qrCode) {
  return api(`/assets/by-qr/${encodeURIComponent(qrCode)}`)
}

export function listAssetLookups(api) {
  return Promise.all([
    api('/brands'),
    api('/asset-types'),
    api('/asset-models'),
    api('/departments'),
  ]).then(([brands, types, models, departments]) => ({
    brands,
    types,
    models,
    departments,
  }))
}

export function reportAssetIssue(api, assetId, description) {
  return api(`/assets/${assetId}/report-damaged`, {
    method: 'POST',
    body: { description },
  })
}
