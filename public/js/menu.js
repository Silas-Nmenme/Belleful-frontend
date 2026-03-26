// Menu functionality + API integration (DB API only - static data removed)

// DOM Elements
const menuGrid = document.getElementById('menuGrid');
const menuLoading = document.querySelector('.menu-loading');
const menuLink = document.getElementById('menuLink');

// Load menu items on page load and menu link click
async function loadMenu() {
  // Defensive null checks - elements may not exist on all pages
  if (!menuGrid || !menuLoading) {
    console.warn('Menu elements not found on this page');
    return;
  }

  try {
    menuGrid.style.display = 'none';
    menuLoading.style.display = 'flex';
    
    const response = await fetch(`${window.API_BASE}/menu?page=1&limit=1000&available=true`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const { data: menuItems = [] } = await response.json();
    
    console.log('🔍 DB Menu Loaded:', menuItems.length, 'items from API');
    
    const itemsToShow = menuItems.filter(item => item && item.name); // Filter invalid
    console.log('Items to display:', itemsToShow.length);
    
    displayMenuItems(itemsToShow);
  } catch (error) {
    console.error('Menu API failed (no fallback):', error);
    menuGrid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fas fa-utensils fa-4x text-muted mb-4"></i>
        <h4 class="text-warning mb-3">Menu Unavailable</h4>
        <p class="text-muted mb-4">Please refresh or check connection</p>
        <button class="btn btn-primary" onclick="loadMenu()">Reload Menu</button>
      </div>`;
    menuLoading.style.display = 'none';
  }
}

// Display menu items with animations
function displayMenuItems(items) {
  console.log('🎨 Rendering', items.length, 'menu cards');
  menuGrid.innerHTML = '';
  
  if (items.length === 0) {
    menuGrid.innerHTML = `
      <div class="col-12 text-center py-5 col-span-full">
        <i class="fas fa-utensils fa-3x text-muted mb-4"></i>
        <h5>No menu items available</h5>
        <p class="text-muted">Check back soon!</p>
        <button class="btn btn-primary" onclick="loadMenu()">Refresh Menu</button>
      </div>
    `;
    menuGrid.style.display = 'block';
    return;
  }
  
  let renderCount = 0;
  items.forEach((item, index) => {
    try {
      const card = createMenuCard(item, index);
      menuGrid.appendChild(card);
      renderCount++;
    } catch (e) {
      console.error('Failed to render item', index, item, e);
    }
  });
  console.log('Successfully rendered', renderCount, '/', items.length, 'cards');
  
  menuGrid.style.display = 'grid'; // Ensure grid layout
  menuLoading.style.display = 'none';
  
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
          <span class="menu-price">₦${item.price.toLocaleString()}</span>
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
  if (typeof window.addToCart === 'function') {
    // cart.js loaded
    await window.addToCart(menuItemId, quantity);
  } else {
    // Fallback local cart
    addToLocalCart(menuItemId, 0, ''); // Price/name from localStorage if needed
    updateCartCount(getLocalCart().items.reduce((sum, item) => sum + item.quantity, 0));
    showToast('Added to cart (guest mode)', 'success');
  }
};

// Add to cart function (works pre/post auth)
// Custom addToCart removed - use window.addToCart from cart.js
// Keeps local functions for guest cart sync
function getLocalCart() {
  return JSON.parse(localStorage.getItem('guestCart') || '{"items": [], "totalAmount": 0}');
}

function addToLocalCart(menuItemId, price, name) {
  let cart = getLocalCart();
  const existing = cart.items.find(item => item.menuItemId === menuItemId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.items.push({ menuItemId, name, price, quantity: 1 });
  }
  cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  localStorage.setItem('guestCart', JSON.stringify(cart));
}

function updateCartCount(count) {
  const badge = document.querySelector('.cart-badge');
  if (badge) {
    badge.dataset.count = count;
    badge.textContent = count;
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



// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('menuGrid')) {
    loadMenu();
  }
});
