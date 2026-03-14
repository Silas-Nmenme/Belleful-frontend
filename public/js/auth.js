// Authentication system - complete flow
let currentUser = null;
let authMode = 'user'; // 'user' or 'admin'

// DOM Elements
const loginForm = document.getElementById('loginForm');
const otpForm = document.getElementById('otpForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const otpEmail = document.getElementById('otpEmail');
const otpCode = document.getElementById('otpCode');

// Initialize auth system
document.addEventListener('DOMContentLoaded', initAuth);

function initAuth() {
  // Auto-fill email from localStorage if available
  const savedEmail = localStorage.getItem('lastEmail');
  if (savedEmail) {
    loginEmail.value = savedEmail;
  }
  
  // Listen for auth state changes
  checkAuthStatus();
  
  // Event listeners
  setupEventListeners();
}

function setupEventListeners() {
  // OTP input enhancements
  otpCode.addEventListener('input', function(e) {
    this.value = this.value.replace(/[^0-9]/g, '').slice(0,6);
  });
  
  otpCode.addEventListener('keyup', function(e) {
    if (this.value.length === 6) {
      otpForm.querySelector('button[type="submit"]').focus();
    }
  });
  
  // Enter to submit
  otpCode.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && this.value.length === 6) {
      otpForm.querySelector('form').dispatchEvent(new Event('submit'));
    }
  });
}

// Check authentication status
async function checkAuthStatus() {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const response = await apiGet('/auth/profile');
      if (response.ok) {
        const userData = await response.json();
        currentUser = userData.user;
        localStorage.setItem('userRole', currentUser.role);
        
        // Redirect based on role
        if (currentUser.role === 'admin') {
          showToast('Welcome Admin!', 'success');
          setTimeout(() => window.location.href = 'admin-dashboard.html', 1500);
        } else {
          showToast(`Welcome back, ${currentUser.name}!`, 'success');
          setTimeout(() => window.location.href = 'user-dashboard.html', 1500);
        }
      } else {
        logout();
      }
    } catch (error) {
      logout();
    }
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
  
  const response = await fetch(`${window.API_BASE}${endpoint}`, config);
  
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

// Login handler
async function handleLogin(e) {
  e.preventDefault();
  
  const email = loginEmail.value.trim().toLowerCase();
  const password = loginPassword.value;
  
  if (!email || !password) {
    showToast('Please fill all fields', 'error');
    return;
  }
  
  try {
    showLoading('loginFormSubmit', 'Signing in...');
    
    const response = await apiPost('/auth/login', { email, password });
    
    if (response.ok) {
      const result = await response.json();
      saveAuth(result);
      showToast('Login successful!', 'success');
    } else {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    hideLoading('loginFormSubmit');
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
  
  try {
    showLoading('registerFormSubmit', 'Creating account...');
    
    const response = await apiPost(endpoint, { name, email, password });
    
    if (response.ok) {
      const result = await response.json();
      localStorage.setItem('pendingEmail', email);
      showOTPForm(email);
      showToast('Check your email for OTP!', 'success');
    } else {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    hideLoading('registerFormSubmit');
  }
}

// OTP Verification
async function handleOTP(e) {
  e.preventDefault();
  
  const email = otpEmail.value;
  const otp = otpCode.value.trim();
  
  if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    showToast('Please enter valid 6-digit OTP', 'error');
    return;
  }
  
  try {
    showLoading('otpFormSubmit', 'Verifying...');
    
    const response = await apiPost('/auth/verify-otp', { email, otp });
    
    if (response.ok) {
      const result = await response.json();
      saveAuth(result);
      mergeGuestCart(); // From cart.js
      showToast('Welcome to Belleful!', 'success');
    } else {
      const error = await response.json();
      throw new Error(error.message || 'Invalid OTP');
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    hideLoading('otpFormSubmit');
  }
}

// Save auth data
function saveAuth(result) {
  localStorage.setItem('token', result.token);
  localStorage.setItem('userRole', result.user.role);
  localStorage.setItem('lastEmail', result.user.email);
  currentUser = result.user;
}

// Show OTP form
function showOTPForm(email) {
  loginForm.style.display = 'none';
  otpForm.style.display = 'block';
  otpEmail.value = email;
  otpCode.value = '';
  otpCode.focus();
}

// Resend OTP
async function resendOTP() {
  const email = otpEmail.value;
  try {
    showLoading('otpResendBtn', 'Sending...');
    // Trigger register again for same email
    const endpoint = localStorage.getItem('authMode') === 'admin' ? '/auth/admin-signup' : '/auth/signup';
    const response = await apiPost(endpoint, { email, name: 'Resend', password: 'temp' });
    if (response.ok) {
      showToast('New OTP sent!', 'success');
    }
  } catch (error) {
    showToast('Failed to resend. Try again.', 'error');
  } finally {
    hideLoading('otpResendBtn');
  }
}

// Show register form (toggle)
function showRegister() {
  // Implementation depends on register form HTML
  document.getElementById('registerSection').scrollIntoView({ behavior: 'smooth' });
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('currentUser');
  currentUser = null;
  showToast('Logged out successfully', 'info');
  setTimeout(() => window.location.href = 'index.html', 1000);
}

// Utility functions
function showLoading(selector, text) {
  const btn = typeof selector === 'string' ? document.querySelector(selector) : selector;
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>${text}`;
}

function hideLoading(selector) {
  const btn = typeof selector === 'string' ? document.querySelector(selector) : selector;
  btn.disabled = false;
  // Reset original text would be set by caller
}

// Toast notifications
function showToast(message, type = 'info') {
  // Same toast from menu.js - could be shared utility
  const toast = document.createElement('div');
  toast.className = `position-fixed top-4 end-4 p-4 rounded-4 shadow-lg z-1050 animate__animated animate__fadeInRight`;
  toast.style.cssText = `
    background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
    color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
    max-width: 400px;
  `;
  toast.innerHTML = `
    <div class="d-flex align-items-start">
      <strong class="me-3">${type.charAt(0).toUpperCase() + type.slice(1)}! </strong>
      <span>${message}</span>
      <button type="button" class="btn-close ms-auto" style="filter: invert(1);" onclick="this.parentElement.parentElement.remove()"></button>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('animate__fadeInRight');
    toast.classList.add('animate__fadeOutRight');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Global auth check for protected pages
window.checkAuth = async (redirectTo = 'login.html') => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
};

// Export for global use
window.AuthManager = {
  login: handleLogin,
  register: handleRegister,
  verifyOTP: handleOTP,
  logout,
  currentUser,
  checkAuthStatus
};

// Form submissions
if (loginForm) {
  loginForm.addEventListener('submit', handleLogin);
}
if (document.getElementById('otpFormSubmit')) {
  document.getElementById('otpFormSubmit').addEventListener('submit', handleOTP);
}

