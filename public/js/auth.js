// Authentication system - complete flow for Belleful frontend (IIFE-wrapped)
// Real backend authentication for Belleful (login via /login endpoint with RBAC)

(function() {
  let currentUser = null;
  let authMode = 'user'; // 'user' or 'admin'

  // Initialize auth system - check if already initialized
  if (window.AuthManager && window.AuthManager.initialized) return;
  
  function initAuth() {
    // No localStorage auto-fill - pure URL/form state
    
    // Listen for auth state changes
    checkAuthStatus();
    
    // Update navbar for current auth state
    updateNavbarForAdmin();
    
    // Smart navigation for Home/Brand links
    if (typeof initSmartNavigation === 'function') {
      initSmartNavigation();
    }
    
    // Event listeners - run immediately for login page
    setupEventListeners();
  }

  // Force toggle setup for login page
  if (document.getElementById('loginForm')) {
    setupEventListeners();
    setupPasswordToggle();
  }

  function setupEventListeners() {
    document.addEventListener('DOMContentLoaded', function() {
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

      // Password visibility toggle
      setupPasswordToggle();
    });
  }

  // Password show/hide toggle setup
  function setupPasswordToggle() {
    const toggle = document.getElementById('togglePassword');
    const pwd = document.getElementById('loginPassword') || document.querySelector('input[type="password"]');
    if (!toggle || !pwd) return;

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = pwd.type === 'password';
      pwd.type = isPassword ? 'text' : 'password';
      const icon = toggle.querySelector('i');
      if (icon) {
        if (isPassword) {
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
          toggle.setAttribute('aria-label', 'Hide password');
        } else {
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
          toggle.setAttribute('aria-label', 'Show password');
        }
      } else {
        toggle.textContent = isPassword ? 'Hide' : 'Show';
      }
    });
  }

  // Check authentication status
  async function checkAuthStatus() {
    const pathname = window.location.pathname;
    const href = window.location.href;
    const currentPath = pathname.split('/').pop() || href.split('/').pop() || '';
    const isPublicPage = ['index.html', 'login.html', 'signup.html', 'admin-login.html', 'cart.html', 'contact-us.html'].some(page => 
      currentPath.includes(page) || href.includes(page) || pathname.endsWith(page) || document.title.includes('Belleful')
    );
    console.log('Auth check:', {currentPath, pathname, isPublicPage}); // Debug - remove after testing
    
    if (isPublicPage) {
      return; // Public pages - no auth required
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = currentPath.includes('admin') ? 'admin-login.html' : 'login.html';
      return;
    }

    const role = localStorage.getItem('userRole');
    const currentPathCheck = window.location.pathname.split('/').pop() || window.location.href.split('/').pop();
    const targetDash = role === 'admin' ? 'admin-dashboard.html' : role === 'staff' ? 'staff-dashboard.html' : 'user-dashboard.html';

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
        const targetDash2 = currentUser.role === 'admin' ? 'admin-dashboard.html' : currentUser.role === 'staff' ? 'staff-dashboard.html' : 'user-dashboard.html';
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
      console.error('Auth check failed:', error);
      logout(); // Redirect to login on auth API failure
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

    const endpoint = authMode === 'admin' ? '/auth/login' : '/auth/login';
    
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
      
      const dash = result.user.role === 'admin' ? 'admin-dashboard.html' : result.user.role === 'staff' ? 'staff-dashboard.html' : 'user-dashboard.html';
      setTimeout(() => window.location.href = dash, 800);
    } catch (error) {
      hideLoading(submitBtn || 'loginFormSubmit');
      showToast(error.message, 'error');
    }
  }

  // Register handler - REAL BACKEND
  async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName')?.value?.trim() || document.getElementById('registerName')?.value?.trim();
    const email = (document.getElementById('signupEmail')?.value || document.getElementById('registerEmail')?.value)?.trim().toLowerCase();
    const password = document.getElementById('signupPassword')?.value || document.getElementById('registerPassword')?.value;
    
    if (!name || !email || !password || password.length < 6) {
      showToast('Please fill all fields correctly (password min 6 chars)', 'error');
      return;
    }
    
    const submitBtn = e.target?.querySelector('button[type="submit"]') || document.getElementById('signupFormSubmit');
    showLoading(submitBtn, 'Creating account...');
    
    try {
      const response = await apiPost('/auth/register', { name, email, password });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Registration failed');
      }
      const result = await response.json();
      showToast(result.message || 'Account created! Check your email for OTP.', 'success');
      hideLoading(submitBtn);
      setTimeout(() => {
        window.location.href = `otp-verify.html?email=${encodeURIComponent(email)}`;
      }, 1500);
    } catch (error) {
      hideLoading(submitBtn);
      showToast(error.message, 'error');
    }
  }

  // OTP Verification - REAL BACKEND
  async function handleVerifyOTP(e, emailOverride = null) {
    e.preventDefault();
    
    // Get email from override, hidden input, query param, or localStorage
    let email = emailOverride;
    if (!email) {
      const hiddenEmail = document.getElementById('otpEmail');
      email = hiddenEmail?.value?.trim().toLowerCase();
    }
    if (!email) {
      const urlParams = new URLSearchParams(window.location.search);
      email = urlParams.get('email');
    }
    if (!email) {
      email = localStorage.getItem('pendingEmail') || localStorage.getItem('resetEmail');
    }
    const otpEl = document.getElementById('otpCode') || Array.from(document.querySelectorAll('.otp-input')).map(i => i.value).join('');
    const otp = (typeof otpEl === 'string' ? otpEl : otpEl?.trim()) || '';
    
    if (!email || !otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      showToast('Please enter valid email and 6-digit OTP', 'error');
      return;
    }
    
    const submitBtn = e.target?.querySelector('button[type="submit"]') || document.getElementById('verifyBtn');
    showLoading(submitBtn, 'Verifying OTP...');
    
    try {
      const response = await apiPost('/auth/verify-otp', { email, otp });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Invalid or expired OTP');
      }
      const result = await response.json();
      saveAuth(result);
      localStorage.removeItem('pendingEmail');
      localStorage.removeItem('pendingStaffEmail');
      showToast('Account verified! Redirecting to dashboard...', 'success');
      hideLoading(submitBtn);
      setTimeout(() => {
        const storedRole = localStorage.getItem('userRole') || (window.location.pathname.includes('staff') ? 'staff' : 'user');
        window.location.href = storedRole === 'admin' ? 'admin-dashboard.html' : storedRole === 'staff' ? 'staff-dashboard.html' : 'user-dashboard.html';
      }, 1500);
    } catch (error) {
      hideLoading(submitBtn);
      showToast(error.message, 'error');
    }
  }

  // Save auth data
  function saveAuth(result) {
    localStorage.setItem('token', result.token);
    localStorage.setItem('userRole', result.user.role);
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
    localStorage.removeItem('pendingEmail');
    currentUser = null;
    showToast('logged out');
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
      if (!btn) {
        const formSelector = selectorOrBtn.includes('Form') ? selectorOrBtn.replace('Submit', '') : null;
        if (formSelector) {
          const form = document.querySelector(formSelector);
          btn = form ? form.querySelector('button[type="submit"]') : null;
        }
      }
      if (!btn) {
        btn = document.querySelector('#menuSubmitBtn, .btn-success[type="submit"], button[type="submit"]');
      }
    }
    
    if (!btn) {
      console.warn(`showLoading: Element "${selectorOrBtn}" not found - no loading UI`);
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
          <div class="toast-body"><strong>${message}</strong></div>
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

    document.querySelectorAll('.navbar-brand').forEach(brand => {
      brand.href = 'admin-dashboard.html';
      brand.innerHTML = '<i class="fas fa-utensils text-warning me-2"></i>Belleful Admin';
    });

    document.querySelectorAll('a[href*="dashboard.html"]:not([href*="admin"])').forEach(link => {
      link.href = 'admin-dashboard.html';
    });
  }

  // Global functions
  window.AuthManager = window.AuthManager || {};
  window.AuthManager.currentUser = () => currentUser;
  window.AuthManager.login = handleLogin;
  window.AuthManager.register = handleRegister;
  window.AuthManager.verifyOTP = handleVerifyOTP;
  window.AuthManager.checkAuthStatus = checkAuthStatus;
  window.AuthManager.logout = logout;
  window.AuthManager.updateNavbarForAdmin = updateNavbarForAdmin;
  window.AuthManager.initialized = true;
  
  // Auto-init if on login/register page
  if (document.querySelector('#loginForm, #registerForm, #otpForm')) {
    document.addEventListener('click', (e) => {
      if (e.target.matches('[onclick*="handleLogin"]')) handleLogin(e);
      if (e.target.matches('[onclick*="handleRegister"]')) handleRegister(e);
      if (e.target.matches('[onclick*="handleOTP"]')) handleVerifyOTP(e);
    });
  }
  
  // Global access
  window.checkAuth = checkAuthStatus;
  window.logout = logout;
  
})();

