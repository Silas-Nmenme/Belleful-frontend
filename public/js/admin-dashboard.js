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
    const countEl = document.getElementById('pendingCount');
    if (!tbody) return;
    
    try {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3"><div class="spinner-border text-danger" role="status"></div></td></tr>';
      
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
    // Sort pending first, then recent
    const sortedOrders = orders.sort((a, b) => {
      const aPending = a.orderStatus === 'pending_approval' ? 1 : 0;
      const bPending = b.orderStatus === 'pending_approval' ? 1 : 0;
      if (aPending !== bPending) return bPending - aPending;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    const tbody = document.getElementById('pendingOrdersTable');
    const countEl = document.getElementById('pendingCount');
    if (!tbody) return;
    
    // Uniform status badges
    const statusBadge = (status) => {
      const badges = {
        'pending_approval': 'bg-warning text-dark',
        'vendor_approved': 'bg-info',
        'preparing': 'bg-primary',
        'delivered': 'bg-success',
        'cancelled': 'bg-danger'
      };
      return `<span class="badge ${badges[status] || 'bg-secondary'}">${status.replace('_', ' ').toUpperCase()}</span>`;
    };
    
    tbody.innerHTML = sortedOrders.map(order => `
      <tr>
        <td>#${order._id?.slice(-8)}</td>
        <td>${order.user?.name || order.userName || 'Customer'}</td>
        <td>${order.items?.map(i => i.name).slice(0,2).join(', ') || 'Items'}</td>
        <td>₦${(order.totalAmount || 0).toLocaleString()}</td>
        <td>${statusBadge(order.orderStatus || 'pending_approval')}</td>
        <td><button class="btn btn-sm btn-primary" onclick="viewOrder('${order._id}')">View</button></td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="text-center py-5">No orders</td></tr>';
    
    if (countEl) countEl.textContent = sortedOrders.filter(o => o.orderStatus === 'pending_approval').length;
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
      showAdminToast('Users load failed', 'danger');
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
      showAdminToast('Contacts load failed', 'danger');
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
        <td>${contact.subject}</td>
        <td><span class="badge bg-${contact.status === 'unread' ? 'danger' : 'success'}">${contact.status}</span></td>
        <td>${new Date(contact.createdAt).toLocaleDateString()}</td>
        <td><button class="btn btn-sm btn-info" onclick="viewContact('${contact._id}')">View</button></td>
      </tr>
    `).join('') || '<tr><td colspan="7" class="text-center py-5 text-muted">No contacts</td></tr>';
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

  // Order View/Update functions
  window.viewOrder = async function(orderId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.API_BASE || '/api'}/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const { data: order } = await response.json();
      
      // Simple modal (add to HTML or use bootstrap)
      const statusOptions = ['pending_approval', 'vendor_approved', 'preparing', 'delivered', 'cancelled'];
      let statusHtml = statusOptions.map(s => 
        `<button class="btn btn-sm me-2 mb-2 btn-${s === order.orderStatus ? 'primary' : 'outline-secondary'}" onclick="updateOrderStatus('${orderId}', '${s}')">${s.replace('_', ' ').toUpperCase()}</button>`
      ).join('');
      
      showAdminToast(`Order #${order._id.slice(-8)} details loaded. Current: ${order.orderStatus}`, 'info');
      console.log('Order details:', order); // Replace with full modal
      
    } catch (error) {
      showAdminToast('Failed to load order', 'danger');
    }
  };
  
  window.updateOrderStatus = async function(orderId, status) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.API_BASE || '/api'}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) throw new Error('Update failed');
      
      showAdminToast(`Status updated to ${status.replace('_', ' ')}`, 'success');
      loadPendingOrders(1); // Refresh
    } catch (error) {
      showAdminToast('Status update failed: ' + error.message, 'danger');
    }
  };

  // Contact View function
  window.viewContact = async function(contactId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.API_BASE || '/api'}/contact/${contactId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const { data: contact } = await response.json();
      
      // Update global variables for modal buttons
      window.currentContactId = contactId;
      
      // Update modal title
      document.getElementById('contactModalTitle').textContent = 
        `Contact #${contact._id?.slice(-8)} - ${contact.name || 'Customer'}`;
      
      // Render contact details
      const modalBody = document.getElementById('contactModalBody');
      const statusBadge = contact.status === 'unread' ? 'bg-danger' : 'bg-success';
      const markReadBtn = document.getElementById('markReadBtn');
      
      modalBody.innerHTML = `
        <div class="row g-4">
          <div class="col-md-6">
            <h6><i class="fas fa-user me-2 text-info"></i><strong>Customer Info</strong></h6>
            <div class="card border-info border-2">
              <div class="card-body">
                <p><strong>Name:</strong> ${contact.name || 'N/A'}</p>
                <p><strong>Email:</strong> ${contact.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${contact.phone || 'N/A'}</p>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <h6><i class="fas fa-info-circle me-2 text-primary"></i><strong>Message Info</strong></h6>
            <div class="card border-primary border-2">
              <div class="card-body">
                <p><strong>Subject:</strong> ${contact.subject || 'No subject'}</p>
                <p><strong>Status:</strong> 
                  <span class="badge ${statusBadge}">${contact.status?.toUpperCase() || 'UNKNOWN'}</span>
                </p>
                <p><strong>Date:</strong> ${new Date(contact.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div class="col-12">
            <h6><i class="fas fa-comment me-2 text-success"></i><strong>Message</strong></h6>
            <div class="card border-success border-2">
              <div class="card-body">
                <div class="message-content">${contact.message || 'No message content'}</div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Show/hide mark read button
      if (markReadBtn) {
        markReadBtn.style.display = contact.status === 'unread' ? 'inline-block' : 'none';
      }
      
      // Show modal
      const modal = new bootstrap.Modal(document.getElementById('contactModal'));
      modal.show();
      
      showAdminToast('Contact details loaded', 'success');
      
    } catch (error) {
      console.error('viewContact error:', error);
      showAdminToast('Failed to load contact: ' + error.message, 'danger');
    }
  };

  // Global variable for current contact
  window.currentContactId = null;

  window.updateContactStatus = async function(contactId, status) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.API_BASE || '/api'}/contact/${contactId}/status`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) throw new Error('Update failed');
      
      showAdminToast(`Contact marked as ${status}`, 'success');
      
      // Close modal and refresh table
      const modal = bootstrap.Modal.getInstance(document.getElementById('contactModal'));
      if (modal) modal.hide();
      
      loadAdminContacts(1); // Refresh contacts table
      
    } catch (error) {
      showAdminToast('Status update failed: ' + error.message, 'danger');
    }
  };
  
  console.log('✅ admin-dashboard.js loaded - DashboardManager ready');
})();

