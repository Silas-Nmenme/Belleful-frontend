// Real Orders - Backend Integration
let orders = [];

async function fetchOrders() {
    try {
        if (typeof showLoading === 'function') showLoading();
        const response = await apiCall('/orders/myorders');
        orders = response.data || [];
        renderOrders();
        if (typeof hideLoading === 'function') hideLoading();
        if (typeof showToast === 'function') showToast(`Loaded ${orders.length} orders`, 'success');
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        if (typeof showToast === 'function') showToast('Failed to load orders: ' + error.message, 'error');
        orders = [];
        renderOrders();
    }
}

function renderOrders() {
    const container = document.querySelector('.row-cols-1');
    
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="fas fa-box fa-4x text-muted mb-4"></i>
                    <h4 class="text-muted">No orders yet</h4>
                    <p class="text-muted">Your orders will appear here once you place them.</p>
                    <a href="menu.html" class="btn btn-warning">Start Ordering</a>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="col">
            <div class="card h-100 shadow-sm">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">Order #${order._id.slice(-6).toUpperCase()}</h5>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <h6><i class="fas fa-calendar me-2"></i>${new Date(order.createdAt).toLocaleDateString()}</h6>
                        <h6><i class="fas fa-tag me-2"></i>${typeof statusBadge === 'function' ? statusBadge(order.orderStatus || 'ordered') : (order.orderStatus || 'ordered')}</h6>
                    </div>
                    <hr>
                    <h6>Items:</h6>
                    <ul class="list-unstyled">
                        ${order.items.map(item => `<li>${item.menuItem?.name || item.name} x${item.quantity}</li>`).join('')}
                    </ul>
                    <hr>
                    <h5 class="text-warning mb-0">Total: ₦${order.totalAmount?.toLocaleString() || '0'}</h5>
                </div>
                <div class="card-footer text-muted small">
                    ${order.items.length} item(s)
                </div>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', function() {
    // Load shared utils dynamically
    const sharedScript = document.createElement('script');
    sharedScript.src = 'dashboard/js/shared-v2.js';
    sharedScript.onload = initOrders;
    document.head.appendChild(sharedScript);
    
    // Auth shared
    const authScript = document.createElement('script');
    authScript.src = 'js/auth-shared.js';
    authScript.onload = () => {
        if (typeof initOrders === 'function') initOrders();
    };
    document.head.appendChild(authScript);
});

function initOrders() {
    if (!isLoggedIn()) {
        if (typeof showToast === 'function') showToast('Please login to view orders', 'error');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }
    
    const refreshBtn = document.getElementById('refresh-orders');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchOrders);
    }
    
    fetchOrders();
}

