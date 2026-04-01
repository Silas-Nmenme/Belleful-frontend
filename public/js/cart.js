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
    // Single robust delegated listener for ALL cart interactions
    // Handles dynamic content perfectly, called once after init
    document.body.addEventListener('click', async (e) => {
      // Qty +/- buttons
      if (e.target.matches('.qty-btn')) {
        const cartItem = e.currentTarget.closest('[data-item-id]');
        const itemId = cartItem ? cartItem.dataset.itemId : null;
        if (itemId) {
          const delta = parseInt(e.target.dataset.delta);
          await this.updateQuantity(itemId, delta, e);
        } else {
          console.warn('Qty button clicked but no itemId found');
        }
        e.preventDefault(); // Prevent double-click issues
        return;
      }

      // Remove item
      if (e.target.matches('.btn-remove')) {
        const cartItem = e.currentTarget.closest('[data-item-id]');
        const itemId = cartItem ? cartItem.dataset.itemId : null;
        if (itemId && confirm('Remove this item?')) {
          console.log('Remove clicked for itemId:', itemId);
          await this.removeItem(itemId);
        } else {
          console.warn('Remove clicked but no itemId:', itemId);
        }
        e.preventDefault();
        return;
      }

      // Clear cart
      if (e.target.matches('.btn-clear')) {
        if (confirm('Clear entire cart?')) {
          console.log('Clear cart confirmed');
          e.preventDefault();
          e.stopPropagation();
          this.clearCart();
        }
        return;
      }

      // Proceed to checkout
      if (e.target.matches('.btn-proceed')) {
        e.preventDefault();
        if (this.cart.items.length === 0) {
          this.showToast('Cart is empty!', 'warning');
          return;
        }
        window.location.href = 'checkout.html';
        return;
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

    // Fix for Cloudinary image loading issues
    const getSafeImageUrl = (image) => {
      if (!image) return '/asset/grilled.jpg';
      if (image.startsWith('http')) {
        return image.includes('cloudinary.com') ? `${image}?crossorigin=anonymous` : image;
      }
      // Handle relative/publicId paths
      return `https://res.cloudinary.com/dtwele294/image/upload/belleful/menu/${image.replace(/^\//, '')}`;
    };
    
    container.innerHTML = validItems.map(item => `
      <div class="cart-item-card" data-item-id="${item.menuItem}">
        <img src="${getSafeImageUrl(item.image)}" alt="${item.name}" class="item-image" loading="lazy" 
             onerror="this.src='/asset/grilled.jpg'; this.onerror=null;" crossorigin="anonymous">
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
        <a href="user-dashboard.html#menu" class="btn-shop">
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
    console.log('updateQuantity:', itemId, delta);
    const itemIndex = this.cart.items.findIndex(item => String(item.menuItem) === String(itemId));
    if (itemIndex === -1) {
      console.warn('Item not found:', itemId);
      return;
    }

    const btn = event.target.closest('.qty-btn');
    const oldQty = this.cart.items[itemIndex].quantity;
    const newQty = Math.max(1, oldQty + delta);

    // Optimistic update
    this.cart.items[itemIndex].quantity = newQty;
    this.cart.totalAmount = this.cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    this.renderCart();
    this.updateCartBadge();

    this.setLoading(btn, true);
    
    // API sync (non-blocking)
    if (this.token) {
      this.apiCall(`/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: newQty })
      }).then(() => console.log('API sync OK')).catch(e => console.warn('API sync failed:', e));
    }

    this.showToast(`Qty: ${newQty}`, 'success');
    this.setLoading(btn, false);
  }

  async removeItem(itemId) {
    console.log('removeItem:', itemId);
    const removeBtn = document.querySelector(`[data-item-id="${itemId}"] .btn-remove`);
    const itemIndex = this.cart.items.findIndex(item => String(item.menuItem) === String(itemId));
    if (itemIndex === -1) return;

    const itemName = this.cart.items[itemIndex].name;
    
    if (removeBtn) this.setLoading(removeBtn, true);
    
    // Optimistic
    this.cart.items.splice(itemIndex, 1);
    this.cart.totalAmount = this.cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.renderCart();
    this.updateCartBadge();

    // API non-blocking
    if (this.token) {
      this.apiCall(`/${itemId}`, { method: 'DELETE' })
        .then(() => this.showToast(`${itemName} removed`, 'success'))
        .catch(e => {
          console.warn('Remove API failed:', e);
          this.showToast('Removed locally', 'success');
        });
    } else {
      this.showToast('Item removed', 'success');
    }
    
    if (removeBtn) this.setLoading(removeBtn, false);
  }

async clearCart() {
    const itemCount = this.cart.items.length;
    const clearBtn = document.querySelector('.btn-clear');
    
    if (clearBtn) this.setLoading(clearBtn, true);
    
    this.cart = { items: [], totalAmount: 0 };
    this.renderEmptyCart();
    this.updateCartBadge();

    // API non-blocking
    if (this.token) {
      this.apiCall('/clear', { method: 'DELETE' })
        .catch(e => console.warn('Clear API failed:', e));
    }

    this.showToast(`${itemCount ? itemCount + ' items' : 'Cart'} cleared!`, 'success');
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
  
  // API-only addToCart - direct POST to /cart
  window.addToCart = async (menuItemId, quantity = 1) => {
    if (!window.CartManager?.token) {
      window.CartManager?.showToast('Please login to add items', 'warning');
      setTimeout(() => window.location.href = 'login.html', 1000);
      return;
    }
    
    try {
      await window.CartManager.apiCall('/', {
        method: 'POST',
        body: JSON.stringify({ menuItemId, quantity })
      });
      window.CartManager.updateCartBadge();
      window.CartManager.showToast('Added to cart!', 'success');
      document.dispatchEvent(new CustomEvent('cartUpdated', { detail: (window.CartManager.cart.items.reduce((sum, item) => sum + item.quantity, 0) + quantity) }));
    } catch (e) {
      console.error('Add to cart failed:', e);
      window.CartManager.showToast('Failed to add item. Server error.', 'error');
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

