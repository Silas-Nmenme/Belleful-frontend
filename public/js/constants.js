// Constants & Local Database
window.API_BASE = 'https://belleful-fphf.vercel.app/api';

// Local Persistent Database
window.DB = JSON.parse(localStorage.getItem('bellefulDB')) || {
  version: 1,
  users: [
    {
      id: 1,
      name: 'John Doe',
      email: 'user@example.com',
      password: '$2b$10$N9XoIVVYAH5/', // password123
      role: 'user',
      createdAt: Date.now() - 1000*60*60*24*30,
      totalOrders: 5,
      totalSpent: 18500
    },
    {
      id: 2,
      name: 'Belleful Admin',
      email: 'admin@belleful.com', 
      password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123
      role: 'admin',
      createdAt: Date.now() - 1000*60*60*24*365,
      isSuperAdmin: true
    }
  ],
  orders: [
    {
      id: 'order001',
      userId: 1,
      items: [{name: 'Jollof Rice', qty: 2, price: 3500}],
      totalAmount: 7000,
      orderStatus: 'delivered',
      paymentStatus: 'paid',
      createdAt: Date.now() - 1000*60*60*2
    },
    {
      id: 'order002',
      userId: 1,
      items: [{name: 'Egusi Soup + Pounded Yam', qty: 1, price: 4500}],
      totalAmount: 4500,
      orderStatus: 'delivered',
      paymentStatus: 'paid',
      createdAt: Date.now() - 1000*60*60*24*3
    },
    // More sample orders...
    {
      id: 'order003',
      userId: 1,
      items: [{name: 'Grilled Fish', qty: 1, price: 6500}],
      totalAmount: 6500,
      orderStatus: 'pending_approval',
      paymentStatus: 'pending',
      createdAt: Date.now() - 1000*60*60*1
    }
  ],
  menuItems: [
    {id: 'm1', name: 'Jollof Rice', price: 3500, category: 'food', available: true},
    {id: 'm2', name: 'Egusi Soup', price: 2800, category: 'soup', available: true},
    // etc
  ],
  nextId: {users: 3, orders: 4}
};

// Auto-save DB changes
const originalDB = window.DB;
window.saveDB = function() {
  try {
    localStorage.setItem('bellefulDB', JSON.stringify(window.DB));
  } catch(e) {
    console.error('DB save failed:', e);
  }
};

// Password hash verification (simple mock - use crypto.subtle in prod)
window.verifyPassword = async function(password, hash) {
  // Mock verification - in real app use Web Crypto API
  const knownHashes = {
    'password123': '$2b$10$N9XoIVVYAH5/',
    'admin123': '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
  };
  return knownHashes[password] === hash;
};

// Token generation (JWT-like)
window.generateToken = function(userId) {
  const payload = {userId, iat: Date.now(), exp: Date.now() + 1000*60*60*24};
  return btoa(JSON.stringify(payload)) + '.' + btoa('signature');
};

// Verify token
window.verifyToken = function(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[0]));
    return payload.exp > Date.now() && payload.userId;
  } catch {
    return null;
  }
};

saveDB(); // Initial save

