(function() {
  // DOM Elements - get dynamically to avoid const redeclaration
function getMenuElements() {
    return {
      menuGrid: document.getElementById('menuGrid'),
      menuLoading: document.querySelector('.menu-loading'),
      menuLink: document.getElementById('menuLink')
    };
  }
  
  // Safe element accessor
  function safeElementAccess(element, action, fallback = () => {}) {
    if (!element) {
      console.warn(`Menu element missing for ${action}`);
      fallback();
      return false;
    }
    return true;
  }
  
  // Check if already initialized
  if (window.MenuManager && window.MenuManager.initialized) return;
  
  // Load menu items - main entry point
window.loadMenu = async function() {
  const elements = getMenuElements();
  const { menuGrid, menuLoading } = elements;
  
  // Ultimate defensive check - only require menuGrid (index.html style, no loading spinner needed)
  if (!safeElementAccess(menuGrid, 'menuGrid existence')) {
    console.warn('menuGrid missing - skipping loadMenu');
    return;
  }

  try {
    // Direct load without spinner for smooth display
    const response = await fetch(`${window.API_BASE}/menu?page=1&limit=1000&available=true`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const { data: menuItems = [] } = await response.json();
    
    console.log('🔍 DB Menu Loaded:', menuItems.length, 'items from API');
    
    const itemsToShow = menuItems.filter(item => item && item.name); // Filter invalid
    console.log('Items to display:', itemsToShow.length);
    
    displayMenuItems(itemsToShow, elements);
  } catch (error) {
    console.error('Menu API failed (no fallback):', error);
    
    // Safe error UI update
    if (safeElementAccess(menuGrid, 'error UI')) {
      menuGrid.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="fas fa-utensils fa-4x text-muted mb-4"></i>
          <h4 class="text-warning mb-3">Menu Unavailable</h4>
          <p class="text-muted mb-4">Please refresh or check connection</p>
          <button class="btn btn-primary" onclick="loadMenu()">Reload Menu</button>
        </div>`;
    }
    // No menuLoading element
  }
}

// Display menu items with animations
function displayMenuItems(items, elements) {
  console.log('🎨 Rendering', items.length, 'menu cards');
  
  // ULTIMATE defensive checks - use window fallback if elements incomplete
  const safeElements = {
    menuGrid: elements?.menuGrid || window.menuElements?.menuGrid || document.getElementById('menuGrid'),
    menuLoading: elements?.menuLoading || window.menuElements?.menuLoading || document.querySelector('.menu-loading'),
    menuCountDisplay: elements?.menuCountDisplay || window.menuElements?.menuCountDisplay || document.getElementById('menuCountDisplay')
  };
  
  if (!safeElements.menuGrid) {
    console.error('CRITICAL: No menuGrid found');
    return;
  }
  
  // Safe grid clear
  try {
    safeElements.menuGrid.innerHTML = '';
  } catch (e) {
    console.error('Failed to clear menuGrid:', e);
    return;
  }

  
  if (items.length === 0) {
    safeElements.menuGrid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fas fa-utensils fa-3x text-muted mb-4"></i>
        <h5>No menu items available</h5>
        <p class="text-muted">Check back soon!</p>
        <button class="btn btn-primary" onclick="loadMenu()">Refresh Menu</button>
      </div>
    `;
    safeElements.menuGrid.style.display = 'block';
    return;
  }
  
  let renderCount = 0;
  items.forEach((item, index) => {
    try {
      const card = createMenuCard(item, index);
      safeElements.menuGrid.appendChild(card);
      renderCount++;
    } catch (e) {
      console.error('Failed to render item', index, item, e);
    }
  });
  console.log('Successfully rendered', renderCount, '/', items.length, 'cards');
  
// Safe display updates

// Remove hidden class and reset for Bootstrap grid
  const menuGrid = safeElements.menuGrid;
  menuGrid.classList.remove('hidden');
  menuGrid.className = 'row g-4 menu-grid';
  menuGrid.style.display = 'flex';
  menuGrid.style.visibility = 'visible';
  menuGrid.style.minHeight = '400px';

  // No menuLoading element - grid shows immediately

  
  // Update count display
  const countDisplay = document.getElementById('menuCountDisplay');
  if (countDisplay) {
    countDisplay.textContent = items.length;
  }
  
  // Show login toast if not authenticated
  const token = localStorage.getItem('token');
  if (!token && typeof showToast === 'function') {
    // Removed informational login toast
  }
  
  // Trigger AOS refresh for new elements
  setTimeout(() => AOS.refresh(), 100);
}

// Create individual menu card
function createMenuCard(item, delayIndex = 0) {
  const colWrapper = document.createElement('div');
  colWrapper.className = 'col-lg-3 col-md-4 col-sm-6 menu-card';
  colWrapper.setAttribute('data-aos', 'fade-up');
  colWrapper.setAttribute('data-aos-delay', delayIndex * 100);
  
  colWrapper.innerHTML = `
    <div class="card h-100">
      <img src="${item.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400'}" 
           class="card-img-top" alt="${item.name}"
           onerror="this.src='https://via.placeholder.com/400x300/667eea/ffffff?text=No+Image'; this.onerror=null;"> 
      <div class="card-body d-flex flex-column">
        <h5 class="card-title fw-bold mb-2">${item.name}</h5>
        <p class="card-text text-muted flex-grow-1">${item.description || 'Delicious ' + item.category}</p>
        <div class="d-flex justify-content-between align-items-center mb-3">
          <span class="menu-price">₦${(item.price || 0).toLocaleString()}</span>
          <span class="badge bg-${item.category === 'food' ? 'primary' : item.category === 'drink' ? 'info' : 'secondary'}">
            ${item.category}
          </span>
        </div>
${isLoggedIn() ? `
          <button class="add-to-cart-btn w-100" onclick="addToCartSafe('${item._id || item.id}', 1)">
            <i class="fas fa-cart-plus me-2"></i><strong>Add to Cart</strong>
          </button>
        ` : `
          <div class="login-to-order text-center p-3 bg-light rounded border">
            <i class="fas fa-lock me-2 text-info"></i><strong>Login to order</strong>
          </div>
        `}
      </div>
    </div>
  `;
  
  return colWrapper;
}

// API-only addToCart wrapper
window.addToCartSafe = async function(menuItemId, quantity = 1) {
  try {
    if (typeof window.addToCart !== 'function') {
      throw new Error('Cart functions not loaded');
    }
    await window.addToCart(menuItemId, quantity);
    showToast('Added to cart!', 'success');
    updateCartCount(); // Trigger badge update
  } catch (error) {
    console.error('Add to cart failed:', error);
    showToast('Failed to add item. Please try again.', 'error');
  }
};

function isLoggedIn() {
  return !!localStorage.getItem('token');
}

// updateCartCount - dispatches event for badges
function updateCartCount(count) {
  const badge = document.querySelector('.cart-badge');
  if (badge) {
    badge.dataset.count = count;
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.toggle('hidden', count === 0);
  }
  document.dispatchEvent(new CustomEvent('cartUpdated', { detail: count }));
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `page-toast page-toast--${type} shadow-lg p-3 rounded-3 position-fixed top-0 end-0 m-4`;
  toast.style.maxWidth = '400px';
  toast.innerHTML = '<strong>' + (type === 'success' ? '✅' : '❌') + ' ' + message + '</strong><button class="btn-close ms-2" onclick="this.parentElement.remove()"></button>';

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1000); // Changed to 1 second
}

    // Auto-init only if menu elements exist
    if (document.getElementById('menuGrid')) {
      window.loadMenu();
    }

    // Expose global functions
    window.MenuManager = window.MenuManager || {};
    window.MenuManager.initialized = true;
    window.MenuManager.loadMenu = loadMenu;
    window.MenuManager.addToCartSafe = addToCartSafe;
    
  })();

  

