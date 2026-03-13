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

// Toast notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showToast('Logged out successfully', 'info');
  setTimeout(() => {
    if (window.location.pathname.includes('admin')) {
      window.location.href = 'dashboard/user-dashboard.html';
    } else {
      window.location.reload();
    }
  }, 1500);
}

// Load user info from token
function getUserInfo() {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    logout();
    return null;
  }
}

// Check admin role
function isAdmin() {
  const user = getUserInfo();
  return user?.role === 'admin';
}

console.log('✅ Shared utils loaded');
