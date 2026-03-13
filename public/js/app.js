// Cleaned Belleful App - Auth/Login Flow Only
// Uses auth-shared.js utils

const API_BASE = 'https://belleful-fphf.vercel.app/api';

// Init app
function initApp() {
  if (typeof getAuthToken === 'undefined') {
    const script = document.createElement('script');
    script.src = './js/auth-shared.js';
    document.head.appendChild(script);
    script.onload = initApp;
    return;
  }
  universalAuthGuard();
  attachFormHandlers();
}

// Attach login/register/verify form handlers
function attachFormHandlers() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      await loginUser(email, password);
    });
  }

  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const btnText = document.getElementById('signup-btn-text');
      const spinner = document.getElementById('signup-loading');
      if (btnText) btnText.classList.add('d-none');
      if (spinner) spinner.classList.remove('d-none');
      const success = await registerUser(name, email, password);
      if (btnText) btnText.classList.remove('d-none');
      if (spinner) spinner.classList.add('d-none');
    });
  }

  const verifyForm = document.getElementById('verify-form');
  if (verifyForm) {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    if (email) document.getElementById('verify-email').value = email;

    const otpInputs = verifyForm.querySelectorAll('input[type="text"][maxlength="1"]');
    otpInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          otpInputs[index - 1].focus();
        }
      });
    });

    verifyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('verify-email').value;
      const otp = Array.from(otpInputs).map(input => input.value).join('');
      if (otp.length !== 6) {
        showToast('Enter full 6-digit OTP', 'error');
        return;
      }
      const btnText = document.getElementById('verify-btn-text');
      const spinner = document.getElementById('verify-loading');
      if (btnText) btnText.classList.add('d-none');
      if (spinner) spinner.classList.remove('d-none');
      await verifyOTP(email, otp);
      if (btnText) btnText.classList.remove('d-none');
      if (spinner) spinner.classList.add('d-none');
    });
  }
}

// Core Auth Functions
async function loginUser(email, password) {
  const btnText = document.getElementById('login-btn-text');
  const spinner = document.getElementById('login-spinner');
  const errorDiv = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit-btn');
  
  if (btnText) btnText.classList.add('d-none');
  if (spinner) spinner.classList.remove('d-none');
  if (submitBtn) submitBtn.disabled = true;
  if (errorDiv) errorDiv.classList.add('d-none');

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    
    if (data.success && data.token) {
      saveAuthToken(data.token);
      const user = getUserInfo();
      const redirectPath = user.role === 'admin' ? 'dashboard/admin-dashboard.html' : 'dashboard/user-dashboard.html';
      window.location.href = redirectPath;
      return true;
    } else {
      if (errorDiv) {
        errorDiv.textContent = data.message || 'Login failed';
        errorDiv.classList.remove('d-none');
      }
      showToast(data.message || 'Login failed', 'error');
      return false;
    }
  } catch (error) {
    if (errorDiv) {
      errorDiv.textContent = 'Network error: ' + error.message;
      errorDiv.classList.remove('d-none');
    }
    showToast('Network error: ' + error.message, 'error');
    return false;
  } finally {
    if (btnText) btnText.classList.remove('d-none');
    if (spinner) spinner.classList.add('d-none');
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function registerUser(name, email, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await response.json();
    if (data.success) {
      showToast('Account created! Check email for OTP.', 'success');
      window.location.href = `verify.html?email=${encodeURIComponent(email)}`;
      return true;
    } else {
      showToast(data.message || data.errors?.[0]?.msg || 'Registration failed', 'error');
      return false;
    }
  } catch (error) {
    showToast('Network error: ' + error.message, 'error');
    return false;
  }
}

async function verifyOTP(email, otp) {
  try {
    const response = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    const data = await response.json();
    if (data.success && data.token) {
      saveAuthToken(data.token);
      const user = getUserInfo();
      const redirectPath = user.role === 'admin' ? 'dashboard/admin-dashboard.html' : 'dashboard/user-dashboard.html';
      showToast('Verified! Redirecting...', 'success');
      window.location.href = redirectPath;
      return true;
    } else {
      showToast(data.message || 'Verification failed', 'error');
      return false;
    }
  } catch (error) {
    showToast('Network error: ' + error.message, 'error');
    return false;
  }
}

// Global logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('belleful-user');
  showToast('Logged out successfully', 'info');
  setTimeout(() => window.location.href = 'login.html', 1000);
}

// DOM Ready
document.addEventListener('DOMContentLoaded', initApp);

console.log('✅ Clean app.js loaded - Auth only');

