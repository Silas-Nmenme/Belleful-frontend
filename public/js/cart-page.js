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
        const cart = data.data;
        return { items: cart?.items || [], totalAmount: cart?.totalAmount || 0 };
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
    const placeholder = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=100&h=100&fit=crop&round';
    container.innerHTML = items.map(item => {
        const itemId = item.menuItem?._id || item.menuItemId || item.id || item.menuItem;
        return `
        <div class="card mb-4 shadow-sm" data-aos="fade-up" data-aos-delay="100">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-2">
                        <img src="${item.image || placeholder}" 
                             class="img-fluid rounded-circle" alt="${item.name || 'Item'}" onerror="this.src='${placeholder}'">
                    </div>
                    <div class="col-md-6">
                        <h5 class="fw-bold">${item.name || 'Item'}</h5>
                        <small class="text-muted">Unit: ₦${(item.price || 0).toLocaleString()}</small>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="input-group w-75 mx-auto">
                            <button class="btn btn-outline-secondary" onclick="updateQuantity('${itemId}', -1)">-</button>
                            <input type="number" class="form-control text-center fw-bold" value="${item.quantity || 1}" min="1" readonly>
                            <button class="btn btn-outline-secondary" onclick="updateQuantity('${itemId}', 1)">+</button>
                        </div>
                        <div class="mt-2 fs-5 fw-bold text-success">
                            ₦${((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                        </div>
                        <button class="btn btn-sm btn-outline-danger mt-2" onclick="removeFromCart('${itemId}')">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    }).join('');
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
        const token = localStorage.getItem('token');

        if (isAuth && token) {
            // Get current qty for calc
            const cartRes = await fetch(`${window.API_BASE}/cart`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const cartData = await cartRes.json();
            const cart = cartData.data;
            const item = cart.items.find(i => (i.menuItem?._id || i.menuItemId || i.id) === id);
            if (!item) {
                showToast('Item not found!', 'error');
                return;
            }
            let newQty = (item.quantity || 1) + change;
            if (newQty < 1) {
                // Remove instead
                await fetch(`${window.API_BASE}/cart/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } else {
                await fetch(`${window.API_BASE}/cart/${id}`, {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ quantity: newQty })
                });
            }
        } else {
            // Guest
            let guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items":[]}');
            const itemIndex = guestCart.items.findIndex(i => (i.menuItemId || i.id) === id);
            if (itemIndex === -1) {
                showToast('Item not found!', 'error');
                return;
            }
            let newQty = (guestCart.items[itemIndex].quantity || 1) + change;
            if (newQty < 1) {
                guestCart.items.splice(itemIndex, 1);
            } else {
                guestCart.items[itemIndex].quantity = newQty;
            }
            localStorage.setItem('guestCart', JSON.stringify(guestCart));
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
            const token = localStorage.getItem('token');
            if (isAuth && token) {
                await fetch(`${window.API_BASE}/cart/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } else {
                let cart = JSON.parse(localStorage.getItem('guestCart') || '{"items":[]}');
                cart.items = cart.items.filter(item => (item.menuItemId || item.id || item.menuItem === id));
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
        const token = localStorage.getItem('token');
        if (isAuth && token) {
            await fetch(`${window.API_BASE}/cart/clear`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
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
