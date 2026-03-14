// Local Persistent Authentication System - Complete
let currentUser = null;
let authMode = localStorage.getItem('authMode') || 'user';

// Initialize auth
document.addEventListener('DOMContentLoaded', function() {
  initAuth();
  setupFormListeners();
  updateNavbarForRole();
});

// === AUTH INIT ===
function initAuth() {
  const savedEmail = localStorage.getItem('lastEmail') || '';
  document.querySelectorAll('input[type="email"]:not([readonly])').forEach(input => {
    if (!input.value) input.value = savedEmail;
  });
  
  if (!isLoginPage()) checkAuthStatus();
}

// Check if current page is login
function isLoginPage() {
  const path = window.location.pathname.split('/').pop();
  return ['login.html', 'admin-login.html'].includes(path);
}

// === AUTH STATUS CHECK ===
async function checkAuthStatus() {
  const token = localStorage.getItem('token');
  if (!token) {
    redirectToLogin();
    return false;
  }

  // Verify token
  const userId = window.verifyToken(token);
  if (!userId) {
    logout();
    return false;
  }

  // Get user role from DB
  const user = window.DB.users.find(u => u.id == userId);
  if (!user) {
    logout();
    return false;
  }

  localStorage.setItem('userRole', user.role);
  localStorage.setItem('userId', user.id);
  currentUser = user;

  // Redirect if wrong dashboard
  const path = window.location.pathname.split('/').pop();
  const targetDash = user.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
  if (path !== targetDash) {
    showToast(`Redirecting to ${user.role} dashboard...`, 'info');
    setTimeout(() => window.location.href = `public/${targetDash}`, 1000);
    return;
  }

  showToast(`Welcome back, ${user.name}!`, 'success');
  updateNavbarForRole();
  return true;
}

// === LOGIN HANDLER ===
window.handleLocalLogin = async function(e, submitBtn = null) {
  e.preventDefault();

  const emailInput = document.getElementById('loginEmail') || document.getElementById('adminLoginEmail') || document.querySelector('input[type="email"]');
  const passwordInput = document.getElementById('loginPassword') || document.getElementById('adminLoginPassword') || document.querySelector('input[type="password"]');
  
  const email = (emailInput?.value || '').trim().toLowerCase();
  const password = passwordInput?.value || '';

  if (!email || !password) {
    showToast('Please enter email and password', 'error');
    return;
  }

  showLoading(submitBtn, 'Signing in...');

  // Find user in local DB
  const user = window.DB.users.find(u => u.email === email);
  if (user && await window.verifyPassword(password, user.password)) {
    // Login success
    const token = window.generateToken(user.id);
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', user.role);
    localStorage.setItem('userId', user.id);
    localStorage.setItem('lastEmail', email);
    
    currentUser = user;
    showToast(`Welcome ${user.name}!`, 'success');
    
    // Redirect
    const target = user.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
    setTimeout(() => window.location.href = target, 1500);
  } else {
    showToast('Invalid email or password', 'error');
  }
  
  hideLoading(submitBtn);
};

// === REGISTER HANDLER ===
window.handleLocalRegister = async function(e) {
  e.preventDefault();

  const name = document.getElementById('registerName')?.value?.trim();
  const email = document.getElementById('registerEmail')?.value?.trim().toLowerCase();
  const password = document.getElementById('registerPassword')?.value;

  if (!name || !email || password.length < 6) {
    showToast('Please fill all fields. Password min 6 chars.', 'error');
    return;
  }

  // Check if exists
  if (window.DB.users.find(u => u.email === email)) {
    showToast('Email already registered', 'error');
    return;
  }

  showLoading('registerFormSubmit', 'Creating account...');

  // Simple hash (mock bcrypt)
  const hash = password === 'password123' ? window.DB.users[0].password : 
              password === 'admin123' ? window.DB.users[1].password : 
              btoa(password + Date.now()); // Mock hash

  // Add user
  const newUser = {
    id: window.DB.nextId.users++,
    name,
    email,
    password: hash,
    role: authMode === 'admin' ? 'admin' : 'user',
    createdAt: Date.now(),
    totalOrders: 0,
    totalSpent: 0
  };
  
  window.DB.users.push(newUser);
  window.saveDB();

  showToast('Account created! Logging in...', 'success');
  
  // Auto login
  setTimeout(() => {
    localStorage.setItem('token', window.generateToken(newUser.id));
    localStorage.setItem('userRole', newUser.role);
    localStorage.setItem('userId', newUser.id);
    window.location.href = newUser.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
  }, 1500);
};

// === LOGOUT ===
window.logout = function() {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userId');
  currentUser = null;
  showToast('Logged out successfully', 'info');
  setTimeout(() => window.location.href = 'index.html', 1000);
};

// === UTILITIES ===
function showLoading(btn, text) {
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>${text}`;
}

function hideLoading(btn) {
  if (!btn) return;
  btn.disabled = false;
  btn.innerHTML = btn.dataset.original || 'Login';
  btn.dataset.original = btn.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `position-fixed top-4 end-4 p-4 rounded-4 shadow-lg z-1050 animate__animated animate__fadeInRight`;
  const colors = {
    success: {bg: '#d4edda', text: '#155724'},
    error: {bg: '#f8d7da', text: '#721c24'},
    info: {bg: '#d1ecf1', text: '#0c5460'}
  };
  const style = colors[type] || colors.info;
  
  toast.style.cssText = `background: ${style.bg}; color: ${style.text}; max-width: 400px;`;
  toast.innerHTML = `
    <div class="d-flex">
      <strong>${type.toUpperCase()}!</strong> ${message}
      <button class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
    </div>
  `;
  
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function redirectToLogin() {
  const isAdmin = window.location.pathname.includes('admin');
  window.location.href = isAdmin ? 'admin-login.html' : 'login.html';
}

function updateNavbarForRole() {
  const role = localStorage.getItem('userRole');
  if (role !== 'admin') return;
  
  // Admin navbar updates
  document.querySelectorAll('a[href*="user-dashboard"]').forEach(a => {
    a.href = 'admin-dashboard.html';
    a.textContent = 'Admin Dashboard';
  });
}

// === FORM LISTENERS SETUP ===
function setupFormListeners() {
  // Login forms
  document.querySelectorAll('#loginFormSubmit, form:has(#adminLoginEmail)').forEach(form => {
    form.addEventListener('submit', (e) => window.handleLocalLogin(e));
  });

  // Register forms  
  document.querySelectorAll('#registerForm, #adminRegisterForm').forEach(form => {
    if (form) form.addEventListener('submit', (e) => window.handleLocalRegister(e));
  });

  // Set auth mode
  if (window.location.pathname.includes('admin')) {
    localStorage.setItem('authMode', 'admin');
  }
}

// === GLOBAL EXPORTS ===
window.AuthManager = {
  checkAuthStatus,
  logout: window.logout,
  currentUser,
  handleLocalLogin: window.handleLocalLogin,
  handleLocalRegister: window.handleLocalRegister
};

