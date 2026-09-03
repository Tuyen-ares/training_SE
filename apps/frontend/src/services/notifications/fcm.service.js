import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
}
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''
const enabled = import.meta.env.VITE_FIREBASE_ENABLED === 'true'
const requiredConfigKeys = ['apiKey', 'projectId', 'messagingSenderId', 'appId']

let app
let messaging
let registration
let deviceId
let foregroundListenerAttached = false
let serviceWorkerListenerAttached = false

function hasCompleteConfig() {
  return enabled && requiredConfigKeys.every((key) => Boolean(firebaseConfig[key])) && Boolean(vapidKey)
}

export function getFcmConfigStatus() {
  if (!enabled) return { state: 'DISABLED' }
  if (!hasCompleteConfig()) return { state: 'MISCONFIGURED' }
  return { state: 'READY' }
}

function basePath() {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? base : `${base}/`
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) throw new Error('FCM_SERVICE_WORKER_UNSUPPORTED')
  if (!registration) {
    const script = `${basePath()}firebase-messaging-sw.js?config=${encodeURIComponent(JSON.stringify(firebaseConfig))}`
    registration = await navigator.serviceWorker.register(script, {
      scope: basePath(),
    })
  }
  return registration
}

function emitNotificationChanged(payload) {
  window.dispatchEvent(
    new CustomEvent('notifications:changed', {
      detail: { source: 'fcm', payload },
    }),
  )
}

function attachServiceWorkerListener() {
  if (serviceWorkerListenerAttached || !('serviceWorker' in navigator)) return
  serviceWorkerListenerAttached = true
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'bigin:fcm-message') emitNotificationChanged(event.data.payload)
  })
}

async function ensureMessaging() {
  const status = getFcmConfigStatus()
  if (status.state !== 'READY') throw new Error(`FCM_${status.state}`)
  if (!(await isSupported())) throw new Error('FCM_BROWSER_UNSUPPORTED')

  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  if (!messaging) messaging = getMessaging(app)
  await registerServiceWorker()
  attachServiceWorkerListener()

  if (!foregroundListenerAttached) {
    foregroundListenerAttached = true
    onMessage(messaging, emitNotificationChanged)
  }
  return { messaging, registration }
}

async function registerCurrentDevice(api) {
  const { messaging: currentMessaging, registration: currentRegistration } = await ensureMessaging()
  const token = await getToken(currentMessaging, {
    vapidKey,
    serviceWorkerRegistration: currentRegistration,
  })
  if (!token) throw new Error('FCM_TOKEN_EMPTY')

  const device = await api('/notification-devices', {
    method: 'POST',
    body: {
      token,
      platform: 'WEB',
      userAgent: navigator.userAgent,
    },
  })
  deviceId = device?.id ?? null
  return { state: 'ENABLED' }
}

export async function initializeFcmNotifications(api) {
  const configStatus = getFcmConfigStatus()
  if (configStatus.state !== 'READY') return configStatus
  if (!('Notification' in window)) return { state: 'UNSUPPORTED' }

  try {
    await ensureMessaging()
    if (Notification.permission !== 'granted') return { state: 'PERMISSION_REQUIRED' }
    return await registerCurrentDevice(api)
  } catch {
    return { state: 'ERROR' }
  }
}

export async function enableFcmNotifications(api) {
  const configStatus = getFcmConfigStatus()
  if (configStatus.state !== 'READY') return configStatus
  if (!('Notification' in window)) return { state: 'UNSUPPORTED' }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted')
      return { state: permission === 'denied' ? 'DENIED' : 'PERMISSION_REQUIRED' }
    await ensureMessaging()
    return await registerCurrentDevice(api)
  } catch {
    return { state: 'ERROR' }
  }
}

export async function disableFcmNotifications(api) {
  try {
    if (messaging) await deleteToken(messaging)
  } catch {
    // Logout must still complete if the browser token has already expired.
  }
  if (api && deviceId) {
    try {
      await api(`/notification-devices/${deviceId}`, { method: 'DELETE' })
    } catch {
      // The next registration will refresh ownership; do not block logout.
    }
  }
  deviceId = null
  return { state: 'DISABLED' }
}
