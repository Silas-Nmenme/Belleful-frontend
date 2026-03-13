// Menu items data
const menuItems = [
    { id: 1, name: 'Jollof Rice', price: 2500, image: '../asset/jollof.webp' },
    { id: 2, name: 'Beans & Plantain', price: 2000, image: '../asset/beans.webp' },
    { id: 3, name: 'Grilled Chicken', price: 3500, image: '../asset/grilled.jpg' },
    { id: 4, name: 'Ofe Owerri', price: 2800, image: '../asset/ofe.webp' },
    { id: 5, name: 'Pounded Yam', price: 3000, image: '../asset/pounded-yam.webp' },
    { id: 6, name: 'Egusi Soup', price: 2200, image: '../asset/egusi.webp' }
];

// Render menu items
function renderMenuItems() {
    const container = document.querySelector('#menu-container');
    container.innerHTML = '';

    menuItems.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col';
        col.innerHTML = `
            <div class="card h-100">
                <img src="${item.image}" class="card-img-top img-fluid" alt="${item.name}" style="height: 200px; object-fit: cover;">
                <div class="card-body d-flex flex-column">
                    <h3 class="card-title">${item.name}</h3>
                    <p class="card-text text-warning fs-4 mb-3">₦${item.price.toLocaleString()}</p>
                    <button class="btn btn-warning w-100 add-to-cart-btn" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-image="${item.image}">
                        <i class="fas fa-cart-plus me-2"></i>Add to Cart
                    </button>
                </div>
            </div>
        `;
        container.appendChild(col);
    });

    // Add event listeners
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', addToCart);
    });
}

// Add item to cart
function addToCart(e) {
    const btn = e.target.closest('.add-to-cart-btn');
    const id = parseInt(btn.dataset.id);
    const name = btn.dataset.name;
    const price = parseFloat(btn.dataset.price);
    const image = btn.dataset.image.replace('../', './');

    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, image, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showToast('Item added to cart!');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    renderMenuItems();
    // updateCartCount() called from cart.js if loaded
    if (typeof updateCartCount === 'function') {
        updateCartCount();
    }
});

// Add CSS for toast animation (inline)
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    .toast-notification {
        max-width: 300px;
    }
`;
document.head.appendChild(style);

