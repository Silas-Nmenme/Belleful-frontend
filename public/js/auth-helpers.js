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
  if (!token) {\n    console.warn(toastMsg);\n    window.location.href = redirectUrl;\n    return null;\n  }

  try {
    const res = await fetch(`${window.API_BASE}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {\n      localStorage.removeItem('token');\n      localStorage.removeItem('userRole');\n      console.error('Session expired');\n      window.location.href = redirectUrl;\n      return null;\n    }

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
