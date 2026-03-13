// Belleful Admin Dashboard Logic
let allOrders = [];
let filteredOrders = [];
let unreadNotifs = 0;
let socket = null;

// DOM Elements
const dashboardContent = document.getElementById('dashboardContent');
const notificationBell = document.getElementById('notificationBell');
const notifBadge = document.getElementById('notifBadge');
const logoutBtn = document.getElementById('logoutBtn');
const ordersTable = document.getElementById('ordersTable');
const statusFilter = document.getElementById('statusFilter');
const totalOrdersEl = document.getElementById('totalOrders');
const pendingOrdersEl = document.getElementById('pendingOrders');
const preparingOrdersEl = document.getElementById('preparingOrders');
const deliveredOrdersEl = document.getElementById('deliveredOrders');
const addMenuForm = document.getElementById('addMenuForm');
const receiptModal = document.getElementById('receiptModal');
const receiptImg = document.getElementById('receiptImg');
const closeReceiptModal = document.getElementById('closeReceiptModal');

// Init
document.addEventListener('DOMContentLoaded', initAdminDashboard);

async function initAdminDashboard() {
  const user = getUserInfo();
  
  if (!user || user.role !== 'admin') {
    showToast('Admin access required', 'error');
    setTimeout(() => window.location.href = '/user-dashboard.html', 2000);
    return;
  }

  logoutBtn.onclick = logout;
  notificationBell.onclick = toggleNotifications;
  closeReceiptModal.onclick = () => receiptModal.style.display = 'none';
  
  statusFilter.onchange = filterOrders;
  addMenuForm.onsubmit = addMenuItem;

  dashboardContent.style.display = 'block';
  connectSocket();
  
  await loadOrders();
  updateStats();
}

async function loadOrders() {
  try {
    const { data } = await apiCall('/orders');
    allOrders = data;
    filteredOrders = [...allOrders];
    renderOrders();
  } catch (error) {
    showToast('Failed to load orders', 'error');
  }
}

function renderOrders() {
  ordersTable.innerHTML = `
    <table class="orders-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Customer</th>
          <th>Items</th>
          <th>Total</th>
          <th>Payment</th>
          <th>Status</th>
          <th>Receipt</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${filteredOrders.map(order => `
          <tr>
            <td><strong>#${order._id.slice(-6)}</strong></td>
            <td>${order.user?.name || 'N/A'}</td>
            <td>${order.items.length} items</td>
            <td>₦${order.totalAmount}</td>
            <td>
              <span class="badge ${order.paymentStatus === 'paid' ? 'bg-success' : 'bg-warning'}">
                ${order.paymentStatus}
              </span>
            </td>
            <td>${statusBadge(order.orderStatus)} ${statusProgress(order.orderStatus)}</td>
            <td>
              ${order.receiptImage ? 
                `<button class="btn btn-sm btn-outline-primary" onclick="showReceipt('${order.receiptImage}')">View</button>` : 
                'None'
              }
            </td>
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-success btn-sm" onclick="updateStatus('${order._id}', 'vendor_approved')">Approve</button>
                <button class="btn btn-outline-warning btn-sm" onclick="updateStatus('${order._id}', 'preparing')">Prep</button>
                <button class="btn btn-outline-info btn-sm" onclick="updateStatus('${order._id}', 'ready')">Ready</button>
                <button class="btn btn-outline-primary btn-sm" onclick="updateStatus('${order._id}', 'off_for_delivery')">Dispatch</button>
                <button class="btn btn-success btn-sm" onclick="updateStatus('${order._id}', 'delivered')">Delivered</button>
                <button class="btn btn-outline-danger btn-sm" onclick="updateStatus('${order._id}', 'cancelled')">Cancel</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function filterOrders() {
  const filter = statusFilter.value.toLowerCase();
  filteredOrders = filter 
    ? allOrders.filter(order => order.orderStatus.includes(filter))
    : allOrders;
  renderOrders();
}

async function updateStatus(orderId, newStatus) {
  if (!confirm(`Set order #${orderId.slice(-6)} to ${newStatus.replace('_', ' ')}?`)) return;
  
  try {
    await apiCall(`/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ orderStatus: newStatus })
    });
    showToast(`Status updated to ${newStatus.replace('_', ' ')}`, 'success');
    await loadOrders(); // Refresh
    updateStats();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function showReceipt(url) {
  receiptImg.src = url;
  receiptModal.style.display = 'flex';
}

async function addMenuItem(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);

  try {
    await apiCall('/menu', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    showToast('Menu item added!', 'success');
    addMenuForm.reset();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function updateStats() {
  totalOrdersEl.textContent = allOrders.length;
  pendingOrdersEl.textContent = allOrders.filter(o => o.orderStatus === 'pending_approval').length;
  preparingOrdersEl.textContent = allOrders.filter(o => o.orderStatus === 'preparing').length;
  deliveredOrdersEl.textContent = allOrders.filter(o => o.orderStatus === 'delivered').length;
}

function toggleNotifications() {
  unreadNotifs = 0;
  notifBadge.style.display = 'none';
  showToast('Notifications cleared', 'info');
}

// Socket listeners
function connectSocketListeners() {
  socket = connectSocket();
  if (!socket) return;

  socket.on('new-order', (order) => {
    unreadNotifs++;
    notifBadge.textContent = unreadNotifs;
    notifBadge.style.display = 'inline';
    showToast(`New order #${order._id.slice(-6)}`, 'success');
    loadOrders();
  });

  socket.on('admin-order-update', (data) => {
    showToast(`Order #${data.orderId.slice(-6)} updated`, 'info');
    loadOrders();
  });
}

// Init socket
connectSocketListeners();
