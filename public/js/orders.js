async function getUserOrders() {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${window.API_BASE}/dashboard/user/orders`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Orders API failed:', response.status, errorText);
    throw new Error(`Failed to fetch orders: ${response.status}`);
  }
  
  return await response.json();
}

async function pollOrderStatus(orderId) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${window.API_BASE}/dashboard/user/orders`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.ok ? await response.json() : null;
}

// Real-time progress bar updates
function updateOrderProgress(order) {
  const progressBar = document.querySelector('.progress-bar');
  const statusText = document.querySelector('.progress-status');
  
  const statusMap = {
    'ordered': { width: '20%', color: 'warning', text: 'Order Received' },
    'pending_approval': { width: '40%', color: 'info', text: 'Payment Verification' },
    'vendor_approved': { width: '60%', color: 'primary', text: 'Preparing Your Order' },
    'preparing': { width: '70%', color: 'warning', text: 'Cooking' },
    'ready': { width: '85%', color: 'success', text: 'Ready for Delivery' },
    'off_for_delivery': { width: '95%', color: 'info', text: 'On the Way' },
    'delivered': { width: '100%', color: 'success', text: 'Delivered! 🎉' }
  };
  
  if (statusMap[order.orderStatus]) {
    const status = statusMap[order.orderStatus];
    progressBar.style.width = status.width;
    progressBar.className = `progress-bar progress-bar-striped progress-bar-animated bg-${status.color}`;
    statusText.textContent = status.text;
  }
}

// Handle order status updates from push notifications
function handleOrderStatusUpdate(orderId, newStatus) {
  console.log('Order status update received:', orderId, newStatus);
  
  // Update current order display if on tracking page
  const currentOrderId = new URLSearchParams(window.location.search).get('id');
  if (currentOrderId === orderId) {
    // Refresh order data
    loadOrderDetails(orderId);
    
    // Show success toast
    if (window.showToast) {
      const statusMessages = {
        'payment_approved': 'Payment approved! Order is being prepared.',
        'preparing': 'Your order is now being prepared!',
        'ready_for_pickup': 'Your order is ready for pickup!',
        'out_for_delivery': 'Your order is out for delivery!',
        'delivered': 'Your order has been delivered! Enjoy your meal!',
        'cancelled': 'Your order has been cancelled.'
      };
      
      window.showToast(statusMessages[newStatus] || `Order status updated to ${newStatus}`, 'success');
    }
  }
  
  // Update order list if on dashboard
  if (window.refreshOrderList) {
    window.refreshOrderList();
  }
}

// Make function globally available
window.updateOrderStatus = handleOrderStatusUpdate;

// Export utilities
window.OrderManager = {
  getUserOrders,
  pollOrderStatus,
  updateOrderProgress,
  handleOrderStatusUpdate
};

