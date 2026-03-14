// Checkout-Only Shared Utils (no const API_BASE conflict)
const API_BASE = 'https://belleful-fphf.vercel.app/api';
const SOCKET_URL = window.location.origin;

// ... (copy full shared-v2.js content without duplicate issues)
function getAuthToken() {
  return localStorage.getItem('token');
}

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

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

function showToast(message, type = 'info') {
  document.querySelectorAll('.toast').forEach(toast => toast.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} position-fixed top-0 end-0 m-3 p-3 rounded shadow-lg`;
  toast.innerHTML = `<i class="fas fa-info-circle me-2"></i>${message}`;
  toast.style.zIndex = '9999';
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}

function isLoggedIn() {
  return !!getAuthToken();
}

console.log('✅ Checkout shared utils loaded');

