// Cart page script moved from inline HTML and refactored to avoid inline styles
AOS.init({ duration: 1000, once: true });

async function loadCartPage() {
    try {
        await window.checkAuthStatus?.() || Promise.resolve();
        const isAuth = !!localStorage.getItem('token');
        let cartData;
        if (isAuth) {
            cartData = await loadAuthCart();
            if ((cartData.items || []).length === 0) cartData = getLocalCart();
        } else {
            cartData = getLocalCart();
        }
        if (((cartData.items || []).length) === 0) {
            document.querySelector('.empty-cart')?.classList.remove('hidden');
            document.getElementById('checkoutBtn').disabled = true;
            return;
        }
        renderCartItems(cartData.items);
        renderSummary(cartData);
        window.CartManager?.updateCartUI?.();
    } catch (error) {
        console.error('Cart load error:', error);
        document.querySelector('.empty-cart')?.classList.remove('hidden');
    }
}

async function loadAuthCart() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${window.API_BASE}/cart`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('API response not ok');
        const data = await response.json();
        return { items: data.data?.items || data.items || [], totalAmount: data.totalAmount || data.total || 0 };
    } catch (error) {
        console.warn('Auth cart load failed, using fallback:', error);
        return { items: [], totalAmount: 0 };
    }
}

function getLocalCart() {
    try {
        const guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items":[]}');
        return { items: guestCart.items || [], totalAmount: (guestCart.items || []).reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0) };
    } catch (e) {
        console.warn('Local cart parse failed:', e);
        return { items: [], totalAmount: 0 };
    }
}

function renderCartItems(items) {
    const container = document.getElementById('cartItemsList');
    container.innerHTML = items.map(item => `
        <div class="card mb-4 shadow-sm" data-aos="fade-up" data-aos-delay="100">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-2">
                        <img src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=100&h=100&fit=crop&round" 
                             class="img-fluid rounded-circle" alt="${item.name || 'Item'}">
                    </div>
                    <div class="col-md-6">
                        <h5 class="fw-bold">${item.name || 'Item'}</h5>
                        <small class="text-muted">Unit: ₦${(item.price || 0).toLocaleString()}</small>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="input-group w-75 mx-auto">
                            <button class="btn btn-outline-secondary" onclick="updateQuantity('${item.menuItemId || item.id || ''}', -1)">-</button>
                            <input type="number" class="form-control text-center fw-bold" value="${item.quantity || 1}" min="1" readonly>
                            <button class="btn btn-outline-secondary" onclick="updateQuantity('${item.menuItemId || item.id || ''}', 1)">+</button>
                        </div>
                        <div class="mt-2 fs-5 fw-bold text-success">
                            ₦${((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                        </div>
                        <button class="btn btn-sm btn-outline-danger mt-2" onclick="removeFromCart('${item.menuItemId || item.id || ''}')">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderSummary(cartData) {
    const items = cartData.items || [];
    const total = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
    document.getElementById('cartTotal').textContent = `₦${total.toLocaleString()}`;
    document.getElementById('checkoutBtn').disabled = items.length === 0;
    const summaryItems = document.getElementById('summaryItems');
    summaryItems.innerHTML = items.map(item => `
        <div class="d-flex justify-content-between small mb-2">
            <span>${item.name || 'Unknown item'} × ${item.quantity || 1}</span>
            <span>₦${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
        </div>
    `).join('');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `page-toast page-toast--${type} animate__animated animate__fadeInRight`;
    toast.innerHTML = `
        <div class="d-flex align-items-start">
            <strong class="me-3">${type.charAt(0).toUpperCase() + type.slice(1)}!</strong>
            <span>${message}</span>
            <button type="button" class="btn-close ms-auto btn-close-invert" aria-label="Close"></button>
        </div>
    `;
    toast.querySelector('.btn-close')?.addEventListener('click', () => toast.remove());
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('animate__fadeInRight');
        toast.classList.add('animate__fadeOutRight');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
    window.showToast = showToast;
}

window.updateQuantity = async function(id, change) {
    try {
        const isAuth = !!localStorage.getItem('token');
        let cartData;

        if (isAuth) {
            const token = localStorage.getItem('token');
            const currentData = await fetch(`${window.API_BASE}/cart`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json());
            cartData = currentData.data || currentData;
        } else {
            cartData = JSON.parse(localStorage.getItem('guestCart') || '{"items":[]}');
        }

        const item = cartData.items.find(i => (i.menuItemId || i.id) === id);
        if (!item) {
            showToast('Item not found!', 'error');
            return;
        }

        const newQty = Math.max(1, (item.quantity || 1) + change);
        item.quantity = newQty;

        if (isAuth) {
            const token = localStorage.getItem('token');
            if (newQty === 1) {
                await fetch(`${window.API_BASE}/cart`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ menuItemId: id })
                });
            } else {
                await fetch(`${window.API_BASE}/cart`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ menuItemId: id, quantity: newQty })
                });
            }
        } else {
            cartData.items = cartData.items.map(i => 
                (i.menuItemId || i.id) === id ? { ...i, quantity: newQty } : i
            );
            if (newQty === 1) {
                cartData.items = cartData.items.filter(i => (i.menuItemId || i.id) !== id);
            }
            localStorage.setItem('guestCart', JSON.stringify(cartData));
        }

        showToast('Quantity updated!', 'success');
        loadCartPage();
    } catch (error) {
        console.error('Update quantity failed:', error);
        showToast('Failed to update quantity', 'error');
    }
}

window.removeFromCart = async function(id) {
    if (confirm('Remove this item from cart?')) {
        try {
            const isAuth = !!localStorage.getItem('token');
            if (isAuth) {
                const token = localStorage.getItem('token');
                await fetch(`${window.API_BASE}/cart`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ menuItemId: id }) });
            } else {
                let cart = JSON.parse(localStorage.getItem('guestCart') || '{"items":[]}');
                cart.items = cart.items.filter(item => (item.menuItemId || item.id) !== id);
                localStorage.setItem('guestCart', JSON.stringify(cart));
            }
            showToast('Item removed from cart!', 'success');
            loadCartPage();
        } catch (error) {
            console.error('Remove failed:', error);
            showToast('Failed to remove item', 'error');
        }
    }
}

window.clearCart = async function() {
    if (!confirm('Clear entire cart? This cannot be undone.')) return;

    try {
        const isAuth = !!localStorage.getItem('token');
        if (isAuth) {
            const token = localStorage.getItem('token');
            // Assume API supports clearing all, or loop delete - fallback to loop
            const cartData = await fetch(`${window.API_BASE}/cart`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json());
            const items = cartData.data?.items || cartData.items || [];
            for (const item of items) {
                await fetch(`${window.API_BASE}/cart`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ menuItemId: item.menuItemId || item.id })
                });
            }
        } else {
            localStorage.removeItem('guestCart');
        }
        showToast('Cart cleared!', 'success');
        loadCartPage();
    } catch (error) {
        console.error('Clear cart failed:', error);
        showToast('Failed to clear cart', 'error');
    }
}

document.getElementById('checkoutBtn')?.addEventListener('click', () => { window.location.href = 'checkout.html'; });

// Initialize
loadCartPage();
