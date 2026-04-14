// Staff Dashboard JS - Limited order management matching backend /api/staff/*
// Separate from admin - staff: pending/preparing orders + limited status updates only

(function() {
    'use strict';
    
    window.StaffDashboardManager = {
        isStaffMode: true,
        currentPage: 1,
        
        // ===== SIDEBAR =====
        initSidebar() {
            const sidebarWrapper = document.querySelector('.sidebar-wrapper');
            const sidebar = document.getElementById('staffSidebar');
            const toggleBtn = document.querySelector('.sidebar-toggle');
            const overlay = document.querySelector('.sidebar-overlay');
            
            if (!sidebarWrapper || !toggleBtn) return console.warn('Staff sidebar not found');
            
            const toggleSidebar = () => {
                const isActive = sidebarWrapper.classList.contains('active');
                sidebarWrapper.classList.toggle('active');
                overlay?.classList.toggle('active');
                toggleBtn.classList.toggle('active');
                console.log('Staff sidebar toggled:', !isActive ? 'OPEN' : 'CLOSED');
            };
            
            toggleBtn.onclick = toggleSidebar;
            overlay?.onclick = () => sidebarWrapper.classList.remove('active');
            document.onkeydown = (e) => {
                if (e.key === 'Escape') sidebarWrapper.classList.remove('active');
            };
            
            console.log('✅ Staff sidebar initialized');
        },
        
        // ===== MAIN DASHBOARD LOAD =====
        async loadStaffDashboard() {
            await Promise.all([
                this.loadStaffStats(),
                this.loadStaffOrders()
            ]);
        },
        
        // ===== STAFF STATS (pending/preparing only) =====
        async loadStaffStats() {
            const container = document.getElementById('staffStats');
            if (!container) return;
            
            try {
                container.innerHTML = `
                    <div class="col-md-6 mb-4">
                        <div class="card staff-stats-card shadow h-100">
                            <div class="card-body">
                                <div class="row align-items-center">
                                    <div class="col">
                                        <div class="text-xs font-weight-bold text-staff-primary text-uppercase mb-1">Pending Orders</div>
                                        <div class="h4 mb-0" id="staffPendingCount">0</div>
                                    </div>
                                    <div class="col-auto"><i class="fas fa-clock fa-2x opacity-75"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 mb-4">
                        <div class="card staff-stats-card shadow h-100">
                            <div class="card-body">
                                <div class="row align-items-center">
                                    <div class="col">
                                        <div class="text-xs font-weight-bold text-staff-primary text-uppercase mb-1">Preparing</div>
                                        <div class="h4 mb-0" id="staffPreparingCount">0</div>
                                    </div>
                                    <div class="col-auto"><i class="fas fa-utensils fa-2x opacity-75"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Fetch real stats from backend
                const token = localStorage.getItem('token');
                const response = await fetch(`${window.API_BASE || '/api'}/staff/orders?page=1&limit=1`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const statsData = await response.json();
                const orders = statsData.data || [];
                
                document.getElementById('staffPendingCount').textContent = orders.filter(o => o.orderStatus === 'pending_approval').length;
                document.getElementById('staffPreparingCount').textContent = orders.filter(o => o.orderStatus === 'preparing').length;
                
            } catch (error) {
                console.error('Staff stats error:', error);
                container.innerHTML = '<div class="col-12 text-center py-5 text-staff-primary"><i class="fas fa-info-circle fa-2x mb-3"></i><h5>Stats loading...</h5></div>';
            }
        },
        
        // ===== STAFF ORDERS TABLE =====
        async loadStaffOrders(page = 1, search = '', status = '') {
            this.currentPage = page;
            const tbody = document.getElementById('staffOrdersTable');
            const countEl = document.getElementById('staffPendingCount');
            if (!tbody) return;
            
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3"><div class="spinner-border text-staff-primary staff-loader" role="status"></div></td></tr>';
            
            try {
                const token = localStorage.getItem('token');
                const params = new URLSearchParams({ page, limit: 20, ...(search && { search }), ...(status && { status }) });
                
                const response = await fetch(`${window.API_BASE || '/api'}/staff/orders?${params}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                    if (response.status === 403) {
                        showStaffToast('Staff access denied. Redirecting...', 'danger');
                        setTimeout(() => window.location.href = 'staff-login.html', 1500);
                        return;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const result = await response.json();
                const orders = result.data || [];
                this.renderStaffOrdersTable(orders);
                if (countEl) countEl.textContent = orders.length;
                
            } catch (error) {
                console.error('Staff orders error:', error);
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-danger"><i class="fas fa-exclamation-triangle fa-2x mb-3"></i>Failed to load orders</td></tr>';
                showStaffToast('Failed to load orders: ' + error.message, 'danger');
            }
        },
        
        renderStaffOrdersTable(orders) {
            const tbody = document.getElementById('staffOrdersTable');
            if (!tbody) return;
            
            // STAFF-ONLY statuses
            const staffStatuses = ['pending_approval', 'preparing', 'ready_for_pickup'];
            const formatStatus = (status) => status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            tbody.innerHTML = orders.map(order => {
                const safeId = order._id?.slice(-8) || '';
                return `
                    <tr>
                        <td>#${safeId}</td>
                        <td>${order.user?.name || 'Customer'}</td>
                        <td>${(order.items || []).map(i => i.menuItem?.name || i.name).slice(0,2).join(', ') || 'Items'}</td>
                        <td>₦${(order.totalAmount || 0).toLocaleString()}</td>
                        <td>
                            <span class="badge staff-badge-${order.orderStatus === 'pending_approval' ? 'pending' : 'preparing'} fs-6">
                                ${formatStatus(order.orderStatus || 'pending')}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-outline-staff-primary btn-sm me-1" onclick="StaffDashboardManager.viewStaffOrder('${order._id}')" title="View order details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <select class="form-select form-select-sm d-inline-block w-auto" style="width: 140px;" onchange="StaffDashboardManager.updateStaffOrderStatus('${order._id}', this.value)" title="Update status (staff permissions only)">
                                ${staffStatuses.map(s => 
                                    `<option value="${s}" ${order.orderStatus === s ? 'selected' : ''}>${formatStatus(s)}</option>`
                                ).join('')}
                            </select>
                        </td>
                    </tr>
                `;
            }).join('') || '<tr><td colspan="6" class="text-center py-5 text-muted"><i class="fas fa-inbox fa-3x mb-3 opacity-50"></i><div class="h6">No pending orders</div></td></tr>';
        },
        
        // ===== STAFF ORDER STATUS UPDATE =====
        async updateStaffOrderStatus(orderId, status) {
            const dropdown = document.querySelector(`select[onchange*="${orderId}"]`);
            if (dropdown) {
                dropdown.disabled = true;
                dropdown.innerHTML = '<option>Updating...</option>';
            }
            
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${window.API_BASE || '/api'}/staff/orders/${orderId}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showStaffToast(`Order #${orderId.slice(-8)} → ${status.replace('_', ' ').toUpperCase()}`, 'success');
                    this.loadStaffOrders(1);
                } else {
                    throw new Error(result.message || 'Update failed');
                }
            } catch (error) {
                console.error('Staff status update error:', error);
                showStaffToast(`Update failed: ${error.message}`, 'danger');
                if (dropdown) dropdown.disabled = false;
            }
        },
        
        // ===== VIEW ORDER DETAILS =====
        async viewStaffOrder(orderId) {
            const modalEl = document.getElementById('staffOrderModal');
            const modalBody = document.getElementById('staffOrderModalBody');
            
            modalBody.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-staff-primary" role="status"></div><p>Loading...</p></div>';
            
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${window.API_BASE || '/api'}/orders/${orderId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const result = await response.json();
                const order = result.data || result;
                
                modalBody.innerHTML = `
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h5><i class="fas fa-hashtag me-2 text-staff-primary"></i>Order #${order._id?.slice(-8)}</h5>
                            <span class="badge staff-status-${order.orderStatus}">${order.orderStatus?.replace('_', ' ')}</span>
                            <p><strong>Total:</strong> ₦${(order.totalAmount || 0).toLocaleString()}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Customer:</strong> ${order.user?.name || order.userName || 'N/A'}</p>
                            <p><strong>Phone:</strong> ${order.phoneNumber || 'N/A'}</p>
                        </div>
                    </div>
                    <h6 class="mb-3"><i class="fas fa-utensils me-2"></i>Items:</h6>
                    <div class="row g-3 mb-4">
                        ${order.items?.map(item => `
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-body">
                                        <div class="d-flex">
                                            <img src="${item.menuItem?.image || '/asset/food-particles.svg'}" class="rounded me-3" style="width:60px;height:60px;object-fit:cover">
                                            <div>
                                                <h6>${item.name || item.menuItem?.name}</h6>
                                                <p><strong>${item.quantity}x</strong> @ ₦${(item.price || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('') || '<p class="text-muted col-12">No items</p>'}
                    </div>
                `;
                
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
                
            } catch (error) {
                console.error('View order error:', error);
                modalBody.innerHTML = `<div class="alert alert-danger">Failed to load: ${error.message}</div>`;
            }
        },
        
        // ===== LOGOUT =====
        logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            localStorage.removeItem('authMode');
            showStaffToast('Logged out successfully');
            setTimeout(() => window.location.href = 'staff-login.html', 1000);
        }
    };
    
    // Staff toast utility
    window.showStaffToast = function(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `position-fixed top-4 end-4 p-3 z-1055`;
        toast.style.cssText = `top: 100px; right: 20px; z-index: 9999; max-width: 400px;`;
        toast.innerHTML = `
            <div class="alert alert-${type === 'success' ? 'success' : type === 'danger' ? 'danger' : 'info'} border-0 alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            const alert = toast.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
                toast.remove();
            }
        }, 5000);
    };
    
    console.log('✅ Staff Dashboard Manager loaded - Backend staff features ready');
})();

