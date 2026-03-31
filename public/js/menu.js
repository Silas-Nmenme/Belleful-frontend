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
  const menuGrid = document.getElementById('menuGridFast') || document.getElementById('menuGrid');
  const menuLoading = document.getElementById('menuLoadingFast') || document.querySelector('.menu-loading');
  const countDisplay = document.getElementById('menuCountDisplay');

  if (!menuGrid) {
    console.warn('menuGrid not found');
    return;
  }

  // Show skeleton/loading fast
  if (menuLoading) menuLoading.style.display = 'block';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(`${window.API_BASE}/menu?page=1&limit=100&available=true`, {
      cache: 'force-cache',
      signal: controller.signal,
      keepalive: true
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const result = await response.json();
    const menuItems = result.data || [];
    
    console.log('Menu loaded:', menuItems.length, 'items');
    
    const validItems = menuItems.filter(item => item && item.name && item.price);
    
    displayMenuItemsFast(validItems, menuGrid, menuLoading, countDisplay);
  } catch (error) {
    console.error('Menu load error:', error);
    menuGrid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fas fa-utensils fa-4x text-muted mb-4"></i>
        <h4 class="text-warning mb-3">Menu temporarily unavailable</h4>
        <p class="text-muted mb-4">Check connection or <button class="btn btn-sm btn-outline-primary" onclick="loadMenu()">retry</button></p>
      </div>`;
    if (menuLoading) menuLoading.style.display = 'none';
  }
}


// Fast display - direct, no fallbacks
function displayMenuItemsFast(items, menuGrid, menuLoading, countDisplay) {
  console.log('Rendering', items.length, 'items fast');
  
  menuGrid.innerHTML = '';
  
  if (items.length === 0) {
    menuGrid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fas fa-utensils fa-3x text-muted mb-4"></i>
        <h5 class="text-muted">No items available</h5>
        <button class="btn btn-primary" onclick="loadMenu()">Refresh</button>
      </div>`;
    if (menuLoading) menuLoading.style.display = 'none';
    return;
  }
  
  items.slice(0, 24).forEach((item, index) => { // Limit for perf
    try {
      const card = createMenuCard(item, index * 50); // Staggered AOS
      menuGrid.appendChild(card);
    } catch (e) {
      console.error('Render error:', e);
    }
  });
  
  // Reset grid, hide loading smooth
  menuGrid.className = 'row g-4 menu-grid';
  menuGrid.style.minHeight = '400px';
  
  if (menuLoading) {
    menuLoading.classList.add('hidden');
    setTimeout(() => menuLoading.style.display = 'none', 300);
  }
  
  if (countDisplay) countDisplay.textContent = items.length;
  
  // AOS refresh
  if (typeof AOS !== 'undefined') AOS.refresh();
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
  
  return card;
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
  setTimeout(() => toast.remove(), 4000);
}

  // Auto early init if grid exists
  const grid = document.getElementById('menuGridFast') || document.getElementById('menuGrid');
  if (grid && typeof window.loadMenu === 'function') {
    // Delay slight for parallel loads
    setTimeout(window.loadMenu, 50);
  }

  window.MenuManager = { initialized: true, loadMenu, addToCartSafe };
  
})();

  

