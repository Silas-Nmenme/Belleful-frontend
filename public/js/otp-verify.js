// OTP Verify JavaScript
// 6-digit OTP inputs, timer, validation (demo OTP: 123456)

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
        this.demoOtp = '123456';
        
        this.init();
    }
    
    init() {
        const email = localStorage.getItem('resetEmail');
        if (!email) {
            this.showMessage('No reset session found. Please start from reset password.', 'error');
            setTimeout(() => window.location.href = 'login.html', 2000);
            return;
        }
        
        this.emailEl.textContent = `Enter code sent to ${email}`;
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
        
        if (this.otp.length !== 6 || !this.validateOtp()) {
            this.showMessage('Please enter complete 6-digit code.', 'error');
            this.focusFirstInput();
            return;
        }
        
        this.verifyOtp();
    }
    
    validateOtp() {
        return this.otp === this.demoOtp;
    }
    
    verifyOtp() {
        this.btn.disabled = true;
        this.spinner.classList.remove('d-none');
        this.btnText.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Verifying...';
        
        setTimeout(() => {
            if (this.otp === this.demoOtp) {
                this.showMessage('OTP verified successfully! Redirecting to set new password...', 'success');
                
                // Simulate complete flow - redirect to login
                localStorage.removeItem('resetEmail');
                localStorage.removeItem('demoOtp');
                localStorage.removeItem('otpSentTime');
                
                setTimeout(() => {
                    // In real app: redirect to new-password.html
                    window.location.href = 'login.html';
                }, 2000);
                
            } else {
                this.showMessage('Invalid OTP. Please check and try again.', 'error');
                this.resetInputs();
            }
            
            this.resetBtn();
        }, 1500);
    }
    
    resendOtp() {
        const email = localStorage.getItem('resetEmail');
        if (!email) return;
        
        this.showMessage(`New OTP sent to ${email}`, 'success');
        localStorage.setItem('demoOtp', '123456'); // Reset demo
        localStorage.setItem('otpSentTime', Date.now());
        this.timeLeft = 120;
        this.startTimer();
        this.resendBtn.disabled = true;
        this.resetInputs();
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

console.log('OTP Verify JS loaded - Demo OTP: 123456');
