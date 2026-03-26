// Reset Password JavaScript
// Email validation → API OTP send → Redirect to OTP page

class ResetPassword {
    constructor() {
        this.form = document.getElementById('resetForm');
        this.emailField = document.getElementById('resetEmail');
        this.btn = document.getElementById('sendOtpBtn');
        this.messageDiv = document.getElementById('resetMessage');
        this.spinner = this.btn.querySelector('.spinner-border');
        this.btnText = this.btn.querySelector('.btn-text');
        
        this.init();
    }
    
    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.emailField.addEventListener('blur', () => this.validateEmail());
        this.emailField.addEventListener('input', () => this.clearError());
    }
    
    handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateEmail()) {
            this.showMessage('Please enter a valid email address.', 'error');
            return;
        }
        
        this.sendOtp();
    }
    
    validateEmail() {
        const email = this.emailField.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            this.showFieldError('Email is required.');
            return false;
        }
        
        if (!emailRegex.test(email)) {
            this.showFieldError('Please enter a valid email address.');
            return false;
        }
        
        this.emailField.classList.add('is-valid');
        this.clearError();
        return true;
    }
    
    sendOtp() {
        // Show loading
        this.btn.disabled = true;
        this.spinner.classList.remove('d-none');
        this.btnText.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
        
        // Real API call
        const token = localStorage.getItem('token') || '';
        try {
          const response = await fetch(`${window.API_BASE}/auth/forgot-password`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token && {'Authorization': `Bearer ${token}`})
            },
            body: JSON.stringify({ email: this.emailField.value.trim().toLowerCase() })
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to send OTP');
          }
          
          this.showMessage(`OTP sent to ${this.emailField.value}! Check your email. Redirecting...`, 'success');
          
          const emailParam = encodeURIComponent(this.emailField.value);
          setTimeout(() => {
            window.location.href = `otp-verify.html?mode=reset&email=${emailParam}`;
          }, 1500);
          
        } catch (error) {
          this.showMessage(error.message || 'Failed to send OTP. Try again.', 'error');
          console.error('Reset API error:', error);
        } finally {
          this.resetBtn();
        }
    }
    
    showFieldError(message) {
        this.emailField.classList.remove('is-valid');
        this.emailField.classList.add('is-invalid');
        
        const feedback = this.emailField.parentNode.querySelector('.invalid-feedback') || 
                        document.createElement('div');
        feedback.className = 'invalid-feedback d-block';
        feedback.textContent = message;
        this.emailField.parentNode.appendChild(feedback);
    }
    
    clearError() {
        this.emailField.classList.remove('is-invalid');
        const feedback = this.emailField.parentNode.querySelector('.invalid-feedback');
        if (feedback) feedback.remove();
    }
    
    showMessage(message, type) {
        this.messageDiv.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show message ${type}" role="alert">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
            </div>
        `;
    }
    
    resetBtn() {
        this.btn.disabled = false;
        this.spinner.classList.add('d-none');
        this.btnText.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send OTP Code';
    }
}

// Initialize when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    new ResetPassword();
    
    // Auto-dismiss alerts after 5s (success only)
    document.addEventListener('click', (e) => {
        if (e.target.closest('.alert-success')) {
            setTimeout(() => {
                const alert = document.querySelector('.alert-success');
                if (alert) {
                    const bsAlert = new bootstrap.Alert(alert);
                    bsAlert.close();
                }
            }, 5000);
        }
    });
});

console.log('Reset Password JS loaded');
