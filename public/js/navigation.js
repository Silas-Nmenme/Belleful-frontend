// navigation.js - Cart configured for logged-in users only (dashboard interface)

// Always redirect to dashboard for logged-in users
document.addEventListener('DOMContentLoaded', initLoggedInNavigation);

function initLoggedInNavigation() {
  // Initialize smart navigation for dashboard
  document.removeEventListener('click', handleDashboardNav);
  document.addEventListener('click', handleDashboardNav);
}

function handleDashboardNav(e) {
  const link = e.target.closest('a');
  if (!link) return;
  
  // Home, brand, menu links always go to dashboard
const isNavLink = (link.classList.contains('nav-link') || 
                    link.classList.contains('navbar-brand') ||
                    link.id === 'menuLink') && 
                    !link.classList.contains('dropdown-toggle');
  
  if (isNavLink) {
    e.preventDefault();
    redirectToDashboard(link.getAttribute('href') || '');
  }
}

function redirectToDashboard(href = '') {
  const token = localStorage.getItem('token');
  
  if (!token) {
    // No token: redirect to login
    if (typeof showToast === 'function') {
      showToast('Please login to access cart and menu', 'warning');
    }
    window.location.href = 'login.html';
    return;
  }
  
  // Logged-in: always dashboard
  const target = href.includes('#menu') ? 'user-dashboard.html#menu' : 'user-dashboard.html';
  
  if (typeof showToast === 'function') {
    showToast(`Navigating to Dashboard...`, 'info');
  }
  window.location.href = target;
}

// Shop Menu - dashboard only
function goToShopMenu() {
  redirectToDashboard('#menu');
}

// Home navigation - dashboard only
function navigateToHome() {
  redirectToDashboard();
}

// Global exports
window.initLoggedInNavigation = initLoggedInNavigation;
window.redirectToDashboard = redirectToDashboard;
window.goToShopMenu = goToShopMenu;
window.navigateToHome = navigateToHome;

