// Shared Auth Utils - Compatible with app.js and dashboards
const API_BASE = 'https://belleful-fphf.vercel.app/api';

function getAuthToken() {
  return localStorage.getItem('token');
}

function saveAuthToken(token) {
  localStorage.setItem('token', token);
}

function clearAuth() {
  localStorage.removeItem('token');
}

function getUserInfo() {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    clearAuth();
    return null;
  }
}

function isLoggedIn() {
  return !!getAuthToken();
}

function isAdmin() {
  const user = getUserInfo();
  return user?.role === 'admin';
}

function showToast(message, type = 'info') {
  // Simple toast compatible with all pages
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 9999;
    padding: 16px 24px; border-radius: 8px; color: white; font-weight: 600;
    background: ${type === 'error' ? '#ef4444' : '#10b981'}; 
    box-shadow: 0 10px 30px rgba(0,0,0,0.3); transform: translateX(400px);
    transition: transform 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.style.transform = 'translateX(0)', 100);
  setTimeout(() => {
    toast.style.transform = 'translateX(400px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function universalAuthGuard() {
  const protectedPaths = ['orders.html', 'dashboard/admin-dashboard.html', 'dashboard/user-dashboard.html'];
  const currentPath = window.location.pathname.split('/').pop();
  
  if (protectedPaths.includes(currentPath) && !isLoggedIn()) {
    showToast('Please login to access this page', 'error');
    setTimeout(() => window.location.href = 'login.html', 1500);
    return false;
  }
  
  // Admin guard
  if (currentPath === 'dashboard/admin-dashboard.html' && !isAdmin()) {
    showToast('Admin access required', 'error');
    setTimeout(() => window.location.href = 'dashboard/user-dashboard.html', 1500);
    return false;
  }
  
  return true;
}

function logout() {
  clearAuth();
  showToast('Logged out successfully', 'info');
  setTimeout(() => window.location.href = 'login.html', 1000);
}

// Role-based redirect helper
function redirectByRole() {
  if (!isLoggedIn()) return 'login.html';
  return isAdmin() ? 'dashboard/admin-dashboard.html' : 'dashboard/user-dashboard.html';
}

console.log('✅ Auth utils loaded');

