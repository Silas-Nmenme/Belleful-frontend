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
/* OLD sidebar toggle functions REMOVED - using inline HTML functions like user-dashboard */

        initSidebar() {
            // Enhanced responsive handling for new sidebar system (inline functions handle toggle)
            window.addEventListener('resize', () => {
                if (window.innerWidth >= 992) {
                    window.closeSidebar?.();
                }
            });
            
            // ESC key support (uses global closeSidebar)
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    window.closeSidebar?.();
                }
            });
            
            console.log('✅ Staff sidebar (new inline system) initialized');
        },

        updateSidebarAvatar(src) {
            const previewImg = document.getElementById('staffSidebarAvatarPreview');
            const placeholder = document.getElementById('staffSidebarAvatarPlaceholder');
            if (!previewImg || !placeholder) return;
            
            if (src && src !== '') {
                previewImg.src = src;
                previewImg.style.display = 'block';
                placeholder.style.display = 'none';
            } else {
                previewImg.style.display = 'none';
                placeholder.style.display = 'flex';
            }
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

                // Populate modal form
                document.getElementById('staffNameInput').value = user.name || '';
                document.getElementById('staffProfileEmail').textContent = user.email || '';
                document.getElementById('staffCurrentAvatar').value = user.avatar || '';
                const previewImg = document.getElementById('staffAvatarPreview');
                const placeholder = document.getElementById('staffAvatarPlaceholder');
                if (user.avatar) {
                    previewImg.src = user.avatar;
                    previewImg.style.display = 'block';
                    placeholder.style.display = 'none';
                } else {
                    previewImg.style.display = 'none';
                    placeholder.style.display = 'flex';
                }

                // Update sidebar avatar
                this.updateSidebarAvatar(user.avatar);

                console.log('✅ Profile loaded in modal + sidebar');
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
                    const preview = document.getElementById('staffAvatarPreview');
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                    document.getElementById('staffAvatarPlaceholder').style.display = 'none';
                    
                    // Update sidebar preview live
                    this.updateSidebarAvatar(e.target.result);
                };
                reader.readAsDataURL(file);
            }
        },


        showProfileModal() {            
            window.toggleSidebar?.(); // Close sidebar
            const modalEl = document.getElementById('staffProfileModal');
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
            if (!this.currentUser) this.loadProfile();
        },

        hideProfileModal() {
            const modalEl = document.getElementById('staffProfileModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        },



        showSection(section) {            
            window.toggleSidebar?.(); // Close sidebar
            // Hide all sections first
            document.querySelectorAll('section[id^=staff-]').forEach(s => s.style.display = 'none');
            document.getElementById('staff-stats') && (document.getElementById('staff-stats').style.display = 'block');
            
            if (section === 'orders') {
                document.getElementById('staff-orders').style.display = 'block';
                this.loadStaffOrders();
            } else if (section === 'staff-receipts') {
                document.getElementById('staff-receipts').style.display = 'block';
                this.loadStaffReceipts();
            }
        },

        // ===== STAFF RECEIPTS =====
        async loadStaffReceipts(page = 1, hasReceipt = false) {
            const tbody = document.getElementById('staffReceiptsTable');
            const countEl = document.getElementById('staffReceiptCount');
            if (!tbody) return;

            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3"><div class="spinner-border text-warning" role="status"></div></td></tr>';

            try {
                const token = localStorage.getItem('token');
                const searchTerm = document.getElementById('staffReceiptSearch')?.value || '';
                const statusFilter = document.getElementById('staffReceiptStatusFilter')?.value || '';
                const params = new URLSearchParams({ 
                    page, 
                    limit: 20, 
                    ...(searchTerm && { search: searchTerm }),
                    ...(statusFilter && { status: statusFilter }),
                    ...(hasReceipt !== false && { hasReceipt: 'true' })
                });

                const response = await fetch(`${window.API_BASE || '/api'}/staff/orders?${params}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const result = await response.json();
                const orders = (result.data || []).filter(order => order.receiptImage); // Only with receipts
                this.renderStaffReceiptsTable(orders);
                if (countEl) countEl.textContent = orders.length;

            } catch (error) {
                console.error('Staff receipts error:', error);
                tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-danger"><i class="fas fa-exclamation-triangle fa-2x mb-3"></i>Failed to load receipts</td></tr>';
                this.showToast('Failed to load receipts: ' + error.message, 'danger');
            }
        },

        renderStaffReceiptsTable(orders) {
            const tbody = document.getElementById('staffReceiptsTable');
            if (!tbody) return;

            const formatStatus = (status) => status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

            tbody.innerHTML = orders.map(order => {
                const safeId = order._id?.slice(-8) || '';
                return `
                    <tr>
                        <td>#${safeId}</td>
                        <td>${order.user?.name || 'Customer'}</td>
                        <td>₦${(order.totalAmount || 0).toLocaleString()}</td>
                        <td><span class="badge bg-${order.orderStatus === 'pending_approval' ? 'warning' : 'info'}">${formatStatus(order.orderStatus)}</span></td>
                        <td>
                            <button class="btn btn-sm btn-success" onclick="StaffDashboardManager.showReceiptPreview('${order.receiptImage}')" title="View Receipt" aria-label="View payment receipt">
                                <i class="fas fa-eye"></i> View
                            </button>
                        </td>
                        <td>${formatDate(order.createdAt)}</td>
                        <td>
                            <button class="btn btn-outline-primary btn-sm" onclick="StaffDashboardManager.viewStaffOrder('${order._id}')" title="Order Details">
                                <i class="fas fa-file-invoice"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('') || '<tr><td colspan="7" class="text-center py-5 text-muted"><i class="fas fa-receipt-slash fa-3x mb-3 opacity-50"></i><div class="h6">No receipts match your filter</div></td></tr>';
        },

        showReceiptPreview(url) {
            if (!url) {
                this.showToast('No receipt available', 'warning');
                return;
            }

            // Create modal if not exists
            let modalEl = document.getElementById('staffReceiptModal');
            if (!modalEl) {
                modalEl = document.createElement('div');
                modalEl.id = 'staffReceiptModal';
                modalEl.className = 'modal fade';
                modalEl.innerHTML = `
                    <div class="modal-dialog modal-xl modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header bg-success text-white">
                                <h5 class="modal-title">
                                    <i class="fas fa-receipt me-2"></i>Payment Receipt Preview
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body p-4 text-center">
                                <img src="${url}" alt="Payment Receipt" class="img-fluid rounded shadow staff-receipt-preview" style="max-height: 70vh; max-width: 100%; object-fit: contain;" onerror="this.style.display='none'; this.parentNode.innerHTML='<p class=\\'text-muted\\'>Receipt image failed to load</p>';">
                            </div>
                            <div class="modal-footer">
                                <a href="${url}" target="_blank" class="btn btn-outline-success">
                                    <i class="fas fa-external-link-alt me-1"></i>Open Full Size
                                </a>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modalEl);
            } else {
                // Update image src
                const img = modalEl.querySelector('img');
                if (img) img.src = url;
            }

            const modal = new bootstrap.Modal(modalEl);
            modal.show();
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
                                        <div class="text-xs font-weight-bold text-staff-primary text-uppercase mb-1">Total Orders</div>
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
            
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3"><div class="spinner-border text-staff-primary staff-loader" role="status"></div></td></tr>';
            
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
                tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-danger"><i class="fas fa-exclamation-triangle fa-2x mb-3"></i>Failed to load orders</td></tr>';
                this.showToast('Failed to load orders: ' + error.message, 'danger');
            }
        },
        
        getAllowedStatuses(currentStatus) {
            const transitions = {
                'pending_approval': ['preparing'],
                'preparing': ['ready_for_pickup'],
                'ready_for_pickup': ['delivered'],
                'delivered': ['preparing', 'cancelled']
            };
            return transitions[currentStatus] || [];
        },

        renderStaffOrdersTable(orders) {
            const tbody = document.getElementById('staffOrdersTable');
            if (!tbody) return;
            
            const allStatuses = ['pending_approval', 'preparing', 'ready_for_pickup', 'delivered', 'cancelled'];
            const formatStatus = (status) => status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            tbody.innerHTML = orders.map(order => {
                const safeId = order._id?.slice(-8) || '';
                const hasReceipt = order.receiptImage;
                const currentStatus = order.orderStatus || 'pending_approval';
                const allowedNext = this.getAllowedStatuses(currentStatus);
                const dropdownOptions = [currentStatus, ...allowedNext].map(s => 
                    `<option value="${s}" ${currentStatus === s ? 'selected' : ''}>${formatStatus(s)}</option>`
                ).join('');
                const isDisabled = allowedNext.length === 0;
                
                return `
                    <tr>
                        <td>#${safeId}</td>
                        <td>${order.user?.name || 'Customer'}</td>
                        <td>${(order.items || []).map(i => i.menuItem?.name || i.name).slice(0,2).join(', ') || 'Items'}</td>
                        <td>₦${(order.totalAmount || 0).toLocaleString()}</td>
                        <td>${hasReceipt ? 
                            `<button class="btn btn-sm btn-success" onclick="StaffDashboardManager.showReceiptPreview('${order.receiptImage}')" title="View Receipt" aria-label="View payment receipt">
                                <i class="fas fa-eye"></i>
                            </button>` : 
                            '<span class="text-muted small"><i class="fas fa-receipt-slash"></i> None</span>'
                        }</td>
                        <td>
                            <span class="badge staff-badge-${currentStatus === 'pending_approval' ? 'pending' : currentStatus === 'preparing' ? 'preparing' : currentStatus === 'ready_for_pickup' ? 'ready' : 'delivered'} fs-6">
                                ${formatStatus(currentStatus)}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-outline-staff-primary btn-sm me-1" onclick="StaffDashboardManager.viewStaffOrder('${order._id}')" title="View order details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <select class="form-select form-select-sm d-inline-block w-auto" style="width: 140px;" 
                                    ${isDisabled ? 'disabled' : `onchange="StaffDashboardManager.updateStaffOrderStatus('${order._id}', this.value)"`} 
                                    title="${isDisabled ? 'No status changes available' : 'Update status (staff permissions)'}">
                                ${isDisabled ? '<option>Complete</option>' : dropdownOptions}
                            </select>
                        </td>
                    </tr>
                `;
            }).join('') || '<tr><td colspan="7" class="text-center py-5 text-muted"><i class="fas fa-inbox fa-3x mb-3 opacity-50"></i><div class="h6">No pending orders</div></td></tr>';
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
                
                let receiptSection = '';
                if (order.receiptImage) {
                    receiptSection = `
                        <div class="mb-4" id="orderReceiptSection">
                            <h6 class="mb-3"><i class="fas fa-receipt text-success me-2"></i>Payment Receipt</h6>
                            <div class="text-center p-4 border rounded shadow-sm bg-light">
                                <img src="${order.receiptImage}" alt="Payment Receipt" class="img-fluid rounded shadow" style="max-height: 400px; max-width: 100%; object-fit: contain;" onerror="this.style.display='none'; document.getElementById('orderReceiptSection').innerHTML='<p class=\\"text-muted\\">Receipt image not available</p>';">
                            </div>
                            <div class="text-center mt-2">
                                <button class="btn btn-outline-success btn-sm" onclick="StaffDashboardManager.showReceiptPreview('${order.receiptImage}')">
                                    <i class="fas fa-expand me-1"></i>Full Preview
                                </button>
                                <a href="${order.receiptImage}" target="_blank" class="btn btn-success btn-sm ms-1">
                                    <i class="fas fa-external-link-alt"></i>
                                </a>
                            </div>
                        </div>
                    `;
                }
                
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
                    ${receiptSection}
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
            const submitBtn = form.querySelector('button[type="submit"]');
            const spinner = submitBtn?.querySelector('.spinner-border') || submitBtn;
            const btnText = submitBtn?.querySelector('.btn-text');
            
            if (submitBtn) {
                submitBtn.disabled = true;
                if (spinner.classList && !spinner.classList.contains('spinner-border')) {
                    spinner.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Saving...';
                } else {
                    spinner.classList?.remove('d-none');
                }
                if (btnText) btnText.style.opacity = '0.5';
            }

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
                    // Close modal if open
                    const modal = bootstrap.Modal.getInstance(document.getElementById('staffProfileModal'));
                    if (modal) modal.hide();
                } else {
                    throw new Error(result.message || 'Update failed');
                }
            } catch (error) {
                console.error('Profile update error:', error);
                this.showToast('Update failed: ' + error.message, 'danger');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    if (btnText) btnText.style.opacity = '1';
                    const spinners = submitBtn.querySelectorAll('.spinner-border');
                    spinners.forEach(s => s.classList.add('d-none'));
                    if (submitBtn.textContent.includes('Saving...')) {
                        submitBtn.innerHTML = '<i class="fas fa-save me-1"></i>Save Changes';
                    }
                }
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
    
        // Form submit handlers for both old inline (if exists) and new modal
        document.getElementById('profileUpdateForm')?.addEventListener('submit', (e) => StaffDashboardManager.updateProfile(e));
        document.getElementById('staffProfileForm')?.addEventListener('submit', (e) => StaffDashboardManager.updateProfile(e));

    // AUTO-INIT on script load
    if (window.StaffDashboardManager) {
        window.StaffDashboardManager.init();
    }
    
    console.log('✅ Staff Dashboard Manager loaded - Auto-init enabled');
})();

