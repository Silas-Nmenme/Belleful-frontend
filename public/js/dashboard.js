// ===== GLOBAL UTILITIES (stubs for safety) =====
window.showToast = window.showToast || function(message, type = 'info') {
  console[type === 'error' ? 'error' : 'log'](`Toast [${type}]: ${message}`);
  // Create toast element if DOM ready
  if (document.body) {
    const toast = document.createElement('div');
    toast.className = `toast-alert alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} position-fixed`;
    toast.style.cssText = 'top:20px;right:20px;z-index:9999;max-width:350px;';
    toast.innerHTML = `<strong>${type.toUpperCase()}</strong>: ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }
};

// OrderManager stub/fallback
window.OrderManager = window.OrderManager || {
  getUserOrders: async () => ({ data: [] })
};

// ===== CORE USER DASHBOARD FUNCTIONS =====
async function loadUserStats() {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No auth token');
    const response = await fetch(`${window.API_BASE || '/api'}/dashboard/user/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('loadUserStats error:', error);
    return { data: { totalOrders: 0, totalSpent: 0, avgOrderValue: 0, monthlyOrders: 0 } };
  }
}

async function loadProfile() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const response = await fetch(`${window.API_BASE || '/api'}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    return result.user || result.data?.user || null;
  } catch (error) {
    console.error('loadProfile error:', error);
    return null;
  }
}

// FIXED: Added missing 'function' keyword
function renderStats(statsData) {
  const stats = statsData?.data || statsData || { totalOrders: 0, totalSpent: 0, avgOrderValue: 0, monthlyOrders: 0 };
  const container = document.getElementById('statsCards');
  if (!container) return;
  
  container.innerHTML = `
    <div class="col-xl-3 col-lg-6 col-md-6 mb-4" data-aos="zoom-in">
      <div class="card border-start border-primary shadow-sm h-100 py-3">
        <div class="card-body">
          <div class="row align-items-center g-0">
            <div class="col">
              <div class="text-xs font-weight-bold text-primary text-uppercase mb-1 small">Total Orders</div>
              <div class="h4 mb-0 fw-bold text-dark">${stats.totalOrders}</div>
            </div>
            <div class="col-auto">
              <i class="fas fa-shopping-bag fa-2x text-primary opacity-75"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-xl-3 col-lg-6 col-md-6 mb-4" data-aos="zoom-in" data-aos-delay="100">
      <div class="card border-start border-success shadow-sm h-100 py-3">
        <div class="card-body">
          <div class="row align-items-center g-0">
            <div class="col">
              <div class="text-xs font-weight-bold text-success text-uppercase mb-1 small">Total Spent</div>
              <div class="h4 mb-0 fw-bold text-dark">₦${stats.totalSpent?.toLocaleString() || '0'}</div>
            </div>
            <div class="col-auto">
              <i class="fas fa-wallet fa-2x text-success opacity-75"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-xl-3 col-lg-6 col-md-6 mb-4" data-aos="zoom-in" data-aos-delay="200">
      <div class="card border-start border-info shadow-sm h-100 py-3">
        <div class="card-body">
          <div class="row align-items-center g-0">
            <div class="col">
              <div class="text-xs font-weight-bold text-info text-uppercase mb-1 small">Avg Order</div>
              <div class="h4 mb-0 fw-bold text-dark">₦${stats.avgOrderValue?.toLocaleString() || '0'}</div>
            </div>
            <div class="col-auto">
              <i class="fas fa-chart-line fa-2x text-info opacity-75"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-xl-3 col-lg-6 col-md-6 mb-4" data-aos="zoom-in" data-aos-delay="300">
      <div class="card border-start border-warning shadow-sm h-100 py-3">
        <div class="card-body">
          <div class="row align-items-center g-0">
            <div class="col">
              <div class="text-xs font-weight-bold text-warning text-uppercase mb-1 small">This Month</div>
              <div class="h4 mb-0 fw-bold text-dark">${stats.monthlyOrders || 0}</div>
            </div>
            <div class="col-auto">
              <i class="fas fa-calendar fa-2x text-warning opacity-75"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // AOS refresh for new cards
  setTimeout(() => AOS.refresh(), 100);
}

// FIXED: Added 'function' keyword
function renderOrders(orders) {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = (orders || []).map(order => {
    const safeTotal = (order?.totalAmount || 0);
    const safeItems = Array.isArray(order?.items) ? order.items : [];
    const itemNames = safeItems.map(item => item?.name || 'Item').slice(0, 3).join(', ');
    const itemCount = safeItems.length;
    
    return `
      <tr class="${getOrderStatusClass(order?.orderStatus || 'pending')}">
        <td><strong>#${(order?._id || 'N/A').slice(-8)}</strong></td>
        <td>
          ${itemNames}${itemCount > 3 ? '...' : ''}
          <br><small class="text-muted">${itemCount} items</small>
        </td>
        <td><strong>₦${safeTotal.toLocaleString()}</strong></td>
        <td>
          <span class="badge bg-${getOrderStatusBadge(order?.orderStatus || 'pending')} fs-6 px-3 py-2">
            ${formatOrderStatus(order?.orderStatus || 'pending')}
          </span>
        </td>
        <td>${order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="trackOrder('${order?._id || ''}')">
            Track
          </button>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6" class="text-center text-muted py-5"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>No orders yet</td></tr>';
}

function getOrderStatusClass(status) {
  const classes = {
    'delivered': 'table-success',
    'ready': 'table-info',
    'preparing': 'table-warning',
    'pending': 'table-secondary'
  };
  return classes[status] || 'table-light';
}

function getOrderStatusBadge(status) {
  const badges = {
    'delivered': 'success',
    'ready': 'success',
    'preparing': 'warning',
    'pending_approval': 'warning',
    'vendor_approved': 'info',
    'ordered': 'secondary'
  };
  return badges[status] || 'light';
}

function formatOrderStatus(status) {
  const labels = {
    'ordered': 'New Order',
    'pending_approval': 'Payment Check',
    'vendor_approved': 'Approved',
    'preparing': 'Cooking',
    'ready': 'Ready',
    'off_for_delivery': 'On Way',
    'delivered': 'Delivered ✓'
  };
  return labels[status] || status;
}

window.trackOrder = function(orderId) {
  window.location.href = `order-tracking.html?id=${orderId}`;
};

function renderMainProfile(user) {
  const container = document.getElementById('mainProfileCard');
  if (!user || !container) return;

  const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=667eea&color=fff&size=120`;
  container.innerHTML = `
    <div class="profile-main">
      <img src="${avatar}" class="rounded-circle mb-4 mx-auto shadow-lg" style="width: 120px; height: 120px; border: 5px solid #667eea;" alt="${user.name}">
      <h4 class="fw-bold mb-2">${user.name || 'User'}</h4>
      <p class="text-muted mb-4 fs-5">${user.email || 'user@example.com'}</p>
      <div class="row g-3 justify-content-center">
        <div class="col-auto">
          <div class="text-center">
            <div class="h4 fw-bold text-primary mb-1">${user.totalOrders || 0}</div>
            <small class="text-muted">Orders</small>
          </div>
        </div>
        <div class="col-auto">
          <div class="text-center">
            <div class="h4 fw-bold text-success mb-1">₦${(user.totalSpent || 0).toLocaleString()}</div>
            <small class="text-muted">Spent</small>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderSidebarProfile(user) {
  const container = document.getElementById('sidebarProfile');
  if (!container) return;

  if (!user) {
    // Fallback empty state
    container.innerHTML = `
      <div class="p-4 text-center text-muted">
        <div class="rounded-circle bg-light d-flex align-items-center justify-content-center mb-3 mx-auto" style="width: 70px; height: 70px;">
          <i class="fas fa-user fa-lg text-muted"></i>
        </div>
        <h6 class="fw-bold mb-2">Loading profile...</h6>
        <p class="small mb-0">Welcome</p>
      </div>
    `;
    return;
  }

  const initials = (user.name || user.email || 'US').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=667eea&color=fff&size=80&font-size=0.6`;
  
  container.innerHTML = `
    <div class="p-4 text-center">
      <img src="${avatar}" class="rounded-circle profile-avatar mb-3 mx-auto" alt="${user.name || 'Profile'}">
      <h6 class="fw-bold mb-1">${user.name || user.email?.split('@')[0] || 'User'}</h6>
      <p class="text-muted small mb-2">${user.email || 'user@example.com'}</p>
      <span class="badge bg-primary">Member</span>
    </div>
  `;
  
  // Update navbar profile too
  updateNavbarProfile(avatar, user.name);
}

// ===== MAIN ENTRY POINT =====
async function loadUserDashboard() {
  try {
    console.log('🔄 loadUserDashboard started');
    
    // Auth check
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Please login to view dashboard', 'warning');
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }

    // Try cached profile first for immediate navbar update
    try {
      const cachedProfile = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (cachedProfile.name || cachedProfile.email) {
        renderSidebarProfile(cachedProfile);
        updateNavbarProfileFromCache(cachedProfile);
      }
    } catch (e) {
      console.log('No valid cached profile');
    }

    // Parallel loads
    const [stats, profile, ordersRes] = await Promise.allSettled([
      loadUserStats(),
      loadProfile(),
      window.OrderManager?.getUserOrders?.() || Promise.resolve({ data: [] })
    ]);

    // Render safe - always render fallback data
    renderStats(stats.status === 'fulfilled' ? stats.value : null);
    
    if (profile.status === 'fulfilled' && profile.value) {
      localStorage.setItem('currentUser', JSON.stringify(profile.value));
      renderSidebarProfile(profile.value);
      renderMainProfile(profile.value);
      updateNavbarProfileFromUser(profile.value);
    }

    const orders = ordersRes.status === 'fulfilled' ? ordersRes.value : { data: [] };
    renderOrders(orders.data || []);

    // Immediate menu load - no lazy loading
    if (typeof window.loadMenu === 'function') {
      window.loadMenu();
    }

    console.log('loadUserDashboard complete');
    showToast('Dashboard loaded successfully!', 'success');
  } catch (error) {
    console.error('loadUserDashboard error:', error);
    showToast('Dashboard load failed: ' + error.message, 'error');
    
    // Always render fallback stats
    renderStats({ totalOrders: 0, totalSpent: 0, avgOrderValue: 0, monthlyOrders: 0 });
  }
}

// Update navbar profile image/text with initials
function updateNavbarProfile(avatarUrl, name) {
  const profileImg = document.querySelector('#accountDropdown img');
  const accountText = document.querySelector('#accountDropdown .dropdown-toggle');
  if (profileImg) profileImg.src = avatarUrl;
  if (accountText) accountText.innerHTML = `<img class="rounded-circle me-2" src="${avatarUrl}" width="32" height="32" alt="Profile">
    ${name || 'Account'}`;
}

function updateNavbarProfileFromCache(cachedProfile) {
  const initials = (cachedProfile.name || cachedProfile.email || 'US').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=667eea&color=fff&size=32`;
  updateNavbarProfile(avatar, cachedProfile.name);
}

function updateNavbarProfileFromUser(user) {
  updateNavbarProfileFromCache(user);
}

// EXPOSE GLOBALS for HTML inline calls
window.loadUserDashboard = loadUserDashboard;
window.initDashboard = loadUserDashboard;  // Alias for inline script compatibility

// Sidebar/UI globals (defensive)
window.setActiveNav = window.setActiveNav || function(section) {
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => link.classList.remove('active'));
  const activeLink = document.querySelector(`.sidebar-nav a[href="#${section}"]`) || event?.target?.closest('.nav-link');
  if (activeLink) activeLink.classList.add('active');
  
  const target = document.getElementById(section);
  if (target) target.scrollIntoView({ behavior: 'smooth' });
  
  window.closeSidebar?.();
};

window.toggleSidebar = window.toggleSidebar || function() {
  const sidebar = document.getElementById('userSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar) sidebar.classList.toggle('show');
  if (backdrop) backdrop.style.display = sidebar?.classList?.contains('show') ? 'block' : 'none';
};

window.closeSidebar = window.closeSidebar || function() {
  const sidebar = document.getElementById('userSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar) sidebar.classList.remove('show');
  if (backdrop) backdrop.style.display = 'none';
};

// Responsive handler
if (window.addEventListener) {
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 992) window.closeSidebar?.();
  });
}

// Cart badge listener
if (window.addEventListener) {
  document.addEventListener('cartUpdated', (e) => {
    const badge = document.querySelector('.cart-badge');
    const count = e.detail || 0;
    if (badge) {
      badge.dataset.count = count;
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
  });
}

// Auto-init when DOM ready (safe)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.loadUserDashboard);
} else {
  // Already loaded, init immediately
  window.loadUserDashboard();
}

console.log('dashboard.js loaded - all functions global & syntax fixed');

