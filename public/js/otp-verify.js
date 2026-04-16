class OTPVerify {
    constructor() {
        this.form = document.getElementById('otpForm');
        this.inputs = document.querySelectorAll('.otp-input');
        this.btn = document.getElementById('verifyBtn');
        this.btnText = document.getElementById('verifyBtn').querySelector('.btn-text');
        this.spinner = this.btn.querySelector('.spinner-border');
        this.messageDiv = document.getElementById('otpMessage');
        this.resendBtn = document.getElementById('resendBtn');
        this.timerEl = document.getElementById('countdown');
        this.emailEl = document.getElementById('emailDisplay');
        
        this.otp = '';
        this.timeLeft = 120; // 2 minutes
        this.timer = null;
        this.email = null;
        
        this.init();
    }
    
    init() {
        // Get email from multiple sources: query param (signup), localStorage pendingStaffEmail/resetEmail
        const urlParams = new URLSearchParams(window.location.search);
        this.email = urlParams.get('email') || localStorage.getItem('pendingStaffEmail');
        if (!this.email) {
            this.showMessage('No email provided. Please start from registration.', 'error');
            setTimeout(() => window.location.href = 'admin-dashboard.html', 2000);
            return;
        }
        // Clear after use
        localStorage.removeItem('pendingStaffEmail');
        
        const hiddenEmail = document.getElementById('otpEmail');
        if (hiddenEmail) hiddenEmail.value = this.email;
        
        this.emailEl.textContent = `Enter code sent to ${this.email}`;
        this.bindEvents();
        this.startTimer();
        this.focusFirstInput();
    }
    
    bindEvents() {
        this.inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => this.handleInput(e, index));
            input.addEventListener('keydown', (e) => this.handleKeydown(e, index));
            input.addEventListener('paste', (e) => this.handlePaste(e));
        });
        
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.resendBtn.addEventListener('click', () => this.resendOtp());
    }
    
    handleInput(e, index) {
        const value = e.target.value;
        if (!/^\d*$/.test(value)) {
            e.target.value = '';
            return;
        }
        
        if (value) {
            this.inputs[index].classList.add('is-valid');
            if (index < 5) {
                this.inputs[index + 1].focus();
            } else {
                this.btn.disabled = false;
                this.btn.focus();
            }
        }
        
        this.otp = Array.from(this.inputs).map(input => input.value).join('');
    }
    
    handleKeydown(e, index) {
        if (e.key === 'Backspace' && !this.inputs[index].value && index > 0) {
            this.inputs[index - 1].focus();
        }
        
        if (e.key === 'Enter' && this.btn.disabled === false) {
            this.form.dispatchEvent(new Event('submit'));
        }
    }
    
    handlePaste(e) {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const digits = paste.replace(/\D/g, '').slice(0, 6);
        
        digits.split('').forEach((digit, i) => {
            if (this.inputs[i]) {
                this.inputs[i].value = digit;
                this.inputs[i].classList.add('is-valid');
            }
        });
        
        if (digits.length === 6) {
            this.inputs[5].focus();
            this.btn.disabled = false;
            this.btn.focus();
        }
    }
    
    handleSubmit(e) {
        e.preventDefault();
        
        // Always delegate to AuthManager - it handles validation, API, toasts
        if (typeof AuthManager?.verifyOTP === 'function') {
            AuthManager.verifyOTP(e, this.email);
        } else {
            this.showMessage('Auth system not loaded. Please refresh.', 'error');
        }
    }
    
    validateOtp(otp) {
        return otp && otp.length === 6 && /^\d{6}$/.test(otp);
    }
    
    resendOtp() {
        if (!this.email) {
            this.showMessage('No email session found.', 'error');
            return;
        }
        
        if (typeof AuthManager?.register === 'function') {
            AuthManager.register({ preventDefault: () => {} });
            this.showMessage(`New OTP sent to ${this.email}. Check your email.`, 'success');
            this.timeLeft = 120;
            this.startTimer();
            this.resetInputs();
        } else {
            this.showMessage('Auth system not ready. Please wait.', 'error');
        }
    }
    
    startTimer() {
        this.timer = setInterval(() => {
            this.timeLeft--;
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            this.timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.timerEl.textContent = '00:00';
                this.timerEl.classList.add('expired');
                this.resendBtn.disabled = false;
            }
        }, 1000);
    }
    
    focusFirstInput() {
        this.inputs[0].focus();
    }
    
    resetInputs() {
        this.inputs.forEach(input => {
            input.value = '';
            input.classList.remove('is-valid', 'is-invalid');
        });
        this.otp = '';
        this.btn.disabled = true;
        this.focusFirstInput();
    }
    
    resetBtn() {
        this.btn.disabled = false;
        this.spinner.classList.add('d-none');
        this.btnText.innerHTML = '<i class="fas fa-check me-2"></i>Verify OTP';
    }
    
    showMessage(message, type) {
        this.messageDiv.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show message ${type}" role="alert">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new OTPVerify();
});

console.log('OTP Verify JS loaded - Real backend integration');
