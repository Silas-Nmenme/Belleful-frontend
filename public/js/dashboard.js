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
    setTimeout(() => toast.remove(), 1000); // Changed to 1 second
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

function renderStats(statsData) {
  const stats = statsData?.data || statsData || { totalOrders: 0, totalSpent: 0, avgOrderValue: 0, monthlyOrders: 0 };
  const container = document.getElementById('statsCards');
  if (!container) return;
  
  container.innerHTML = `
    <div class="row g-4">
      <div class="col-xl-3 col-lg-6 col-md-6 col-sm-12 mb-0 h-100" data-aos="zoom-in">
        <div class="card border-start border-primary shadow-sm h-100 py-4">
          <div class="card-body">
            <div class="row align-items-center g-0">
              <div class="col">
                <div class="text-xs font-weight-bold text-primary text-uppercase mb-1 small">Total Orders</div>
                <div class="h3 mb-0 fw-bold text-dark">${stats.totalOrders || 0}</div>
              </div>
              <div class="col-auto">
                <i class="fas fa-shopping-bag fa-2x text-primary opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-xl-3 col-lg-6 col-md-6 col-sm-12 mb-0 h-100" data-aos="zoom-in" data-aos-delay="100">
        <div class="card border-start border-success shadow-sm h-100 py-4">
          <div class="card-body">
            <div class="row align-items-center g-0">
              <div class="col">
                <div class="text-xs font-weight-bold text-success text-uppercase mb-1 small">Total Spent</div>
                <div class="h3 mb-0 fw-bold text-dark">₦${(stats.totalSpent || 0)?.toLocaleString()}</div>
              </div>
              <div class="col-auto">
                <i class="fas fa-wallet fa-2x text-success opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-xl-3 col-lg-6 col-md-6 col-sm-12 mb-0 h-100" data-aos="zoom-in" data-aos-delay="200">
        <div class="card border-start border-info shadow-sm h-100 py-4">
          <div class="card-body">
            <div class="row align-items-center g-0">
              <div class="col">
                <div class="text-xs font-weight-bold text-info text-uppercase mb-1 small">Avg Order</div>
                <div class="h3 mb-0 fw-bold text-dark">₦${(stats.avgOrderValue || 0)?.toLocaleString()}</div>
              </div>
              <div class="col-auto">
                <i class="fas fa-chart-line fa-2x text-info opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-xl-3 col-lg-6 col-md-6 col-sm-12 mb-0 h-100" data-aos="zoom-in" data-aos-delay="300">
        <div class="card border-start border-warning shadow-sm h-100 py-4">
          <div class="card-body">
            <div class="row align-items-center g-0">
              <div class="col">
                <div class="text-xs font-weight-bold text-warning text-uppercase mb-1 small">This Month</div>
                <div class="h3 mb-0 fw-bold text-dark">${stats.monthlyOrders || 0}</div>
              </div>
              <div class="col-auto">
                <i class="fas fa-calendar fa-2x text-warning opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // AOS refresh for new cards
  setTimeout(() => AOS.refresh(), 100);
}

function refreshOrders() {
  const btn = document.getElementById('refreshOrdersBtn');
  const icon = document.getElementById('refreshIcon');
  const text = document.getElementById('refreshText');
  if (!btn || !icon || !text) {
    // Removed toast notification
    return;
  }

  // Loading state
  const originalIcon = icon.innerHTML;
  const originalText = text.textContent;
  btn.disabled = true;
  icon.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>';
  text.textContent = 'Refreshing...';

  window.OrderManager?.getUserOrders()
    .then(r => {
      renderOrders(r.data || []);
      // Removed success toast
    })
    .catch(err => {
      console.error('Refresh orders failed:', err);
      renderOrders([]); // Show empty state
      // Removed error toast
    })
    .finally(() => {
      // Reset button
      btn.disabled = false;
      icon.innerHTML = originalIcon;
      text.textContent = originalText;
    });
}

function renderOrders(orders) {
  const container = document.getElementById('ordersTableBody');
  if (!container) return;

  // Toggle download button state
  const downloadBtn = document.getElementById('downloadBtn');
  if (downloadBtn) {
    downloadBtn.disabled = !(orders && Array.isArray(orders) && orders.length > 0);
  }

  const isMobile = window.innerWidth < 768;
  
  if (isMobile) {
    // Mobile Card View - Track button prominent
    container.innerHTML = (orders || []).map(order => {
      const safeTotal = (order?.totalAmount || 0);
      const safeItems = Array.isArray(order?.items) ? order.items : [];
      const itemNames = safeItems.map(item => item?.name || 'Item').slice(0, 2).join(', ');
      const itemCount = safeItems.length;
      const statusClass = getOrderStatusClass(order?.orderStatus || 'pending');
      const statusBadge = getOrderStatusBadge(order?.orderStatus || 'pending');
      const statusText = formatOrderStatus(order?.orderStatus || 'pending');
      const orderId = order?._id || '';
      
      return `
        <tr class="border-bottom ${statusClass}">
          <td colspan="6" class="p-0">
            <div class="card border-0 bg-transparent shadow-sm mb-2 p-3 rounded-3">
              <div class="row g-3 align-items-center">
                <div class="col-8 col-sm-9">
                  <div class="d-flex align-items-center mb-1">
                    <strong class="me-2 text-primary">#${orderId.slice(-8)}</strong>
                    <span class="badge bg-${statusBadge} fs-6 px-2 py-1">${statusText}</span>
                  </div>
                  <div class="small text-muted">${itemNames}${itemCount > 2 ? '...' : ''} • ${itemCount} items</div>
                  <div class="small">₦${safeTotal.toLocaleString()} • ${order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div class="col-4 col-sm-3 text-end">
                  <button class="btn btn-primary btn-sm w-100 fs-6 fw-bold" onclick="trackOrder('${orderId}')" style="min-height: 44px;">
                    <i class="fas fa-map-marker-alt me-1"></i>Track 
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="6" class="text-center text-muted py-5"><i class="fas fa-shopping-bag fa-3x mb-3 opacity-50"></i><h6>No orders yet</h6><p class="mb-0">Your orders will appear here</p></td></tr>';
  } else {
    // Desktop Table View
    container.innerHTML = (orders || []).map(order => {
      const safeTotal = (order?.totalAmount || 0);
      const safeItems = Array.isArray(order?.items) ? order.items : [];
      const itemNames = safeItems.map(item => item?.name || 'Item').slice(0, 3).join(', ');
      const itemCount = safeItems.length;
      
      return `
        <tr class="${getOrderStatusClass(order?.orderStatus || 'pending')}" onclick="event.stopPropagation(); trackOrder('${order?._id || ''}')" style="cursor:pointer;">
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
            <button class="btn btn-sm btn-outline-primary track-btn" onclick="event.stopPropagation(); trackOrder('${order?._id || ''}')">
              <i class="fas fa-map-marker-alt me-1"></i>Track
            </button>
          </td>
        </tr>
      `;

    }).join('') || '<tr><td colspan="6" class="text-center text-muted py-5"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>No orders yet</td></tr>';
  }
}

// Responsive re-render on resize
let resizeTimeout;
function handleResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Re-fetch and re-render orders if data available
    if (window.OrderManager?.getUserOrders) {
      window.OrderManager.getUserOrders().then(ordersRes => {
        const orders = ordersRes?.data || [];
        renderOrders(orders);
      }).catch(console.error);
    }
  }, 250);
}

window.addEventListener('resize', handleResize);

function getOrderStatusClass(status) {
  const classes = {
    'delivered': 'table-success',
    'ready': 'table-success',
    'ready_for_pickup': 'table-success',
    'preparing': 'table-success',
    'pending_approval': 'table-success',
    'vendor_approved': 'table-success',
    'ordered': 'table-secondary'
  };
  return classes[status] || 'table-light';
}

function getOrderStatusBadge(status) {
  const badges = {
    'delivered': 'success',
    'ready': 'success',
    'ready_for_pickup': 'success',
    'preparing': 'success',
    'pending_approval': 'success',
    'vendor_approved': 'success',
    'ordered': 'secondary'
  };
  return badges[status] || 'light';
}

function formatOrderStatus(status) {
  const labels = {
    'ordered': 'New Order',
    'pending_approval': 'Pending',
    'vendor_approved': 'Approved',
    'preparing': 'Preparing',
    'ready': 'Ready',
    'ready_for_pickup': 'Ready for Pickup',
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
  if (!container) return;

  if (!user) {
    container.innerHTML = `
      <div class="profile-main text-center py-5">
        <div class="spinner-border text-primary mb-4" style="width: 4rem; height: 4rem;" role="status">
          <span class="visually-hidden">Loading profile...</span>
        </div>
        <h5 class="text-muted">Loading profile...</h5>
      </div>
    `;
    return;
  }

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
      // Removed toast notification
      setTimeout(() => window.location.href = 'login.html', 1500);
      return;
    }

    // Show loading states initially - wait for real API data
    renderSidebarProfile(null);
    renderMainProfile(null);

    // Parallel loads
    const [stats, profile, ordersRes] = await Promise.allSettled([
      loadUserStats(),
      loadProfile(),
      window.OrderManager?.getUserOrders?.() || Promise.resolve({ data: [] })
    ]);

    // Render safe - always render fallback data
    renderStats(stats.status === 'fulfilled' ? stats.value : null);
    
    if (profile.status === 'fulfilled' && profile.value) {
      const realUser = profile.value;
      localStorage.setItem('currentUser', JSON.stringify(realUser));
      renderSidebarProfile(realUser);
      renderMainProfile(realUser);
      updateNavbarProfileFromUser(realUser);
    }

    const orders = ordersRes.status === 'fulfilled' ? ordersRes.value : { data: [] };
    renderOrders(orders.data || []);

    // Immediate menu load - no lazy loading
    if (typeof window.loadMenu === 'function') {
      window.loadMenu();
    }

    console.log('loadUserDashboard complete');
    // Removed success toast
  } catch (error) {
    console.error('loadUserDashboard error:', error);
    // Removed error toast
    
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
// REMOVED: window.setActiveNav - Moved to HTML inline script (fixes race condition)

// REMOVED: window.toggleSidebar - Moved to HTML inline script (fixes race condition)

// REMOVED: window.closeSidebar - Moved to HTML inline script (fixes race condition)

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

// ===== PROFILE SETTINGS FUNCTIONS =====
let currentProfileCache = null; // Cache for settings modal

async function openSettingsModal() {
  try {
    // Use cached profile or fetch fresh
    const cached = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!cached.name && !cached.email) {
      // Removed loading toast
      currentProfileCache = await loadProfile();
    } else {
      currentProfileCache = cached;
    }

    if (!currentProfileCache) {
      // Removed profile not found toast
      return;
    }

    // Populate form
    document.getElementById('nameInput').value = currentProfileCache.name || '';
    document.getElementById('profileEmail').textContent = currentProfileCache.email || 'N/A';
    document.getElementById('currentAvatar').value = currentProfileCache.avatar || '';

    // Show current avatar or placeholder
    const preview = document.getElementById('avatarPreview');
    const placeholder = document.getElementById('avatarPlaceholder');
    if (currentProfileCache.avatar) {
      preview.src = currentProfileCache.avatar;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
    } else {
      preview.style.display = 'none';
      placeholder.style.display = 'block';
    }

    // Reset form state
    document.getElementById('uploadProgress').classList.add('d-none');
    document.getElementById('formError')?.classList.add('d-none');
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('settingsModal'));
    modal.show();

    // Auto-focus name input
    setTimeout(() => document.getElementById('nameInput').focus(), 300);
  } catch (error) {
    console.error('openSettingsModal error:', error);
    // Removed error toast
  }
}

function previewAvatar(file) {
  if (!file || !file.type.startsWith('image/')) {
    // Removed invalid file toast
    return;
  }

  if (file.size > 5 * 1024 * 1024) { // 5MB
    // Removed file too large toast
    return;
  }

  const preview = document.getElementById('avatarPreview');
  const placeholder = document.getElementById('avatarPlaceholder');
  
  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src = e.target.result;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function updateProfile(formData) {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No auth token');

    const submitBtn = document.getElementById('profileSubmit');
    const progress = document.getElementById('uploadProgress');
    const progressBar = progress.querySelector('.progress-bar');
    const formError = document.getElementById('formError');

    // Show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Updating...';
    progress.classList.remove('d-none');
    formError.classList.add('d-none');

    const response = await fetch(`${window.API_BASE || '/api'}/auth/profile`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    // Simple progress simulation (fetch can't stream upload progress easily)
    const interval = setInterval(() => {
      let loaded = parseInt(progressBar.style.width) || 0;
      loaded += 15;
      if (loaded <= 90) {
        progressBar.style.width = `${loaded}%`;
      }
    }, 150);

    // Clean up after response
    setTimeout(() => clearInterval(interval), 2500);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success || !result.user) {
      throw new Error(result.message || 'Update failed');
    }

    // Success
    progress.classList.add('d-none');
    showToast('Profile updated successfully!', 'success');
    
    return result.user;
  } catch (error) {
    console.error('updateProfile error:', error);
    // Removed error toast
    throw error;
  }
}

async function refreshProfileAfterUpdate(updatedUser) {
  // Update cache
  localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  
  // Re-render all profile displays
  renderSidebarProfile(updatedUser);
  renderMainProfile(updatedUser);
  updateNavbarProfileFromUser(updatedUser);
  
  // Close modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
  if (modal) modal.hide();
}

// ===== DOM EVENT LISTENERS (settings specific) =====
function initSettingsEvents() {
  const form = document.getElementById('profileForm');
  const avatarInput = document.getElementById('avatarInput');
  
  if (!form || !avatarInput) return;

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const name = formData.get('name')?.trim();
    
    if (!name || name.length < 2) {
      // Removed validation toast
      return;
    }

    try {
      const updatedUser = await updateProfile(formData);
      await refreshProfileAfterUpdate(updatedUser);
    } catch (error) {
      // Error handled in updateProfile
    }
  });

  // Avatar preview
  avatarInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      previewAvatar(e.target.files[0]);
    }
  });

  // Reset preview on modal hidden
  document.getElementById('settingsModal').addEventListener('hidden.bs.modal', () => {
    avatarInput.value = '';
    const preview = document.getElementById('avatarPreview');
    preview.src = '';
  });
}

// Auto-init settings when dashboard loads
if (typeof loadUserDashboard === 'function') {
  const originalLoad = loadUserDashboard;
  window.loadUserDashboard = async function(...args) {
    await originalLoad.apply(this, args);
    initSettingsEvents();
  };
}

// Download transaction function

async function downloadTransactions(format) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Please log in to download transactions', 'error');
      return;
    }
    
    console.log(`Download requested: ${format} - fetching ALL orders`);
    
    showToast(`Generating ${format.toUpperCase()}...`, 'info');
    
    const response = await fetch(`${window.API_BASE || '/api'}/orders/download-my-transactions?format=${format}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Download failed: ${response.status}`);
    }
    
    // Handle blob download (works for PDF, DOCX, CSV)
    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `my-transactions-${new Date().toISOString().slice(0,10)}.${format}`;
    
    // Extract filename from Content-Disposition if available
    if (contentDisposition && contentDisposition.includes('filename=')) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
      if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
    }
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    setTimeout(() => document.body.removeChild(a), 100);
    
    showToast(`${format.toUpperCase()} downloaded successfully!`, 'success');
  } catch (error) {
console.error('Download error:', error);
    showToast(error.message, 'error');
  }
}

// Expose download function globally (downloads ALL transactions)
window.downloadTransactions = downloadTransactions;

console.log('dashboard.js: Download transactions refactored - ALL orders, multi-format support ready');

// Expose globals
window.openSettingsModal = openSettingsModal;
window.previewAvatar = previewAvatar;
window.updateProfile = updateProfile;
window.refreshProfileAfterUpdate = refreshProfileAfterUpdate;

console.log('dashboard.js loaded with transaction download - all functions global & syntax fixed');


