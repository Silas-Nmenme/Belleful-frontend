// Admin Dashboard JS - Complete implementation for loadAdminDashboard, loadAdminMenu, etc.
// Fixes broken "loading dashboard" / "loading all menu" issues

(function() {
  // Global DashboardManager
  window.DashboardManager = window.DashboardManager || {};
  
  // Utils
  window.showAdminToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `admin-toast alert alert-${type} position-fixed`;
    toast.style.cssText = 'top:80px;right:20px;z-index:9999;max-width:400px;';
    toast.innerHTML = `<strong>${type.toUpperCase()}:</strong> ${message} <button type="button" class="btn-close ms-2" onclick="this.parentElement.remove()"></button>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  };

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
      renderPagination('menuPagination', page, Math.ceil(50 / items.length) || 1, loadAdminMenu);
    } catch (error) {
      console.error('loadAdminMenu error:', error);
      tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-danger">Failed to load menu items</td></tr>';
      showAdminToast('Menu load failed: ' + error.message, 'danger');
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
        <td><img src="${item.image || 'https://via.placeholder.com/50x50?text=?'}&w=50" class="rounded" style="width:50px;height:50px;object-fit:cover" onerror="this.src='https://via.placeholder.com/50x50/f0f0f0/999?text=No+Img'"></td>
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
      
      showAdminToast('Dashboard loaded successfully', 'success');
    } catch (error) {
      console.error('Dashboard load error:', error);
      showAdminToast('Dashboard failed to load completely', 'warning');
    }
  };

  // Pending Orders Table (stub - implement based on routes/orders.js)
  async function loadPendingOrders(page = 1, search = '', status = '') {
    const tbody = document.getElementById('pendingOrdersTable');
    if (!tbody) return;
    
    try {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3"><div class="spinner-border text-danger" role="status"></div></td></tr>';
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page, limit: 10, ...(search && { search }), ...(status && { status }) });
      
      const response = await fetch(`${window.API_BASE}/orders/admin?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const { data: orders = [] } = await response.json();
      renderPendingOrdersTable(orders);
      // renderPagination('ordersPagination', page, 5, (p, s, st) => loadPendingOrders(p, s, st));
    } catch (error) {
      console.error('Orders load error:', error);
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-danger">Orders unavailable</td></tr>';
    }
  }

  function renderPendingOrdersTable(orders) {
    const tbody = document.getElementById('pendingOrdersTable');
    if (!tbody) return;
    
    tbody.innerHTML = orders.map(order => `
      <tr>
        <td>#${order._id?.slice(-8)}</td>
        <td>${order.userName || order.user?.name || 'Customer'}</td>
        <td>${order.items?.map(i => i.name).slice(0,2).join(', ') || 'Items'}</td>
        <td>₦${(order.totalAmount || 0).toLocaleString()}</td>
        <td><span class="badge bg-warning">${order.paymentStatus || 'Pending'}</span></td>
        <td><button class="btn btn-sm btn-primary">View</button></td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="text-center py-5">No pending orders</td></tr>';
  }

  // Users Table (stub)
  async function loadAdminUsers(page = 1) {
    const tbody = document.getElementById('usersTable');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner-border" role="status"></div></td></tr>';
    
    // Implement fetch /api/users
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted">Users data coming soon</td></tr>';
  }

  // Contacts (stub)
  async function loadAdminContacts(page = 1) {
    const tbody = document.getElementById('contactsTable');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border" role="status"></div></td></tr>';
    
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted">Contacts data coming soon</td></tr>';
  }

  // ===== MENU CRUD =====
  window.prepareMenuForm = function(editId = null) {
    const form = document.getElementById('menuForm');
    const title = document.getElementById('menuModalTitle');
    form.reset();
    document.getElementById('menuId').value = editId || '';
    title.textContent = editId ? 'Edit Menu Item' : 'Add New Menu Item';
  };

  window.editMenuItem = async function(id) {
    try {
      const response = await fetch(`${window.API_BASE}/menu/${id}`);
      const { data: item } = await response.json();
      document.getElementById('menuName').value = item.name;
      document.getElementById('menuPrice').value = item.price;
      document.getElementById('menuCategory').value = item.category;
      document.getElementById('menuStock').value = item.stock;
      document.getElementById('menuAvailable').checked = item.available;
      document.getElementById('menuDescription').value = item.description;
      document.getElementById('imagePreview').src = item.image || '';
      document.getElementById('imagePreview').classList.remove('d-none');
      
      new bootstrap.Modal(document.getElementById('menuModal')).show();
    } catch (error) {
      showAdminToast('Failed to load item', 'danger');
    }
  };

  window.deleteMenuItem = async function(id) {
    if (!confirm('Delete this menu item?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.API_BASE}/menu/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showAdminToast('Item deleted', 'success');
        loadAdminMenu(1);
      }
    } catch (error) {
      showAdminToast('Delete failed', 'danger');
    }
  };

  // Direct Cloudinary Upload + Create
  document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('menuForm');
    if (form) {
      form.onsubmit = async function(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('menuSubmitBtn');
        const loader = document.getElementById('menuLoader');
        const imageFile = document.getElementById('menuImage').files[0];
        
        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
          loader.style.display = 'block';
          
          let imageUrl = '';
          
          // Step 1: Direct Cloudinary upload if file
          if (imageFile) {
            const uploadRes = await fetch(`${window.API_BASE}/menu/upload-url?folder=menu`);
            const uploadConfig = await uploadRes.json();
            
            const formData = new FormData();
            Object.keys(uploadConfig.fields).forEach(key => formData.append(key, uploadConfig.fields[key]));
            formData.append('file', imageFile);
            
            const uploadResponse = await fetch(uploadConfig.url, {
              method: 'POST',
              body: formData
            });
            
            if (!uploadResponse.ok) throw new Error('Upload failed');
            const result = await uploadResponse.json();
            imageUrl = result.secure_url;
            showAdminToast('Image uploaded successfully', 'success');
          }
          
          // Step 2: Create/Update item
          const formData = new FormData(form);
          const itemData = Object.fromEntries(formData.entries());
          itemData.image = imageUrl;
          itemData.stock = parseInt(itemData.stock) || 50;
          itemData.available = itemData.available === 'on';
          
          const method = document.getElementById('menuId').value ? 'PUT' : 'POST';
          const url = method === 'PUT' 
            ? `${window.API_BASE}/menu/${document.getElementById('menuId').value}`
            : `${window.API_BASE}/menu`;
          
          const token = localStorage.getItem('token');
          const response = await fetch(url, {
            method,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemData)
          });
          
          if (!response.ok) throw new Error((await response.json()).message || 'Save failed');
          
          showAdminToast('Menu item saved!', 'success');
          bootstrap.Modal.getInstance(document.getElementById('menuModal')).hide();
          loadAdminMenu(1);
          
        } catch (error) {
          console.error('Menu save error:', error);
          showAdminToast('Save failed: ' + error.message, 'danger');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-save me-1"></i>Save Item';
          loader.style.display = 'none';
        }
      };
      
      // Image preview
      document.getElementById('menuImage').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const preview = document.getElementById('imagePreview');
            preview.src = e.target.result;
            preview.classList.remove('d-none');
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
    document.getElementById(targetId).parentNode.insertBefore(loader, document.getElementById(targetId).nextSibling);
    return loader;
  }

  function renderPagination(containerId, currentPage, totalPages, loadFn) {
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) return;
    
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
    window.loadAdminDashboard = loadAdminDashboard;
    // Init on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(loadAdminDashboard, 500));
    } else {
      setTimeout(loadAdminDashboard, 500);
    }
  }

  console.log('✅ admin-dashboard.js loaded - DashboardManager ready');
})();

