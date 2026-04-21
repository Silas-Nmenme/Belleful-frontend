/**
 * Firebase Messaging Service Worker
 * This is the service worker that Firebase Cloud Messaging (FCM) requires.
 * It handles background messages and delegates to the main sw.js for other functionality.
 */

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

let firebaseInitialized = false;

try {
  // Initialize Firebase for messaging
  firebase.initializeApp({
    apiKey: "AIzaSyB_ilbF0tw_L4jZrQRLt-zkxA2c0I70tHM",
    authDomain: "belleful-b2ab8.firebaseapp.com",
    projectId: "belleful-b2ab8",
    storageBucket: "belleful-b2ab8.firebasestorage.app",
    messagingSenderId: "321960038846",
    appId: "1:321960038846:web:fe413a27b434d1f9b6e9ef",
    measurementId: "G-7CGM68SJWP"
  });

  const messaging = firebase.messaging();
  firebaseInitialized = true;
  console.log('✅ Firebase messaging initialized in firebase-messaging-sw.js');

  // Handle background messages from Firebase
  messaging.onBackgroundMessage((payload) => {
    console.log('Received FCM background message:', payload);

    const { title, body } = payload.notification || {};
    const { orderId, status } = payload.data || {};

    if (!title || !body) {
      console.warn('No title or body in notification payload');
      return;
    }

    const notificationOptions = {
      body,
      icon: '/asset/logo.jpeg',
      badge: '/asset/logo.jpeg',
      tag: orderId ? `order-${orderId}` : 'general',
      requireInteraction: true,
      data: { orderId, status, url: payload.data?.link || '/' },
      actions: orderId ? [{
        action: 'view_order',
        title: 'View Order',
        icon: '/asset/icon-192.png'
      }] : []
    };

    return self.registration.showNotification(title, notificationOptions);
  });

} catch (error) {
  console.error('❌ Firebase messaging initialization failed:', error.message);
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  const { orderId, url } = event.notification.data || {};
  const action = event.action;

  let targetUrl = '/';

  if (action === 'view_order' && orderId) {
    targetUrl = `/order-tracking.html?id=${orderId}`;
  } else if (url) {
    targetUrl = url;
  } else if (orderId) {
    targetUrl = `/order-tracking.html?id=${orderId}`;
  }

  // Open the URL in the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }

        // If no matching window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(
    clients.claim().then(() => {
      console.log('Service Worker activated and claimed all clients.');
    })
  );
});
