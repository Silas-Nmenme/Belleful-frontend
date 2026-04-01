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
    this.saveCart = this.saveCart.bind(this);
    this.loadLocalCart = this.loadLocalCart.bind(this);
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
      this.bindEvents();
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
    let debounceTimer;
    document.body.addEventListener('click', async (e) => {
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
            } else {
              newQty = parseInt(e.target.value) || 1;
            }
            newQty = Math.max(1, newQty);
            await this.updateQuantity(itemId, newQty, e.target.closest('.qty-stepper'));
          }
        }, 300);
        return;
      }

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

      if (e.target.matches('.btn-clear')) {
        if (confirm('Clear entire cart?')) {
          console.log('Clear cart confirmed');
          e.preventDefault();
          e.stopPropagation();
          this.clearCart();
        }
        return;
      }

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
    let cleanEndpoint = endpoint;
    if (endpoint.startsWith('/')) {
      cleanEndpoint = endpoint;
    } else {
      cleanEndpoint = `/${endpoint}`;
    }
    const url = `${this.API_BASE}/cart${cleanEndpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
      },
      ...options
    };

    console.log('🔄 API Call:', { url, method: config.method || 'GET', body: options.body });

    try {
      const response = await fetch(url, config);
      let errorData;
      try {
        errorData = await response.clone().json();
      } catch {
        errorData = { message: await response.clone().text() };
      }
      if (!response.ok) {
        const errorMsg = errorData.message || errorData.error || `HTTP ${response.status}`;
        console.error('API Error Details:', { status: response.status, errorData });
        throw new Error(errorMsg);
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
    if (!this.isCartPage()) {
      console.log('Badge-only page - skipping full cart load');
      this.updateCartBadge();
      return;
    }

    if (!document.getElementById('cartItems')) {
      console.warn('Cart DOM not ready, retrying...');
      setTimeout(() => this.loadCart(), 100);
      return;
    }

    try {
      let cartData = { items: [], totalAmount: 0 };

      if (this.token) {
        try {
          const result = await this.apiCall('/');
          cartData = result.data || cartData;
        } catch (apiError) {
          console.warn('API load failed, using local cart:', apiError.message);
        }
      }

      const localCart = this.loadLocalCart();
      cartData.items = localCart.items.length > cartData.items.length ? localCart.items : cartData.items;
      cartData.totalAmount = localCart.totalAmount || cartData.totalAmount;

      if (!this.token) {
        cartData = this.loadLocalCart();
        if (document.querySelector('.cart-empty')) {
          this.showToast('Login to sync cart with orders', 'info');
        }
      }

      this.cart = cartData;
      await this.saveCart();
      this.renderCart();
    } catch (error) {
      console.error('Load cart failed:', error);
      this.cart = this.loadLocalCart();
      await this.saveCart();
      this.renderCart();
    }
  }

  saveCart() {
    localStorage.setItem('belleful_cart', JSON.stringify(this.cart));
  }

  loadLocalCart() {
    try {
      const cartStr = localStorage.getItem('belleful_cart');
      return cartStr ? JSON.parse(cartStr) : { items: [], totalAmount: 0 };
    } catch (e) {
      console.warn('Local cart parse failed:', e);
      localStorage.removeItem('belleful_cart');
      return { items: [], totalAmount: 0 };
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

    const getSafeImageUrl = (image) => {
      if (!image) return '/asset/grilled.jpg';
      if (image.startsWith('http')) {
        return image.includes('cloudinary.com') ? `${image}?crossorigin=anonymous` : image;
      }
      return `https://res.cloudinary.com/dtwele294/image/upload/belleful/menu/${image.replace(/^\//, '')}`;
    };
    
    container.innerHTML = validItems.map(item => {
      const safeItemId = String(item._id || item.menuItem || item.menuItem?._id);
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
    this.bindEvents();
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
    
    if (!this.cart.items.length) {
      summary.innerHTML = '<div class="text-center py-4"><p class="text-muted mb-0">No items in cart</p></div>';
      return;
    }

    const subtotal = this.cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.cart.totalAmount = subtotal;
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
    console.log('updateQuantity called:', { itemId, newQty });
    
    if (!itemId || typeof itemId !== 'string') {
      this.showToast('Invalid item ID format', 'error');
      return;
    }
    
    const itemIndex = this.cart.items.findIndex(item => String(item._id) === String(itemId));
    if (itemIndex === -1) {
      console.warn('Item not found:', itemId);
      this.showToast('Item not found', 'error');
      return;
    }

    this.setLoading(stepper, true);
    try {
      newQty = Math.max(1, newQty);
      
      if (newQty <= 0) {
        await this.removeItem(itemId);
        return;
      }
      
      this.cart.items[itemIndex].quantity = newQty;
      this.cart.totalAmount = this.cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      await this.saveCart();
      this.renderCart();
      this.updateCartBadge();
      this.showToast(`Updated to ${newQty}`, 'success');
      
    } catch (error) {
      console.error('Update failed:', error);
      this.showToast('Update failed', 'error');
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
      this.cart.items = this.cart.items.filter(item => String(item._id) !== String(itemId));
      this.cart.totalAmount = this.cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      await this.saveCart();
      this.renderCart();
      this.updateCartBadge();
      this.showToast('Item removed', 'success');
    } catch (error) {
      console.error('Remove failed:', error);
      this.showToast('Remove failed', 'error');
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
      this.cart = { items: [], totalAmount: 0 };
      localStorage.removeItem('belleful_cart');
      
      this.renderEmptyCart();
      this.updateCartBadge();
      this.showToast(`${itemCount ? itemCount + ' items' : 'Cart'} cleared!`, 'success');
    } catch (error) {
      console.error('Clear failed:', error);
      this.showToast('Clear failed', 'error');
      this.renderEmptyCart();
    } finally {
      if (clearBtn) this.setLoading(clearBtn, false);
    }
  }

  updateCartBadge() {
    const count = this.cart.items.reduce((sum, item) => sum + item.quantity, 0);
    document.dispatchEvent(new CustomEvent('cartUpdated', { detail: count }));
    
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
  
  if (!document.querySelector('#cart-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'cart-toast-styles';
    style.textContent = `
      @keyframes slideIn { from { transform: translateX(400px); } to { transform: translateX(0); } }
      @keyframes slideOut { from { transform: translateX(0); } to { transform: translateX(400px); opacity: 0; } }
    `;
    document.head.appendChild(style);
  }
  
  window.CartManager = window.CartManager || new CartManager();
  window.CartSingleton = window.CartManager;
  
})();

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.CartManager.init();
  });
} else {
  window.CartManager.init();
}
