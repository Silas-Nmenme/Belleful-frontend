/**
 * Firebase Push Notifications Manager
 * Handles device registration, permission requests, and notification display
 */

class NotificationManager {
  constructor() {
    this.messaging = null;
    this.initialized = false;
    this.swRegistration = null;
    this.vapidKey = 'BBf5TtFZyyP9Uv2aGb7hqFoc7N9KYf1X1CoXW7048HA9E53ilWUY1HftQws3y3ySFRgOu_HTj0Vh3cZ0V1ZMl8A';
    this.init();
  }

  async init() {
    // Check if Firebase is available and service worker is supported
    if (!window.FirebaseMessaging || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('⚠️ Push notifications not supported on this browser');
      return;
    }

    try {
      // Register the Firebase messaging service worker
      this.swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope'
      });
      console.log('✅ Service worker registered for Firebase messaging');

      this.messaging = window.FirebaseMessaging.messaging;

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await this.registerDevice();
        this.setupMessageListener();
        this.initialized = true;
        console.log('✅ Push notifications enabled');
      } else {
        console.log('⚠️ Push notifications permission denied by user');
      }
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
    }
  }

  async registerDevice() {
    try {
      // Check if user is authenticated
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        console.log('⚠️ No auth token found, skipping device registration');
        return;
      }

      const token = await window.FirebaseMessaging.getToken(this.messaging, {
        vapidKey: this.vapidKey,
        serviceWorkerRegistration: this.swRegistration
      });

      if (token) {
        // Send token to backend
        const response = await fetch(`${window.API_BASE}/auth/register-device`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ token, platform: 'web' })
        });

        if (response.ok) {
          localStorage.setItem('fcmToken', token);
          console.log('✅ Device registered for push notifications');
        } else {
          console.warn('⚠️ Failed to register device token on backend');
        }
      } else {
        console.warn('⚠️ No FCM token obtained');
      }
    } catch (error) {
      console.error('❌ Device registration failed:', error);
    }
  }

  setupMessageListener() {
    // Handle foreground messages
    window.FirebaseMessaging.onMessage(this.messaging, (payload) => {
      console.log('Received foreground message:', payload);
      this.showNotification(payload);
    });
  }

  showNotification(payload) {
    const { title, body } = payload.notification || {};
    const { orderId, status } = payload.data || {};

    if (!title || !body) return;

    // Show browser notification
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/asset/logo.jpeg',
        badge: '/asset/logo.jpeg',
        tag: orderId ? `order-${orderId}` : 'general',
        requireInteraction: true,
        data: { orderId, status }
      });

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        if (orderId) {
          window.location.href = `order-tracking.html?id=${orderId}`;
        }
        notification.close();
      };

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    }

    // Also show in-app toast if available
    if (window.showToast) {
      window.showToast(body, 'info', 8000);
    }

    // Update order status in UI if on relevant page
    if (window.updateOrderStatus && orderId && status) {
      window.updateOrderStatus(orderId, status);
    }

    // Dispatch custom event for other parts of the app
    window.dispatchEvent(new CustomEvent('pushNotification', {
      detail: { title, body, orderId, status, payload }
    }));
  }

  async unregister() {
    const token = localStorage.getItem('fcmToken');
    if (token) {
      try {
        await fetch(`${window.API_BASE}/auth/unregister-device`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ token })
        });
        localStorage.removeItem('fcmToken');
        console.log('Device unregistered from notifications');
      } catch (error) {
        console.error('Device unregistration failed:', error);
      }
    }
  }

  // Check if notifications are enabled
  isEnabled() {
    return this.initialized && Notification.permission === 'granted';
  }

  // Request permission manually (can be called from UI)
  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await this.registerDevice();
        this.setupMessageListener();
        this.initialized = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.notificationManager = new NotificationManager();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationManager;
}