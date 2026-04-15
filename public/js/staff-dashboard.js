// Staff Dashboard JS - Limited order management matching backend /api/staff/*
// Separate from admin - staff: pending/preparing orders + limited status updates only

(function() {
    'use strict';
    
    window.StaffDashboardManager = {
        isStaffMode: true,
        currentPage: 1,
        
        // ===== CORE INIT =====
        init() {
            // Safe DOM ready wrapper
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this._safeInit());
            } else {
                this._safeInit();
            }
        },
        
        _safeInit() {
            try {
                this.initSidebar();
                this.loadStaffDashboard();
                console.log('✅ StaffDashboardManager fully initialized');
            } catch (error) {
                console.error('Staff dashboard init error:', error);
            }
        },
        
        // ===== SIDEBAR =====
toggleSidebar() {
            const sidebarWrapper = document.querySelector('.sidebar-wrapper');
            const overlay = document.querySelector('.sidebar-overlay');
            const toggleBtn = document.querySelector('.sidebar-toggle');
            
            sidebarWrapper.classList.toggle('active');
            overlay?.classList.toggle('active');
            toggleBtn?.classList.toggle('active');
            document.body.classList.toggle('sidebar-open');
        },

        initSidebar() {
            const toggleBtn = document.querySelector('.sidebar-toggle');
            const overlay = document.querySelector('.sidebar-overlay');
            const sidebarWrapper = document.querySelector('.sidebar-wrapper');
            
            if (toggleBtn) toggleBtn.onclick = () => this.toggleSidebar();
            if (overlay) overlay.onclick = () => this.toggleSidebar();
            
            // ESC close
            document.onkeydown = (e) => {
                if (e.key === 'Escape' && sidebarWrapper?.classList.contains('active')) {
                    this.toggleSidebar();
                }
            };
            
            // Responsive
            window.addEventListener('resize', () => {
                if (window.innerWidth >= 992) {
                    sidebarWrapper?.classList.remove('active');
                }
            });
            
            console.log('✅ Staff sidebar initialized');
        },

        // ===== PROFILE FUNCTIONS =====
        async loadProfile() {
            const token = localStorage.getItem('token');
            if (!token) {
                this.showToast('Please login to view profile', 'warning');
                return;
            }

            try {
                const response = await fetch(`${window.API_BASE || '/api'}/auth/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        localStorage.removeItem('token');
                        window.location.href = 'staff-login.html';
                        return;
                    }
                    throw new Error('Failed to fetch profile');
                }

                const { user } = await response.json();
                this.currentUser = user;

                // Populate form
                document.getElementById('profileName').value = user.name || '';
                document.getElementById('profileEmail').textContent = user.email || '';
                document.getElementById('profileRole').value = user.role || 'staff';
                document.getElementById('profileAvatar').src = user.avatar || '/asset/default-avatar.png';

                // Update header user display
                const userNameSpan = document.querySelector('.navbar-nav .dropdown-toggle span.d-none.d-md-inline');
                if (userNameSpan) userNameSpan.textContent = user.name || 'Staff';
                const userIcon = document.querySelector('.navbar-nav .dropdown-toggle i');
                if (userIcon && user.avatar) userIcon.classList.replace('fa-user-circle', 'rounded-circle');
                if (user.avatar) {
                    const img = document.createElement('img');
                    img.src = user.avatar;
                    img.className = 'rounded-circle';
                    img.style.cssText = 'width: 32px; height: 32px; object-fit: cover;';
                    userIcon.replaceWith(img);
                }

                console.log('✅ Profile loaded');
            } catch (error) {
                console.error('Profile load error:', error);
                this.showToast('Failed to load profile: ' + error.message, 'danger');
            }
        },

        previewAvatar(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('profileAvatar').src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        },

        showProfileForm() {
            this.toggleSidebar(); // Close sidebar
            document.getElementById('staff-orders').style.display = 'none';
            document.getElementById('staff-stats').style.display = 'none';
            document.getElementById('staff-profile').style.display = 'block';
            if (!this.currentUser) this.loadProfile();
        },

        hideProfileForm() {
            document.getElementById('staff-profile').style.display = 'none';
            document.getElementById('staff-orders').style.display = 'block';
            document.getElementById('staff-stats').style.display = 'block';
        },

        showSection(section) {
            this.toggleSidebar(); // Close sidebar
            if (section === 'orders') {
                document.getElementById('staff-profile').style.display = 'none';
                document.getElementById('staff-orders').style.display = 'block';
                document.getElementById('staff-stats').style.display = 'block';
                this.loadStaffOrders();
            }
        },

        
        // ===== MAIN DASHBOARD LOAD =====
        async loadStaffDashboard() {
            // Simple token check - no StaffAuthManager needed
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('No auth token - stats fallback');
                this.loadStaffStatsFallback();
                return;
            }
            
            await Promise.all([
                this.loadProfile(),
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
                
                const token = localStorage.getItem('token');
                const response = await fetch(`${window.API_BASE || '/api'}/staff/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const statsData = await response.json();
                const stats = statsData.data || {};

                document.getElementById('staffPendingCount').textContent = stats.pendingApproval || 0;
                document.getElementById('staffPreparingCount').textContent = stats.preparing || 0;
                
            } catch (error) {
                console.error('Staff stats error:', error);
                this.loadStaffStatsFallback();
            }
        },
        
        loadStaffStatsFallback() {
            const container = document.getElementById('staffStats');
            if (!container) return;
            container.innerHTML = '<div class="col-12 text-center py-5 text-staff-primary"><i class="fas fa-info-circle fa-2x mb-3"></i><h5>Stats unavailable (check login/backend)</h5></div>';
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
                const searchTerm = document.getElementById('staffOrdersSearch')?.value || '';
                const statusFilter = document.getElementById('staffOrderStatusFilter')?.value || '';
                const params = new URLSearchParams({ 
                  page, 
                  limit: 20, 
                  ...(searchTerm && { search: searchTerm }), 
                  ...(statusFilter && { status: statusFilter }) 
                });
                
                const response = await fetch(`${window.API_BASE || '/api'}/staff/orders?${params}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                if (!response.ok) {
                    if (response.status === 403) {
                        this.showToast('Staff access denied. Redirecting...', 'danger');
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
                this.showToast('Failed to load orders: ' + error.message, 'danger');
            }
        },
        
        renderStaffOrdersTable(orders) {
            const tbody = document.getElementById('staffOrdersTable');
            if (!tbody) return;
            
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
                    this.showToast(`Order #${orderId.slice(-8)} → ${status.replace('_', ' ').toUpperCase()}`, 'success');
                    this.loadStaffOrders(1);
                } else {
                    throw new Error(result.message || 'Update failed');
                }
            } catch (error) {
                console.error('Staff status update error:', error);
                this.showToast(`Update failed: ${error.message}`, 'danger');
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
                const response = await fetch(`${window.API_BASE || '/api'}/staff/orders/${orderId}`, {
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
        async updateProfile(event) {
            event.preventDefault();
            const form = event.target;
            const btn = document.getElementById('updateProfileBtn');
            const spinner = btn.querySelector('.spinner-border');
            const btnText = btn.querySelector('.btn-text');
            
            btn.disabled = true;
            spinner.classList.remove('d-none');
            btnText.style.opacity = '0.5';

            try {
                const formData = new FormData(form);
                const token = localStorage.getItem('token');

                const response = await fetch(`${window.API_BASE || '/api'}/auth/profile`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    this.currentUser = result.user;
                    this.showToast('Profile updated successfully!', 'success');
                    // Refresh display
                    await this.loadProfile();
                } else {
                    throw new Error(result.message || 'Update failed');
                }
            } catch (error) {
                console.error('Profile update error:', error);
                this.showToast('Update failed: ' + error.message, 'danger');
            } finally {
                btn.disabled = false;
                spinner.classList.add('d-none');
                btnText.style.opacity = '1';
            }
        },

        logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            localStorage.removeItem('authMode');
            this.showToast('Logged out successfully');
            setTimeout(() => window.location.href = 'staff-login.html', 1000);
        },
        
        // ===== TOAST UTILITY =====
        showToast(message, type = 'info') {
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
        }
    };
    
        // Form submit handler
        document.getElementById('profileUpdateForm')?.addEventListener('submit', (e) => this.updateProfile(e));

    // AUTO-INIT on script load
    if (window.StaffDashboardManager) {
        window.StaffDashboardManager.init();
    }
    
    console.log('✅ Staff Dashboard Manager loaded - Auto-init enabled');
})();

