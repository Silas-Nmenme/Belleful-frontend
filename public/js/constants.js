window.API_BASE = 'https://belleful-gold.vercel.app/api';

// Global showToast utility - safe fallback for all JS files
// Matches patterns used in menu.js, auth.js, cart.js etc.
function showToast(message, type = 'info') {
  // Use Bootstrap toast if available (dashboard/admin)
  if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
    const toastEl = document.querySelector('.global-toast-container') || createToastContainer();
    const toastHtml = `
      <div class="toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'primary'} border-0" role="alert">
        <div class="d-flex">
          <div class="toast-body">${escapeHtml(message)}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    `;
    toastEl.insertAdjacentHTML('beforeend', toastHtml);
    const toast = new bootstrap.Toast(toastEl.lastElementChild);
    toast.show();
    return;
  }
  
  // Simple DOM fallback (no Bootstrap)
  const toast = document.createElement('div');
  toast.className = `toast-notification position-fixed top-0 end-0 m-3 p-3 rounded shadow-lg ${
    type === 'success' ? 'bg-success' : 
    type === 'error' ? 'bg-danger' : 'bg-primary'
  } text-white`;
  toast.style.cssText = 'z-index: 9999; max-width: 350px; animation: slideInRight 0.3s ease-out;';
  toast.innerHTML = `
    ${message}
    <button type="button" class="btn-close btn-close-white ms-2 p-1" onclick="this.parentElement.remove()"></button>
  `;
  document.body.appendChild(toast);
  
  // Auto-remove
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

// Utilities
function createToastContainer() {
  let container = document.getElementById('globalToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'globalToastContainer';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }
  return container;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Global exposure
window.showToast = showToast;
