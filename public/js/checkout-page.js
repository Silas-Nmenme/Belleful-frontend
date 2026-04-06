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
    
    // Clean payload - only send required fields
    const payload = {
        phoneNumber: phoneNumber,
        bankAccount: bankAccount,
        bankName: bankName
    };
    
    if (deliveryMethod === 'delivery') {
        payload.deliveryAddress = deliveryAddress;
    }
    
    const token = localStorage.getItem('token');
    try {
        const btn = document.getElementById('createOrderBtn');
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
        
        // Reset button
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalText || '<i class="fas fa-shopping-cart me-2"></i>Create Pending Order';
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = errorData.message || `Server error (${res.status})`;
            throw new Error(errorMsg);
        }
        
        const result = await res.json();
        currentOrder = result;
        document.getElementById('uploadOrderId').textContent = result.data?.displayId || result.data?._id?.slice(-6).toUpperCase() || 'ORDER';
        document.getElementById('uploadSection').classList.remove('hidden');
        document.getElementById('checkoutForm').classList.add('hidden');
        btn.style.display = 'none';
        
        showToast(`Order created successfully! #${result.data?._id?.slice(-6).toUpperCase()}`, 'success');
    } catch (error) {
        // Reset button on error
        const btn = document.getElementById('createOrderBtn');
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalText || '<i class="fas fa-shopping-cart me-2"></i>Create Pending Order';
        
        console.error('Order creation failed:', error);
        showToast(error.message || 'Failed to create order - check form fields', 'error');
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
        const { uploadUrl, publicId } = await urlRes.json();
        
        // Step 2: Upload to Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'belleful-receipts'); // Backend preset
        
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
        
        // Start live status polling
        currentOrderId = currentOrder.data._id || currentOrder.data.id;
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

