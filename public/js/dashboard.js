// Local DB Dashboard System - Real Data from localStorage DB
(function() {
  // User Stats - computed from real DB
  window.loadUserStats = async function() {
    const userId = localStorage.getItem('userId');
    if (!userId || !window.DB) return {data: {totalOrders: 0, totalSpent: 0}};

    const userOrders = window.DB.orders.filter(o => o.userId == userId);
    const totalSpent = userOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    return {
      data: {
        totalOrders: userOrders.length,
        totalSpent,
        avgOrderValue: userOrders.length ? Math.round(totalSpent / userOrders.length) : 0,
        recentItems: [...new Set(userOrders.flatMap(o => o.items.map(i => i.name)))].slice(0, 3)
      }
    };
  };

  // Admin Stats - aggregate from all users
  window.loadAdminStats = async function() {
    const allOrders = window.DB.orders || [];
    const allUsers = window.DB.users.filter(u => !u.isSuperAdmin) || [];
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return {
      stats: {
        success: true,
        data: {
          totalOrders: allOrders.length,
          totalRevenue,
          totalUsers: allUsers.length,
          activeMenuItems: (window.DB.menuItems || []).filter(m => m.available).length,
          pendingOrders: allOrders.filter(o => o.orderStatus === 'pending_approval').length
        }
      },
      orders: {data: allOrders.filter(o => o.orderStatus === 'pending_approval')},
      users: {data: allUsers}
    };
  };

  // Render User Stats Cards
  window.renderUserStats = function(stats) {
    const container = document.getElementById('statsCards');
    if (!container) return;

    const data = stats.data || {};
    container.innerHTML = `
      <div class="col-md-4 mb-4" data-aos="zoom-in">
        <div class="card border-left-primary shadow h-100">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col">
                <h5 class="text-primary mb-1">Total Orders</h5>
                <h3 class="fw-bold">${data.totalOrders || 0}</h3>
              </div>
              <div class="col-auto">
                <i class="fas fa-shopping-bag fa-2x text-primary"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4 mb-4" data-aos="zoom-in" data-aos-delay="100">
        <div class="card border-left-success shadow h-100">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col">
                <h5 class="text-success mb-1">Total Spent</h5>
                <h3 class="fw-bold">₦${(data.totalSpent || 0).toLocaleString()}</h3>
              </div>
              <div class="col-auto">
                <i class="fas fa-wallet fa-2x text-success"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4 mb-4" data-aos="zoom-in" data-aos-delay="200">
        <div class="card border-left-info shadow h-100">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col">
                <h5 class="text-info mb-1">Avg Order</h5>
                <h3 class="fw-bold">₦${(data.avgOrderValue || 0).toLocaleString()}</h3>
              </div>
              <div class="col-auto">
                <i class="fas fa-chart-line fa-2x text-info"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Render User Orders Table
  window.renderUserOrders = function() {
    const userId = localStorage.getItem('userId');
    if (!userId || !window.DB) {
      document.getElementById('ordersTableBody').innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">No orders yet. Start ordering!</td></tr>';
      return;
    }

    const orders = window.DB.orders.filter(o => o.userId == userId);
    const tbody = document.getElementById('ordersTableBody');
    
    if (!tbody) return;
    
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">No orders yet. Start ordering!</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(order => {
      const statusClass = order.orderStatus === 'delivered' ? 'success' : 
                         order.orderStatus === 'pending_approval' ? 'warning' : 'secondary';
      return `
        <tr class="table-${statusClass}">
          <td><strong>#${order.id}</strong></td>
          <td>${order.items.map(i => i.name).join(', ')} <small>(${order.items.length} items)</small></td>
          <td><strong>₦${order.totalAmount.toLocaleString()}</strong></td>
          <td><span class="badge bg-${statusClass}">${formatOrderStatus(order.orderStatus)}</span></td>
          <td>${new Date(order.createdAt).toLocaleDateString()}</td>
          <td><button class="btn btn-sm btn-outline-primary" onclick="trackOrder('${order.id}')">Track</button></td>
        </tr>
      `;
    }).join('');
  };

  // Admin Stats Render
  window.renderAdminStats = function(data) {
    const stats = data?.data || {};
    const container = document.getElementById('adminStats');
    if (!container) return;
    
    container.innerHTML = `
      <div class="col-lg-3 col-md-6 mb-4">
        <div class="card border-left-primary shadow">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col">
                <div class="text-primary h5 mb-1">Total Orders</div>
                <h3 class="fw-bold">${stats.totalOrders || 0}</h3>
              </div>
              <i class="col-auto fas fa-shopping-bag fa-2x text-primary opacity-75"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-3 col-md-6 mb-4">
        <div class="card border-left-success shadow">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col">
                <div class="text-success h5 mb-1">Revenue</div>
                <h3 class="fw-bold">₦${(stats.totalRevenue || 0).toLocaleString()}</h3>
              </div>
              <i class="col-auto fas fa-naira-sign fa-2x text-success opacity-75"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-3 col-md-6 mb-4">
        <div class="card border-left-info shadow">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col">
                <div class="text-info h5 mb-1">Users</div>
                <h3 class="fw-bold">${stats.totalUsers || 0}</h3>
              </div>
              <i class="col-auto fas fa-users fa-2x text-info opacity-75"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-3 col-md-6 mb-4">
        <div class="card border-left-warning shadow">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col">
                <div class="text-warning h5 mb-1">Pending</div>
                <h3 class="fw-bold">${stats.pendingOrders || 0}</h3>
              </div>
              <i class="col-auto fas fa-clock fa-2x text-warning opacity-75"></i>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Admin Pending Orders
  window.renderPendingOrders = function() {
    const orders = window.DB?.orders?.filter(o => o.orderStatus === 'pending_approval') || [];
    document.getElementById('pendingCount').textContent = orders.length;
    
    const tbody = document.getElementById('pendingOrdersTable');
    if (!tbody) return;

    tbody.innerHTML = orders.length ? orders.map(o => `
      <tr>
        <td>#${o.id}</td>
        <td>${window.DB.users.find(u => u.id == o.userId)?.name || 'User'}<br><small>${window.DB.users.find(u => u.id == o.userId)?.email}</small></td>
        <td>${o.items.map(i => i.name).join(', ')} (${o.items.length} items)</td>
        <td>₦${o.totalAmount?.toLocaleString()}</td>
        <td><span class="badge bg-warning">${o.paymentStatus}</span></td>
        <td>
          <button class="btn btn-sm btn-success" onclick="approveOrder('${o.id}')">Approve</button>
          <button class="btn btn-sm btn-info" onclick="viewOrder('${o.id}')">View</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="6" class="text-center py-4">No pending orders</td></tr>';
  };

  // Admin Users Table
  window.renderAdminUsers = function() {
    const users = window.DB?.users?.filter(u => !u.isSuperAdmin) || [];
    const tbody = document.getElementById('usersTable');
    if (!tbody) return;

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td><span class="badge bg-${u.role === 'admin' ? 'danger' : 'secondary'}">${u.role.toUpperCase()}</span></td>
        <td>${window.DB.orders.filter(o => o.userId == u.id).length}</td>
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="text-center">No users</td></tr>';
  };

  // === ADMIN ACTIONS ===
  window.approveOrder = function(orderId) {
    if (!confirm('Approve this order?')) return;
    
    const order = window.DB.orders.find(o => o.id === orderId);
    if (order) {
      order.orderStatus = 'vendor_approved';
      order.paymentStatus = 'paid';
      window.saveDB();
      showToast('Order approved!', 'success');
      window.loadAdminDashboard();
    }
  };

  window.viewOrder = function(orderId) {
    const order = window.DB.orders.find(o => o.id === orderId);
    alert(`Order #${orderId}\nTotal: ₦${order?.totalAmount}\nStatus: ${order?.orderStatus}\nUser: ${window.DB.users.find(u => u.id == order?.userId)?.name}`);
  };

  window.loadAdminDashboard = async function() {
    const data = await window.loadAdminStats();
    window.renderAdminStats(data.stats);
    window.renderPendingOrders();
    window.renderAdminUsers();
  };

  // User Dashboard Load
  window.loadUserDashboard = async function() {
    const stats = await window.loadUserStats();
    window.renderUserStats(stats);
    window.renderUserOrders();
  };

  // Order status formatter
  function formatOrderStatus(status) {
    const labels = {
      'pending_approval': 'Pending',
      'vendor_approved': 'Approved', 
      'preparing': 'Cooking',
      'ready': 'Ready',
      'delivered': 'Delivered'
    };
    return labels[status] || status;
  }

  window.trackOrder = function(id) {
    showToast(`Tracking order #${id} - Feature coming soon!`, 'info');
  };

  // Show toast globally
  function showToast(msg, type = 'info') {
    // Reuse auth.js toast style
    const toast = document.createElement('div');
    toast.innerHTML = `<div class="alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed" style="top:20px;right:20px;z-index:9999;max-width:400px;">
      ${msg}
      <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    </div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  // Global Dashboard Manager
  window.DashboardManager = {
    loadUserStats: window.loadUserStats,
    loadAdminStats: window.loadAdminStats,
    loadAdminDashboard: window.loadAdminDashboard,
    loadUserDashboard: window.loadUserDashboard,
    renderUserStats: window.renderUserStats,
    renderUserOrders: window.renderUserOrders
  };

})();

