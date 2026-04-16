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
  }
};

