// navigation.js - Auth-aware global navigation for Home/Brand links
document.addEventListener('DOMContentLoaded', initSmartNavigation);

function initSmartNavigation() {
  // Remove existing listeners to prevent duplicates
  document.removeEventListener('click', handleSmartNavClick);
  document.addEventListener('click', handleSmartNavClick);
}

function handleSmartNavClick(e) {
  const link = e.target.closest('a');
  if (!link) return;
  
  // Match Home nav-link or navbar-brand (Belleful logo)
  const isHomeLink = link.classList.contains('nav-link') && 
                     (link.textContent.trim().toLowerCase().includes('home') || 
                      link.getAttribute('href') === 'index.html');
  const isBrandLink = link.classList.contains('navbar-brand');
  
  if (isHomeLink || isBrandLink) {
    e.preventDefault();
    navigateToHome();
  }
}

function navigateToHome() {
  const token = localStorage.getItem('token');
  const target = token ? 'user-dashboard.html' : 'index.html';
  
  // Use existing toast if available, else simple alert
  if (typeof showToast === 'function') {
    showToast(`Redirecting to ${token ? 'Dashboard' : 'Home'}...`, 'info');
  }
  setTimeout(() => {
    window.location.href = target;
  }, token ? 500 : 0);
}

// Export for auth.js inclusion
window.initSmartNavigation = initSmartNavigation;
window.navigateToHome = navigateToHome;

