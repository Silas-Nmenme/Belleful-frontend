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

function renderStats(statsData) {
  const stats = statsData || {};
  const container = document.getElementById('statsCards');
  if (!container) return;
  
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
              <div class="text-xs font-weight-bold text-success text-uppercase mb-1">Total Spent</div>
              <div class="h5 mb-0 font-weight-bold text-gray-800">₦${(stats.totalSpent || 0).toLocaleString()}</div>
            </div>
            <div class="col-auto">
              <i class="fas fa-wallet fa-2x text-gray-300"></i>
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
              <div class="text-xs font-weight-bold text-info text-uppercase mb-1">Avg Order</div>
              <div class="h5 mb-0 font-weight-bold text-gray-800">₦${(stats.avgOrderValue || 0).toLocaleString()}</div>
            </div>
            <div class="col-auto">
              <i class="fas fa-chart-line fa-2x text-gray-300"></i>
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
              <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">Orders This Month</div>
              <div class="h5 mb-0 font-weight-bold text-gray-800">${stats.monthlyOrders || 0}</div>
            </div>
            <div class="col-auto">
              <i class="fas fa-calendar fa-2x text-gray-300"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

renderOrders(orders) {
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
      <td>#${(order._id || 'ORDER').slice(-8).toUpperCase()}</td>
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
    
    // DEBUG: Log raw response
    console.log('🔍 RAW STATS:', data.stats);
    
    // Force render
    renderAdminStats(data.stats);
    renderPendingOrders(data.orders.data || [], data.stats.data?.pendingOrders || 0);
    renderAdminUsers(data.users.data || []);
    loadAdminMenu(1);
    loadAdminContacts(1);
  } catch (err) {
    console.error('Dashboard load error:', err);
    showToast('Failed to load dashboard: ' + err.message, 'error');
  } finally {
    document.body.classList.remove('loading');
  }
}

// Load admin contacts (page, search, status)
async function loadAdminContacts(page = 1, search = '', status = '') {
  try {
    document.body.classList.add('loading');
    const params = new URLSearchParams({ page, limit: 15 });
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${window.API_BASE}/contact?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    renderAdminContacts(result.data || [], result.pagination || {});
    document.getElementById('contactsCount').textContent = result.pagination.total || 0;
  } catch (error) {
    console.error('Contacts load error:', error);
    showToast('Failed to load contacts: ' + error.message, 'error');
    renderAdminContacts([], {});
  } finally {
    document.body.classList.remove('loading');
  }
}

// Render contacts table
function renderAdminContacts(contacts, pagination) {
  const tbody = document.getElementById('contactsTable');
  if (!tbody) return;
  
  if (contacts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5">No contacts found</td></tr>';
    return;
  }
  
  tbody.innerHTML = contacts.map(contact => {
    const safeId = contact._id?.slice(-8).toUpperCase() || 'N/A';
    const hasUnread = !contact.read; // Assume backend adds 'read' field or use createdAt logic
    return `
      <tr class="${hasUnread ? 'table-info fw-bold' : ''}">
        <td><strong>#${safeId}</strong></td>
        <td>${contact.name || 'N/A'}</td>
        <td>
          <div><strong>${contact.email || ''}</strong></div>
          ${contact.phone ? `<small class="text-muted">${contact.phone}</small>` : ''}
        </td>
        <td>${contact.subject || 'No subject'}</td>
        <td>
          <span class="badge bg-${contact.read ? 'success' : 'warning'} fs-6 px-3 py-2">
            ${contact.read ? 'Read' : 'Unread'}
          </span>
        </td>
        <td>${new Date(contact.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="viewContact('${contact._id}')" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
            ${!contact.read ? `<button class="btn btn-outline-success btn-sm" onclick="markRead('${contact._id}')" title="Mark Read">
              <i class="fas fa-check"></i>
            </button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
  
  renderContactsPagination(pagination.pages || 1, pagination.current || 1, '', '');
}

// Pagination renderer
function renderContactsPagination(pages, currentPage, search, status) {
  const container = document.getElementById('contactsPagination');
  if (!container || pages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  let paginationHTML = '<nav><ul class="pagination justify-content-center mb-0">';
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(pages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);
  
  if (startPage > 1) {
    paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="loadAdminContacts(1,'${search}','${status}');return false;">1</a></li>`;
    if (startPage > 2) paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
  }
  
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" onclick="loadAdminContacts(${i}, '${search}', '${status}');return false;">${i}</a>
      </li>
    `;
  }
  
  if (endPage < pages) {
    if (endPage < pages - 1) paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="loadAdminContacts(${pages},'${search}','${status}');return false;">${pages}</a></li>`;
  }
  paginationHTML += '</ul></nav>';
  container.innerHTML = paginationHTML;
}

// Contact actions (global window functions)
window.viewContact = async function(id) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_BASE}/contact/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Contact not found');
    const data = await res.json();
    const contact = data.data;
    
    // Simple Bootstrap modal
    const modalHTML = `
      <div class="modal fade" id="contactModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">#${id.slice(-8)} ${contact.subject || 'Contact'}</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-md-6">
                  <p><strong>Name:</strong> ${contact.name || 'N/A'}</p>
                  <p><strong>Email:</strong> <a href="mailto:${contact.email}">${contact.email}</a></p>
                  ${contact.phone ? `<p><strong>Phone:</strong> ${contact.phone}</p>` : ''}
                </div>
                <div class="col-md-6">
                  <p><strong>Subject:</strong> ${contact.subject}</p>
                  <p><strong>Date:</strong> ${new Date(contact.createdAt).toLocaleString()}</p>
                  <p><strong>Status:</strong> <span class="badge bg-${contact.read ? 'success' : 'warning'}">${contact.read ? 'Read' : 'Unread'}</span></p>
                </div>
              </div>
              <hr>
              <div><strong>Message:</strong></div>
              <div class="p-3 bg-light rounded">${contact.message || 'No message'}</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              ${!contact.read ? `<button type="button" class="btn btn-success" onclick="markRead('${id}'); bootstrap.Modal.getInstance(document.getElementById('contactModal')).hide();">Mark as Read</button>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('contactModal'));
    modal.show();
    modal._element.addEventListener('hidden.bs.modal', () => modal._element.remove(), { once: true });
  } catch (err) {
    showToast('Failed to load contact: ' + err.message, 'error');
  }
};

window.markRead = async function(id) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_BASE}/api/contact/${id}/read`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    });
    if (res.ok) {
      showToast('Marked as read', 'success');
      loadAdminContacts(1); // Refresh
    } else {
      showToast('Failed to mark as read', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

window.markAllRead = async function() {
  if (!confirm('Mark all unread contacts as read?')) return;
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${window.API_BASE}/api/contact/read-all`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    });
    if (res.ok) {
      showToast('All contacts marked as read', 'success');
      loadAdminContacts(1);
    } else {
      showToast('Bulk mark failed', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

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
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    try {
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        // Auto-load menu section
        if (href === '#menu-admin') {
          setTimeout(() => loadAdminMenu(1), 500);
        }
      }
    } catch (error) {
      console.warn('Invalid smooth scroll target:', href, error);
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
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Menu API error:', response.status, errorText);
      showToast(`Menu load failed (${response.status}): ${errorText.slice(0,100)}`, 'error');
      renderAdminMenu([], 0);
      renderMenuPagination(1, page, search, category);
      return;
    }
    
    const result = await response.json();
    renderAdminMenu(result.data || [], result.count || 0);
    renderMenuPagination(result.pages || 1, page, search, category);
  } catch (error) {
    console.error('loadAdminMenu error:', error);
    showToast(`Menu load failed: ${error.message}`, 'error');
    renderAdminMenu([], 0);
    renderMenuPagination(1, page, search, category);
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
  
  tbody.innerHTML = items.map(item => {
    const safeId = item._id ? item._id.toString() : '';
    const safeName = item.name || 'Unknown';
    return `
    <tr>
      <td>#${safeId.slice(-8).toUpperCase()}</td>
      <td>
        <img src="${item.image || '/asset/hero.jpeg'}" class="rounded" style="width:50px;height:50px;object-fit:cover;" alt="${safeName}">
      </td>
      <td>${safeName}</td>
      <td><strong>₦${parseFloat(item.price || 0).toLocaleString()}</strong></td>
      <td>
        <span class="badge bg-${getCategoryBadge(item.category)}">${item.category || 'Unknown'}</span>
      </td>
      <td>
        <span class="badge bg-${item.available ? 'success' : 'warning'}">
          ${item.available ? 'Yes' : 'No'}
        </span>
      </td>
      <td>
        <span class="badge bg-${(item.stock || 0) > 0 ? 'info' : 'secondary'}">${item.stock || 0}</span>
      </td>
      <td>
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-primary" onclick="editMenuItem('${safeId}')" title="Edit" ${!safeId ? 'disabled' : ''}>
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-outline-danger" onclick="deleteMenuItem('${safeId}', '${safeName}')" title="Delete" ${!safeId ? 'disabled' : ''}>
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
  }).join('');
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
  document.getElementById('menuId').value = ''; // Explicitly clear ID
  document.getElementById('menuModalTitle').textContent = 'Add New Menu Item';
  document.getElementById('menuSubmitText').textContent = 'Create Item';
  document.getElementById('imagePreview').style.display = 'none';
};

window.editMenuItem = async function(id) {
  if (!id || typeof id !== 'string' || id.length < 10) {
    showToast('Invalid menu item ID', 'error');
    return;
  }

  // FIX 1: Show modal FIRST, wait for Bootstrap animation
  const menuModal = document.getElementById('menuModal');
  if (!menuModal) {
    showToast('Menu editor not available. Please refresh page.', 'error');
    return;
  }

  const modalInstance = new bootstrap.Modal(menuModal);
  modalInstance.show();

  // Wait for modal fully shown
  await new Promise((resolve) => {
    const handleShown = () => {
      menuModal.removeEventListener('shown.bs.modal', handleShown);
      resolve();
    };
    menuModal.addEventListener('shown.bs.modal', handleShown);
    setTimeout(resolve, 600); // Failsafe
  });

  const submitBtn = document.getElementById('menuSubmitBtn');
  showLoading(submitBtn);
  
  try {
    const token = localStorage.getItem('token');
  const response = await fetch(`${window.API_BASE}/menu/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      let errMsg = `Server error ${response.status}`;
      try {
        const errData = await response.json();
        errMsg = errData.message || errData.error || errMsg;
      } catch {
        // Fallback
      }
      console.error(`Edit menu fetch failed (${response.status}):`, errMsg);
      showToast(`Failed to load item: ${errMsg}`, 'error');
      return;
    }
    
    let responseData;
    try {
      responseData = await response.json();
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr);
      showToast('Invalid server response', 'error');
      return;
    }
    
    const item = responseData.data;
    console.log('Edit menu response:', responseData);
    
// SEQUENTIAL wait for CRITICAL form inputs only (fastest + most reliable)
    console.log('✅ Modal ready, waiting for CRITICAL form elements...');
    
    const criticalElements = [
      { selector: '#menuId', required: true },
      { selector: '#menuName', required: true },
      { selector: '#menuPrice', required: true },
      { selector: '#menuCategory', required: true }
    ];
    
    let missingCritical = [];
    for (const { selector, required } of criticalElements) {
      const el = await waitForElement(selector);
      if (!el && required) {
        missingCritical.push(selector);
      }
    }
    
    if (missingCritical.length > 0) {
      console.error('❌ Missing critical elements:', missingCritical);
      showToast(`Missing form fields: ${missingCritical.join(', ')}. Please refresh page.`, 'error');
      return;
    }
    
    console.log('✅ Critical form elements ready - populating form');
    
    // Populate CRITICAL fields (guaranteed to exist)
    document.getElementById('menuId').value = item._id || '';
    document.getElementById('menuName').value = item.name || '';
    document.getElementById('menuPrice').value = item.price?.toString() || '';
    document.getElementById('menuCategory').value = item.category || 'food';
    
    // Populate OPTIONAL fields safely
    const safeFields = {
      menuStock: (item.stock ?? 50).toString(),
      menuDescription: item.description || '',
      menuAvailable: item.available !== false
    };
    
    for (const [id, value] of Object.entries(safeFields)) {
      const el = document.getElementById(id);
      if (el) {
        if (typeof value === 'boolean') {
          el.checked = value;
        } else {
          el.value = value;
        }
      }
    }
    
    // Safe UI updates (no more undefined variables)
    const titleEl = document.getElementById('menuModalTitle');
    if (titleEl) titleEl.textContent = item.name ? `Edit: ${item.name}` : 'Edit Menu Item';
    
    const submitTextEl = document.getElementById('menuSubmitText');
    if (submitTextEl) submitTextEl.textContent = 'Update Item';
    
    // Safe image preview
    const imagePreviewEl = document.getElementById('imagePreview');
    if (item.image && imagePreviewEl) {
      imagePreviewEl.src = item.image;
      imagePreviewEl.style.display = 'block';
      imagePreviewEl.onerror = () => {
        imagePreviewEl.style.display = 'none';
      };
    } else if (imagePreviewEl) {
      imagePreviewEl.style.display = 'none';
    }
    
    console.log('✅ Form populated successfully:', { id: item._id, name: item.name });
  } catch (error) {
    console.error('Edit menu fetch error:', error);
    showToast('Failed to load item: ' + error.message, 'error');
  } finally {
    if (submitBtn) hideLoading(submitBtn);
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
  const rawId = document.getElementById('menuId').value;
  const id = rawId ? rawId.trim() : null;
  
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
  
  // UPDATE-SPECIFIC VALIDATION
  if (id && (!id || id === 'undefined' || id.length < 10)) {
    showToast('Invalid menu item ID. Please refresh and try editing again.', 'error');
    return;
  }
  
  const submitBtn = document.getElementById('menuSubmitBtn');
  showLoading(submitBtn);
  
  const commonData = {
    name: name,
    price: parseFloat(priceStr),
    category: category,
    description: document.getElementById('menuDescription').value.trim(),
    available: document.getElementById('menuAvailable').checked,
    stock: parseInt(document.getElementById('menuStock')?.value) || 50
  };
  
  const token = localStorage.getItem('token');
  const method = id ? 'PUT' : 'POST';
  const url = id ? `${window.API_BASE}/menu/${id}` : `${window.API_BASE}/menu`;
  
  console.log(`[${method}] ${url.slice(-50)}`, { id, hasImage: !!document.getElementById('menuImage').files[0] }); // Debug
  
  try {
    let res;
    // UNIFIED: Always use FormData for both create/update (allows image on PUT)
    const formData = new FormData();
    Object.keys(commonData).forEach(key => formData.append(key, commonData[key]));
    const imageFile = document.getElementById('menuImage').files[0];
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    res = await fetch(url, {
      method,
      headers: { 
        'Authorization': `Bearer ${token}` 
        // No Content-Type - let browser set multipart/form-data boundary
      },
      body: formData
    });
    
    if (res.ok) {
      showToast(id ? 'Item updated successfully!' : 'Item created successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('menuModal')).hide();
      document.getElementById('menuForm').reset();
      document.getElementById('imagePreview').style.display = 'none';
      await loadAdminMenu(1);
      await loadAdminDashboard(); // Refresh stats
    } else {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.message || errData.error || (await res.text()) || 'Operation failed';
      throw new Error(errMsg);
    }
  } catch (error) {
    console.error('Menu form submit error:', error);
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

// Expose local functions globally for inline handlers
window.loadAdminDashboard = loadAdminDashboard;
window.loadAdminMenu = loadAdminMenu;
window.loadAdminContacts = loadAdminContacts;

// Make DashboardManager available
window.DashboardManager = {
  loadUserStats,
  loadAdminStats,
  renderAdminStats,
  renderPendingOrders,
  renderAdminUsers,
  loadAdminDashboard
};

// ===== USER DASHBOARD FUNCTIONS (from inline HTML) =====
async function loadUserDashboard() {
  try {
    // Show loading
    document.getElementById('statsCards').innerHTML = 
      '<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"></div><p>Loading dashboard...</p></div>';

    // Load stats
    const stats = await loadUserStats();
    if (stats.data) {
      renderStats(stats.data);
    } else {
      renderEmptyStats();
    }

    // Load profile (for both sidebar + main)
    const profile = await loadProfile();
    renderSidebarProfile(profile);
    renderMainProfile(profile);

    // Load orders
    const ordersTableBody = document.getElementById('ordersTableBody');
    if (ordersTableBody) ordersTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';
    const orders = await OrderManager.getUserOrders().catch(err => {
      console.error('Dashboard orders fetch error:', err);
      return { data: [] };
    });
    if (ordersTableBody) renderOrders(orders.data || []);

    // Defensive menu load with global elements & retry
    // Pre-define global menu elements for safety
    window.menuElements = window.menuElements || {
      menuGrid: document.getElementById('menuGrid'),
      menuLoading: document.querySelector('.menu-loading'),
      menuCountDisplay: document.getElementById('menuCountDisplay')
    };
    
    if (typeof window.loadMenu === 'function') {
      try {
        // Retry wrapper
        const loadWithRetry = async (maxRetries = 3) => {
          for (let i = 0; i < maxRetries; i++) {
            try {
              await window.loadMenu();
              return;
            } catch (err) {
              console.warn(`Menu load attempt ${i+1} failed:`, err);
              if (i === maxRetries - 1) throw err;
              await new Promise(r => setTimeout(r, 500 * (i + 1)));
            }
          }
        };
        await loadWithRetry();
      } catch (error) {
        console.error('Final menu load failed:', error);
        // Safe fallback UI
        const grid = document.getElementById('menuGrid');
        if (grid) {
          grid.innerHTML = `
            <div class="col-12 text-center py-5">
              <i class="fas fa-utensils fa-4x text-muted mb-4"></i>
              <h4 class="text-muted">Menu Loading Issue</h4>
              <p class="text-muted mb-4">Tap to retry</p>
              <button class="btn btn-primary" onclick="window.loadMenu()">Reload Menu</button>
            </div>`;
          grid.style.display = 'block';
        }
      }
    } else {
      console.warn('window.loadMenu not available');
    }

  } catch (error) {
    console.error('Dashboard load failed:', error);
    if (typeof showToast === 'function') {
      showToast('Dashboard load failed: ' + error.message, 'error');
    }
    // Safe fallback UIs
    const statsCards = document.getElementById('statsCards');
    if (statsCards) {
      statsCards.innerHTML = 
        '<div class="col-12 text-center py-5 animate__animated animate__pulse"><h5 class="text-danger">⚠️ Unable to load dashboard</h5><p class="text-muted">Please check your connection</p><button class="btn btn-primary mt-2" onclick="loadUserDashboard()">Retry</button></div>';
    }
    const ordersTableBody = document.getElementById('ordersTableBody');
    if (ordersTableBody) {
      ordersTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5">No orders available</td></tr>';
    }
  }
}

// Render main profile card
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

// Render sidebar profile
function renderSidebarProfile(user) {
  const container = document.getElementById('sidebarProfile');
  if (!user || !container) return;

  const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=667eea&color=fff&size=80`;
  container.innerHTML = `
    <div class="p-4 text-center">
      <img src="${avatar}" class="rounded-circle profile-avatar mb-3 mx-auto" alt="${user.name}">
      <h6 class="fw-bold mb-1">${user.name || 'User'}</h6>
      <p class="text-muted small mb-2">${user.email || 'user@example.com'}</p>
      <span class="badge bg-primary">Member</span>
    </div>
  `;
}

// Sidebar navigation
function setActiveNav(section) {
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => link.classList.remove('active'));
  event.target.classList.add('active');
  
  // Scroll to section
  const target = document.getElementById(section) || document.querySelector(`[id*="${section}"]`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
  }
  
  // Close mobile sidebar
  closeSidebar();
}

// Sidebar toggle functions
function toggleSidebar() {
  const sidebar = document.getElementById('userSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const isMobile = window.innerWidth < 992;
  
  if (isMobile) {
    sidebar.classList.toggle('show');
    backdrop.style.display = sidebar.classList.contains('show') ? 'block' : 'none';
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('userSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  sidebar.classList.remove('show');
  backdrop.style.display = 'none';
}

// Responsive resize handler
window.addEventListener('resize', () => {
  const sidebar = document.getElementById('userSidebar');
  const isMobile = window.innerWidth < 992;
  if (!isMobile && sidebar.classList.contains('show')) {
    closeSidebar();
  }
});

// Navbar cart count update
document.addEventListener('cartUpdated', function(e) {
  const badge = document.querySelector('.cart-badge');
  const count = e.detail || 0;
  if (badge) {
    badge.dataset.count = count;
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  }
});

// Empty stats fallback
// REMOVED: No mock/static data - pure API loading states only
// renderEmptyStats replaced with safe defaults in renderStats()


// Pure API dashboard - auto-init removed (handled by HTML inline script)
// All mock data/static fallbacks REMOVED ✅



// ===== SAFE DOM UTILITIES =====
/**
 * Wait for element with timeout/retry
 * @param {string} selector - CSS selector
 * @param {number} timeoutMs - Max wait time
 * @returns {Promise<HTMLElement|null>}
 */
async function waitForElement(selector, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const start = Date.now();
    
    // Primary: RAF polling
    const checkRAF = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() - start > timeoutMs) {
        console.warn(`waitForElement RAF timeout: ${selector}`);
      } else {
        requestAnimationFrame(checkRAF);
      }
    };
    
    // Fallback: MutationObserver on modal container
    const modal = document.getElementById('menuModal');
    if (modal) {
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(modal, { childList: true, subtree: true });
    }
    
    // Also poll body as ultimate fallback
    const checkBodyRAF = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() - start <= timeoutMs) {
        requestAnimationFrame(checkBodyRAF);
      }
    };
    
    checkRAF();
    checkBodyRAF();
    
    // Final timeout
    setTimeout(() => {
      const finalEl = document.querySelector(selector);
      if (!finalEl) console.error(`waitForElement FINAL FAIL: ${selector}`);
      resolve(finalEl);
    }, timeoutMs);
  });
}

/**
 * Safe single element getter with console info
 */
function safeGetElement(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`Element #${id} not found`);
  return el;
}

// Safe helper for dashboard loading states
function safeShowLoading(selector) {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (el) showLoading(el);
  else console.warn('safeShowLoading: Element not found:', selector);
}

function safeHideLoading(selector) {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (el) hideLoading(el);
  else console.warn('safeHideLoading: Element not found:', selector);
}

// ===== PROFILE FUNCTIONS =====
async function loadProfile() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const response = await fetch(`${window.API_BASE}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Profile fetch failed');
    const result = await response.json();
    return result.user || result.data?.user;
  } catch (error) {
    console.error('Profile load error:', error);
    return null;
  }
}

function renderProfileCard(user) {
  const containerId = user.role === 'admin' ? 'adminProfileCard' : 'userProfileCard';
  const container = document.getElementById(containerId);
  if (!container || !user) {
    console.warn('Profile container not found or no user data:', containerId);
    return;
  }
  
  const avatarUrl = user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=007bff&color=fff&size=128&font-size=0.6';
  
  container.innerHTML = `
    <div class="card shadow-lg border-0 rounded-4 mb-4" data-aos="fade-up">
      <div class="card-body text-center p-4">
        <img src="${avatarUrl}" alt="${user.name}" class="rounded-circle mb-3" style="width: 100px; height: 100px; object-fit: cover; border: 4px solid #007bff;">
        <h4 class="card-title fw-bold mb-1">${user.name}</h4>
        <p class="text-muted mb-2">${user.email}</p>
        <span class="badge bg-${user.role === 'admin' ? 'danger' : 'primary'} fs-6 px-3 py-2 mb-3">${user.role?.toUpperCase()}</span>
        <small class="text-muted d-block">ID: ${user.id?.slice(-8) || user._id?.slice(-8) || 'N/A'}</small>
      </div>
    </div>
  `;
}

