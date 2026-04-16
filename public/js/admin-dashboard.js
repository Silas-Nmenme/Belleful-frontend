// Admin Dashboard JS - FIXED: Menu save Object.keys error with defensive programming
// NEW: Active Collapsible Sidebar Toggle + State Management
// Fixes broken "loading dashboard" / "loading all menu" issues + TypeError protection

(function() {
  // Global DashboardManager
  window.DashboardManager = window.DashboardManager || {};
  
  // Removed collapsed state - now universal popup

  // Utils
  window.showAdminToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `admin-toast alert alert-${type} position-fixed`;
    toast.style.cssText = 'top:80px;right:20px;z-index:9999;max-width:400px; transition: opacity 0.3s ease-out; opacity: 1; animation: slideInRight 0.3s ease-out;';
    toast.innerHTML = `<strong>${type.toUpperCase()}:</strong> ${message} <button type="button" class="btn-close ms-2" onclick="this.parentElement.remove()"></button>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 1000);
  };

  // ===== SIDEBAR INITIALIZATION & TOGGLE =====
  function initSidebar() {
    const sidebarWrapper = document.querySelector('.sidebar-wrapper');
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.querySelector('.sidebar-toggle');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (!sidebarWrapper || !toggleBtn) {
      console.warn('Sidebar elements not found');
      return;
    }

    // Universal popup toggle - ALL screen sizes
    function toggleSidebar() {
      const isActive = sidebarWrapper.classList.contains('active');
      
      sidebarWrapper.classList.toggle('active');
      overlay?.classList.toggle('active');
      toggleBtn.classList.toggle('active');
      
      console.log('Sidebar toggled:', !isActive ? 'shown' : 'hidden');
    }

    // Event listeners
    toggleBtn.addEventListener('click', toggleSidebar);
    
    // Mobile overlay close
    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      toggleBtn.classList.remove('active');
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        sidebar.classList.remove('active');
        overlay?.classList.remove('active');
        toggleBtn.classList.remove('active');
      }
    });

    // Window resize handler - reset popup on desktop resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (window.innerWidth >= 992) {
          sidebarWrapper.classList.remove('active');
          overlay?.classList.remove('active');
          toggleBtn.classList.remove('active');
        }
      }, 250);
    });

    // No tooltips needed for full popup mode

    console.log('✅ Sidebar initialized - Active toggle + persistent state');
  }

  // ===== ADMIN STATS =====
  async function loadAdminStats() {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');
      
      const response = await fetch(`${window.API_BASE || '/api'}/dashboard/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const stats = await response.json();
      renderAdminStats(stats.data || stats);
    } catch (error) {
      console.error('Admin stats error:', error);
      showAdminToast('Failed to load stats: ' + error.message, 'danger');
      document.getElementById('adminStats').innerHTML = '<div class="col-12 text-center py-5 text-danger"><i class="fas fa-exclamation-triangle fa-2x mb-3"></i><h5>Stats unavailable</h5></div>';
    }
  }

  function renderAdminStats(stats) {
    const container = document.getElementById('adminStats');
    if (!container) return;
    
    container.innerHTML = `
      <div class="col-md-3 mb-4" data-aos="zoom-in">
        <div class="card border-left-primary shadow h-100">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col">
                <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">Total Orders</div>
                <div class="h4 mb-0">${stats.totalOrders || 0}</div>
              </div>
              <div class="col-auto"><i class="fas fa-shopping-bag fa-2x text-gray-300"></i></div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3 mb-4" data-aos="zoom-in" data-aos-delay="100">
        <div class="card border-left-success shadow h-100">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col">
                <div class="text-xs font-weight-bold text-success text-uppercase mb-1">Total Revenue</div>
                <div class="h4 mb-0">₦${(stats.totalRevenue || 0).toLocaleString()}</div>
              </div>
              <div class="col-auto"><i class="fas fa-wallet fa-2x text-gray-300"></i></div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3 mb-4" data-aos="zoom-in" data-aos-delay="200">
        <div class="card border-left-info shadow h-100">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col">
                <div class="text-xs font-weight-bold text-info text-uppercase mb-1">Total Users</div>
                <div class="h4 mb-0">${stats.totalUsers || 0}</div>
              </div>
              <div class="col-auto"><i class="fas fa-users fa-2x text-gray-300"></i></div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3 mb-4" data-aos="zoom-in" data-aos-delay="300">
        <div class="card border-left-warning shadow h-100">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col">
                <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">Pending Orders</div>
                <div class="h4 mb-0">${stats.pendingOrders || 0}</div>
              </div>
              <div class="col-auto"><i class="fas fa-clock fa-2x text-gray-300"></i></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ===== ADMIN MENU TABLE =====
  async function loadAdminMenu(page = 1, search = '', category = '') {
    const tableBody = document.getElementById('menuItemsTable');
    const loader = document.getElementById('menuLoader') || createLoader('menuItemsTable');
    
    try {
      if (tableBody) tableBody.innerHTML = '';
      loader.style.display = 'block';
      
      const params = new URLSearchParams({ page, limit: 50, ...(search && { search }), ...(category && { category }) });
      const response = await fetch(`${window.API_BASE}/menu?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const { data: items = [] } = await response.json();
      renderAdminMenuTable(items);
      document.getElementById('menuCount').textContent = items.length;
      renderPagination('menuPagination', page, Math.ceil(50 / items.length) || 1, loadAdminMenu);
    } catch (error) {
      console.error('loadAdminMenu error:', error);
      tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-danger">Failed to load menu items</td></tr>';
      console.error('Menu load failed:', error); // Toast removed - non-critical data load
    } finally {
      loader.style.display = 'none';
    }
  }

  function renderAdminMenuTable(items) {
    const tbody = document.getElementById('menuItemsTable');
    if (!tbody) return;
    
    tbody.innerHTML = items.map(item => `
      <tr>
        <td>${item._id.slice(-8)}</td>
        <td><img src="${item.image || '/asset/grilled.jpg'}" class="rounded" style="width:50px;height:50px;object-fit:cover" onerror="this.src='/asset/food-particles.svg'"></td>
        <td>${item.name}</td>
        <td>₦${item.price.toLocaleString()}</td>
        <td><span class="badge bg-${item.category === 'food' ? 'primary' : 'info'}">${item.category}</span></td>
        <td><i class="fas fa-${item.available ? 'check-circle text-success' : 'times-circle text-danger'}"></i></td>
        <td><span class="badge ${item.stock > 10 ? 'bg-success' : item.stock > 0 ? 'bg-warning' : 'bg-danger'}">${item.stock}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editMenuItem('${item._id}')">Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteMenuItem('${item._id}')">Delete</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="8" class="text-center py-5 text-muted">No menu items found</td></tr>';
  }

  // ===== MAIN DASHBOARD LOAD =====
  window.loadAdminDashboard = async function(page = 1, search = '', status = '') {
    try {
      // Parallel loading
      await Promise.all([
        loadAdminStats(),
        loadPendingOrders(page, search, status),
        loadAdminUsers(1),
        loadAdminContacts(1)
      ]);
      
      // Load menu after stats
      setTimeout(() => loadAdminMenu(1), 300);
      
      // Toast removed - unnecessary for dashboard load
    } catch (error) {
      console.error('Dashboard load error:', error);
      showAdminToast('Dashboard failed to load completely', 'warning');
    }
  };

  // Pending Orders Table
  async function loadPendingOrders(page = 1, search = '', status = '') {
    const tbody = document.getElementById('pendingOrdersTable');
    const countEl = document.getElementById('pendingCount');
    if (!tbody) return;
    
    try {
tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3"><div class="spinner-border text-danger" role="status"></div></td></tr>';
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page, limit: 10, ...(search && { search }), ...(status && { status }) });
      
      const response = await fetch(`${window.API_BASE || '/api'}/orders/admin?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const { data: orders = [] } = await response.json();
      renderPendingOrdersTable(orders);
      renderPagination('ordersPagination', page, 5, (p, s, st) => loadPendingOrders(p, s, st));
      if (countEl) countEl.textContent = orders.filter(o => o.orderStatus === 'pending_approval').length || 0;
    } catch (error) {
      console.error('Orders load error:', error);
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-danger">Orders unavailable</td></tr>';
    }
  }

  function renderPendingOrdersTable(orders) {
    const sortedOrders = orders.sort((a, b) => {
      const aPending = a.orderStatus === 'pending_approval' ? 1 : 0;
      const bPending = b.orderStatus === 'pending_approval' ? 1 : 0;
      if (aPending !== bPending) return bPending - aPending;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    const tbody = document.getElementById('pendingOrdersTable');
    const countEl = document.getElementById('pendingCount');
    if (!tbody) return;
    
    // Status dropdown helpers
    const validStatuses = ['pending_approval', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'];
    const formatStatus = (status) => status.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
    
    const statusBadge = (status) => {
      const badges = {
        'pending_payment': 'bg-warning text-dark',
        'pending_approval': 'bg-warning text-dark',
        'preparing': 'bg-info',
        'ready_for_pickup': 'bg-primary',
        'out_for_delivery': 'bg-info text-dark',
        'delivered': 'bg-success',
        'cancelled': 'bg-danger'
      };
      return `<span class="badge ${badges[status] || 'bg-secondary'}">${status.replace(/_/g, ' ').toUpperCase()}</span>`;
    };

    
tbody.innerHTML = sortedOrders.map(order => {
      const safeId = order._id || '';
      const hasReceipt = order.receiptImage;
      
      return `
      <tr>
        <td>#${safeId.slice(-8)}</td>
        <td>${order.user?.name || order.userName || 'Customer'}</td>
        <td>${order.items?.map(i => i.name).slice(0,2).join(', ') || 'Items'}</td>
        <td>₦${(order.totalAmount || 0).toLocaleString()}</td>
        <td>${statusBadge(order.orderStatus || 'pending_approval')}</td>
        <td>${hasReceipt ? `<button class="btn btn-sm btn-success" onclick="showReceiptPreview('${order.receiptImage}')" title="View Receipt"><i class="fas fa-eye"></i></button><small class="d-block text-success mt-1"><i class="fas fa-check"></i></small>` : '<span class="text-muted"><i class="fas fa-receipt-slash"></i></span>'}</td>
        <td>
          <button class="btn btn-outline-primary btn-sm me-1" onclick="viewOrder('${safeId}')" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
          <select class="form-select form-select-sm status-dropdown" data-order-id="${safeId}" onchange="updateOrderStatus('${safeId}', this.value)" style="width: auto; display: inline-block;">
            ${validStatuses.map(s => `<option value="${s}" ${order.orderStatus === s ? 'selected' : ''}>${formatStatus(s)}</option>`).join('')}
          </select>
        </td>
      </tr>
      `;
    }).join('') || '<tr><td colspan="7" class="text-center py-5 text-muted"><i class="fas fa-inbox fa-3x mb-3 opacity-50"></i><div class="h6 text-muted">No pending orders</div></td></tr>';  

    
    if (countEl) countEl.textContent = sortedOrders.filter(o => o.orderStatus === 'pending_approval').length;
    
    // Enable download button if orders exist
    updateAdminDownloadBtn(sortedOrders);
  }

  // Users Table
  async function loadAdminUsers(page = 1, search = '') {
    const tbody = document.getElementById('usersTable');
    const countEl = document.getElementById('usersCount');
    if (!tbody) return;
    
    try {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner-border" role="status"></div></td></tr>';
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page, limit: 10, ...(search && { search }) });
      
      const response = await fetch(`${window.API_BASE || '/api'}/dashboard/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const { data: users = [], pagination } = await response.json();
      renderAdminUsersTable(users);
      renderPagination('usersPagination', page, pagination?.totalPages || 1, (p, s) => loadAdminUsers(p, s));
      if (countEl) countEl.textContent = pagination?.total || users.length;
      
    } catch (error) {
      console.error('Users load error:', error);
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-danger">Failed to load users</td></tr>';
      console.error('Users load failed:', error); // Toast removed - non-critical
    }
  }

  function renderAdminUsersTable(users) {
    const tbody = document.getElementById('usersTable');
    if (!tbody) return;
    
    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${user.name || 'N/A'}</td>
        <td>${user.email}</td>
        <td><span class="badge bg-${user.role === 'admin' ? 'danger' : 'primary'}">${user.role || 'user'}</span></td>
        <td>${user.totalOrders || 0}</td>
        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="text-center py-5 text-muted">No users found</td></tr>';
  }

  // Contacts Table
  async function loadAdminContacts(page = 1, search = '', status = '') {
    const tbody = document.getElementById('contactsTable');
    const countEl = document.getElementById('contactsCount');
    if (!tbody) return;
    
    try {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border" role="status"></div></td></tr>';
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page, limit: 10, ...(search && { search }), ...(status && { status }) });
      
      const response = await fetch(`${window.API_BASE || '/api'}/contact/?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const { data: contacts = [], pagination } = await response.json();
      renderAdminContactsTable(contacts);
      renderPagination('contactsPagination', page, pagination?.totalPages || 1, (p, s, st) => loadAdminContacts(p, s, st));
      if (countEl) countEl.textContent = pagination?.total || contacts.length;
      
    } catch (error) {
      console.error('Contacts load error:', error);
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-danger">Failed to load contacts</td></tr>';
      console.error('Contacts load failed:', error); // Toast removed - non-critical
    }
  }

  function renderAdminContactsTable(contacts) {
    const tbody = document.getElementById('contactsTable');
    if (!tbody) return;
    
    tbody.innerHTML = contacts.map(contact => `
      <tr>
        <td>${contact._id.slice(-8)}</td>
        <td>${contact.name}</td>
        <td>${contact.email || contact.phone || 'N/A'}</td>
        <td>${contact.subject || 'General inquiry'}</td>
        <td><span class="badge bg-${(contact.status || 'unread') === 'unread' ? 'danger' : contact.status === 'read' ? 'info' : 'success'}">${(contact.status || 'unread').toUpperCase()}</span></td>
        <td>${new Date(contact.createdAt).toLocaleDateString()}</td>
        <td>
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-info" onclick="viewContact('${contact._id}')" title="View"><i class="fas fa-eye"></i></button>
            <button class="btn btn-success" onclick="markContactReady('${contact._id}')" ${contact.status === 'ready' ? 'disabled title="Already ready"' : ''}><i class="fas fa-check"></i></button>
            <button class="btn btn-primary" onclick="openReplyModal('${contact._id}')" title="Reply"${!contact.email ? ' disabled' : ''}><i class="fas fa-reply"></i></button>
          </div>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="7" class="text-center py-5 text-muted">No contacts</td></tr>';
  }

  // ===== MENU CRUD - BULLETPROOF VERSION =====
  window.prepareMenuForm = function(editId = null) {
    const form = document.getElementById('menuForm');
    const title = document.getElementById('menuModalTitle');
    if (form) form.reset();
    const menuIdEl = document.getElementById('menuId');
    if (menuIdEl) menuIdEl.value = editId || '';
    if (title) title.textContent = editId ? 'Edit Menu Item' : 'Add New Menu Item';
  };

  window.editMenuItem = async function(id) {
    try {
      const response = await fetch(`${window.API_BASE || '/api'}/menu/${id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { data: item } = await response.json();
      
      const nameEl = document.getElementById('menuName');
      const priceEl = document.getElementById('menuPrice');
      const categoryEl = document.getElementById('menuCategory');
      const stockEl = document.getElementById('menuStock');
      const availableEl = document.getElementById('menuAvailable');
      const descEl = document.getElementById('menuDescription');
      const previewEl = document.getElementById('imagePreview');
      
      if (nameEl) nameEl.value = item.name || '';
      if (priceEl) priceEl.value = item.price || '';
      if (categoryEl) categoryEl.value = item.category || '';
      if (stockEl) stockEl.value = item.stock || '';
      if (availableEl) availableEl.checked = !!item.available;
      if (descEl) descEl.value = item.description || '';
      if (previewEl) {
        previewEl.src = item.image || '';
        previewEl.classList.toggle('d-none', !item.image);
      }
      
      const modalEl = document.getElementById('menuModal');
      if (modalEl) new bootstrap.Modal(modalEl).show();
      
    } catch (error) {
      console.error('Edit menu error:', error);
      showAdminToast('Failed to load item: ' + error.message, 'danger');
    }
  };

  window.deleteMenuItem = async function(id) {
    if (!confirm('Delete this menu item? This cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      
      const response = await fetch(`${window.API_BASE || '/api'}/menu/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showAdminToast('Item deleted successfully', 'success');
        loadAdminMenu(1);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      showAdminToast('Delete failed: ' + error.message, 'danger');
    }
  };

// BULLETPROOF Menu Form Handler + Menu Controls
  function attachMenuEventListeners() {
    // Menu refresh button
    const refreshBtns = document.querySelectorAll('.btn-refresh-menu, .btn.btn-success[title*="Refresh"]');
    refreshBtns.forEach(btn => {
      btn.onclick = () => loadAdminMenu(1);
      btn.removeAttribute('onclick'); // Clean inline
    });

    // Menu search input
    const searchInput = document.getElementById('menuSearch');
    if (searchInput) {
      searchInput.oninput = function() {
        const category = document.getElementById('categoryFilter')?.value || '';
        loadAdminMenu(1, this.value, category);
      };
    }

    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.onchange = function() {
        const search = document.getElementById('menuSearch')?.value || '';
        loadAdminMenu(1, search, this.value);
      };
    }
  }

  // Staff Register Modal Handler
  window.showStaffRegisterModal = function() {
    // Reset form
    document.getElementById('staffRegisterForm').reset();
    document.getElementById('staffRegisterError').classList.add('d-none');
  };

  document.addEventListener('DOMContentLoaded', function() {
    // Staff register form handler
    const staffForm = document.getElementById('staffRegisterForm');
    if (staffForm) {
      staffForm.onsubmit = async function(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('staffRegisterSubmit');
        const errorDiv = document.getElementById('staffRegisterError');
        
        // Loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Registering...';
        errorDiv.classList.add('d-none');
        
        try {
          const formData = new FormData(staffForm);
          await window.StaffAuthManager.registerStaff(formData);
          
          // Success - close modal, show message
          const modal = bootstrap.Modal.getInstance(document.getElementById('staffRegisterModal'));
          modal.hide();
          
          // Refresh users table
          if (typeof loadAdminUsers === 'function') {
            loadAdminUsers(1);
          }
          
        } catch (error) {
          errorDiv.textContent = error.message;
          errorDiv.classList.remove('d-none');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-user-plus me-1"></i>Register Staff';
        }
      };
    }

    // Initialize sidebar FIRST
    initSidebar();
    
    attachMenuEventListeners();
    
    const form = document.getElementById('menuForm');
    if (!form) {
      console.warn('Menu form not found');
      return;
    }

    // Enhanced name validation feedback
    const nameInput = document.getElementById('menuName');
    if (nameInput) {
      nameInput.addEventListener('blur', function() {
        if (!this.value.trim()) {
          this.classList.add('is-invalid');
          this.title = 'Name is required';
        } else {
          this.classList.remove('is-invalid');
        }
      });
    }

    form.onsubmit = async function(e) {
      e.preventDefault();
      console.log('🚀 Menu save initiated - BULLETPROOF price fix applied');

      // 🔧 FIX: Cache ALL form elements safely first
      const formElements = {
        submitBtn: document.getElementById('menuSubmitBtn'),
        loader: document.getElementById('menuLoader'),
        imageInput: document.getElementById('menuImage'),
        menuId: document.getElementById('menuId'),
        name: document.getElementById('menuName'),
        price: document.getElementById('menuPrice'),
        category: document.getElementById('menuCategory'),
        stock: document.getElementById('menuStock'),
        available: document.getElementById('menuAvailable'),
        desc: document.getElementById('menuDescription')
      };

      if (!formElements.submitBtn || !formElements.name || !formElements.price || !formElements.category) {
        console.error('❌ Critical form elements missing - aborting save');
        showAdminToast('Form elements missing - reload dashboard', 'danger');
        return;
      }
      
      try {
        // BULLETPROOF: Double-check elements before extraction
        if (!formElements.name || !formElements.price || !formElements.category) {
          throw new Error('Required form fields (name, price, category) not found');
        }

        // UI lock
        formElements.submitBtn.disabled = true;
        formElements.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        if (formElements.loader) formElements.loader.style.display = 'block';
        
        const name = formElements.name.value.trim();
        const menuId = formElements.menuId?.value || '';
        const price = parseFloat(formElements.price.value) || 0;
        const category = formElements.category.value || '';
        const stock = parseInt(formElements.stock?.value || '50') || 50;
        const available = formElements.available?.checked || (stock > 0);
        const description = formElements.desc?.value?.trim() || '';

        // Client-side validation before submit
        if (!name || name.length < 3) throw new Error('Name must be at least 3 characters');
        if (price <= 0 || isNaN(price)) throw new Error('Price must be greater than 0');
        if (!['food', 'drink', 'side'].includes(category)) throw new Error('Please select a valid category');
        
        // Create FormData matching backend expectations
        const menuFormData = new FormData();
        menuFormData.append('name', name);
        menuFormData.append('price', price);
        menuFormData.append('category', category);
        menuFormData.append('stock', stock);
        menuFormData.append('available', available);
        menuFormData.append('description', description);
        const imageFile = formElements.imageInput?.files[0];
        if (imageFile) {
          menuFormData.append('image', imageFile);
        }
        
        console.log('📦 FormData payload ready (multer server upload)');
        
        // Use FormData for server multer upload
const method = menuId ? 'PUT' : 'POST';
        const url = `${window.API_BASE || '/api'}/menu${menuId ? `/${menuId}` : ''}`;
        
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No auth token');
        
        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${token}`
            // No Content-Type - let browser set multipart boundary
          },
          body: menuFormData
        });
        
        if (!response.ok) {
          let errorMsg = 'Unknown server error';
          try {
            const errData = await response.json();
            errorMsg = errData.message || errData.error || `HTTP ${response.status}`;
          } catch {}
          throw new Error(errorMsg);
        }
        
        console.log('Save success');
        showAdminToast(`Menu ${menuId ? 'updated' : 'created'} successfully!`, 'success');
        
        const modalEl = document.getElementById('menuModal');
        if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
        
        loadAdminMenu(1);
        
      } catch (error) {
        console.error('Menu save FAILED:', error);
        showAdminToast('DANGER: Save failed - ' + error.message, 'danger');
      } finally {
        formElements.submitBtn.disabled = false;
        formElements.submitBtn.innerHTML = '<i class="fas fa-save me-1"></i>Save Item';
        if (formElements.loader) formElements.loader.style.display = 'none';
      }
    };

    // Real-time name validation + image preview
        // Removed name length validation per request - backend handles

    // Image preview handler with file size check
    const imageInput = document.getElementById('menuImage');
    if (imageInput) {
      imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) { // 5MB
            showAdminToast('Image max 5MB', 'warning');
            this.value = '';
            return;
          }
          const reader = new FileReader();
          reader.onload = (e) => {
            const preview = document.getElementById('imagePreview');
            if (preview) {
              preview.src = e.target.result;
              preview.classList.remove('d-none');
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
  });

  function createLoader(targetId) {
    const loader = document.createElement('div');
    loader.id = `${targetId}-loader`;
    loader.className = 'd-none text-center py-3';
    loader.innerHTML = '<i class="fas fa-spinner fa-spin fa-2x text-primary mb-2"></i><div>Loading...</div>';
    const target = document.getElementById(targetId);
    if (target && target.parentNode) {
      target.parentNode.insertBefore(loader, target.nextSibling);
    }
    return loader;
  }

function renderPagination(containerId, currentPage, totalPages, loadFn) {
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) {
      if (container) container.innerHTML = '';
      return;
    }
    
    let html = '<nav><ul class="pagination justify-content-center mb-0">';
    for (let i = 1; i <= totalPages; i++) {
      html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" onclick="${loadFn.name}(${i})">${i}</a>
      </li>`;
    }
    html += '</ul></nav>';
    container.innerHTML = html;
  }

  // Auto-init
  if (document.getElementById('adminStats')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initSidebar();
        setTimeout(loadAdminDashboard, 500);
      });
    } else {
      initSidebar();
      setTimeout(loadAdminDashboard, 500);
    }
  }

  // Order functions (unchanged)
window.viewOrder = async function(orderId) {
    const modalEl = document.getElementById('orderModal');
    if (!modalEl) {
      showAdminToast('Order modal not available', 'warning');
      return;
    }

    const modalBody = modalEl.querySelector('.modal-body');
    const spinner = modalBody.querySelector('.spinner-border') || modalBody;
    spinner.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-3 text-muted">Loading order details...</p></div>';

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.API_BASE || '/api'}/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      const order = result.data || result;

      // Populate modal
      modalBody.innerHTML = `
        <div class="row mb-4">
          <div class="col-md-6">
            <h5><i class="fas fa-hashtag me-2 text-primary"></i>Order #${order._id?.slice(-8)}</h5>
              <span class="badge bg-${order.orderStatus === 'pending_approval' ? 'warning' : order.orderStatus === 'preparing' ? 'success' : 'secondary'}">${order.orderStatus?.replace('_', ' ')}</span>
            <p><strong>Total:</strong> ₦${(order.totalAmount || 0).toLocaleString()}</p>
            <p><strong>Method:</strong> ${order.deliveryMethod || 'Pickup'}</p>
          </div>
          <div class="col-md-6">
            <p><strong>Customer:</strong> ${order.user?.name || 'N/A'}</p>
            <p><strong>Phone:</strong> ${order.phoneNumber || 'N/A'}</p>
            <p><strong>Email:</strong> ${order.user?.email || 'N/A'}</p>
            ${order.deliveryAddress ? `<p><strong>Address:</strong> ${order.deliveryAddress}</p>` : ''}
            <p><strong>Bank:</strong> ${order.bankName} (${order.bankAccount})</p>
          </div>
        </div>
        <h6 class="mb-3"><i class="fas fa-utensils me-2"></i>Items:</h6>
        <div class="row g-3 mb-4">
          ${order.items?.map(item => `
            <div class="col-md-6">
              <div class="card">
                <div class="card-body">
                  <div class="d-flex">
                    <img src="${item.menuItem?.image || '/asset/food-particles.svg'}" class="rounded me-3" style="width:60px;height:60px;object-fit:cover">
                    <div>
                      <h6>${item.name || item.menuItem?.name || 'Item'}</h6>
                      <p class="mb-1"><strong>${item.quantity}x</strong> @ ₦${(item.price || 0).toLocaleString()}</p>
                      <small class="text-muted">₦${(item.quantity * (item.price || 0)).toLocaleString()}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `).join('') || '<p class="text-muted">No items</p>'}
        </div>
        ${order.receiptImage ? `
        <div class="mb-4" id="orderReceiptSection">
          <h6 class="mb-3"><i class="fas fa-receipt text-success me-2"></i>Payment Receipt</h6>
          <div class="text-center p-4 border rounded shadow-sm bg-light">
            <img src="${order.receiptImage}" alt="Payment Receipt" class="img-fluid rounded shadow" style="max-height: 400px; max-width: 100%; object-fit: contain;" onerror="this.style.display='none'; document.getElementById('orderReceiptSection').innerHTML='<p class="text-muted">Receipt image not available</p>';">
          </div>
          <div class="text-center mt-2">
            <a href="${order.receiptImage}" target="_blank" class="btn btn-outline-success btn-sm">
              <i class="fas fa-external-link-alt me-1"></i>Open Full Size
            </a>
          </div>
        </div>
        ` : ''}
        <div class="text-end">
          <button class="btn btn-outline-secondary" onclick="bootstrap.Modal.getInstance(document.getElementById('orderModal')).hide()">Close</button>
        </div>
      `;

      const modal = new bootstrap.Modal(modalEl);
      modal.show();
      // Toast removed - unnecessary for order view

    } catch (error) {
      console.error('Order load error:', error);
      spinner.innerHTML = `<div class="alert alert-danger">Failed to load order: ${error.message}</div>`;
      showAdminToast('Order load failed', 'danger');
    }
  };
  
window.updateOrderStatus = async function(orderId, status) {
    // Find & disable dropdown during request
    const dropdown = document.querySelector(`[data-order-id="${orderId}"]`);
    if (dropdown) {
      dropdown.disabled = true;
      dropdown.innerHTML = '<option>Loading...</option>';
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');
      
      console.log(`🔄 Updating ${orderId.slice(-8)} → ${status}`);
      
      const response = await fetch(`${window.API_BASE || '/api'}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        showAdminToast(`Order #${orderId.slice(-8)} → ${status.replace(/_/g, ' ').toUpperCase()}`, 'success');
        
        // Refresh table (reloads ALL orders for consistency)
        await loadPendingOrders(1);
        
        // Reset dropdown to show updated status
        if (dropdown) {
          dropdown.value = status;
          dropdown.disabled = false;
        }
      } else {
        // Enhanced error handling
        const errorMsg = result.message || `HTTP ${response.status}`;
        console.error('Status update failed:', errorMsg);
        
        showAdminToast(`Update failed: ${errorMsg}`, 'danger');
        
        // Restore dropdown
        if (dropdown) dropdown.disabled = false;
      }
    } catch (error) {
      console.error('Update network error:', error);
      showAdminToast('Network error - check connection', 'danger');
      
      // Restore dropdown
      if (dropdown) {
        dropdown.disabled = false;
        dropdown.innerHTML = dropdown.dataset.originalHtml || '';
      }
    }
  };

// Contact functions
  window.currentContactId = null;

  window.viewContact = async function(contactId) {
    try {
      window.currentContactId = contactId;
      
      // Show loader
      const modalBody = document.getElementById('contactModalBody');
      const markReadBtn = document.getElementById('markReadBtn');
      const modalTitle = document.getElementById('contactModalTitle');
      
      if (modalBody) {
        modalBody.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-info" role="status"></div><p class="mt-3 text-muted">Loading contact details...</p></div>';
      }
      
      // Fetch contact details
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.API_BASE || '/api'}/contact/${contactId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      const contact = result.data || result;
      if (!contact || !contact._id) {
        throw new Error('Invalid contact data received from server');
      }
      
      // Populate modal
      if (modalBody) {
        modalBody.innerHTML = `
          <div class="row mb-4">
            <div class="col-md-6">
              <h6><i class="fas fa-user me-2 text-primary"></i><strong>Name:</strong> ${contact.name || 'N/A'}</h6>
              <h6><i class="fas fa-envelope me-2 text-info"></i><strong>Email:</strong> ${contact.email || 'N/A'}</h6>
              <h6><i class="fas fa-phone me-2 text-success"></i><strong>Phone:</strong> ${contact.phone || 'N/A'}</h6>
            </div>
            <div class="col-md-6">
              <h6><i class="fas fa-tag me-2 text-warning"></i><strong>Subject:</strong> ${contact.subject || 'No subject'}</h6>
              <h6><i class="fas fa-calendar me-2 text-secondary"></i><strong>Date:</strong> ${contact.createdAt ? new Date(contact.createdAt).toLocaleString() : 'Unknown'}</h6>
              <h6><i class="fas fa-info-circle me-2 ${(contact.status || 'unread') === 'unread' ? 'text-danger' : 'text-success'}"></i><strong>Status:</strong>
                <span class="badge bg-${(contact.status || 'unread') === 'unread' ? 'danger' : 'success'}">${(contact.status || 'unread').toUpperCase()}</span>
              </h6>
            </div>
          </div>
          <div class="mb-3">
            <h6><i class="fas fa-comment me-2 text-primary"></i><strong>Message:</strong></h6>
            <div class="border rounded-3 p-4 bg-light">${(contact.message || '').replace(/\\n/g, '<br>')}</div>
          </div>
        `;
      }
      
      if (modalTitle) {
        modalTitle.innerHTML = `<i class="fas fa-envelope-open me-2"></i>Contact Details`; 
      }
      
      // Show/hide mark read button
      if (markReadBtn) {
        markReadBtn.style.display = contact.status === 'unread' ? 'inline-block' : 'none';
      }
      
      // Auto-mark as read
      if (contact.status === 'unread') {
        await updateContactStatus(contactId, 'read');
      }
      
      // Show modal
      const modalEl = document.getElementById('contactModal');
      if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
      
      // Toast removed - unnecessary for contact view
      
    } catch (error) {
      console.error('View contact error:', error);
      showAdminToast('Failed to load contact: ' + error.message, 'danger');
      
      const modalBody = document.getElementById('contactModalBody');
      if (modalBody) {
        modalBody.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>Failed to load contact details</div>';
      }
    }
  };

// Mark contact as ready
window.markContactReady = async function(contactId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${window.API_BASE || '/api'}/contact/${contactId}/status`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'ready' })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    showAdminToast('Marked as READY ✅', 'success');
    loadAdminContacts(1);
    
  } catch (error) {
    console.error('Mark ready error:', error);
    showAdminToast('Failed to mark ready', 'danger');
  }
};

// Reply modal functions
let currentReplyContact = null;

window.openReplyModal = async function(contactId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${window.API_BASE || '/api'}/contact/${contactId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    currentReplyContact = result.data || result;
    
    // Create/show modal
    let modal = document.getElementById('replyModal');
    if (!modal) {
      modal = createReplyModal();
    }
    
    const modalBody = document.getElementById('replyModalBody');
    modalBody.innerHTML = `
      <div class="mb-3">
        <h6><strong>To:</strong> ${currentReplyContact.name} <${currentReplyContact.email}></h6>
        <h6><strong>Subject:</strong> Re: ${currentReplyContact.subject || 'Your inquiry'}</h6>
      </div>
      <div class="border rounded p-3 mb-3 bg-light" style="max-height: 200px; overflow-y: auto;">
        <small class="text-muted mb-2 d-block">Original message:</small>
        <div style="white-space: pre-wrap; font-size: 0.9em;">${currentReplyContact.message}</div>
      </div>
      <div class="mb-3">
        <label class="form-label fw-bold">Your Reply * (min 10 chars)</label>
        <textarea class="form-control" id="replyTextarea" rows="4" placeholder="Thank you for contacting us. We have received your message and will get back to you shortly..." required minlength="10"></textarea>
      </div>
    `;
    
    const replyModal = new bootstrap.Modal(modal);
    replyModal.show();
    
  } catch (error) {
    console.error('Open reply error:', error);
    showAdminToast('Failed to load contact for reply', 'danger');
  }
};

window.sendReply = async function() {
  const replyText = document.getElementById('replyTextarea')?.value?.trim();
  if (!replyText || replyText.length < 10) {
    showAdminToast('Reply must be at least 10 characters', 'warning');
    return;
  }
  
  if (!currentReplyContact) {
    showAdminToast('Contact data missing', 'danger');
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${window.API_BASE || '/api'}/contact/${currentReplyContact._id}/reply`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ replyText })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Reply failed');
    }
    
    showAdminToast('Reply sent successfully! 📧', 'success');
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('replyModal'));
    modal.hide();
    
    // Refresh table
    loadAdminContacts(1);
    
  } catch (error) {
    console.error('Send reply error:', error);
    showAdminToast('Failed to send reply: ' + error.message, 'danger');
  }
};

function createReplyModal() {
  const modalHtml = `
    <div class="modal fade" id="replyModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="fas fa-reply me-2"></i>Send Reply
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="replyModalBody">
            Loading contact...
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="sendReply()">
              <i class="fas fa-paper-plane me-1"></i>Send Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  return document.getElementById('replyModal');
};
  
window.showReceiptPreview = function(url) {
  if (!url) {
    showAdminToast('No receipt available', 'warning');
    return;
  }
  const receiptModal = document.getElementById('receiptModal');
  if (!receiptModal) {
    // Create modal if not exists
    const modalHtml = `
      <div class="modal fade" id="receiptModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title"><i class="fas fa-receipt me-2"></i>Payment Receipt</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-center p-5">
              <img id="receiptModalImg" src="" class="img-fluid rounded shadow" style="max-height: 70vh;">
            </div>
            <div class="modal-footer">
              <a href="#" id="receiptFullLink" target="_blank" class="btn btn-success">
                <i class="fas fa-external-link-alt me-1"></i>Open Full Size
              </a>
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  
  const img = document.getElementById('receiptModalImg');
  const link = document.getElementById('receiptFullLink');
  if (img && link) {
    img.src = url;
    link.href = url;
    const modal = new bootstrap.Modal(document.getElementById('receiptModal'));
    modal.show();
  }
};

console.log('admin-dashboard.js ENHANCED - Receipt viewing enabled');

// ===== ADMIN TRANSACTIONS DOWNLOAD (MATCHES USER DASHBOARD + BACKEND) =====
async function downloadTransactionsAdmin(format, filters = {}) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      showAdminToast('Please log in to download transactions', 'danger');
      return;
    }
    
    // Optional filters: status, dateFrom, limit (backend supports)
    const params = new URLSearchParams({ format, ...filters });
    
    showAdminToast(`Generating ${format.toUpperCase()}...`, 'info');
    
    const response = await fetch(`${window.API_BASE || '/api'}/orders/admin/download?${params}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Download failed: ${response.status}`);
    }
    
    // Blob download (PDF/DOCX/CSV - identical to user dashboard)
    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `admin-transactions-${new Date().toISOString().slice(0,10).replace(/:/g, '-')}.${format}`;
    
    if (contentDisposition && contentDisposition.includes('filename=')) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
      if (matches?.[1]) filename = matches[1].replace(/['"]/g, '');
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
    
    showAdminToast(`${format.toUpperCase()} downloaded successfully!`, 'success');
  } catch (error) {
    console.error('Admin download error:', error);
    showAdminToast(error.message, 'danger');
  }
}

// Expose globally for HTML onclick
window.downloadTransactionsAdmin = downloadTransactionsAdmin;

// Enable/disable download button based on orders
function updateAdminDownloadBtn(orders) {
  const btn = document.getElementById('adminDownloadBtn');
  if (btn) {
    btn.disabled = !(Array.isArray(orders) && orders.length > 0);
    btn.title = orders?.length ? 'Download transactions' : 'No transactions to download';
  }
}
})();

