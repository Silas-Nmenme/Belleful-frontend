// Reset Password JavaScript
// Email validation → Simulate OTP send → Redirect to OTP page

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
        
        // Simulate API delay
        setTimeout(() => {
            try {
                // Store email & fake OTP for demo (123456)
                localStorage.setItem('resetEmail', this.emailField.value);
                localStorage.setItem('demoOtp', '123456');
                localStorage.setItem('otpSentTime', Date.now());
                
                this.showMessage(`OTP sent to ${this.emailField.value}! Check your email or SMS. Redirecting...`, 'success');
                
                // Redirect after 2s
                setTimeout(() => {
                    window.location.href = 'otp-verify.html';
                }, 2000);
                
            } catch (error) {
                this.showMessage('Failed to send OTP. Please try again.', 'error');
                console.error('Reset error:', error);
            } finally {
                this.resetBtn();
            }
        }, 1500);
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
