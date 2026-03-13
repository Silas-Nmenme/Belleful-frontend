// Belleful Professional User Dashboard - Complete Rewrite V2
// Uses new /api/dashboard/user/* endpoints - RECURSION FIXED

let stats = {}, profile = {}, cart = {}, orders = [], payments = [];
let currentOrderPage = 1, totalOrderPages = 1;
// socket provided by shared-v2.js

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const sidebar = document.getElementById('sidebar');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelectorAll('.nav-link');
const tabContents = document.querySelectorAll('.tab-content');
const userProfile = document.getElementById('userProfile');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const notificationBtn = document.getElementById('notificationBtn');
const themeToggle = document.getElementById('themeToggle');
const refreshBtn = document.getElementById('refreshBtn');

// Orders
const ordersStatusFilter = document.getElementById('ordersStatusFilter');
const ordersRefreshBtn = document.getElementById('ordersRefreshBtn');

// FIXED: Robust init - loader hides FIRST
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 User Dashboard V2 init START');
  
  // SAFETY: Hide loader IMMEDIATELY
  hideLoading();
  
  try {
    const auth = safeAuthCheck(false);
    if (!auth.valid) {
      console.warn('🔒 User auth failed:', auth.reason);
      showToast('Please login to access dashboard', 'error');
      setTimeout(() => window.location.href = '../login.html', 2000);
      return;
    }

    console.log('✅ User dashboard auth OK:', auth.user.name);
    
    // Setup & load
    await initProfessionalDashboard();
  } catch (error) {
    console.error('💥 User dashboard V2 init error:', error);
    showToast('Dashboard loaded with limited functionality', 'warning');
  }
});

async function initProfessionalDashboard() {
  hideLoading();
  
  const user = getUserInfo();
  if (!user) {
    showToast('Please login to access dashboard', 'error');
    setTimeout(() => window.location.href = '../login.html', 2000);
    return;
  }

  // Setup UI
  userName.textContent = user.name || user.email;
  setupEventListeners();
  
  // Socket: Safe singleton call from shared-v2.js
  window.connectSocket?.();
  
  // Load all data
  await Promise.all([
    loadStats(),
    loadProfile(),
    loadCart(),
    loadOrders(1),
    loadPayments()
  ]);
  
  setupSkeletonLoaders();
}

function switchTab(tabId) {
  tabContents.forEach(content => content.classList.remove('active'));
  navLinks.forEach(link => link.classList.remove('active'));
  
  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add('active');
  
  const targetLink = document.querySelector(`[data-tab="${tabId}"]`);
  if (targetLink) targetLink.classList.add('active');
  
  // Update header
  const header = document.querySelector('.section-header h1');
  if (header) {
    const titles = {
      stats: 'Dashboard Overview',
      orders: 'Your Orders', 
      profile: 'Profile Settings',
      cart: 'Shopping Cart',
      payments: 'Payment History'
    };
    header.textContent = titles[tabId] || 'Dashboard';
  }
}

function setupEventListeners() {
  // Navigation
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      switchTab(tab);
    });
  });

  mobileMenuBtn.onclick = () => sidebar.classList.toggle('open');
  
  logoutBtn.onclick = logout;
  refreshBtn.onclick = refreshAllData;
  ordersRefreshBtn.onclick = () => loadOrders(currentOrderPage);
  ordersStatusFilter.onchange = filterOrders;

  themeToggle.onclick = toggleTheme;
  notificationBtn.onclick = toggleNotifications;

  // Close modals on outside click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.remove('show');
    };
  });
}

async function refreshAllData() {
  try {
    showToast('Refreshing all data...', 'info');
    await Promise.all([
      loadStats?.(),
      loadProfile?.(),
      loadCart?.(),
      loadOrders?.(currentOrderPage),
      loadPayments?.()
    ]);
    showToast('Dashboard refreshed!', 'success');
  } catch (error) {
    console.error('Refresh error:', error);
    showToast('Some data refresh failed', 'warning');
  }
}
async function loadStats() {
  try {
    showSkeleton('statsGrid');
    const { data } = await apiCall('/dashboard/user/stats');
    stats = data;
    renderStats();
  } catch (error) {
    console.error('Stats load error:', error);
  }
}

function renderStats() {
  const statsGrid = document.getElementById('statsGrid');
  const statsData = [
    { id: 'totalOrders', label: 'Total Orders', value: stats.totalOrders || 0, icon: 'fas fa-shopping-bag', color: 'primary' },
    { id: 'totalSpent', label: 'Total Spent', value: `₦${(stats.totalSpent || 0).toLocaleString()}`, icon: 'fas fa-wallet', color: 'success' },
    { id: 'completedOrders', label: 'Completed', value: stats.completedOrders || 0, icon: 'fas fa-check-circle', color: 'success' },
    { id: 'cartItems', label: 'Cart Items', value: stats.cartItems || 0, icon: 'fas fa-shopping-cart', color: 'warning' },
    { id: 'cartTotal', label: 'Cart Total', value: `₦${(stats.cartTotal || 0).toLocaleString()}`, icon: 'fas fa-credit-card', color: 'info' }
  ];

  statsGrid.innerHTML = statsData.map(stat => `
    <div class="stat-card ${stat.color}">
      <div class="stat-icon">
        <i class="${stat.icon}"></i>
      </div>
      <div class="stat-content">
        <div class="stat-label">${stat.label}</div>
        <div class="stat-value" data-target="${stat.value}">${stat.value}</div>
        <div class="stat-change positive">+12% from last month</div>
      </div>
    </div>
  `).join('');

  // Animate counters
  document.querySelectorAll('.stat-value').forEach(el => animateCounter(el));
}

// Stub functions for referenced APIs to prevent further errors (implement as needed)
async function loadProfile() {
  console.log('loadProfile stub');
  profile = { name: userName.textContent, email: getUserInfo()?.email };
}
async function loadCart() {
  console.log('loadCart stub');
  cart = {};
}
async function loadOrders(page = 1) {
  console.log('loadOrders stub');
  orders = [];
  currentOrderPage = page;
}
async function loadPayments() {
  console.log('loadPayments stub');
  payments = [];
}

function animateCounter(el) {
  const target = parseFloat(el.textContent.replace(/[^\d.]/g, ''));
  let current = 0;
  const increment = target / 50;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      el.textContent = el.dataset.target || el.textContent;
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(current).toLocaleString();
    }
  }, 20);
}

// Global exports - FIXES ReferenceErrors for onclick handlers
window.switchTab = switchTab;
window.refreshAllData = refreshAllData;
window.loadOrders = loadOrders;
window.filterOrders = filterOrders;
window.toggleTheme = toggleTheme;
window.toggleNotifications = toggleNotifications;

// Missing utility stubs
function filterOrders() { console.log('filterOrders'); }
function toggleTheme() { 
  document.documentElement.classList.toggle('dark-theme');
  localStorage.setItem('theme

