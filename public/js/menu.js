// Menu functionality + API integration

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

  // Static fallback menu - displays ALL items even if API empty/fails
  const staticMenuItems = [
    { _id: '1', name: 'Jollof Rice', price: 2500, category: 'food', description: 'Spicy Nigerian jollof rice with chicken', image: 'https://images.unsplash.com/photo-1579586140626-58aab2eb442e?w=400', available: true },
    { _id: '2', name: 'Egusi Soup', price: 3500, category: 'food', description: 'Rich egusi soup with assorted meats', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400', available: true },
    { _id: '3', name: 'Pounded Yam', price: 2800, category: 'food', description: 'Smooth pounded yam swallow', image: 'https://images.unsplash.com/photo-1599948586636-fde8e11d4fdc?w=400', available: true },
    { _id: '4', name: 'Fried Rice', price: 2200, category: 'food', description: 'Vegetable fried rice with shrimp', image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400', available: true },
    { _id: '5', name: 'Grilled Fish', price: 4500, category: 'food', description: 'Fresh tilapia grilled with pepper sauce', image: 'https://images.unsplash.com/photo-1628079308096-4837e1d8d581?w=400', available: true },
    { _id: '6', name: 'White Rice & Stew', price: 2000, category: 'food', description: 'Classic white rice with spicy stew', image: 'https://images.unsplash.com/photo-1632398004518-47e3d15552e8?w=400', available: true },
    { _id: '7', name: 'Beans Porridge', price: 2300, category: 'food', description: 'Honey beans porridge with plantain', image: 'https://images.unsplash.com/photo-1626761343925-10b89aa586d8?w=400', available: true },
    { _id: '8', name: 'Pepper Soup', price: 3800, category: 'food', description: 'Spicy catfish pepper soup', image: 'https://images.unsplash.com/photo-1628700453423-1be17fc3a249?w=400', available: true },
    { _id: '9', name: 'Suya', price: 1500, category: 'food', description: 'Spicy beef suya skewers', image: 'https://images.unsplash.com/photo-1632845831278-100ae5634b59?w=400', available: true },
    { _id: '10', name: 'Puff Puff', price: 800, category: 'food', description: 'Fresh Nigerian doughnuts', image: 'https://images.unsplash.com/photo-1627806818431-429d92a0542c?w=400', available: true },
    { _id: '11', name: 'Chapman Drink', price: 1200, category: 'drink', description: 'Refreshing Nigerian cocktail mocktail', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', available: true },
    { _id: '12', name: 'Chappal Water', price: 500, category: 'drink', description: 'Pure mineral water', image: 'https://images.unsplash.com/photo-1571102067898-6f17170ffe11?w=400', available: true },
    { _id: '13', name: 'Orange Juice', price: 900, category: 'drink', description: 'Fresh squeezed orange juice', image: 'https://images.unsplash.com/photo-1592924554336-777d09918b31?w=400', available: true },
    { _id: '14', name: 'Mango Smoothie', price: 1100, category: 'drink', description: 'Creamy mango smoothie', image: 'https://images.unsplash.com/photo-1622293462325-2e934f5ac719?w=400', available: true },
    { _id: '15', name: 'Star Beer', price: 700, category: 'drink', description: 'Cold Star lager beer', image: 'https://images.unsplash.com/photo-1571617204891-61480380b017?w=400', available: true },
    { _id: '16', name: 'Egusi with Fufu', price: 4200, category: 'food', description: 'Egusi soup served with fufu', image: 'https://images.unsplash.com/photo-1621996343925-10b89aa586d8?w=400', available: true },
    { _id: '17', name: 'Amala & Ewedu', price: 3200, category: 'food', description: 'Traditional amala with ewedu soup', image: 'https://images.unsplash.com/photo-1599948586636-fde8e11d8fdc?w=400', available: true },
    { _id: '18', name: 'Yam & Egg Sauce', price: 2600, category: 'food', description: 'Boiled yam with spicy egg sauce', image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400', available: true },
    { _id: '19', name: 'Moi Moi', price: 1400, category: 'food', description: 'Steamed bean pudding', image: 'https://images.unsplash.com/photo-1628700453423-1be17fc3a249?w=400', available: true },
    { _id: '20', name: 'Plantain Chips', price: 600, category: 'food', description: 'Crispy plantain chips', image: 'https://images.unsplash.com/photo-1632398004518-47e3d15552e8?w=400', available: true },
    { _id: '21', name: 'Oha Soup', price: 3900, category: 'food', description: 'Delicate oha leaves soup', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400', available: true },
    { _id: '22', name: 'Bitterleaf Soup', price: 3400, category: 'food', description: 'Authentic onugbu soup', image: 'https://images.unsplash.com/photo-1628079308096-4837e1d8d581?w=400', available: true }
  ];
  
  try {
    menuGrid.style.display = 'none';
    menuLoading.style.display = 'flex';
    
    const response = await fetch(`${window.API_BASE}/menu`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const { data: menuItems = [] } = await response.json();
    
    // Use API data OR static data if API empty
    const itemsToShow = menuItems.length > 0 ? menuItems : staticMenuItems;
    
    displayMenuItems(itemsToShow);
  } catch (error) {
    console.error('API failed, using static menu:', error);
    displayMenuItems(staticMenuItems);
  }
}

// Display menu items with animations
function displayMenuItems(items) {
  menuGrid.innerHTML = '';
  
  items.forEach((item, index) => {
    const card = createMenuCard(item, index);
    menuGrid.appendChild(card);
  });
  
  menuGrid.style.display = 'flex';
  menuLoading.style.display = 'none';
  
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
});

// Update cart count on page load (use server cart if logged in)
    const token = localStorage.getItem('token');
    updateCartCount(token ? (window.CartManager?.currentCart?.length || 0) : getLocalCart().items.length);

