// Staff Authentication - Extends main auth.js
// Sets authMode='staff', redirects to staff-dashboard.html on success

(function() {
    'use strict';
    
    // Wait for main auth system
    function initStaffAuth() {
        if (!window.AuthManager) {
            setTimeout(initStaffAuth, 100);
            return;
        }
        
        // Override login handler for staff mode
        const originalLogin = window.AuthManager.login;
        window.StaffAuthManager = {
            login: async function(e) {
                localStorage.setItem('authMode', 'staff');
                
                // Use main auth with staff context
                return originalLogin.call(this, e, document.getElementById('staffLoginSubmit'));
            },
            
            checkStaffAuth: async function() {
                const token = localStorage.getItem('token');
                if (!token) {
                    window.location.href = 'staff-login.html';
                    return false;
                }
                
                try {
                    const response = await fetch(`${window.API_BASE || '/api'}/auth/profile`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (!response.ok) throw new Error('Auth failed');
                    
                    const userData = await response.json();
                    if (userData.user.role !== 'staff') {
                        localStorage.removeItem('token');
                        window.location.href = 'staff-login.html';
                        return false;
                    }
                    
                    localStorage.setItem('userRole', 'staff');
                    return true;
                } catch (error) {
                    console.error('Staff auth check failed:', error);
                    localStorage.removeItem('token');
                    window.location.href = 'staff-login.html';
                    return false;
                }
            }
        };
        
        console.log('✅ Staff auth initialized');
    }
    
    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStaffAuth);
    } else {
        initStaffAuth();
    }
    
    // Global cleanup on logout
    window.addEventListener('beforeunload', function() {
        if (localStorage.getItem('authMode') === 'staff') {
            localStorage.removeItem('authMode');
        }
    });
})();

