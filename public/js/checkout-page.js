AOS.init();

let currentOrder = null;

async function initCheckout() {
    if (!await window.checkAuth('login.html')) return;
    await loadCheckoutData();
}

async function loadCheckoutData() {
    const token = localStorage.getItem('token');
    try {
        const cartRes = await fetch(`${window.API_BASE}/cart`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!cartRes.ok) {
            showToast('Cart not found. Redirecting...', 'error');
            setTimeout(() => window.location.href = 'cart.html', 2000);
            return;
        }
        const cart = await cartRes.json();
        renderCheckoutItems(cart.data.items || cart.data);
        const total = cart.data.totalAmount || cart.totalAmount || 0;
        document.getElementById('checkoutTotal').textContent = `₦${(total || 0).toLocaleString()}`;
        document.getElementById('paymentAmount').textContent = `₦${(total || 0).toLocaleString()}`;
        
        // Add delivery toggle
        document.querySelectorAll('input[name="deliveryMethod"]').forEach(radio => {
            radio.addEventListener('change', toggleDeliveryAddress);
        });
        toggleDeliveryAddress();
    } catch (e) {
        console.error('Checkout load failed', e);
        showToast('Failed to load cart', 'error');
    }
}

function toggleDeliveryAddress() {
    const deliverySelected = document.getElementById('delivery').checked;
    const addressGroup = document.querySelector('#deliveryAddressGroup, [name="deliveryAddress"]').closest('.mb-3, .mb-4');
    if (addressGroup) {
        addressGroup.style.display = deliverySelected ? 'block' : 'none';
    }
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
    
    // Validate delivery address if delivery selected
    if (data.deliveryMethod === 'delivery' && !data.deliveryAddress.trim()) {
        showToast('Delivery address required for delivery orders', 'error');
        return;
    }
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${window.API_BASE}/orders/checkout`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(data)
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Checkout failed');
        }
        
        currentOrder = await res.json();
        document.getElementById('uploadOrderId').textContent = currentOrder.data.displayId || currentOrder.data._id.slice(-6).toUpperCase();
        document.getElementById('uploadSection').classList.remove('hidden');
        document.getElementById('checkoutForm').classList.add('hidden');
        document.getElementById('createOrderBtn').classList.add('hidden');
        showToast(`Order ${currentOrder.data.displayId || '#' + currentOrder.data._id.slice(-6).toUpperCase()} created successfully! Upload payment proof.`, 'success');
    } catch (error) {
        showToast('Checkout failed: ' + error.message, 'error');
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
        
        showToast('Payment receipt submitted! Admin will verify shortly.', 'success');
        setTimeout(() => window.location.href = 'user-dashboard.html', 2000);
    } catch (error) {
        showToast('Upload failed: ' + error.message, 'error');
    }
};

initCheckout();

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
