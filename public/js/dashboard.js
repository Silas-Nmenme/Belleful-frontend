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
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
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

