// Global Auth Helper - Pure API auth guards
// Place in auth-helpers.js - include in all protected pages

/**
 * requireAuth(redirectUrl, toastMsg) 
 * - Check token & validate with /auth/profile
 * - Redirect if invalid/expired
 * - Returns user data if valid
 */
window.requireAuth = async function(redirectUrl = 'login.html', toastMsg = 'Please login to continue') {
  const token = localStorage.getItem('token');
  if (!token) {
    if (typeof showToast === 'function') showToast(toastMsg, 'warning');
    window.location.href = redirectUrl;
    return null;
  }

  try {
    const res = await fetch(`${window.API_BASE}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      if (typeof showToast === 'function') showToast('Session expired', 'error');
      window.location.href = redirectUrl;
      return null;
    }

    const userData = await res.json();
    window.currentUser = userData.user;
    return userData.user;
  } catch (error) {
    console.error('Auth check failed:', error);
    localStorage.removeItem('token');
    window.location.href = redirectUrl;
    return null;
  }
};

// Export for use
window.AuthHelpers = { requireAuth };
