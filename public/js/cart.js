// Cart JavaScript - Matches Backend API & Project Patterns [IIFE-wrapped]
// Integrates with navbar badges via 'cartUpdated' events

(function() {
  // Singleton pattern to prevent multiple instances
  if (window.CartSingleton) return;
  
  class CartManager {
  constructor() {
    this.API_BASE = window.API_BASE || '/api';
    this.token = localStorage.getItem('token');
    this.cart = { items: [], totalAmount: 0 };
    this.isCartPage = this.isCartPage.bind(this);
    this.init();
  }

  isCartPage() {
    const path = window.location.pathname;
    return path.includes('cart.html') || 
           !!document.getElementById('cartItems') || 
           !!document.querySelector('.cart-summary');
  }

  async init() {
    // Badge-only mode for non-cart pages
    if (!this.isCartPage()) {
      console.log('Initializing cart badge-only mode');
      this.updateCartBadge();
      this.bindEvents(); // Still bind global events
      return;
    }

    // Full cart page init
    await this.waitForElements();
    this.bindEvents();
    await this.loadCart();
    this.updateCartBadge();
  }

  waitForElements() {
    return new Promise((resolve) => {
      const checkElements = () => {
        const cartItems = document.getElementById('cartItems');
        const summary = document.querySelector('.cart-summary');
        if (cartItems && summary) {
          resolve();
        } else {
          requestAnimationFrame(checkElements);
        }
      };
      checkElements();
    });
  }

  bindEvents() {
    // Qty controls
    document.addEventListener('click', (e) => {
      if (e.target.matches('.qty-btn')) {
        const itemId = e.target.closest('.cart-item-card').dataset.itemId;
        const delta = e.target.dataset.delta;
        this.updateQuantity(itemId, parseInt(delta), e);
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
    const url = `${this.API_BASE}/cart${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
      },
      ...options
    };

    console.log('🔄 API Call:', url, config.method || 'GET', options.body || 'no body');

    try {
      const response = await fetch(url, config);
      let errorData;
      try {
        errorData = await response.clone().json();
      } catch {
        errorData = { message: await response.clone().text() };
      }
      if (!response.ok) {
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ API Success:', endpoint, data);
      return data;
    } catch (error) {
      console.error('❌ API Error:', url, error.message);
      throw error;
    }
  }

async loadCart() {
    // Skip full load on badge-only pages (menu/dashboard)
    if (!this.isCartPage()) {
      console.log('Badge-only page - skipping full cart load');
      this.updateCartBadge();
      return;
    }

    // DOM safety check for cart page
    if (!document.getElementById('cartItems')) {
      console.warn('Cart DOM not ready, retrying...');
      setTimeout(() => this.loadCart(), 100);
      return;
    }

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
    const container = document.getElementById('cartItems');
    if (!container) {
      console.warn('Cart items container not found');
      this.renderEmptyCart();
      return;
    }
    
    if (!this.cart.items.length) {
      this.renderEmptyCart();
      return;
    }

    container.innerHTML = this.cart.items.map(item => `
      <div class="cart-item-card" data-item-id="${item.menuItem}">
        <img src="${item.image || '/asset/placeholder-food.jpg'}" alt="${item.name}" class="item-image" loading="lazy">
        <div class="item-details">
          <h3 class="item-name">${item.name}</h3>
          <div class="item-price">₦${item.price.toLocaleString()}</div>
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
    const container = document.getElementById('cartItems');
    if (!container) {
      console.warn('Cart container not found');
      return;
    }
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
    if (!summary) {
      console.warn('Cart summary not found');
      return;
    }
    if (!this.cart.items.length) return;

    const subtotal = this.cart.totalAmount;
    const deliveryFee = 2000; // ₦2k realistic Lagos delivery
    const total = subtotal + deliveryFee;

    summary.innerHTML = `
      <div class="summary-row"><span>Subtotal</span><span>₦${subtotal.toLocaleString()}</span></div>
      <div class="summary-row"><span>Delivery Fee</span><span>₦${deliveryFee.toLocaleString()}</span></div>
      <div class="summary-row summary-total">
        <span>Total</span><span>₦${total.toLocaleString()}</span>
      </div>
      <button class="btn-proceed">
        <i class="fas fa-credit-card me-2"></i>Proceed to Checkout
      </button>
      <button class="btn-clear">
        <i class="fas fa-trash me-2"></i>Clear Cart
      </button>
    `;
  }

async updateQuantity(itemId, delta, event) {
    const itemIndex = this.cart.items.findIndex(item => item.menuItem === itemId);
    if (itemIndex === -1) return;

    const btn = event.target.closest('.qty-btn');
    const oldQty = this.cart.items[itemIndex].quantity;
    const newQty = Math.max(1, oldQty + delta);

    // Optimistic update
    this.cart.items[itemIndex].quantity = newQty;
    this.renderCart(); // Immediate UI refresh
    this.updateCartBadge();

    try {
      this.setLoading(btn, true);
      await this.apiCall(`/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: newQty })
      });
      console.log('✅ Quantity updated via API:', newQty);
      this.showToast(`Updated quantity to ${newQty}`, 'success');
    } catch (error) {
      // Rollback on failure
      this.cart.items[itemIndex].quantity = oldQty;
      this.renderCart();
      this.updateCartBadge();
      console.error('❌ API update failed:', error);
      // Sync from server anyway
      await this.loadCart();
      this.showToast('Updated locally (API sync failed)', 'warning');
    } finally {
      this.setLoading(btn, false);
    }
  }

  async removeItem(itemId) {
    // Find closest remove button for loading state
    const removeBtn = document.querySelector(`[data-item-id="${itemId}"] .btn-remove`);
    const itemIndex = this.cart.items.findIndex(item => item.menuItem === itemId);
    if (itemIndex === -1) return;

    const itemName = this.cart.items[itemIndex].name;
    
    // Optimistic remove with loading
    if (removeBtn) this.setLoading(removeBtn, true);
    this.cart.items.splice(itemIndex, 1);
    this.renderCart();
    this.updateCartBadge();

    try {
      await this.apiCall(`/${itemId}`, { method: 'DELETE' });
      console.log('✅ Item removed via API:', itemName);
      this.showToast('Item removed', 'success');
    } catch (error) {
      // Rollback on error
      await this.loadCart();
      console.error('❌ Remove API failed:', error);
      this.showToast('Removed locally (API sync failed)', 'warning');
    } finally {
      if (removeBtn) this.setLoading(removeBtn, false);
    }
  }

  async clearCart() {
    const itemCount = this.cart.items.length;
    const clearBtn = document.querySelector('.btn-clear');
    
    // Optimistic clear with loading
    if (clearBtn) this.setLoading(clearBtn, true);
    localStorage.removeItem('guestCart');
    this.cart = { items: [], totalAmount: 0 };
    this.renderEmptyCart();
    this.updateCartBadge();

    try {
      // Try API first (auth'd users)
      if (this.token) {
        await this.apiCall('/clear', { method: 'DELETE' });
      }
      console.log('✅ Cart cleared via API');
      this.showToast(`Cleared ${itemCount} items from cart`, 'success');
    } catch (error) {
      console.warn('API clear failed, using local fallback:', error.message);
      // Already optimistically cleared, just sync
      await this.loadCart();
      this.showToast(`Cart cleared locally (${itemCount} items)`, 'warning');
    } finally {
      if (clearBtn) this.setLoading(clearBtn, false);
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

    window.CartSingleton = true;
    
    // Global styles for toasts (singleton)
    if (!document.querySelector('#cart-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'cart-toast-styles';
      style.textContent = `
        @keyframes slideIn { from { transform: translateX(400px); } to { transform: translateX(0); } }
        @keyframes slideOut { from { transform: translateX(0); } to { transform: translateX(400px); opacity: 0; } }
      `;
      document.head.appendChild(style);
    }
    
    // Export singleton instance
    window.CartManager = window.CartManager || new CartManager();
    window.CartSingleton = window.CartManager;
    
  })();
  
  // Export addToCart using singleton (safe for multiple calls)
  window.addToCart = async (menuItemId, quantity = 1) => {
    try {
      await window.CartManager.apiCall('/', {
        method: 'POST',
        body: JSON.stringify({ menuItemId, quantity })
      });
      window.CartManager.loadCart();
      window.CartManager.showToast('Added to cart!', 'success');
    } catch (error) {
      window.CartManager?.showToast(error.message, 'error');
    }
  };
  
  // Auto-init safely
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.CartManager.init();
    });
  } else {
    window.CartManager.init();
  }

