// Orders & Checkout functionality - Pure Backend API (No Mock Data)
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

// Export utilities
window.OrderManager = {
  getUserOrders,
  pollOrderStatus,
  updateOrderProgress
};

