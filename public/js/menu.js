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
    
    const response = await fetch(`${window.API_BASE}/menu`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const { data: menuItems = [] } = await response.json();
    
    console.log('🔍 DB Menu Loaded:', menuItems.length, 'items from API');
    console.log('Sample items:', menuItems.slice(0,3));
    
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
        <button class="btn btn-success w-100 add-to-cart-btn" onclick="addToCart(event, '${item._id}', ${item.price}, '${item.name}')" ${!item.available ? 'disabled' : ''}>
          ${item.available ? '<i class="fas fa-plus me-2"></i>Add to Cart' : '<i class="fas fa-ban me-2"></i>Unavailable'}
        </button>
      </div>
    </div>
  `;
  
  return card;
}

// Add to cart function (works pre/post auth)
async function addToCart(e, menuItemId, price, name) {
  const btn = e?.target?.closest('button');
  const originalText = btn.innerHTML;
  
  try {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Adding...';
    btn.disabled = true;
    
    // Check auth status
    const token = localStorage.getItem('token');
    
    if (token) {
      // Authenticated - API call
      const response = await fetch(`${window.API_BASE}/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ menuItemId, quantity: 1 })
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          alert('Session expired. Please login again.');
          window.location.href = 'login.html';
          return;
        }
        throw new Error('Failed to add to cart');
      }
      
      const cart = await response.json();
      updateCartCount(cart.data.items.length);
      showToast('Added to cart!', 'success');
    } else {
      // Guest - localStorage cart
      addToLocalCart(menuItemId, price, name);
      updateCartCount(getLocalCart().items.length);
      showToast('Added to cart!', 'success');
    }
  } catch (error) {
    console.error('Add to cart error:', error);
    showToast('Failed to add item. Please try again.', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// LocalStorage cart for guests
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
  const badge = document.querySelector('.cart-count');
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Toast notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast-notification animate__animated animate__fadeInDown position-fixed top-0 end-0 m-4 p-3 rounded-4 shadow-lg`;
  toast.style.cssText = `
    background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
    color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
    z-index: 9999;
    max-width: 350px;
  `;
  toast.innerHTML = `
    <strong>${type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : 'Info'} </strong> ${message}
    <button type="button" class="btn-close ms-3" onclick="this.parentElement.remove()"></button>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('animate__fadeOutUp');
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('menuGrid')) {
    loadMenu();
  }
});

menuLink?.addEventListener('click', (e) => {
  e.preventDefault();
  document.querySelector('#menu').scrollIntoView({ behavior: 'smooth' });
  loadMenu();
