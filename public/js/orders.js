// Orders functionality
let orders = [];

function renderOrders() {
    const container = document.querySelector('.row-cols-1');
    
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
                    <h5 class="mb-0">Order #${order.id.toString().slice(-6)}</h5>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <h6><i class="fas fa-calendar me-2"></i>${order.date}</h6>
                        <h6><i class="fas fa-tag me-2 text-warning"></i>${order.status}</h6>
                    </div>
                    <hr>
                    <h6>Items:</h6>
                    <ul class="list-unstyled">
                        ${order.items.map(item => `<li>${item.name} x${item.quantity}</li>`).join('')}
                    </ul>
                    <hr>
                    <h5 class="text-warning mb-0">Total: ₦${order.total.toLocaleString()}</h5>
                </div>
                <div class="card-footer text-muted small">
                    ${order.items.length} item(s)
                </div>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', function() {
    orders = JSON.parse(localStorage.getItem('orders')) || [];
    renderOrders();
});

