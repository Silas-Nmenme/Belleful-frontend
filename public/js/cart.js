// Cart JavaScript - Full Backend Integration for Belleful
// Matches controller/schema/routes exactly (no extra fees; total = items only)

(function() {
  'use strict';
  
  if (window.CartManager) return;
  
  class CartManager {
    constructor() {
      this.API_BASE = window.API_BASE || 'https://belleful-gold.vercel.app/api';
      this.token = localStorage.getItem('token');
      // Defensive initialization - prevent undefined items
      this.cart = { 
        items: [], 
        totalAmount: 0, 
        itemCount: 0 
      };
      this.isDelivery = true;   // Default delivery mode
      this.init();
    }

    async init() {
      this.bindGlobalEvents();
      await this.updateFromBackend();
      document.dispatchEvent(new CustomEvent('cartReady'));
    }

    bindGlobalEvents() {
      document.addEventListener('click', async (e) => {
        const qtyBtn = e.target.closest('.qty-btn');
        if (qtyBtn) {
          e.preventDefault();
          e.stopPropagation();
          const itemEl = qtyBtn.closest('[data-menuitem-id]');
          if (itemEl) {
            const itemId = itemEl.dataset.menuitemId;
            const currentQty = parseInt(itemEl.dataset.quantity) || 1;
            const delta = parseInt(qtyBtn.dataset.delta);
            const newQty = Math.max(1, currentQty + delta);
await this.updateQuantity(itemId, newQty, qtyBtn, e);
          }
          return;
        }

        const qtyInput = e.target.closest('.qty-input');
        if (qtyInput) {
          e.stopPropagation();
          const itemEl = qtyInput.closest('[data-menuitem-id]');
          if (itemEl) {
            const itemId = itemEl.dataset.menuitemId;
        const newQty = parseInt(qtyInput.value) || 1;
            qtyInput.value = newQty;
            await this.updateQuantity(itemId, newQty, qtyInput, e);
          }
          return;
        }

        if (e.target.closest('.btn-cart-remove')) {
          e.preventDefault();
          const itemEl = e.target.closest('[data-menuitem-id]');
          const itemId = itemEl.dataset.menuitemId;
          const removeBtn = e.target.closest('.btn-cart-remove');
          if (confirm('Remove this item from cart?')) {
            await this.removeItem(itemId, removeBtn, e);
          }
          return;
        }

        if (e.target.closest('.btn-cart-clear')) {
          e.preventDefault();
          if (confirm('Clear entire cart? All stock will be restored.')) {
            await this.clearCart(e.target.closest('.btn-cart-clear'));
          }
          return;
        }

        if (e.target.closest('.btn-proceed')) {
          e.preventDefault();
          if (!this.cart.items?.length) {
            this.showToast('Your cart is empty', 'warning');
            return;
          }
          // Save robust cart snapshot for checkout - prevent payload errors
          // Fix menuItem object → string ID for checkout
          const snapshotItems = this.cart.items.map(item => ({
            ...item,
            menuItem: String(item.menuItem?._id || item.menuItem || item.menuItemId || '')
          }));
          const snapshot = {
            items: snapshotItems,
            itemCount: this.cart.itemCount || this.cart.items.reduce((sum, i) => sum + i.quantity, 0),
            totals: this.getTotals(),
            deliveryPreference: this.isDelivery ? 'delivery' : 'pickup'
          };
          localStorage.setItem('checkoutCartSnapshot', JSON.stringify(snapshot));
          console.log('Fixed snapshot saved - menuItem IDs:', snapshotItems.map(i => i.menuItem).slice(0,2));
          localStorage.setItem('deliveryPreference', snapshot.deliveryPreference);
          this.showToast('Proceeding to checkout...', 'success');
          window.location.href = 'checkout.html';
          return;
        }

        if (e.target.closest('.btn-delivery-toggle')) {
          e.preventDefault();
          this.isDelivery = !this.isDelivery;
          this.updateDeliveryToggle();
          this.renderSummary();
          return;
        }


      });
    }

    ensureValidCart() {
      if (!Array.isArray(this.cart.items)) {
        console.warn('Invalid cart.items, resetting to []:', this.cart.items);
        this.cart.items = [];
      }
      if (typeof this.cart.itemCount !== 'number') {
        this.cart.itemCount = 0;
      }
      if (typeof this.cart.totalAmount !== 'number') {
        this.cart.totalAmount = 0;
      }
    }

    recalculateCartMetrics() {
      const items = this.cart.items || [];
      this.cart.itemCount = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
      // totalAmount from backend is authoritative, but recalc subtotal for logging
    }

    async updateFromBackend() {
      try {
        this.ensureValidCart();
        
        if (this.token) {
          const response = await this.apiCall('');
          if (response.success && response.data) {
            const backendItems = Array.isArray(response.data.items) ? response.data.items : [];
            const backendItemCount = response.data.itemCount ?? backendItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
            
            this.cart = {
              items: backendItems,
              totalAmount: response.data.totalAmount ?? 0,
              itemCount: backendItemCount,
              ...response.data
            };
            
            console.log('Cart loaded:', {
              items: backendItems.length,
              itemCount: backendItemCount,
              totalAmount: this.cart.totalAmount
            });
          }
        } else {
          const local = this.loadLocalBackup();
          if (local && Array.isArray(local.items)) {
            this.cart = local;
            console.log('Guest cart loaded:', local.items.length, 'items');
          }
        }
        
        this.ensureValidCart();
        this.recalculateCartMetrics();
        this.saveLocalBackup();
        this.updateBadge();
        this.render();
      } catch (error) {
        console.error('Cart sync error:', error);
        this.ensureValidCart();
        if (error.status === 401) {
          this.redirectToLogin();
        }
        this.render();
      }
    }

    async apiCall(endpoint, options = {}) {
      const url = `${this.API_BASE}/cart${endpoint}`;
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { Authorization: `Bearer ${this.token}` })
        },
        ...options
      };

      const response = await fetch(url, config);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const error = new Error(data.message || `HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }

      return response.json();
    }

    async getCart() {
      return this.apiCall('');
    }

    async addToCart(menuItemId, quantity = 1) {
      if (!this.token) throw new Error('Login required');
      if (!this.isValidMongoId(menuItemId)) throw new Error('Invalid menu item ID');
      
      const result = await this.apiCall('', {
        method: 'POST',
        body: JSON.stringify({ menuItemId, quantity })
      });
      
      this.cart = {
        ...result.data,
        itemCount: result.data.itemCount || result.data.items.reduce((sum, i) => sum + i.quantity, 0)
      };
      this.saveLocalBackup();
      this.updateBadge();
      return result;
    }

async updateQuantity(menuItemId, quantity, buttonEl, event) {
      if (!this.token) throw new Error('Login required');
      if (!this.isValidMongoId(menuItemId)) {
        console.warn(`Invalid menuItemId: ${menuItemId}`);
        // Temporarily skip strict validation - backend will handle
      }
      if (quantity < 1) return this.removeItem(menuItemId);

      await this.setElementLoading(buttonEl.closest('.qty-stepper'), true);
      
      try {
        const result = await this.apiCall(`/${menuItemId}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity })
        });
        
        this.cart = {
          ...result.data,
          itemCount: result.data.itemCount || result.data.items.reduce((sum, i) => sum + i.quantity, 0)
        };
        this.saveLocalBackup();
        this.updateBadge();
        this.render();
        this.showToast(`Updated to ${quantity}x`, 'success');
      } catch (error) {
        this.showToast(error.message || 'Update failed', 'error');
        this.render();
      } finally {
        this.setElementLoading(buttonEl.closest('.qty-stepper'), false);
      }
    }

    async removeItem(menuItemId, buttonEl, event) {
      if (!this.token) throw new Error('Login required');
      if (!this.isValidMongoId(menuItemId)) {
        console.warn(`Invalid menuItemId: ${menuItemId}`);
        // Temporarily skip strict validation - backend will handle
      }
      await this.setElementLoading(buttonEl, true);
      
      try {
        await this.apiCall(`/${menuItemId}`, { method: 'DELETE' });
        await this.updateFromBackend();
        this.showToast('Item removed', 'success');
      } catch (error) {
        this.showToast(error.message || 'Remove failed', 'error');
        this.render();
      } finally {
        this.setElementLoading(buttonEl, false);
      }
    }

    async clearCart(buttonEl) {
      if (!this.token) throw new Error('Login required');
      await this.setElementLoading(buttonEl, true);
      
      try {
        // Try clearing by deleting all items individually first
        if (this.cart.items && this.cart.items.length > 0) {
          for (const item of this.cart.items) {
            const menuItemId = String(item.menuItem?._id || item.menuItem || item.menuItemId || item._id || '');
            if (menuItemId) {
              await this.apiCall(`/${menuItemId}`, { method: 'DELETE' });
            }
          }
        }
        
        // Then update from backend to ensure sync
        await this.updateFromBackend();
        this.showToast('Cart cleared', 'success');
      } catch (error) {
        this.showToast(error.message || 'Clear failed', 'error');
        this.render();
      } finally {
        this.setElementLoading(buttonEl, false);
      }
    }

    isValidMongoId(id) {
      return /^[0-9a-fA-F]{24}$/.test(id);
    }

    toggleDeliveryMode(isDelivery) {
      this.isDelivery = !!isDelivery;
      this.updateDeliveryToggle();
      this.renderSummary();
    }

    updateDeliveryToggle() {
      document.querySelectorAll('.delivery-toggle').forEach(btn => {
        btn.textContent = this.isDelivery ? 'Switch to Pickup' : 'Switch to Delivery';
        btn.dataset.mode = this.isDelivery ? 'pickup' : 'delivery';
      });
    }

    getTotals() {
      // Safe reduce with array check
      const items = Array.isArray(this.cart.items) ? this.cart.items : [];
      const subtotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
      
      return { subtotal, grandTotal: subtotal };
    }

    render(isCartPage = this.isCartPage()) {
      if (isCartPage) {
        this.renderItems();
        this.renderSummary();
      }
      this.updateBadge();
    }

    renderItems() {
      const container = document.getElementById('cartItems');
      if (!container) return;

      // Defensive check - ensure items is always array
      if (!Array.isArray(this.cart.items)) {
        console.warn('Cart items is not an array, resetting:', this.cart.items);
        this.cart.items = [];
      }

      if (!this.cart.items.length) {
        container.innerHTML = this.emptyCartHTML();
        return;
      }

      container.innerHTML = this.cart.items.map(item => {
        const menuItemId = String(item.menuItem?._id || item.menuItem || item.menuItemId || item._id || '');
        const image = item.image || '/asset/grilled.jpg';
        const quantity = item.quantity || 1;
        const price = item.price || 0;
        
        return `
          <div class="cart-item-card" data-menuitem-id="${menuItemId}" data-quantity="${quantity}">
            <img src="${image}" alt="${this.escapeHtml(item.name || 'Item')}" class="item-image" loading="lazy" onerror="this.src='/asset/grilled.jpg'">
            <div class="item-details">
              <h3 class="item-name">${this.escapeHtml(item.name || 'Unnamed Item')}</h3>
              <div class="item-price">₦${(price * quantity).toLocaleString()}</div>
              <div class="item-price-small">Unit: ₦${price.toLocaleString()}</div>
              <div class="item-controls">
                <div class="qty-stepper">
                  <button class="qty-btn" data-delta="-1" ${quantity <= 1 ? 'disabled' : ''} aria-label="Decrease">
                    <i class="fas fa-minus"></i>
                  </button>
                  <span class="qty-display">${quantity}</span>
                  <button class="qty-btn" data-delta="1" aria-label="Increase">
                    <i class="fas fa-plus"></i>
                  </button>
                </div>
                <button class="btn-cart-remove ms-3">
                  <i class="fas fa-trash"></i> Remove
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    renderSummary() {
      const summaryEl = document.querySelector('.cart-summary');
      if (!summaryEl) return;

      if (!this.cart.items.length) {
        summaryEl.innerHTML = '<div class="text-center py-4 text-muted">No items</div>';
        return;
      }

      const { subtotal, grandTotal } = this.getTotals();
      const deliveryMode = this.isDelivery ? 'Delivery' : 'Pickup';

      summaryEl.innerHTML = `
        <div class="mb-3 p-3 bg-light rounded">
          <button class="btn btn-outline-primary btn-delivery-toggle w-100 btn-sm" data-mode="${deliveryMode.toLowerCase()}">
            <i class="fas ${this.isDelivery ? 'fa-truck' : 'fa-walking'} me-2"></i>
            ${deliveryMode}
          </button>
        </div>
        
        <div class="summary-row"><span>Subtotal (${this.cart.itemCount} items)</span><strong>₦${subtotal.toLocaleString()}</strong></div>
        <div class="summary-row summary-total">
          <span><strong>Grand Total</strong></span>
          <strong>₦${grandTotal.toLocaleString()}</strong>
        </div>
        
        <button class="btn-proceed w-100 mt-3">
          <i class="fas fa-credit-card me-2"></i>Proceed to Checkout ₦${grandTotal.toLocaleString()}
        </button>
        <button class="btn-cart-clear w-100 mt-2">
          <i class="fas fa-trash me-2"></i>Clear Cart
        </button>
      `;
    }

    emptyCartHTML() {
      return `
        <div class="cart-empty text-center py-5">
          <div class="empty-icon fs-1 mb-4">🛒</div>
          <h2>Your Cart is Empty</h2>
          <p class="text-muted mb-4">Add items from <a href="user-dashboard.html#menu">Menu</a></p>
          ${this.token ? '' : '<p class="small text-warning">Login to save cart across devices</p>'}
        </div>
      `;
    }

    isCartPage() {
      return !!document.getElementById('cartItems');
    }

    updateBadge() {
      // Defensive checks before any operations
      if (!Array.isArray(this.cart.items)) {
        console.warn('updateBadge: cart.items is not array, using itemCount only');
        const count = this.cart.itemCount || 0;
        this.setBadgeCount(count);
        return;
      }
      
      const count = this.cart.itemCount ?? this.cart.items.reduce((sum, i) => sum + (i.quantity || 0), 0);
      this.setBadgeCount(count);
    }
    
    setBadgeCount(count) {
      document.querySelectorAll('.cart-badge, .cart-count').forEach(badge => {
        badge.textContent = count;
        badge.classList.toggle('d-none', count === 0);
      });
      document.dispatchEvent(new CustomEvent('cartUpdated', { detail: count }));
    }

    saveLocalBackup() {
      if (!this.token) {
        localStorage.setItem('guest_cart', JSON.stringify(this.cart));
      }
    }

    loadLocalBackup() {
      try {
        return JSON.parse(localStorage.getItem('guest_cart') || '{}');
      } catch {
        return null;
      }
    }

    setElementLoading(el, loading) {
      if (!el) return;
      
      if (loading) {
        // Store original content
        if (!el._originalHTML) {
          el._originalHTML = el.innerHTML;
        }
        el.classList.add('loading');
        el.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Loading...';
        el.disabled = true;
      } else {
        // Restore original content
        if (el._originalHTML) {
          el.innerHTML = el._originalHTML;
          el._originalHTML = null;
        }
        el.classList.remove('loading');
        el.disabled = false;
      }
    }

    showToast(message, type = 'info') {
      // Bootstrap toast compatible - 1 second duration
      const toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3 z-1055';
      const toastEl = document.createElement('div');
      toastEl.className = `toast align-items-center text-bg-${type} border-0`;
      toastEl.setAttribute('role', 'alert');
      toastEl.innerHTML = `
        <div class="d-flex">
          <div class="toast-body"><strong>${message}</strong></div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      `;
      toastContainer.appendChild(toastEl);
      document.body.appendChild(toastContainer);
      
      const bsToast = new bootstrap.Toast(toastEl, {
        autohide: true,
        delay: 1000
      });
      bsToast.show();
      
      toastEl.addEventListener('hidden.bs.toast', () => {
        if (toastContainer.parentNode) {
          toastContainer.remove();
        }
      });
      
      // Global alias for other files
      if (typeof window.showToast !== 'function') {
        window.showToast = this.showToast.bind(this);
      }
    }

    redirectToLogin() {
      // Removed login toast - handled by redirect
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    }

    escapeHtml(text) {
      const map = { '&': '&amp;', '<': '<', '>': '>', '"': '"', "'": '&#039;' };
      return text.replace(/[&<>"']/g, m => map[m]);
    }
  }

  // Global functions
  window.CartManager = new CartManager();

  window.addToCart = async (menuItemId, quantity = 1) => {
    try {
      await window.CartManager.addToCart(menuItemId, quantity);
      window.CartManager.showToast('Added to cart!', 'success');
    } catch (error) {
      window.CartManager.showToast(error.message, 'error');
      if (error.status === 401) {
        window.location.href = 'login.html';
      }
    }
  };

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.CartManager.render());
  } else {
    window.CartManager.render();
  }

})();

