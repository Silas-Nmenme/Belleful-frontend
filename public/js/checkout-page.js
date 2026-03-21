// Checkout page script moved from inline HTML and refactored to avoid inline styles
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
        renderCheckoutItems(cart.data.items);
        document.getElementById('checkoutTotal').textContent = `₦${cart.data.totalAmount.toLocaleString()}`;
        document.getElementById('paymentAmount').textContent = `₦${cart.data.totalAmount.toLocaleString()}`;
    } catch (e) {
        console.error('Checkout load failed', e);
    }
}

function renderCheckoutItems(items) {
    document.getElementById('checkoutItems').innerHTML = items.map(item => `
        <div class="d-flex justify-content-between align-items-center py-3 border-bottom">
            <div>
                <h6 class="fw-bold">${item.menuItem?.name || item.name}</h6>
                <small class="text-muted">${item.quantity} × ₦${item.price.toLocaleString()}</small>
            </div>
            <div class="text-end">
                <div class="h6 fw-bold">₦${(item.price * item.quantity).toLocaleString()}</div>
            </div>
        </div>
    `).join('');
}

document.getElementById('createOrderBtn').onclick = async () => {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${window.API_BASE}/orders/checkout`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (res.ok) {
            currentOrder = await res.json();
            document.getElementById('accountNumber').textContent = currentOrder.data.accountNumber;
            document.getElementById('uploadSection')?.classList.remove('hidden');
            document.getElementById('createOrderBtn')?.classList.add('hidden');
            showToast(`Order #${currentOrder.data._id.slice(-6).toUpperCase()} created! Upload receipt.`, 'success');
        }
    } catch (error) {
        showToast('Checkout failed: ' + error.message, 'error');
    }
};

document.getElementById('paymentUploadForm').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('orderId', currentOrder.data._id);
    formData.append('receipt', document.getElementById('receiptFile').files[0]);
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${window.API_BASE}/payments/upload-receipt`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
        if (res.ok) {
            showToast('Receipt uploaded! Waiting verification...', 'success');
            setTimeout(() => window.location.href = 'user-dashboard.html', 2000);
        }
    } catch (error) {
        showToast('Upload failed', 'error');
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
