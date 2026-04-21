/**
 * Service Worker for Firebase Push Notifications
 * Handles background messages and notification clicks
 * Gracefully handles Firebase CDN failures
 */

let messaging = null;
let firebaseInitialized = false;

// Try to load Firebase scripts and initialize messaging
try {
  importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js');
  importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging.js');

  // Initialize Firebase
  firebase.initializeApp({
    apiKey: "AIzaSyB_ilbF0tw_L4jZrQRLt-zkxA2c0I70tHM",
    authDomain: "belleful-b2ab8.firebaseapp.com",
    projectId: "belleful-b2ab8",
    storageBucket: "belleful-b2ab8.firebasestorage.app",
    messagingSenderId: "321960038846",
    appId: "1:321960038846:web:fe413a27b434d1f9b6e9ef",
    measurementId: "G-7CGM68SJWP"
  });

  messaging = firebase.messaging();
  firebaseInitialized = true;
  console.log('✅ Firebase messaging initialized in service worker');

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);

    const { title, body } = payload.notification || {};
    const { orderId, status } = payload.data || {};

    if (!title || !body) return;

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
  console.warn('⚠️ Firebase initialization failed in service worker:', error.message);
  console.log('⚠️ Push notifications will not be available. Service worker will continue with other functions.');
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const { orderId, url } = event.notification.data || {};
  const action = event.action;

  let targetUrl = '/';

  if (action === 'view_order' && orderId) {
    targetUrl = `order-tracking.html?id=${orderId}`;
  } else if (url) {
    targetUrl = url;
  } else if (orderId) {
    targetUrl = `order-tracking.html?id=${orderId}`;
  }

  // Open the URL in the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open with the target URL
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

// Handle push events (fallback for older browsers)
self.addEventListener('push', (event) => {
  console.log('Push received:', event);

  if (event.data) {
    const data = event.data.json();
    const { title, body } = data.notification || {};
    const { orderId } = data.data || {};

    if (title && body) {
      const options = {
        body,
        icon: '/asset/icon-192.png',
        badge: '/asset/icon-192.png',
        tag: orderId ? `order-${orderId}` : 'general',
        data: { orderId, url: data.data?.link || '/' }
      };

      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    }
  }
});