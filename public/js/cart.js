// Cart functionality
let cart = [];

function renderCart() {
    const tbody = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');

    if (cart.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                    <p class="text-muted mb-0">Your cart is empty</p>
                    <a href="menu.html" class="btn btn-warning mt-2">Continue Shopping</a>
                </td>
            </tr>
        `;
        totalEl.textContent = '₦0';
        return;
    }

    tbody.innerHTML = cart.map((item, index) => `
        <tr>
            <td>
                <img src="./asset/${item.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.webp" alt="${item.name}" 
                     class="rounded me-3" style="width: 60px; height: 60px; object-fit: cover;">
                ${item.name}
            </td>
            <td>₦${item.price.toLocaleString()}</td>
            <td>
                <div class="d-flex align-items-center">
                    <button class="btn btn-outline-secondary btn-sm decrement" data-index="${index}">-</button>
                    <span class="mx-2 fs-5">${item.quantity}</span>
                    <button class="btn btn-outline-secondary btn-sm increment" data-index="${index}">+</button>
                </div>
            </td>
            <td>₦${(item.price * item.quantity).toLocaleString()}</td>
            <td>
                <button class="btn btn-danger btn-sm remove-item" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalEl.textContent = `₦${total.toLocaleString()}`;

    // Add event listeners
    document.querySelectorAll('.increment').forEach(btn => btn.addEventListener('click', handleQuantityChange));
    document.querySelectorAll('.decrement').forEach(btn => btn.addEventListener('click', handleQuantityChange));
    document.querySelectorAll('.remove-item').forEach(btn => btn.addEventListener('click', removeItem));
}

function handleQuantityChange(e) {
    e.preventDefault();
    const index = parseInt(e.target.dataset.index);
    if (e.target.classList.contains('increment')) {
        cart[index].quantity += 1;
    } else {
        cart[index].quantity = Math.max(1, cart[index].quantity - 1);
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
}

function removeItem(e) {
    const index = parseInt(e.target.closest('.remove-item').dataset.index);
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount();
}

function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
        cartCountEl.textContent = totalItems;
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification position-fixed top-0 end-0 m-3 bg-success text-white p-3 rounded shadow-lg';
    toast.style.zIndex = '9999';
    toast.style.cssText = 'animation: slideIn 0.3s ease-out;';
    toast.innerHTML = `${message} <i class="fas fa-check ms-2"></i>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Checkout functionality
document.addEventListener('DOMContentLoaded', function() {
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            if (cart.length === 0) {
                showToast('Your cart is empty!');
                return;
            }

            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const order = {
                id: Date.now(),
                items: [...cart],
                total: total,
                date: new Date().toLocaleDateString(),
                status: 'Pending'
            };

            let orders = JSON.parse(localStorage.getItem('orders')) || [];
            orders.unshift(order);
            localStorage.setItem('orders', JSON.stringify(orders));

            localStorage.removeItem('cart');
            cart = [];
            
            showToast('Order placed successfully!');
            renderCart();
            updateCartCount();
            
            setTimeout(() => {
                window.location.href = 'orders.html';
            }, 1500);
        });
    }

    // Load cart and render
    cart = JSON.parse(localStorage.getItem('cart')) || [];
    renderCart();
    updateCartCount();
});
