// Authentication system - complete flow
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

// Check authentication status
async function checkAuthStatus() {
  const currentPath = window.location.pathname.split('/').pop() || window.location.href.split('/').pop();
  if (currentPath === 'login.html' || currentPath === 'admin-login.html') {
    return; // Skip auth check on login pages
  }
  
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = window.location.pathname.includes('admin') ? 'admin-login.html' : 'login.html';
    return;
  }

  const role = localStorage.getItem('userRole');
  const currentPathCheck = window.location.pathname.split('/').pop() || window.location.href.split('/').pop();
  const targetDash = role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';

  // Skip API call & trust localStorage if already on correct dashboard
  if (role && currentPath === targetDash) {
    showToast(`Welcome ${role === 'admin' ? 'Admin' : ''}!`, 'success');
    return;
  }

  try {
    const response = await apiGet('/auth/profile');
    if (response.ok) {
      const userData = await response.json();
      currentUser = userData.user;
      localStorage.setItem('userRole', currentUser.role);
      
      // Skip redirect if already on correct dashboard
      const currentPath2 = window.location.pathname.split('/').pop() || window.location.href.split('/').pop();
      const targetDash2 = currentUser.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
  if (currentPath2 === targetDash2) {
        showToast(`Welcome ${currentUser.role === 'admin' ? 'Admin' : 'back'}, ${currentUser.name}!`, 'success');
        updateNavbarForAdmin();
        return;
      }
      
      // Redirect based on role
      showToast(`Welcome ${currentUser.role === 'admin' ? 'Admin' : 'back'}, ${currentUser.name}!`, 'success');
      setTimeout(() => window.location.href = targetDash2, 1500);
    } else {
      logout();
    }
  } catch (error) {
    logout();
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

// Mock users for frontend demo
const MOCK_USERS = {
  'user@example.com': { name: 'John User', role: 'user' },
  'admin@belleful.com': { name: 'Admin Belleful', role: 'admin' }
};

// Login handler
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

  // Mock credentials check
  const user = MOCK_USERS[email];
  if (user && (password === 'password123' || (email === 'admin@belleful.com' && password === 'admin123'))) {
    // Mock success
    showLoading(submitBtn || 'loginFormSubmit', 'Signing in...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
    
    const mockResult = {
      token: 'mock-jwt-' + Date.now(),
      user: user
    };
    saveAuth(mockResult);
    showToast(`Login successful! Welcome ${user.name}`, 'success');
    
    // Demo direct redirect (bypasses API/checkAuthStatus loop)
    setTimeout(() => {
      const role = user.role;
      window.location.href = role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
    }, 1500);
    
    hideLoading(submitBtn || 'loginFormSubmit');
    return;
  }

  
  try {
    showLoading(submitBtn || 'loginFormSubmit', 'Signing in...');
    
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
    showToast(`Invalid credentials. Try: user@example.com/password123 or admin@belleful.com/admin123`, 'error');
  } finally {
    hideLoading(submitBtn || 'loginFormSubmit');
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
  
  const otpEmailEl = document.getElementById('otpEmail');
  const otpCodeEl = document.getElementById('otpCode');
  
  const email = otpEmailEl?.value || '';
  const otp = otpCodeEl?.value.trim() || '';
  
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
  setTimeout(() => {
    updateNavbarForAdmin(); // Reset navbar
    window.location.href = 'index.html';
  }, 1000);
}

// Utility functions
function showLoading(selector, text) {
  const btn = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!btn) {
    console.warn(`showLoading: Element not found for selector "${selector}"`);
    return;
  }
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>${text}`;
}

function hideLoading(selector) {
  const btn = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!btn) {
    console.warn(`hideLoading: Element not found for selector "${selector}"`);
    return;
  }
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

// Update navbar for admin users
function updateNavbarForAdmin() {
  const role = localStorage.getItem('userRole');
  if (role !== 'admin') return;

  // Set all navbar brands to public site
  document.querySelectorAll('.navbar-brand').forEach(brand => {
    brand.href = 'index.html';
    brand.innerHTML = '<i class="fas fa-utensils me-2"></i>Belleful';
  });

  // Redirect public nav links to admin dashboard
  document.querySelectorAll('a[href="index.html"], a[href="#menu"], a[href="cart.html"], a[href="user-dashboard.html"]').forEach(link => {
    if (!link.closest('.dropdown-menu') && !link.textContent.includes('Admin') && !link.closest('#navbarNav')?.querySelector('[href="admin-dashboard.html"]')) {
      link.href = 'admin-dashboard.html';
      if (link.href === '#menu') link.href = 'admin-dashboard.html#orders-admin';
    }
  });

  // Add admin indicator to account dropdown if present
  const accountToggle = document.querySelector('.dropdown-toggle:has(.fa-user)');
  if (accountToggle) {
    accountToggle.innerHTML = '<i class="fas fa-user-shield text-warning me-1"></i>Admin';
  }
}

// Global form event listeners - only on login pages
document.addEventListener('DOMContentLoaded', () => {
  // OTP forms only (login handled by HTML inline)
  if (document.getElementById('otpFormSubmit')) {
    document.querySelectorAll('form#otpFormSubmit').forEach(form => {
      form.addEventListener('submit', handleOTP);
    });
  }
  
  // Update navbar after DOM ready
  updateNavbarForAdmin();
});


// Export navbar function globally
window.AuthManager.updateNavbarForAdmin = updateNavbarForAdmin;



