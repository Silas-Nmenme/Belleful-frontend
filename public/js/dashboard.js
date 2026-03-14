// Dashboard functionality for User & Admin
async function loadUserStats() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${window.API_BASE}/dashboard/user/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.ok ? await response.json() : { data: {} };
}

async function loadAdminStats(pageOrders = 1, limitOrders = 10, pageUsers = 1, limitUsers = 10, searchUsers = '', statusFilter = '') {
  const token = localStorage.getItem('token');
  
  const paramsOrders = new URLSearchParams({
    page: pageOrders,
    limit: limitOrders,
    ...(statusFilter && { status: statusFilter })
  });
  
  const paramsUsers = new URLSearchParams({
    page: pageUsers,
    limit: limitUsers,
    ...(searchUsers && { search: searchUsers })
  });
  
  const [statsRes, ordersRes, usersRes] = await Promise.all([
    fetch(`${window.API_BASE}/dashboard/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    fetch(`${window.API_BASE}/dashboard/admin/orders?${paramsOrders}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    fetch(`${window.API_BASE}/dashboard/admin/users?${paramsUsers}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
  ]);
  
  return {
    stats: await statsRes.json(),
    orders: await ordersRes.json(),
    users: await usersRes.json()
  };
}

function renderAdminStats(statsData) {
  const stats = statsData.data || {};
  const container = document.getElementById('adminStats');
  container.innerHTML = `
    <div class="col-xl-3 col-md-6 mb-4" data-aos="zoom-in">
      <div class="card border-left-primary shadow h-100 py-2">
        <div class="card-body">
          <div class="row no-gutters align-items-center">
            <div class="col mr-2">
              <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">Total Orders</div>
              <div class="h5 mb-0 font-weight-bold text-gray-800">${stats.totalOrders || 0}</div>
            </div>
            <div class="col-auto">
              <i class="fas fa-shopping-bag fa-2x text-gray-300"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-xl-3 col-md-6 mb-4" data-aos="zoom-in" data-aos-delay="100">
      <div class="card border-left-success shadow h-100 py-2">
        <div class="card-body">
          <div class="row no-gutters align-items-center">
            <div class="col mr-2">
              <div class="text-xs font-weight-bold text-success text-uppercase mb-1">Revenue</div>
              <div class="h5 mb-0 font-weight-bold text-gray-800">₦${(stats.totalRevenue || 0).toLocaleString()}</div>
            </div>
            <div class="col-auto">
              <i class="fas fa-dollar-sign fa-2x text-gray-300"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-xl-3 col-md-6 mb-4" data-aos="zoom-in" data-aos-delay="200">
      <div class="card border-left-info shadow h-100 py-2">
        <div class="card-body">
          <div class="row no-gutters align-items-center">
            <div class="col mr-2">
              <div class="text-xs font-weight-bold text-info text-uppercase mb-1">Total Users</div>
              <div class="h5 mb-0 font-weight-bold text-gray-800">${stats.totalUsers || 0}</div>
            </div>
            <div class="col-auto">
              <i class="fas fa-users fa-2x text-gray-300"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-xl-3 col-md-6 mb-4" data-aos="zoom-in" data-aos-delay="300">
      <div class="card border-left-warning shadow h-100 py-2">
        <div class="card-body">
          <div class="row no-gutters align-items-center">
            <div class="col mr-2">
              <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">Active Items</div>
              <div class="h5 mb-0 font-weight-bold text-gray-800">${stats.activeMenuItems || 0}</div>
            </div>
            <div class="col-auto">
              <i class="fas fa-utensils fa-2x text-gray-300"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderOrders(orders) {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = orders.map(order => `
    <tr class="${getOrderStatusClass(order.orderStatus)}">
      <td><strong>#${order._id.slice(-8)}</strong></td>
      <td>
        ${order.items.map(item => item.name).join(', ')}
        <br><small class="text-muted">${order.items.length} items</small>
      </td>
      <td><strong>₦${order.totalAmount.toLocaleString()}</strong></td>
      <td>
        <span class="badge bg-${getOrderStatusBadge(order.orderStatus)} fs-6 px-3 py-2">
          ${formatOrderStatus(order.orderStatus)}
        </span>
      </td>
      <td>${new Date(order.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="trackOrder('${order._id}')">
          Track
        </button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="text-center text-muted py-5">No orders yet</td></tr>';
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

// Render admin orders table (Pending/Recent)
function renderPendingOrders(orders, pendingCount = 0) {
  document.getElementById('pendingCount').textContent = pendingCount;
  const tbody = document.getElementById('pendingOrdersTable');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5">No pending orders</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(order => `
    <tr>
      <td>#${order._id.slice(-8).toUpperCase()}</td>
      <td>
        <div>${order.user?.name || order.user?.email || 'Guest'}</div>
        <small class="text-muted">${order.user?.email || ''}</small>
      </td>
      <td>
        ${order.items.map(item => item.menuItem?.name || item.name).slice(0,2).join(', ')}${order.items.length > 2 ? '...' : ''}
        <br><small class="text-muted">${order.items.length} items</small>
      </td>
      <td><strong>₦${order.totalAmount.toLocaleString()}</strong></td>
      <td>
        <span class="badge bg-${order.paymentStatus === 'paid' ? 'success' : 'warning'}">${order.paymentStatus?.toUpperCase()}</span>
      </td>
      <td>
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-success" onclick="quickApproveOrder('${order._id}')" title="Approve">
            <i class="fas fa-check"></i>
          </button>
          <button class="btn btn-outline-primary" onclick="viewOrderDetails('${order._id}')" title="View">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Render users table
function renderAdminUsers(users) {
  const tbody = document.getElementById('usersTable');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">No users found</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => `
    <tr>
      <td>
        <div class="fw-bold">${user.name}</div>
      </td>
      <td>${user.email}</td>
      <td>
        <span class="badge bg-${user.role === 'admin' ? 'danger' : 'secondary'}">${user.role?.toUpperCase() || 'USER'}</span>
      </td>
      <td>-</td>
      <td>${new Date(user.createdAt).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

// Quick approve order (inline)
window.quickApproveOrder = async function(orderId) {
  if (!confirm('Approve this order and mark as paid?')) return;
  
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${window.API_BASE}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        orderStatus: 'vendor_approved', 
        paymentStatus: 'paid' 
      })
    });
    
    if (res.ok) {
      showToast('Order approved!', 'success');
      DashboardManager.loadAdminDashboard(); // Refresh
    } else {
      showToast('Approval failed', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

// View order details modal (placeholder)
window.viewOrderDetails = function(orderId) {
  showToast(`Opening details for #${orderId.slice(-8)}`, 'info');
  // TODO: Modal or new page
};

// Main load function
async function loadAdminDashboard(pageOrders = 1, statusFilter = '') {
  try {
    document.body.classList.add('loading');
    const data = await loadAdminStats(pageOrders, 10, 1, 10, '', statusFilter);
    
    if (data.stats.success) renderAdminStats(data.stats);
    renderPendingOrders(data.orders.data || [], (data.orders.data || []).filter(o => o.orderStatus === 'pending_approval').length);
    renderAdminUsers(data.users.data || []);
    loadAdminMenu(1); // Load menu items
  } catch (err) {
    showToast('Failed to load dashboard: ' + err.message, 'error');
  } finally {
    document.body.classList.remove('loading');
  }
}

// Polling
setInterval(() => {
  if (localStorage.getItem('userRole') === 'admin') {
    loadAdminDashboard();
  }
}, 30000);

// Sidebar navigation
document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      // Auto-load menu section
      if (link.getAttribute('href') === '#menu-admin') {
        setTimeout(() => loadAdminMenu(1), 500);
      }
    }
  });
});


// Load admin menu items
async function loadAdminMenu(page = 1, search = '', category = '') {
  try {
    document.body.classList.add('loading');
    const params = new URLSearchParams({ page, limit: 10 });
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${window.API_BASE}/menu?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Failed to load menu items');
    const result = await response.json();
    
    renderAdminMenu(result.data || [], result.count || 0);
    renderMenuPagination(result.pages || 1, page, search, category);
  } catch (error) {
    showToast('Failed to load menu: ' + error.message, 'error');
    document.getElementById('menuItemsTable').innerHTML = 
      '<tr><td colspan="7" class="text-center text-muted py-5">Failed to load menu items</td></tr>';
  } finally {
    document.body.classList.remove('loading');
  }
}

function renderAdminMenu(items, count) {
  document.getElementById('menuCount').textContent = count;
  const tbody = document.getElementById('menuItemsTable');
  if (!tbody) return;
  
  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5">No menu items found</td></tr>';
    return;
  }
  
  tbody.innerHTML = items.map(item => `
    <tr>
      <td>#${item._id.slice(-8).toUpperCase()}</td>
      <td>
        <img src="${item.image || '/asset/placeholder-food.jpg'}" class="rounded" style="width:50px;height:50px;object-fit:cover;" alt="${item.name}">
      </td>
      <td>${item.name}</td>
      <td><strong>₦${parseFloat(item.price || 0).toLocaleString()}</strong></td>
      <td>
        <span class="badge bg-${getCategoryBadge(item.category)}">${item.category}</span>
      </td>
      <td>
        <span class="badge bg-${item.available ? 'success' : 'warning'}">
          ${item.available ? 'Yes' : 'No'}
        </span>
      </td>
      <td>
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-primary" onclick="editMenuItem('${item._id}')" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-outline-danger" onclick="deleteMenuItem('${item._id}', '${item.name}')" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function getCategoryBadge(category) {
  const badges = { food: 'primary', drink: 'info', side: 'secondary' };
  return badges[category] || 'secondary';
}

function renderMenuPagination(pages, currentPage, search, category) {
  const container = document.getElementById('menuPagination');
  if (!container) return;
  
  if (pages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  let pagination = '<nav><ul class="pagination justify-content-center mb-0">';
  for (let i = 1; i <= pages; i++) {
    pagination += `
      <li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" onclick="loadAdminMenu(${i}, '${search}', '${category}');return false;">${i}</a>
      </li>
    `;
  }
  pagination += '</ul></nav>';
  container.innerHTML = pagination;
}

// Menu CRUD functions
window.prepareMenuForm = async function() {
  const form = document.getElementById('menuForm');
  form.reset();
  document.getElementById('menuId').value = '';
  document.getElementById('menuModalTitle').textContent = 'Add New Menu Item';
  document.getElementById('menuSubmitText').textContent = 'Create Item';
  document.getElementById('imagePreview').style.display = 'none';
};

window.editMenuItem = async function(id) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${window.API_BASE}/menu/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Item not found');
    
    const item = await response.json();
    document.getElementById('menuId').value = item._id;
    document.getElementById('menuName').value = item.name || '';
    document.getElementById('menuPrice').value = item.price || '';
    document.getElementById('menuCategory').value = item.category || 'food';
    document.getElementById('menuDescription').value = item.description || '';
    document.getElementById('menuAvailable').checked = item.available !== false;
    document.getElementById('menuModalTitle').textContent = 'Edit Menu Item';
    document.getElementById('menuSubmitText').textContent = 'Update Item';
    
    // Image preview
    if (item.image) {
      document.getElementById('imagePreview').src = item.image;
      document.getElementById('imagePreview').style.display = 'block';
    }
    
    new bootstrap.Modal(document.getElementById('menuModal')).show();
  } catch (error) {
    showToast('Failed to load item: ' + error.message, 'error');
  }
};

window.deleteMenuItem = function(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  
  showLoading('menuDeleteBtn');
  const token = localStorage.getItem('token');
  
  fetch(`${window.API_BASE}/menu/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => {
    if (res.ok) {
      showToast('Menu item deleted!', 'success');
      loadAdminMenu(1);
    } else {
      throw new Error('Delete failed');
    }
  })
  .catch(err => showToast('Error: ' + err.message, 'error'))
  .finally(() => hideLoading('menuDeleteBtn'));
};

document.getElementById('menuForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  // Client-side validation
  const name = document.getElementById('menuName').value.trim();
  const priceStr = document.getElementById('menuPrice').value.trim();
  const category = document.getElementById('menuCategory').value;
  
  if (!name) {
    showToast('Name is required', 'error');
    document.getElementById('menuName').focus();
    return;
  }
  
  if (!priceStr || isNaN(priceStr) || parseFloat(priceStr) <= 0) {
    showToast('Price must be a positive number', 'error');
    document.getElementById('menuPrice').focus();
    return;
  }
  
  if (!category) {
    showToast('Category is required', 'error');
    document.getElementById('menuCategory').focus();
    return;
  }
  
  const submitBtn = document.getElementById('menuSubmitBtn');
  showLoading(submitBtn);
  
  const id = document.getElementById('menuId').value;
  const commonData = {
    name: name,
    price: parseFloat(priceStr),
    category: category,
    description: document.getElementById('menuDescription').value.trim(),
    available: document.getElementById('menuAvailable').checked
  };
  
  const token = localStorage.getItem('token');
  const method = id ? 'PUT' : 'POST';
  const url = id ? `${window.API_BASE}/menu/${id}` : `${window.API_BASE}/menu`;
  
  try {
    let res;
    if (id) {
      // UPDATE: Send JSON (no image update to avoid multer issues)
      res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(commonData)
      });
    } else {
      // CREATE: FormData for image upload
      const formData = new FormData();
      Object.keys(commonData).forEach(key => formData.append(key, commonData[key]));
      const imageFile = document.getElementById('menuImage').files[0];
      if (imageFile) formData.append('image', imageFile);
      
      res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
    }
    
    if (res.ok) {
      showToast(id ? 'Item updated!' : 'Item created!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('menuModal')).hide();
      await loadAdminMenu(1);
    } else {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || (await res.text()) || 'Operation failed');
    }
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  } finally {
    hideLoading(submitBtn);
  }
});

// Image preview
document.getElementById('menuImage')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('imagePreview').src = e.target.result;
      document.getElementById('imagePreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
});

// Make globally available
window.DashboardManager = {
  loadUserStats,
  loadAdminStats,
  renderAdminStats,
  renderPendingOrders,
  renderAdminUsers,
  loadAdminDashboard
};


