/* global firebase, self */

importScripts(
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js',
);

function readConfig() {
  try {
    const value = new URL(self.location.href).searchParams.get('config');
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function validConfig(config) {
  return Boolean(
    config &&
      typeof config.apiKey === 'string' &&
      typeof config.projectId === 'string' &&
      typeof config.messagingSenderId === 'string' &&
      typeof config.appId === 'string',
  );
}

function safeLink(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    return url.origin === self.location.origin &&
      (url.protocol === 'http:' || url.protocol === 'https:')
      ? url.href
      : null;
  } catch {
    return null;
  }
}

const config = readConfig();
if (validConfig(config)) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};

    // The FCM notification payload is displayed automatically by the web SDK
    // while this app is in the background. Do not call showNotification here,
    // otherwise the browser can display the same push twice.

    void self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients)
          client.postMessage({ type: 'bigin:fcm-message', payload });
      });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const deepLink = safeLink(event.notification.data?.deepLink);
  if (!deepLink) return;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clients) => {
        const existing = clients.find((client) => 'focus' in client);
        if (existing) {
          await existing.focus();
          await existing.navigate(deepLink);
          return;
        }
        await self.clients.openWindow(deepLink);
      }),
  );
});
