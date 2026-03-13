// Belleful Shared Utils - API, Socket, UI Helpers
const API_BASE = 'https://belleful-fphf.vercel.app/api';
const SOCKET_URL = window.location.origin;

// Get JWT from localStorage
function getAuthToken() {
  return localStorage.getItem('token');
}

// API call wrapper with auth
async function apiCall(endpoint, options = {}) {
  const token = getAuthToken();
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...options
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(data.message || 'Request failed');
    }
    
    return data;
  } catch (error) {
    showToast(error.message, 'error');
    throw error;
  }
}

// File upload helper (receipt)
async function uploadReceipt(orderId, file) {
  const formData = new FormData();
  formData.append('receipt', file);
  formData.append('orderId', orderId);

  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/payments/upload-receipt`, {
    method: 'POST',
    body: formData,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` })
    }
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
}

// Socket connection
let socket = null;
function connectSocket() {
  const token = getAuthToken();
  if (!token) return;

  socket = io(SOCKET_URL, {
    auth: { token }
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected');
    showToast('Connected to live updates', 'success');
  });

  socket.on('connect_error', (err) => {
    console.error('Socket error:', err);
    showToast('Connection lost. Retrying...', 'warning');
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  return socket;
}

// Status helpers
const statusConfig = {
  'ordered': { color: '#ffc107', bg: '#fff3cd', emoji: '📦' },
  'pending_approval': { color: '#fd7e14', bg: '#ffeaa7', emoji: '⏳' },
  'vendor_approved': { color: '#198754', bg: '#c3e6cb', emoji: '✅' },
  'preparing': { color: '#dc3545', bg: '#f8d7da', emoji: '🔥' },
  'ready': { color: '#0dcaf0', bg: '#bee5eb', emoji: '🍽️' },
  'off_for_delivery': { color: '#6f42c1', bg: '#e2e8f0', emoji: '🚀' },
  'delivered': { color: '#28a745', bg: '#d4edda', emoji: '🎉' }
};

function statusBadge(status) {
  const config = statusConfig[status] || statusConfig.ordered;
  return `<span class="status-badge" style="background: ${config.bg}; color: ${config.color}">${config.emoji} ${status.replace('_', ' ').toUpperCase()}</span>`;
}

function statusProgress(status) {
  const widths = { ordered: '14%', pending_approval: '29%', vendor_approved: '43%', preparing: '57%', ready: '71%', 'off_for_delivery': '86%', delivered: '100%' };
  const config = statusConfig[status] || statusConfig.ordered;
  return `<div class="status-progress"><div style="background: ${config.color}; width: ${widths[status] || '14%'}"></div></div>`;
}

// Dashboard critical utils - SINGLE SOURCE OF TRUTH

// Robust loader hide - SAFE
function hideLoading() {
  console.log('🟢 Hiding loader...');
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    console.log('✅ Loader hidden');
  }
}

// Safe auth check
function safeAuthCheck(isAdminRequired = false) {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn('❌ No token');
      return { valid: false, reason: 'no-token' };
    }
    
    const user = getUserInfo();
    if (!user) {
      console.warn('❌ Invalid token payload');
      return { valid: false, reason: 'invalid-token' };
    }
    
    if (isAdminRequired && user.role !== 'admin') {
      console.warn('❌ Admin required, got:', user.role);
      return { valid: false, reason: 'admin-required' };
    }
    
    console.log('✅ Auth OK:', user.role || 'user');
    return { valid: true, user };
  } catch (error) {
    console.error('❌ Auth check error:', error);
    return { valid: false, reason: 'error', error };
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('💥 Global JS Error:', event.error);
  hideLoading();
  const toastMsg = 'Dashboard error occurred. Page still functional.';
  // Reuse showToast if available, else simple alert
  if (typeof showToast === 'function') {
    showToast(toastMsg, 'error');
  } else {
    alert(toastMsg);
  }
});

// DOM ready safety net
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 DOM ready - safety net');
  // Hide loader even if scripts fail
  setTimeout(hideLoading, 100);
});

console.log('✅ Shared utils loaded');
