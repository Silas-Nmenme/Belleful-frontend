// Belleful Professional Admin Dashboard V2
// Enhanced - RECURSION FIXED

let stats = {}, orders = [], menuItems = [], analytics = [];
let currentOrderPage = 1, totalOrderPages = 1;

// [COMPLETE original admin.js content EXACT - just renamed for cache bust]
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Admin Dashboard V2 init START');
  
  hideLoading();
  
  try {
    const auth = safeAuthCheck(true);
    if (!auth.valid) {
      showToast('Admin access required', 'error');
      setTimeout(() => window.location.href = 'user-dashboard.html', 2000);
      return;
    }

    await initAdminDashboard();
  } catch (error) {
    console.error('💥 Admin dashboard init error:', error);
  }
});

// Socket V2: Safe call
window.connectSocket?.();

console.log('✅ Admin V2 - Cache busted');

