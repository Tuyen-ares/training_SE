/**
 * @typedef {Object} AssetIdentity
 * @property {string|null} modelName
 * @property {string|null} assetCode
 * @property {string|null} serialNumber
 * @property {string|null} imageUrl
 */

export const MISSING_ASSET_VALUE = '—'

function cleanValue(value) {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized || null
}

/**
 * Convert the asset response variants used by the existing API into the one
 * shape consumed by shared identity presentation.
 *
 * @param {unknown} source
 * @returns {AssetIdentity}
 */
export function normalizeAssetIdentity(source) {
  const value = source && typeof source === 'object' ? source : {}
  const nested = value.asset && typeof value.asset === 'object' ? value.asset : value

  return {
    modelName: cleanValue(
      nested.modelName
      ?? nested.model?.name
      ?? nested.assetModel?.name,
    ),
    assetCode: cleanValue(nested.assetCode ?? nested.asset_code),
    serialNumber: cleanValue(nested.serialNumber ?? nested.serial_number),
    imageUrl: cleanValue(nested.imageUrl ?? nested.image_url),
  }
}

export function displayAssetValue(value) {
  return cleanValue(value) || MISSING_ASSET_VALUE
}

export function assetInitial(identity) {
  return displayAssetValue(identity?.modelName).slice(0, 1).toUpperCase()
}

export function formatAssetIdentity(source, { includeSerial = true } = {}) {
  const identity = normalizeAssetIdentity(source)
  const lines = [
    displayAssetValue(identity.modelName),
    `Code: ${displayAssetValue(identity.assetCode)}`,
  ]
  if (includeSerial) lines.push(`Seri: ${displayAssetValue(identity.serialNumber)}`)
  return lines.join(' · ')
}

export function formatAssetOption(source) {
  return formatAssetIdentity(source)
}
