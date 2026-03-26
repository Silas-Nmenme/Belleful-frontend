// Menu functionality + API integration (DB API only - static data removed) [IIFE-wrapped]

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
  
  // Ultimate defensive check - skip if ANY required element missing
  if (!safeElementAccess(menuGrid, 'menuGrid existence') || !safeElementAccess(menuLoading, 'menuLoading existence')) {
    console.warn('Required menu elements missing - skipping loadMenu');
    return;
  }

  try {
    // Safe hide/show with double-check
    safeElementAccess(menuGrid, 'hide grid', () => menuGrid.style.display = 'none');
    safeElementAccess(menuLoading, 'show loading', () => menuLoading.style.display = 'flex');
    
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
    safeElementAccess(menuLoading, 'hide loading on error', () => menuLoading.style.display = 'none');
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
    elements.menuGrid.innerHTML = `
      <div class="col-12 text-center py-5 col-span-full">
        <i class="fas fa-utensils fa-3x text-muted mb-4"></i>
        <h5>No menu items available</h5>
        <p class="text-muted">Check back soon!</p>
        <button class="btn btn-primary" onclick="loadMenu()">Refresh Menu</button>
      </div>
    `;
    elements.menuGrid.style.display = 'block';
    return;
  }
  
  let renderCount = 0;
  items.forEach((item, index) => {
    try {
      const card = createMenuCard(item, index);
      elements.menuGrid.appendChild(card);
      renderCount++;
    } catch (e) {
      console.error('Failed to render item', index, item, e);
    }
  });
  console.log('Successfully rendered', renderCount, '/', items.length, 'cards');
  
  // Safe display updates
  safeElementAccess(elements.menuGrid, 'show grid', () => elements.menuGrid.style.display = 'grid');
  safeElementAccess(elements.menuLoading, 'hide loading', () => elements.menuLoading.style.display = 'none');
  
  // Update count display
  const countDisplay = document.getElementById('menuCountDisplay');
  if (countDisplay) {
    countDisplay.textContent = items.length;
  }
  
  // Trigger AOS refresh for new elements
  setTimeout(() => AOS.refresh(), 100);
}

// Create individual menu card
function createMenuCard(item, delayIndex = 0) {
  const card = document.createElement('div');
  card.className = 'menu-card';
  card.setAttribute('data-aos', 'fade-up');
  card.setAttribute('data-aos-delay', delayIndex * 100);
  
  card.innerHTML = `
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
        <button class="btn btn-success w-100 add-to-cart-btn" onclick="addToCartSafe('${item._id}', 1)" ${!item.available ? 'disabled' : ''}>
          ${item.available ? '<i class="fas fa-plus me-2"></i>Add to Cart' : '<i class="fas fa-ban me-2"></i>Unavailable'}
        </button>
      </div>
    </div>
  `;
  
  return card;
}

// Safe addToCart wrapper - works with/without cart.js
window.addToCartSafe = async function(menuItemId, quantity = 1) {
  // Robust retry mechanism for cart.js loading
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (typeof window.addToCart === 'function') {
        // cart.js loaded - use API cart
        await window.addToCart(menuItemId, quantity);
        showToast('Added to cart!', 'success');
        updateCartCount(); // Trigger badge update
        return;
      } else if (attempt === 1) {
        // First attempt failed, wait for cart.js
        await new Promise(resolve => setTimeout(resolve, 200 * attempt));
      }
    } catch (error) {
      lastError = error;
      console.warn(`addToCart attempt ${attempt} failed:`, error);
      await new Promise(resolve => setTimeout(resolve, 300 * attempt));
    }
  }
  
  // All retries failed - use robust local fallback
  console.log('Using local cart fallback after retries');
  addToLocalCart(menuItemId, 0, '');
  const totalItems = getLocalCart().items.reduce((sum, item) => sum + item.quantity, 0);
  updateCartCount(totalItems);
  showToast('Added to cart (local)', 'success');
};

// Pure API cart - no guest/localStorage fallback
// addToCartSafe will redirect unauth users to login

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
  setTimeout(() => toast.remove(), 4000);
}



    // Expose global functions
    window.MenuManager = window.MenuManager || {};
    window.MenuManager.initialized = true;
    window.MenuManager.loadMenu = loadMenu;
    window.MenuManager.addToCartSafe = addToCartSafe;
    
  })();
  
  // Auto-init only if menu elements exist
  if (document.getElementById('menuGrid')) {
    window.loadMenu();
  }
