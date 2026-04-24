// Staff Auth Helpers - Extend auth.js for staff flows
// Reuse: admin-dashboard.js will call these for register flow

window.StaffAuthManager = {
  // Register Staff from Admin - POST /api/auth/admin-register-staff
  async registerStaff(formData) {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Admin login required');

      const response = await fetch(`${window.API_BASE || '/api'}/auth/admin-register-staff`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.fromEntries(formData))
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const result = await response.json();
      localStorage.setItem('pendingStaffEmail', formData.get('email'));
      window.showAdminToast('Staff created successfully! Redirecting to OTP verification...', 'success');
      setTimeout(() => {
        window.location.href = 'otp-verify.html';
      }, 1500);
      return result;
    } catch (error) {
      window.showAdminToast('Registration failed: ' + error.message, 'danger');
      throw error;
    }
  },

  // After register, redirect to staff login with email param
  goToStaffLogin(email) {
    window.location.href = `staff-login.html?pendingEmail=${encodeURIComponent(email)}`;
  },

  // Staff login handler - POST /api/auth/login (reuse auth.js utilities)
  async login(e, submitBtn) {
    e.preventDefault();
    
    const emailInput = document.getElementById('staffEmail');
    const passwordInput = document.getElementById('staffPassword');
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    
    if (!email || !password) {
      window.showToast?.('Please fill all fields', 'error') || alert('Please fill all fields');
      return false;
    }

    // Use auth.js shared utilities
    if (typeof window.AuthManager?.showLoading === 'function') {
      window.AuthManager.showLoading(submitBtn, 'Signing in...');
    }

    try {
      // Set staff mode (for consistency, though backend handles roles)
      if (window.AuthManager) window.AuthManager.authMode = 'staff';
      
      const response = await window.apiPost?.('/auth/login', { email, password }) ||
                       await fetch(`${window.API_BASE || '/api'}/auth/login`, {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ email, password })
                       });

      if (!response.ok) {
        const errorData = await response.json();
        if (typeof window.AuthManager?.hideLoading === 'function') {
          window.AuthManager.hideLoading(submitBtn);
        }
        
        // Handle specific error codes without redirecting
        const errorCode = errorData.code;
        
        if (errorCode === 'EMAIL_NOT_FOUND') {
          window.showToast?.('❌ Email not found. Please check your email address.', 'error') || alert('Email not found');
        } else if (errorCode === 'WRONG_PASSWORD') {
          window.showToast?.('❌ Incorrect password. Please try again.', 'error') || alert('Incorrect password');
        } else if (errorCode === 'EMAIL_NOT_VERIFIED') {
          window.showToast?.('⚠️ ' + errorData.message, 'warning') || alert(errorData.message);
        } else {
          window.showToast?.(errorData.message || 'Login failed', 'error') || alert(errorData.message || 'Login failed');
        }
        return false; // Stay on login page, don't redirect
      }

      const result = await response.json();
      
      // Save auth using shared logic
      if (window.AuthManager?.saveAuth) {
        window.AuthManager.saveAuth(result);
      } else {
        localStorage.setItem('token', result.token);
        localStorage.setItem('userRole', result.user.role);
      }
      
      window.showToast?.(`✅ Welcome back, ${result.user.name}!`, 'success') || alert('Login successful!');
      
      if (typeof window.AuthManager?.hideLoading === 'function') {
        window.AuthManager.hideLoading(submitBtn);
      }

      // Redirect to staff dashboard
      setTimeout(() => {
        window.location.href = 'staff-dashboard.html';
      }, 800);
      
      return true;
    } catch (error) {
      if (typeof window.AuthManager?.hideLoading === 'function') {
        window.AuthManager.hideLoading(submitBtn);
      }
      window.showToast?.('Network error: ' + error.message, 'error') || alert('Network error: ' + error.message);
      return false;
    }
  }
};

