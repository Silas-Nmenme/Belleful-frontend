const API_BASE = window.API_BASE;\n\n// Dashboard functionality for User & Admin\nasync function loadUserStats() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/dashboard/user/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.ok ? await response.json() : { data: {} };
}

async function loadAdminStats() {
  const token = localStorage.getItem('token');
  const [statsRes, ordersRes, usersRes] = await Promise.all([
    fetch(`${API_BASE}/dashboard/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    fetch(`${API_BASE}/dashboard/admin/orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    fetch(`${API_BASE}/dashboard/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
  ]);
  
  return {
    stats: await statsRes.json(),
    recentOrders: await ordersRes.json(),
    users: await usersRes.json()
  };
}

function renderStats(stats) {
  const container = document.getElementById('statsCards') || document.querySelector('.stats-container');
  container.innerHTML = `
    <div class="col-lg-3 col-md-6" data-aos="zoom-in">
      <div class="card border-0 shadow-lg h-100 text-center p-4">
        <i class="fas fa-shopping-bag fa-3x text-primary mb-3"></i>
        <h3 class="display-4 fw-bold text-primary">${stats.totalOrders || 0}</h3>
        <h6 class="text-muted">Total Orders</h6>
      </div>
    </div>
    <div class="col-lg-3 col-md-6" data-aos="zoom-in" data-aos-delay="100">
      <div class="card border-0 shadow-lg h-100 text-center p-4">
        <i class="fas fa-credit-card fa-3x text-success mb-3"></i>
        <h3 class="display-4 fw-bold text-success">₦${(stats.totalSpent || 0).toLocaleString()}</h3>
        <h6 class="text-muted">Total Spent</h6>
      </div>
    </div>
    <div class="col-lg-3 col-md-6" data-aos="zoom-in" data-aos-delay="200">
      <div class="card border-0 shadow-lg h-100 text-center p-4">
        <i class="fas fa-check-circle fa-3x text-info mb-3"></i>
        <h3 class="display-4 fw-bold text-info">${stats.completedOrders || 0}</h3>
        <h6 class="text-muted">Delivered</h6>
      </div>
    </div>
    <div class="col-lg-3 col-md-6" data-aos="zoom-in" data-aos-delay="300">
      <div class="card border-0 shadow-lg h-100 text-center p-4">
        <i class="fas fa-shopping-cart fa-3x text-warning mb-3"></i>
        <h3 class="display-4 fw-bold text-warning">${stats.cartItems || 0}</h3>
        <h6 class="text-muted">In Cart</h6>
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

// Admin-specific functions
async function loadAdminDashboard() {
  const data = await loadAdminStats();
  renderStats(data.stats.data);
  
  // Render admin tables
  renderAdminOrders(data.recentOrders.data);
  renderAdminUsers(data.users.data);
}

// Make functions globally available
window.DashboardManager = {
  loadUserStats,
  loadAdminStats,
  renderStats,
  renderOrders,
  loadAdminDashboard
};

