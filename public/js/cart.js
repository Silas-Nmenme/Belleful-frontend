// Cart JavaScript - Matches Backend API & Project Patterns
// Integrates with navbar badges via 'cartUpdated' events

class CartManager {
  constructor() {
    this.API_BASE = window.API_BASE || '/api';
    this.token = localStorage.getItem('token');
    this.cart = { items: [], totalAmount: 0 };
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadCart();
    this.updateCartBadge();
  }

  bindEvents() {
    // Qty controls
    document.addEventListener('click', (e) => {
      if (e.target.matches('.qty-btn')) {
        const itemId = e.target.closest('.cart-item-card').dataset.itemId;
        const delta = e.target.dataset.delta;
        this.updateQuantity(itemId, parseInt(delta));
      }
    });

    // Remove
    document.addEventListener('click', async (e) => {
      if (e.target.matches('.btn-remove')) {
        const itemId = e.target.closest('.cart-item-card').dataset.itemId;
        if (confirm('Remove this item?')) {
          await this.removeItem(itemId);
        }
      }
    });

    // Clear cart
    document.body.addEventListener('click', (e) => {
      if (e.target.matches('.btn-clear')) {
        if (confirm('Clear entire cart?')) {
          this.clearCart();
        }
      }
    });

    // Proceed to checkout
    document.body.addEventListener('click', (e) => {
      if (e.target.matches('.btn-proceed')) {
        if (this.cart.items.length === 0) {
          this.showToast('Cart is empty!', 'warning');
          return;
        }
        window.location.href = 'checkout.html';
      }
    });
  }

  async apiCall(endpoint, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
      },
      ...options
    };

    try {
      const response = await fetch(`${this.API_BASE}/cart${endpoint}`, config);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('auth')) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        throw error;
      }
      throw error;
    }
  }

  async loadCart() {
    try {
      const btns = document.querySelectorAll('.btn-proceed, .btn-clear, .qty-btn');
      btns.forEach(btn => this.setLoading(btn, true));

      const result = await this.apiCall('/');
      this.cart = result.data || { items: [], totalAmount: 0 };

      // Fallback guest cart
      if (!this.token && !this.cart.items.length) {
        const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');
        this.cart.items = guestCart;
        this.cart.totalAmount = guestCart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      }

      this.renderCart();
    } catch (error) {
      console.error('Load cart failed:', error);
      this.showToast(error.message, 'error');
      this.renderEmptyCart();
    } finally {
      document.querySelectorAll('.btn-proceed, .btn-clear, .qty-btn').forEach(btn => this.setLoading(btn, false));
    }
  }

  renderCart() {
    const container = document.querySelector('.cart-items-grid') || document.getElementById('cartItems');
    
    if (!this.cart.items.length) {
      this.renderEmptyCart();
      return;
    }

    container.innerHTML = this.cart.items.map(item => `
      <div class="cart-item-card" data-item-id="${item.menuItem}">
        <img src="${item.image || '/asset/placeholder-food.jpg'}" alt="${item.name}" class="item-image" loading="lazy">
        <div class="item-details">
          <h3 class="item-name">${item.name}</h3>
          <div class="item-price">$${item.price.toFixed(2)}</div>
          <div class="item-controls">
            <div class="qty-stepper">
              <button class="qty-btn" data-delta="-1" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
              <span class="qty-display">${item.quantity}</span>
              <button class="qty-btn" data-delta="1">+</button>
            </div>
            <button class="btn-remove">Remove</button>
          </div>
        </div>
      </div>
    `).join('');

    this.renderSummary();
    this.updateCartBadge();
  }

  renderEmptyCart() {
    const container = document.querySelector('.cart-items-grid') || document.querySelector('.cart-container');
    container.innerHTML = `
      <div class="cart-empty">
        <div class="empty-icon">🛒</div>
        <h2>Your cart is empty</h2>
        <p>Add delicious meals from our menu to get started. Fresh food delivered hot and fast!</p>
        <a href="index.html#menu" class="btn-shop">
          <i class="fas fa-utensils me-2"></i> Shop Menu
        </a>
      </div>
    `;
    this.updateCartBadge();
  }

  renderSummary() {
    const summary = document.querySelector('.cart-summary');
    if (!summary || !this.cart.items.length) return;

    const subtotal = this.cart.totalAmount;
    const deliveryFee = 5.00;
    const total = subtotal + deliveryFee;

    summary.innerHTML = `
      <div class="summary-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
      <div class="summary-row"><span>Delivery Fee</span><span>$${deliveryFee.toFixed(2)}</span></div>
      <div class="summary-row summary-total">
        <span>Total</span><span>$${total.toFixed(2)}</span>
      </div>
      <button class="btn-proceed">
        <i class="fas fa-credit-card me-2"></i>Proceed to Checkout
      </button>
      <button class="btn-clear">
        <i class="fas fa-trash me-2"></i>Clear Cart
      </button>
    `;
  }

  async updateQuantity(itemId, delta) {
    const itemIndex = this.cart.items.findIndex(item => item.menuItem === itemId);
    if (itemIndex === -1) return;

    const newQty = Math.max(1, this.cart.items[itemIndex].quantity + delta);
    const btn = event.target.closest('.qty-btn');

    try {
      this.setLoading(btn, true);
      await this.apiCall(`/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: newQty })
      });
      
      this.cart.items[itemIndex].quantity = newQty;
      this.loadCart(); // Reload to sync totals/stock
      this.showToast(`Updated quantity to ${newQty}`, 'success');
    } catch (error) {
      this.showToast(error.message, 'error');
    } finally {
      this.setLoading(btn, false);
    }
  }

  async removeItem(itemId) {
    try {
      await this.apiCall(`/${itemId}`, { method: 'DELETE' });
      await this.loadCart();
      this.showToast('Item removed', 'success');
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  async clearCart() {
    try {
      await this.apiCall('/clear', { method: 'DELETE' });
      localStorage.removeItem('guestCart');
      this.loadCart();
      this.showToast('Cart cleared', 'success');
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  updateCartBadge() {
    const count = this.cart.items.reduce((sum, item) => sum + item.quantity, 0);
    document.dispatchEvent(new CustomEvent('cartUpdated', { detail: count }));
    
    // Direct updates for cart page badges
    document.querySelectorAll('.cart-count, .cart-badge').forEach(badge => {
      badge.textContent = count;
      if (count > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    });
  }

  setLoading(element, loading = true) {
    element.classList.toggle('loading', loading);
    if (loading) {
      element.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${element.dataset.originalText || 'Loading...'}`;
    } else if (element.dataset.originalText) {
      element.innerHTML = element.dataset.originalText;
    }
  }

  showToast(message, type = 'info') {
    // Simple toast without Bootstrap dependency
    const toast = document.createElement('div');
    toast.className = `toast alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} shadow-lg`;
    toast.innerHTML = `
      ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} ${message}
      <button type="button" class="btn-close ms-2" onclick="this.parentElement.remove()"></button>
    `;
    toast.style.cssText = `
      position: fixed; top: 1rem; right: 1rem; z-index: 9999; 
      min-width: 300px; cursor: pointer; transform: translateX(400px);
      animation: slideIn 0.3s ease forwards;
    `;
    toast.onmouseenter = () => toast.style.animation = 'none';
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }
}

// Global styles for toasts
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn { from { transform: translateX(400px); } to { transform: translateX(0); } }
  @keyframes slideOut { from { transform: translateX(0); } to { transform: translateX(400px); opacity: 0; } }
`;
document.head.appendChild(style);

// Export for global use (navbar/menu)
window.CartManager = CartManager;

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new CartManager());
} else {
  new CartManager();
}

// Export functions for external calls (e.g., from menu.js)
window.addToCart = async (menuItemId, quantity = 1) => {
  const cart = new CartManager();
  try {
    await cart.apiCall('/', {
      method: 'POST',
      body: JSON.stringify({ menuItemId, quantity })
    });
    cart.loadCart();
    cart.showToast('Added to cart!', 'success');
  } catch (error) {
    cart.showToast(error.message, 'error');
  }
};

