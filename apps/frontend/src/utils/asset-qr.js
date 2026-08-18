import QRCode from 'qrcode'

function getPublicAppOrigin() {
  if (typeof window === 'undefined' || !window.location.origin) {
    throw new Error('The current app origin is not available.')
  }

  return window.location.origin
}

export function buildAssetQrUrl(qrCode) {
  return `${getPublicAppOrigin()}/qr/${encodeURIComponent(qrCode)}`
}

export async function generateAssetQr(asset) {
  if (!asset?.qrCode) throw new Error('Asset does not have a QR code.')

  return QRCode.toDataURL(buildAssetQrUrl(asset.qrCode), {
    width: 256,
    margin: 2,
    errorCorrectionLevel: 'M',
  })
}

export function parseAssetQrPayload(rawValue) {
  const value = String(rawValue || '').trim()
  if (!value) throw new Error('QR code is empty.')

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('Invalid asset QR URL.')
  }

  const expectedOrigin = getPublicAppOrigin()
  if (url.origin !== expectedOrigin) throw new Error('This QR code belongs to another application.')

  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length !== 2 || segments[0] !== 'qr' || !segments[1]) {
    throw new Error('This QR code is not an asset QR code.')
  }

  try {
    return decodeURIComponent(segments[1])
  } catch {
    throw new Error('Invalid asset QR URL.')
  }
}

export function downloadAssetQr(asset, qrImage) {
  const link = document.createElement('a')
  link.href = qrImage
  link.download = `${asset.assetCode || asset.serialNumber || asset.id}-qr.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function printAssetQr(asset, qrImage) {
  const printWindow = window.open('', '_blank', 'width=480,height=640')
  if (!printWindow) throw new Error('The browser blocked the print window.')

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]))
  const identifier = escapeHtml(asset.assetCode || asset.serialNumber || asset.id)
  const modelName = escapeHtml(asset.model?.name || asset.modelName || '')
  printWindow.document.write(`
    <!doctype html>
    <html><head><title>Asset QR Label</title>
    <style>body{font-family:Arial,sans-serif;text-align:center;padding:24px}img{width:220px;height:220px}.id{margin-top:12px;font-weight:700}</style>
    </head><body><img src="${qrImage}" alt="Asset QR Code" /><div class="id">${identifier}</div><div>${modelName}</div></body></html>
  `)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }
}
