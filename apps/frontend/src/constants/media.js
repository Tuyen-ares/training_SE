import assetPlaceholder from '../assets/asset-placeholder.svg'

export const DEFAULT_ASSET_IMAGE = assetPlaceholder

export const MEDIA_LIMITS = {
  maxImageSizeBytes: 10 * 1024 * 1024,
  maxImageEdgePixels: 1920,
  maxEvidenceImages: 10,
  lossyQuality: 0.85,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
}
