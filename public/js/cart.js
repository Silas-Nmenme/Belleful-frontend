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
      let cartData = { items: [], totalAmount: 0 };

      // Always try API first (auth users)
      if (this.token) {
        const result = await this.apiCall('/');
        cartData = result.data || cartData;
      }

// Auth required - no guest cart
      if (!this.token) {
        this.showToast('Please login to view cart', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
      }
      


      this.cart = cartData;
      this.renderCart();
    } catch (error) {
      console.error('Load cart failed:', error);
      this.cart = { items: [], totalAmount: 0 };
      this.renderEmptyCart();
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

    const validItems = this.cart.items.filter(item => item && item.name && typeof item.price === 'number' && item.price >= 0);
    
    if (validItems.length !== this.cart.items.length) {
      console.warn(`renderCart: Filtered ${this.cart.items.length - validItems.length} invalid items`);
    }
    
    container.innerHTML = validItems.map(item => `
      <div class="cart-item-card" data-item-id="${item.menuItem}">
        <img src="${item.image || '/asset/placeholder-food.jpg'}" alt="${item.name}" class="item-image" loading="lazy">
        <div class="item-details">
          <h3 class="item-name">${item.name}</h3>
          <div class="item-price">₦${(item.price || 0).toLocaleString()}</div>
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
    this.bindEvents(); // Re-bind dynamic elements
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

    // Always update local first (optimistic + persistent)
    this.cart.items[itemIndex].quantity = newQty;
    
    this.renderCart();
    this.updateCartBadge();
    this.bindEvents(); // Re-bind after re-render

    this.setLoading(btn, true);
    
    // Try API if auth'd (optional)
    if (this.token) {
      try {
        await this.apiCall(`/${itemId}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity: newQty })
        });
        console.log('✅ Quantity synced via API:', newQty);
      } catch (apiError) {
        console.warn('API update failed, kept local change:', apiError);
      }
    }

    this.showToast(`Quantity: ${newQty}`, 'success');
    this.setLoading(btn, false);
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
    
    if (clearBtn) this.setLoading(clearBtn, true);
    
    // Always clear localStorage first
    // No localStorage - pure API
    this.cart = { items: [], totalAmount: 0 };
    this.renderEmptyCart();
    this.updateCartBadge();

    // Try API clear if auth'd
    if (this.token) {
      try {
        await this.apiCall('/clear', { method: 'DELETE' });
        console.log('✅ Cart cleared via API');
      } catch (apiError) {
        console.warn('API clear failed, local clear complete:', apiError);
      }
    }

    this.showToast(`Cleared ${itemCount} items`, 'success');
    if (clearBtn) this.setLoading(clearBtn, false);
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
  window.addToCart = async (menuItemId, itemData, quantity = 1) => {
    if (!window.CartManager?.token) {
      window.CartManager?.showToast('Please login to add items', 'warning');
      setTimeout(() => window.location.href = 'login.html', 1000);
      return;
    }
    
    // Get itemData from API for validation
    try {
      const itemRes = await fetch(`${window.API_BASE}/menu/${menuItemId}`);
      const itemData = await itemRes.json();
      if (!itemData.data?.name || typeof itemData.data.price !== 'number') {
        console.error('Invalid item data:', itemData);
        return;
      }
      
      await window.CartManager.apiCall('/', {
        method: 'POST',
        body: JSON.stringify({ menuItemId, quantity })
      });
      window.CartManager.loadCart();
      window.CartManager?.showToast('Added to cart!', 'success');
    } catch (e) {
      console.error('Add failed:', e);
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

