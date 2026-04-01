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
    let debounceTimer;
    document.body.addEventListener('click', async (e) => {
      // Qty +/- buttons - DEBOUNCED
      if (e.target.matches('.qty-btn, .qty-input')) {
        e.preventDefault();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          const cartItem = e.target.closest('[data-item-id]');
          const itemId = cartItem ? cartItem.dataset.itemId : null;
          if (itemId) {
            let newQty;
            if (e.target.matches('.qty-btn')) {
              const delta = parseInt(e.target.dataset.delta);
              newQty = parseInt(cartItem.querySelector('.qty-display, .qty-input').textContent || '1') + delta;
            } else { // qty-input
              newQty = parseInt(e.target.value) || 1;
            }
            newQty = Math.max(1, newQty);
            await this.updateQuantity(itemId, newQty, e.target.closest('.qty-stepper'));
          }
        }, 300);
        return;
      }


      // Remove item
      if (e.target.matches('.btn-remove')) {
        const cartItem = e.target.closest('[data-item-id]');
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
    const url = `${this.API_BASE}/cart${endpoint.replace(/[^a-zA-Z0-9-_]/g, '')}`;
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
    
    container.innerHTML = validItems.map(item => {
      const safeItemId = String(item._id || item.menuItem || item.menuItem?._id); // Backend precise match - FIXED cart item ID
      return `
      <div class="cart-item-card" data-item-id="${safeItemId}">
        <img src="${getSafeImageUrl(item.image)}" alt="${item.name}" class="item-image" loading="lazy" 
             onerror="this.src='/asset/grilled.jpg'; this.onerror=null;" crossorigin="anonymous">
        <div class="item-details">
          <h3 class="item-name">${item.name}</h3>
          <div class="item-price">₦${(item.price || 0).toLocaleString()}</div>
          <div class="item-controls">
            <div class="qty-stepper">
              <button class="qty-btn" data-delta="-1" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
              <input type="number" class="qty-input form-control form-control-sm mx-2" min="1" value="${item.quantity}" style="width:60px;">
              <button class="qty-btn" data-delta="1">+</button>
            </div>
            <button class="btn-remove">Remove</button>
          </div>
        </div>
      </div>
      `;
    }).join('');

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
    
    // CRITICAL FIX: Don't render summary for empty cart
    if (!this.cart.items.length) {
      summary.innerHTML = '<div class="text-center py-4"><p class="text-muted mb-0">No items in cart</p></div>';
      return;
    }

    const subtotal = this.cart.totalAmount || this.cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 2000;
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

async updateQuantity(itemId, newQty, stepper) {
    console.log('updateQuantity:', itemId, newQty);
    
    // Precise matching: use cart item _id (not menuItem reference)
    const itemIndex = this.cart.items.findIndex(item => String(item._id || item.menuItem) === String(itemId));
    if (itemIndex === -1) {
      console.warn('Item not found:', itemId);
      this.showToast('Item not found', 'error');
      return;
    }

    // Disable stepper during API
    this.setLoading(stepper, true);

    try {
      // API first (no optimistic - sync state)
      if (this.token) {
        await this.apiCall(`/${itemId}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity: newQty })
        });
      }

      // Reload full cart to sync
      await this.loadCart();
      this.updateCartBadge();
      this.showToast(`Updated to ${newQty}`, 'success');
      
    } catch (error) {
      console.error('Update failed:', error);
      this.showToast(`Update failed: ${error.message}. Refresh page.`, 'error');
      // Re-render from current cart (may be stale)
      this.renderCart();
    } finally {
      this.setLoading(stepper, false);
    }
  }

  async removeItem(itemId) {
    console.log('removeItem:', itemId);

    const removeBtn = document.querySelector(`[data-item-id="${itemId}"] .btn-remove`);
    if (removeBtn) this.setLoading(removeBtn, true);

    try {
      if (this.token) {
        await this.apiCall(`/${itemId}`, { method: 'DELETE' });
      }
      await this.loadCart(); // Sync
      this.updateCartBadge();
      this.showToast('Item removed', 'success');
    } catch (error) {
      console.error('Remove failed:', error);
      this.showToast(`Remove failed: ${error.message}. Refresh page.`, 'error');
      this.renderCart();
    } finally {
      if (removeBtn) this.setLoading(removeBtn, false);
    }
  }

async clearCart() {
    const itemCount = this.cart.items.length;
    const clearBtn = document.querySelector('.btn-clear');
    
    if (clearBtn) this.setLoading(clearBtn, true);

    try {
      if (this.token) {
        await this.apiCall('/clear', { method: 'DELETE' });
      }
      await this.loadCart();
      this.updateCartBadge();
      this.showToast(`${itemCount ? itemCount + ' items' : 'Cart'} cleared!`, 'success');
    } catch (error) {
      console.error('Clear failed:', error);
      this.showToast(`Clear failed: ${error.message}`, 'error');
      this.renderEmptyCart();
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
    if (!element) return;
    element.classList.toggle('loading', loading);
    if (loading) {
      const spinners = element.querySelectorAll('.spinner-border');
      if (!spinners.length) {
        element.dataset.originalHTML = element.innerHTML;
        element.innerHTML = element.innerHTML.replace(/(<i[^>]*>.*?<\/i>|<span[^>]*>.*?<\/span>)?\s*/g, '') 
          + '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
      }
    } else {
      if (element.dataset.originalHTML) {
        element.innerHTML = element.dataset.originalHTML;
        delete element.dataset.originalHTML;
      }
      element.classList.remove('loading');
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

