import { MEDIA_LIMITS } from '../constants/media'

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const HEIC_MESSAGE = 'Định dạng HEIC/HEIF hiện chưa được hỗ trợ. Vui lòng dùng ảnh JPEG, PNG hoặc WebP. Trên iPhone có thể chọn Camera → Formats → Most Compatible.'

export class ImageProcessingError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ImageProcessingError'
    this.code = code
  }
}

export function duplicateKey(file) {
  return [file.name, file.size, file.lastModified, file.type].join(':')
}

export function calculateResizeDimensions(width, height, maxEdge = MEDIA_LIMITS.maxImageEdgePixels) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new ImageProcessingError('DECODE_FAILED', 'Không thể đọc kích thước ảnh.')
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function isHeic(file, bytes) {
  const type = file.type.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase()
  const brand = new TextDecoder('ascii').decode(bytes.slice(4, 12)).toLowerCase()
  return type === 'image/heic' || type === 'image/heif' || extension === 'heic' || extension === 'heif' ||
    brand.includes('ftypheic') || brand.includes('ftypheif') || brand.includes('ftypheix') ||
    brand.includes('ftyphevc') || brand.includes('ftyphevx') || brand.includes('ftypmif1')
}

function matchesSignature(mimeType, bytes) {
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mimeType === 'image/png') {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value)
  }
  if (mimeType === 'image/webp') {
    return new TextDecoder('ascii').decode(bytes.slice(0, 4)) === 'RIFF' &&
      new TextDecoder('ascii').decode(bytes.slice(8, 12)) === 'WEBP'
  }
  return false
}

function readBlobBytes(blob) {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('Không thể đọc ảnh.'))
    reader.onload = () => resolve(reader.result)
    reader.readAsArrayBuffer(blob)
  })
}

export async function validateImageFile(file) {
  if (!file || file.size <= 0) {
    throw new ImageProcessingError('EMPTY_FILE', 'Ảnh không được để trống.')
  }
  if (file.size > MEDIA_LIMITS.maxImageSizeBytes) {
    throw new ImageProcessingError('FILE_TOO_LARGE', 'Ảnh phải có dung lượng không quá 10 MB.')
  }

  const bytes = new Uint8Array(await readBlobBytes(file.slice(0, 16)))
  if (isHeic(file, bytes)) throw new ImageProcessingError('HEIC_UNSUPPORTED', HEIC_MESSAGE)
  if (!MEDIA_LIMITS.allowedMimeTypes.includes(file.type)) {
    throw new ImageProcessingError('MIME_UNSUPPORTED', 'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.')
  }
  if (!matchesSignature(file.type, bytes)) {
    throw new ImageProcessingError('SIGNATURE_MISMATCH', 'Định dạng nội dung ảnh không khớp với loại tệp.')
  }
}

async function decodeWithImageElement(file) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = objectUrl
    await image.decode()
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      source: image,
      close() {},
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { width: bitmap.width, height: bitmap.height, source: bitmap, close: () => bitmap.close() }
  }
  return decodeWithImageElement(file)
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new ImageProcessingError('ENCODE_FAILED', 'Trình duyệt không thể xử lý định dạng ảnh này.'))
      resolve(blob)
    }, mimeType, quality)
  })
}

function processedName(originalName, mimeType) {
  const base = originalName.replace(/\.[^.]+$/, '') || 'image'
  return `${base}.${MIME_EXTENSIONS[mimeType]}`
}

export async function processImageFile(file) {
  await validateImageFile(file)

  let decoded
  try {
    decoded = await decodeImage(file)
    const dimensions = calculateResizeDimensions(decoded.width, decoded.height)
    const canvas = document.createElement('canvas')
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    const context = canvas.getContext('2d')
    if (!context) throw new ImageProcessingError('ENCODE_FAILED', 'Trình duyệt không thể xử lý ảnh này.')
    context.drawImage(decoded.source, 0, 0, dimensions.width, dimensions.height)
    const quality = file.type === 'image/png' ? undefined : MEDIA_LIMITS.lossyQuality
    const blob = await canvasToBlob(canvas, file.type, quality)
    if (blob.type !== file.type) {
      throw new ImageProcessingError('ENCODE_UNSUPPORTED', 'Trình duyệt không thể xuất đúng định dạng ảnh đã chọn.')
    }
    if (blob.size <= 0 || blob.size > MEDIA_LIMITS.maxImageSizeBytes) {
      throw new ImageProcessingError('OUTPUT_TOO_LARGE', 'Ảnh sau xử lý vẫn vượt quá 10 MB.')
    }
    return new File([blob], processedName(file.name, file.type), {
      type: file.type,
      lastModified: Date.now(),
    })
  } catch (error) {
    if (error instanceof ImageProcessingError) throw error
    throw new ImageProcessingError('DECODE_FAILED', 'Không thể đọc hoặc xử lý ảnh này.')
  } finally {
    decoded?.close()
  }
}

export { HEIC_MESSAGE }
