// Belleful Shared Utils - API, Socket, UI Helpers - V2 w/ RECURSION FIX
// Added defensive retry guard
const API_BASE = 'https://belleful-fphf.vercel.app/api';
const SOCKET_URL = window.location.origin;

let connectAttempts = 0;
const MAX_CONNECT_ATTEMPTS = 5;

// Get JWT from localStorage
function getAuthToken() {
  return localStorage.getItem('token');
}

// Get user info from JWT payload - CRITICAL FIX
function getUserInfo() {
  try {
    const token = getAuthToken();
    if (!token) return null;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.sub || payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role || 'user'
    };
  } catch (error) {
    console.warn('Invalid token payload:', error);
    localStorage.removeItem('token');
    return null;
  }
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

// Socket connection - RECURSION-PROOF w/ retry guard
function connectSocket() {
  console.log('🔌 Socket disabled for local development - no spam');
  showToast('Live updates disabled (local mode)', 'info');
  return null;
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

// Toast notification system - CRITICAL FIX
function showToast(message, type = 'info') {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(toast => toast.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    </div>
    <button class="toast-close">&times;</button>
  `;
  
  document.body.appendChild(toast);
  
  // Auto remove
  const timer = setTimeout(() => {
    if (toast.parentNode) toast.remove();
    clearTimeout(timer);
  }, 4000);
  
  // Close button
  toast.querySelector('.toast-close').onclick = () => {
    if (toast.parentNode) toast.remove();
  };
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

// Logout function - fixes ReferenceError in user.js/admin.js
function clearAuth() {
  localStorage.removeItem('token');
}

function logout() {
  clearAuth();
  if (typeof showToast === 'function') {
    showToast('Logged out successfully', 'info');
  }
  setTimeout(() => {
    window.location.href = '../login.html';
  }, 1000);
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

console.log('✅ Shared utils V2 loaded - RECURSION-PROOF');


