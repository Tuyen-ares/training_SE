import { MEDIA_LIMITS } from '../../constants/media'
import { calculateResizeDimensions } from '../../utils/image-processing'
import { CameraCaptureError } from './camera-errors'

export async function captureVideoFrame(video) {
  if (!video?.videoWidth || !video?.videoHeight) {
    throw new CameraCaptureError('CAMERA_VIDEO_NOT_READY', 'The camera preview is not ready yet.')
  }
  const dimensions = calculateResizeDimensions(video.videoWidth, video.videoHeight, MEDIA_LIMITS.maxImageEdgePixels)
  const canvas = document.createElement('canvas')
  canvas.width = dimensions.width
  canvas.height = dimensions.height
  const context = canvas.getContext('2d')
  if (!context) throw new CameraCaptureError('CAMERA_ENCODE_FAILED', 'The image could not be created. Try again.')
  context.drawImage(video, 0, 0, dimensions.width, dimensions.height)
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new CameraCaptureError('CAMERA_ENCODE_FAILED', 'The image could not be created. Try again.')), 'image/jpeg', 0.95)
  })
  const now = Date.now()
  return new File([blob], `camera-${now}.jpg`, { type: 'image/jpeg', lastModified: now })
}
