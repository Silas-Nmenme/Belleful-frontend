// Cart management - shared across pages
let currentCart = [];

// Initialize cart system
document.addEventListener('DOMContentLoaded', initCartSystem);

function initCartSystem() {
  checkAuthStatus();
  updateCartUI();
}

// Auth check + cart sync
async function checkAuthStatus() {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  
  if (token && !currentCart.length) {
    try {
      const response = await fetch(`${window.API_BASE}/cart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        currentCart = result.data?.items || [];
      }
    } catch (error) {
      console.warn('Cart sync failed:', error);
    }
  }
}

// Update cart count in navbar (all pages)
function updateCartCount() {
  const badges = document.querySelectorAll('.cart-count');
  const count = currentCart.length;
  badges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  });
}

// Guest to auth cart merge
async function mergeGuestCart() {
  const guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items":[]}');
  if (guestCart.items.length === 0) return;
  
  const token = localStorage.getItem('token');
  if (!token) return;
  
  for (const item of guestCart.items) {
    try {
      await fetch(`${window.API_BASE}/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ menuItemId: item.menuItemId, quantity: item.quantity })
      });
    } catch (error) {
      console.error('Merge failed:', error);
    }
  }
  
  localStorage.removeItem('guestCart');
  updateCartUI();
}

// Export for other modules
window.CartManager = {
  currentCart,
  addItem: (item) => {
    currentCart.push(item);
    updateCartUI();
  },
  removeItem: (menuItemId) => {
    currentCart = currentCart.filter(item => item.menuItemId !== menuItemId);
    updateCartUI();
  },
  getTotal: () => currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
  updateCartUI
};

function updateCartUI() {
  updateCartCount();
}
