// Authentication system - complete flow for Belleful frontend
// Real backend authentication for Belleful (login via /login endpoint with RBAC)

let currentUser = null;
let authMode = 'user'; // 'user' or 'admin'

// Initialize auth system
document.addEventListener('DOMContentLoaded', initAuth);

function initAuth() {
  // Auto-fill email from localStorage if available
  const savedEmail = localStorage.getItem('lastEmail');
  const emailInputs = document.querySelectorAll('input[type="email"]:not([readonly])');
  emailInputs.forEach(input => {
    if (!input.value) input.value = savedEmail;
  });
  
  // Listen for auth state changes
  checkAuthStatus();
  
  // Update navbar for current auth state
  updateNavbarForAdmin();
  
  // Event listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Get OTP elements dynamically with null checks
  const otpCodeEl = document.getElementById('otpCode');
  const otpFormEl = document.getElementById('otpForm');
  
  if (otpCodeEl) {
    otpCodeEl.addEventListener('input', function(e) {
      this.value = this.value.replace(/[^0-9]/g, '').slice(0,6);
    });
    
    otpCodeEl.addEventListener('keyup', function(e) {
      if (this.value.length === 6 && otpFormEl) {
        const submitBtn = otpFormEl.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.focus();
      }
    });
    
    otpCodeEl.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && this.value.length === 6 && otpFormEl) {
        otpFormEl.querySelector('form')?.dispatchEvent(new Event('submit'));
      }
    });
  }
}

// Check authentication status - FIXED for mock tokens
async function checkAuthStatus() {
  const currentPath = window.location.pathname.split('/').pop() || window.location.href.split('/').pop();
  if (currentPath === 'login.html' || currentPath === 'admin-login.html') {
    return; // Skip auth check on login pages
  }
  
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = currentPath.includes('admin') ? 'admin-login.html' : 'login.html';
    return;
  }

  const role = localStorage.getItem('userRole');
  const currentPathCheck = window.location.pathname.split('/').pop() || window.location.href.split('/').pop();
  const targetDash = role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';

  // Skip if already on correct dashboard
  if (role && currentPathCheck === targetDash) {
    showToast(`Welcome ${role === 'admin' ? 'Admin' : ''}!`, 'success');
    return;
  }



  // Real API check
  try {
    const response = await apiGet('/auth/profile');

    if (response.ok) {
      const userData = await response.json();
      currentUser = userData.user;
      localStorage.setItem('userRole', currentUser.role);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      // Skip redirect if already on correct dashboard
      const currentPath2 = window.location.pathname.split('/').pop() || window.location.href.split('/').pop();
      const targetDash2 = currentUser.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
      if (currentPath2 === targetDash2) {
        showToast(`Welcome ${currentUser.role === 'admin' ? 'Admin' : 'back'}, ${currentUser.name}!`, 'success');
        updateNavbarForAdmin();
        return;
      }
      
      showToast(`Welcome ${currentUser.role === 'admin' ? 'Admin' : 'back'}, ${currentUser.name}!`, 'success');
      setTimeout(() => window.location.href = targetDash2, 1500);
    } else {
      logout();
    }
  } catch (error) {
    // Fallback to mock if API fails
    console.warn('API check failed, using mock auth');
  }
}

// API Helper with auth
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...options
  };
  
  const response = await fetch(`${window.API_BASE || '/api'}${endpoint}`, config);
  
  if (response.status === 401) {
    logout();
    throw new Error('Session expired. Please login again.');
  }
  
  return response;
}

async function apiPost(endpoint, data) {
  return apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function apiGet(endpoint) {
  return apiCall(endpoint, { method: 'GET' });
}

// Mock users for frontend demo (real users saved in DB later)


// Login handler - FIXED mock logic
async function handleLogin(e, submitBtn = null) {
  e.preventDefault();
  
  // Dynamic element lookup with fallbacks
  const emailInput = document.getElementById('loginEmail') || 
                     document.querySelector('input[type="email"]:not([readonly])') ||
                     document.getElementById('adminLoginEmail');
  const passwordInput = document.getElementById('loginPassword') || 
                        document.querySelector('input[type="password"]') ||
                        document.getElementById('adminLoginPassword');
  
  const email = emailInput?.value.trim().toLowerCase() || '';
  const password = passwordInput?.value || '';
  
  if (!email || !password) {
    showToast('Please fill all fields', 'error');
    return;
  }

  const authMode = localStorage.getItem('authMode') || 'user';
  const endpoint = authMode === 'admin' ? '/admin/login' : '/login';
  
  showLoading(submitBtn || 'loginFormSubmit', 'Signing in...');
  
  try {
    const response = await apiPost(endpoint, { email, password });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Login failed');
    }
    const result = await response.json();
    saveAuth(result);
    localStorage.setItem('currentUser', JSON.stringify(result.user));
    showToast(`Welcome ${result.user.name || 'back'}!`, 'success');
    hideLoading(submitBtn || 'loginFormSubmit');
    
    const dash = result.user.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
    setTimeout(() => window.location.href = dash, 800);
  } catch (error) {
    hideLoading(submitBtn || 'loginFormSubmit');
    showToast(error.message, 'error');
  }

}

// Register handler
async function handleRegister(e) {
  e.preventDefault();
  
  const name = document.getElementById('registerName')?.value.trim();
  const email = document.getElementById('registerEmail')?.value.trim().toLowerCase();
  const password = document.getElementById('registerPassword')?.value;
  const endpoint = authMode === 'admin' ? '/auth/admin-signup' : '/auth/signup';
  
  if (!name || !email || !password) {
    showToast('Please fill all fields', 'error');
    return;
  }
  
  // Mock register (in real app, save to DB)
  showToast('Registration temporarily disabled. Please login with existing account or contact admin@belleful.com', 'info');
}

// OTP Verification
async function handleOTP(e) {
  e.preventDefault();
  
  const otpEmailEl = document.getElementById('otpEmail');
  const otpCodeEl = document.getElementById('otpCode');
  
  const email = otpEmailEl?.value || '';
  const otp = otpCodeEl?.value.trim() || '';
  
  if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    showToast('Please enter valid 6-digit OTP (Demo: 123456)', 'error');
    return;
  }
  
  showToast('Registration temporarily disabled. Please login with existing account.', 'info');
}

// Save auth data
function saveAuth(result) {
  localStorage.setItem('token', result.token);
  localStorage.setItem('userRole', result.user.role);
  localStorage.setItem('lastEmail', result.user.email);
  localStorage.setItem('currentUserName', result.user.name);
  currentUser = result.user;
}

// Show OTP form
function showOTPForm(email) {
  const loginForm = document.getElementById('loginForm');
  const otpForm = document.getElementById('otpForm');
  if (loginForm) loginForm.style.display = 'none';
  if (otpForm) otpForm.style.display = 'block';
  const otpEmail = document.getElementById('otpEmail');
  if (otpEmail) otpEmail.value = email;
  const otpCode = document.getElementById('otpCode');
  if (otpCode) {
    otpCode.value = '';
    otpCode.focus();
  }
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('currentUserName');
  localStorage.removeItem('lastEmail');
  localStorage.removeItem('pendingEmail');
  currentUser = null;
  showToast('Logged out successfully', 'info');
  updateNavbarForAdmin();
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
}

// Utility functions
function showLoading(selectorOrBtn, text) {
  let btn = selectorOrBtn;
  if (typeof selectorOrBtn === 'string') {
    btn = document.querySelector(selectorOrBtn);
    if (!btn && selectorOrBtn.includes('Form')) {
      const form = document.querySelector(selectorOrBtn.replace('Submit', ''));
      btn = form ? form.querySelector('button[type="submit"]') : null;
    }
  }
  if (!btn) {
    console.warn(`showLoading: Element "${selectorOrBtn}" not found`);
    return;
  }
  btn.dataset.originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>${text}`;
}

function hideLoading(selectorOrBtn) {
  let btn = selectorOrBtn;
  if (typeof selectorOrBtn === 'string') {
    btn = document.querySelector(selectorOrBtn);
    if (!btn && selectorOrBtn.includes('Form')) {
      const form = document.querySelector(selectorOrBtn.replace('Submit', ''));
      btn = form ? form.querySelector('button[type="submit"]') : null;
    }
  }
  if (!btn) return;
  btn.disabled = false;
  btn.innerHTML = btn.dataset.originalText || btn.textContent.trim() || 'Submit';
}

// Toast notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast-container position-fixed top-0 end-0 p-3 z-1055`;
  toast.innerHTML = `
    <div class="toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;
  document.body.appendChild(toast);
  
  const bsToast = new bootstrap.Toast(toast.querySelector('.toast'));
  bsToast.show();
  
  toast.querySelector('.toast').addEventListener('hidden.bs.toast', () => toast.remove());
}

// Update navbar for admin users
function updateNavbarForAdmin() {
  const role = localStorage.getItem('userRole');
  if (role !== 'admin') return;

  // Update navbar to show admin context
  document.querySelectorAll('.navbar-brand').forEach(brand => {
    brand.href = 'admin-dashboard.html';
    brand.innerHTML = '<i class="fas fa-utensils text-warning me-2"></i>Belleful Admin';
  });

  // Redirect links to admin dashboard
  document.querySelectorAll('a[href*="dashboard.html"]:not([href*="admin"])').forEach(link => {
    link.href = 'admin-dashboard.html';
  });
}

// Global functions
window.checkAuth = checkAuthStatus;
window.logout = logout;
window.AuthManager = {
  login: handleLogin,
  currentUser,
  checkAuthStatus,
  updateNavbarForAdmin
};
AuthManager.login = handleLogin;

// Auto-init if on login/register page
if (document.querySelector('#loginForm, #registerForm, #otpForm')) {
  // Form event listeners added via HTML onclick or here
  document.addEventListener('click', (e) => {
    if (e.target.matches('[onclick*="handleLogin"]')) handleLogin(e);
    if (e.target.matches('[onclick*="handleRegister"]')) handleRegister(e);
    if (e.target.matches('[onclick*="handleOTP"]')) handleOTP(e);
  });
}

