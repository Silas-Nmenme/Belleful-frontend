AOS.init();

let currentOrder = null;

async function initCheckout() {
    // Use auth-helpers requireAuth (more reliable)
    const user = await window.requireAuth('cart.html', 'Please add items to cart first');
    if (!user) return;
    
    await loadCheckoutData();
}

async function loadCheckoutData() {
    const token = localStorage.getItem('token');
    let cart = null;
    
    try {
        // Primary: Backend API (authenticated)
        const cartRes = await fetch(`${window.API_BASE}/cart`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        
        if (cartRes.ok) {
            const apiData = await cartRes.json();
            cart = apiData.data || apiData;
        }
    } catch (apiError) {
        console.warn('API cart fetch failed, using local snapshot:', apiError);
    }
    
    // Fallback: Cart snapshot from cart.html proceed button
    if (!cart || !cart.items?.length) {
        try {
            const snapshot = localStorage.getItem('checkoutCartSnapshot');
            if (snapshot) {
                cart = JSON.parse(snapshot);
                console.log('Using cart snapshot:', cart.items.length, 'items');
            }
        } catch (snapshotError) {
            console.error('Snapshot parse failed:', snapshotError);
        }
    }
    
    if (!cart?.items?.length) {
        showToast('Cart is empty. Add items from menu first.', 'warning');
        setTimeout(() => window.location.href = 'cart.html', 1500);
        return;
    }
    
    // Sync CartManager for consistent calculations
    if (window.CartManager) {
        window.CartManager.cart = { ...window.CartManager.cart, ...cart, items: cart.items };
        window.CartManager.isDelivery = localStorage.getItem('deliveryPreference') !== 'pickup';
    }
    
    renderCheckoutItems(cart.items);
    
    // Calculate consistent totals using CartManager logic
    const totals = window.CartManager ? window.CartManager.getTotals() : {
        subtotal: cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        delivery: cart.deliveryPreference === 'delivery' ? 2000 : 0,
        service: 500,
        vat: 0.015,
        grandTotal: 0 // fallback calc
    };
    const grandTotal = totals.grandTotal || Math.round(totals.subtotal + totals.delivery + totals.service + totals.subtotal * 0.015);
    
    document.getElementById('checkoutTotal').textContent = `₦${grandTotal.toLocaleString()}`;
    document.getElementById('paymentAmount').textContent = `₦${grandTotal.toLocaleString()}`;
    
    // Set delivery radio
    const deliveryPref = localStorage.getItem('deliveryPreference') || 'delivery';
    document.getElementById(deliveryPref).checked = true;
    
    // Event listeners
    document.querySelectorAll('input[name="deliveryMethod"]').forEach(radio => {
        radio.addEventListener('change', toggleDeliveryAddress);
    });
    toggleDeliveryAddress();
    
    showToast(`${cart.items.length} items • ₦${grandTotal.toLocaleString()}`, 'success');
}

function toggleDeliveryAddress() {
    const deliverySelected = document.getElementById('delivery').checked;
    const addressGroup = document.getElementById('deliveryAddressGroup');
    if (addressGroup) {
        addressGroup.style.display = deliverySelected ? 'block' : 'none';
        document.getElementById('deliveryAddress').required = deliverySelected;
    }
    
    // Sync with localStorage for cart consistency
    const preference = deliverySelected ? 'delivery' : 'pickup';
    localStorage.setItem('deliveryPreference', preference);
}

function renderCheckoutItems(items) {
    document.getElementById('checkoutItems').innerHTML = items.map(item => `
        <div class="d-flex justify-content-between align-items-center py-3 border-bottom">
            <div>
                <h6 class="fw-bold">${item.menuItem?.name || item.name}</h6>
                <small class="text-muted">${item.quantity} × ₦${(item.price || 0).toLocaleString()}</small>
            </div>
            <div class="text-end">
                <div class="h6 fw-bold">₦${((item.price || 0) * item.quantity).toLocaleString()}</div>
            </div>
        </div>
    `).join('');
}

document.getElementById('createOrderBtn').onclick = async () => {
    const form = document.getElementById('checkoutForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Frontend fields → backend expects these exact names
    const phoneNumber = data.phoneNumber?.trim();
    const bankAccount = data.bankAccount?.trim();
    const bankName = data.bankName?.trim();
    const deliveryAddress = data.deliveryAddress?.trim();
    
    const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked')?.value || 'pickup';
    
    // Strict frontend validation matching backend controller
    if (!phoneNumber) {
        showToast('Phone number is required', 'error');
        return;
    }
    if (!bankAccount || !bankName) {
        showToast('Your bank account number and bank name are required', 'error');
        return;
    }
    if (deliveryMethod === 'delivery' && !deliveryAddress) {
        showToast('Delivery address is required for delivery orders', 'error');
        return;
    }
    
    let snapshot = null;
    try {
        const snapshotStr = localStorage.getItem('checkoutCartSnapshot');
        if (snapshotStr) {
            snapshot = JSON.parse(snapshotStr);
            // VALIDATE snapshot before send - prevent backend 400s
            if (snapshot?.items?.length) {
                for (let item of snapshot.items) {
                    if (!item.menuItem || !item.name || !item.quantity || item.quantity < 1 || !item.price || item.price <= 0) {
                        showToast(`Invalid cart item: ${item.name || 'Unknown'}`, 'error');
                        return;
                    }
                    // Ensure menuItem is string ID for backend (double-check)
                    const menuItemId = String(item.menuItem?._id || item.menuItem || item.menuItemId || '');
                    if (!menuItemId || menuItemId === '[object Object]') {
                        showToast(`Invalid menuItem ID for ${item.name || 'item'}: ${menuItemId}`, 'error');
                        return;
                    }
                    item.menuItem = menuItemId;
                }
            } else {
                showToast('Invalid cart snapshot - go back to cart', 'error');
                setTimeout(() => window.location.href = 'cart.html', 1500);
                return;
            }
        }
    } catch (e) {
        console.warn('Invalid cart snapshot:', e);
        showToast('Cart data corrupted - returning to cart', 'error');
        setTimeout(() => window.location.href = 'cart.html', 1500);
        return;
    }

    const payload = {
        phoneNumber,
        bankAccount,
        bankName,
        cartSnapshot: snapshot,
        deliveryMethod,  // Pass explicitly
        grandTotal: window.CartManager ? window.CartManager.getTotals().grandTotal : 0
    };

    if (deliveryMethod === 'delivery') {
        payload.deliveryAddress = deliveryAddress;
    }
    
    console.log('Sending checkout payload:', payload);
    
    const token = localStorage.getItem('token');
    const btn = document.getElementById('createOrderBtn');
    
    try {
        btn.dataset.originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating order...';
        
        const res = await fetch(`${window.API_BASE}/orders/checkout`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            let errorData = {};
            try {
                errorData = await res.json();
            } catch {}
            const errorMsg = errorData.message || errorData.error || `Server error (${res.status})`;
            throw new Error(errorMsg);
        }
        
        const result = await res.json();
        
        // SAFER ORDER ID HANDLING - fix _id.slice error
        if (!result.data || !result.data._id) {
            console.error('Invalid order response:', result);
            throw new Error('Invalid order created - missing ID');
        }
        
        currentOrder = result;
        // Prefer backend displayId virtual, fallback safe slice
        const orderIdStr = result.data.displayId || String(result.data._id).slice(-6).toUpperCase() || 'ORDER123';
        document.getElementById('uploadOrderId').textContent = orderIdStr;
        document.getElementById('uploadSection').classList.remove('hidden');
        document.getElementById('checkoutForm').classList.add('hidden');
        btn.style.display = 'none';
        
        showToast(`Order created! #${orderIdStr}`, 'success');
        
        // Clear local cart snapshots
        localStorage.removeItem('checkoutCartSnapshot');
        
    } catch (error) {
        console.error('Order creation failed:', error);
        showToast(error.message || 'Failed to create order', 'error');
    } finally {
        // Always reset button
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalText || '<i class="fas fa-shopping-cart me-2"></i>Create Pending Order';
    }
};

document.getElementById('paymentUploadForm').onsubmit = async (e) => {
    e.preventDefault();
    const file = document.getElementById('receiptFile').files[0];
    if (!file) {
        showToast('Please select a receipt image', 'error');
        return;
    }
    
    const token = localStorage.getItem('token');
    try {
        // Step 1: Get Cloudinary upload URL
        const urlRes = await fetch(`${window.API_BASE}/payments/receipt-upload-url?folder=order-receipts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!urlRes.ok) {
            const urlErr = await urlRes.json();
            throw new Error(urlErr.error || urlErr.message || 'Failed to get upload URL');
        }
        const uploadData = await urlRes.json();
        const { url: uploadUrl } = uploadData;
        if (!uploadUrl || uploadUrl.includes('undefined')) {
            throw new Error('Invalid upload URL from server - check Cloudinary config');
        }
        console.log('Upload URL ready:', uploadUrl.substring(0, 80) + '...');
        
        // Step 2: Upload to Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        // REQUIRED: Always use server-provided preset (fallback removed)
        if (!uploadData.fields?.upload_preset) {
            throw new Error('Server missing upload_preset - contact admin');
        }
        formData.append('upload_preset', uploadData.fields.upload_preset);
        console.log('Using preset:', uploadData.fields.upload_preset);
        
        const cloudRes = await fetch(uploadUrl, {
            method: 'POST',
            body: formData
        });
        
        if (!cloudRes.ok) throw new Error('Cloudinary upload failed');
        
        const cloudResult = await cloudRes.json();
        const receiptUrl = cloudResult.secure_url;
        
        // Step 3: Submit receipt URL to backend
        const submitRes = await fetch(`${window.API_BASE}/payments/receipt`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ receiptUrl })
        });
        

        if (!submitRes.ok) {
            const error = await submitRes.json();
            throw new Error(error.message || 'Receipt submission failed');
        }
        
        // Start live status polling - fix undefined
        const orderId = currentOrder?.data?._id;
        if (!orderId) {
            console.error('No order ID for polling');
            showToast('Receipt submitted! Check dashboard for status.', 'success');
            return;
        }
        currentOrderId = orderId;
        showToast('Receipt submitted! Tracking approval status...', 'success');
        startStatusPolling(currentOrderId);

    } catch (error) {
        showToast('Upload failed: ' + error.message, 'error');
    }
};

initCheckout();


let pollInterval;
let currentOrderId = null;

function startStatusPolling(orderId) {
  currentOrderId = orderId;
  const token = localStorage.getItem('token');
  
  // Show status container
  const statusContainer = document.getElementById('statusContainer') || createStatusContainer();
  
  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`${window.API_BASE}/orders/my-orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const order = data.data.find(o => o._id === orderId);
      
      if (order) {
        updateStatusDisplay(order);
        if (['vendor_approved', 'preparing', 'delivered', 'cancelled'].includes(order.orderStatus)) {
          stopPolling();
          if (order.orderStatus === 'cancelled') {
            showToast('Order cancelled by admin.', 'error');
          } else {
            showToast(`Order ${order.orderStatus.replace('_', ' ')}!`, 'success');
            setTimeout(() => window.location.href = 'user-dashboard.html', 3000);
          }
        }
      }
    } catch (e) {
      console.error('Polling error:', e);
    }
  }, 10000); // Poll every 10s
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function createStatusContainer() {
  const container = document.createElement('div');
  container.id = 'statusContainer';
  container.className = 'status-live mt-4 p-4 border rounded-3 bg-light shadow-sm';
  container.innerHTML = `
    <h5 class="text-primary mb-3"><i class="fas fa-sync-alt fa-spin me-2"></i>Live Status</h5>
    <div id="statusProgress" class="progress mb-3" style="height: 25px;">
      <div class="progress-bar" role="progressbar"></div>
    </div>
    <div id="statusText" class="h6 fw-bold text-center"></div>
    <small class="text-muted text-center d-block mt-2">Refreshing every 10 seconds...</small>
  `;
  document.querySelector('.container, main')?.appendChild(container) || document.body.appendChild(container);
  return container;
}

function updateStatusDisplay(order) {
  const progressBar = document.querySelector('#statusProgress .progress-bar');
  const statusText = document.getElementById('statusText');
  
  const statusMap = {
    'pending_approval': { width: '30%', color: 'warning', text: 'Payment verified - Awaiting admin approval' },
    'vendor_approved': { width: '60%', color: 'success', text: '✅ Approved! Preparing your order' },
    'preparing': { width: '80%', color: 'info', text: 'Cooking your delicious meal' },
    'delivered': { width: '100%', color: 'success', text: 'Delivered! Enjoy your meal!' }
  };
  
  const status = statusMap[order.orderStatus] || statusMap['pending_approval'];
  progressBar.style.width = status.width;
  progressBar.className = `progress-bar bg-${status.color}`;
  statusText.textContent = status.text;
}

function showToast(msg, type='info') {
    const toast = document.createElement('div');
    toast.className = `page-toast page-toast--${type} animate__animated animate__fadeInRight`;
    toast.innerHTML = `
        <div class="d-flex align-items-start">
            <strong class="me-3">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
            <span>${msg}</span>
            <button type="button" class="btn-close ms-auto btn-close-invert" aria-label="Close"></button>
        </div>
    `;
    toast.querySelector('.btn-close')?.addEventListener('click', () => toast.remove());
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.remove('animate__fadeInRight'); toast.classList.add('animate__fadeOutRight'); setTimeout(() => toast.remove(), 300); }, 4000);
}

