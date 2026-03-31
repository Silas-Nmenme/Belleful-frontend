// Reset Password JavaScript - Token-based flow matching backend
// Handles both: send reset email | submit new password with token

class ResetPassword {
    constructor() {
        this.container = document.getElementById('resetContainer');
        this.emailForm = document.getElementById('emailForm');
        this.passwordForm = document.getElementById('passwordForm');
        this.pageTitle = document.getElementById('pageTitle');
        this.pageSubtitle = document.getElementById('pageSubtitle');
        this.messageDiv = document.getElementById('resetMessage');
        
        // Email form elements
        this.emailField = document.getElementById('resetEmail');
        this.sendLinkBtn = document.getElementById('sendLinkBtn');
        this.sendLinkSpinner = this.sendLinkBtn.querySelector('.spinner-border');
        this.sendLinkText = this.sendLinkBtn.querySelector('.btn-text');
        
        // Password form elements
        this.tokenField = document.getElementById('resetToken');
        this.userEmailField = document.getElementById('resetUserEmail');
        this.displayEmail = document.getElementById('displayEmail');
        this.newPassword = document.getElementById('newPassword');
        this.confirmPassword = document.getElementById('confirmPassword');
        this.resetBtn = document.getElementById('resetBtn');
        this.resetSpinner = this.resetBtn.querySelector('.spinner-border');
        this.resetText = this.resetBtn.querySelector('.btn-text');
        
        this.mode = 'email';
        this.token = null;
        this.email = null;
        
        this.init();
    }
    
    init() {
        // Parse URL params for token reset mode
        const urlParams = new URLSearchParams(window.location.search);
        this.token = urlParams.get('token');
        this.email = urlParams.get('email');
        
        if (this.token && this.email) {
            this.switchToResetMode();
        } else {
            this.switchToEmailMode();
        }
        
        // Event listeners
        this.emailForm.addEventListener('submit', (e) => this.handleEmailSubmit(e));
        this.passwordForm.addEventListener('submit', (e) => this.handlePasswordSubmit(e));
        
        this.emailField.addEventListener('blur', () => this.validateEmail());
        this.emailField.addEventListener('input', () => this.clearFieldError(this.emailField));
        
        this.newPassword.addEventListener('blur', () => this.validatePassword());
        this.confirmPassword.addEventListener('blur', () => this.validateConfirmPassword());
        [this.newPassword, this.confirmPassword].forEach(field => {
            field.addEventListener('input', () => this.clearFieldError(field));
        });
    }
    
    switchToEmailMode() {
        this.mode = 'email';
        this.container.dataset.mode = 'email';
        this.emailForm.classList.remove('d-none');
        this.passwordForm.classList.add('d-none');
        this.pageTitle.textContent = 'Reset Password';
        this.pageSubtitle.textContent = 'Enter your email to receive a password reset link.';
        this.emailField.focus();
    }
    
    switchToResetMode() {
        this.mode = 'reset';
        this.container.dataset.mode = 'reset';
        this.emailForm.classList.add('d-none');
        this.passwordForm.classList.remove('d-none');
        this.tokenField.value = this.token;
        this.userEmailField.value = this.email;
        this.displayEmail.value = this.email;
        this.pageTitle.textContent = 'Set New Password';
        this.pageSubtitle.textContent = `Securely reset your password for ${this.email}`;
        this.newPassword.focus();
        
        // Warn if token missing/expired
        if (!this.token) {
            this.showMessage('Invalid or missing reset link. Please request a new one.', 'error');
            setTimeout(() => this.switchToEmailMode(), 3000);
        }
    }
    
    async handleEmailSubmit(e) {
        e.preventDefault();
        
        if (!this.validateEmail()) return;
        
        this.setEmailLoading(true);
        
        try {
            const response = await fetch(`${window.API_BASE}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: this.emailField.value.trim().toLowerCase() })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to send reset link');
            }
            
            this.showMessage('Password reset link sent! Check your email (including spam folder).', 'success');
            this.emailField.value = '';
            this.clearFieldError(this.emailField);
            
        } catch (error) {
            this.showMessage(error.message || 'Failed to send reset link. Try again.', 'error');
            console.error('Forgot password error:', error);
        } finally {
            this.setEmailLoading(false);
        }
    }
    
    async handlePasswordSubmit(e) {
        e.preventDefault();
        
        if (!this.validatePassword() || !this.validateConfirmPassword()) return;
        
        this.setResetLoading(true);
        
        try {
            const response = await fetch(`${window.API_BASE}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    token: this.tokenField.value, 
                    password: this.newPassword.value 
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Reset failed');
            }
            
            this.showMessage('Password updated successfully! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
        } catch (error) {
            this.showMessage(error.message || 'Failed to update password. Token may be invalid/expired.', 'error');
            console.error('Reset password error:', error);
        } finally {
            this.setResetLoading(false);
        }
    }
    
    validateEmail() {
        const email = this.emailField.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            this.showFieldError(this.emailField, 'Email is required.');
            return false;
        }
        
        if (!emailRegex.test(email)) {
            this.showFieldError(this.emailField, 'Please enter a valid email address.');
            return false;
        }
        
        this.emailField.classList.add('is-valid');
        this.clearFieldError(this.emailField);
        return true;
    }
    
    validatePassword() {
        const password = this.newPassword.value;
        if (password.length < 8) {
            this.showFieldError(this.newPassword, 'Password must be at least 8 characters.');
            return false;
        }
        this.newPassword.classList.add('is-valid');
        this.clearFieldError(this.newPassword);
        return true;
    }
    
    validateConfirmPassword() {
        const password = this.newPassword.value;
        const confirm = this.confirmPassword.value;
        if (confirm !== password) {
            this.showFieldError(this.confirmPassword, 'Passwords do not match.');
            return false;
        }
        this.confirmPassword.classList.add('is-valid');
        this.clearFieldError(this.confirmPassword);
        return true;
    }
    
    showFieldError(field, message) {
        field.classList.remove('is-valid');
        field.classList.add('is-invalid');
        let feedback = field.parentNode.querySelector('.invalid-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback d-block';
            field.parentNode.appendChild(feedback);
        }
        feedback.textContent = message;
    }
    
    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) feedback.remove();
    }
    
    setEmailLoading(loading) {
        this.sendLinkBtn.disabled = loading;
        this.sendLinkSpinner.classList.toggle('d-none', !loading);
        this.sendLinkText.innerHTML = loading 
            ? '<i class="fas fa-spinner fa-spin me-2"></i>Sending...'
            : '<i class="fas fa-paper-plane me-2"></i>Send Reset Link';
    }
    
    setResetLoading(loading) {
        this.resetBtn.disabled = loading;
        this.resetSpinner.classList.toggle('d-none', !loading);
        this.resetText.innerHTML = loading 
            ? '<i class="fas fa-spinner fa-spin me-2"></i>Updating...'
            : '<i class="fas fa-check me-2"></i>Update Password';
    }
    
    showMessage(message, type) {
        this.messageDiv.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show message" role="alert">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
            </div>
        `;
        this.messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.API_BASE === 'undefined') {
        console.error('API_BASE not loaded. Check constants.js');
        return;
    }
    new ResetPassword();
});

console.log('Reset Password JS loaded - Token flow ready');
