// Signup-specific manager for Belleful - extends AuthManager
// Handles form validation, password toggle, registration flow

const SignupManager = {
    init() {
        document.addEventListener('DOMContentLoaded', this.setupEventListeners.bind(this));
    },

    setupEventListeners() {
        // Password visibility toggle for signup
        const toggle = document.getElementById('toggleSignupPassword');
        const pwd = document.getElementById('signupPassword');
        if (toggle && pwd) {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const isPassword = pwd.type === 'password';
                pwd.type = isPassword ? 'text' : 'password';
                const icon = toggle.querySelector('i');
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
                toggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
            });
        }

        // Form validation enhancements
        const form = document.getElementById('signupForm');
        if (form) {
            form.addEventListener('input', this.validateForm.bind(this));
        }
    },

    validateForm() {
        const name = document.getElementById('signupName')?.value.trim();
        const email = document.getElementById('signupEmail')?.value.trim();
        const password = document.getElementById('signupPassword')?.value;
        const submitBtn = document.getElementById('signupFormSubmit');

        let isValid = true;
        if (!name || name.length < 2) isValid = false;
        if (!email || !/^[\w\.-]+@([\w-]+\.)+[\w-]{2,4}$/i.test(email)) isValid = false;

        if (!password || password.length < 6) isValid = false;

        submitBtn.disabled = !isValid;
        submitBtn.style.opacity = isValid ? '1' : '0.6';
    },

    async register(event) {
        event.preventDefault();

        const name = document.getElementById('signupName')?.value.trim();
        const email = document.getElementById('signupEmail')?.value.trim().toLowerCase();
        const password = document.getElementById('signupPassword')?.value;

        if (!name || !email || !password || password.length < 6) {
            showToast('Please fill all fields correctly (password min 6 chars)', 'error');
            return;
        }

        const submitBtn = document.getElementById('signupFormSubmit');
        showLoading(submitBtn, 'Creating account...');

        try {
            // Call extended register from auth.js
            if (typeof AuthManager.register === 'function') {
                await AuthManager.register({ name, email, password });
            } else {
                // Fallback mock - enable real in auth.js
                showToast('Registration temporarily disabled. Use demo login: customer@belleful.com / password123', 'info');
                setTimeout(() => window.location.href = 'login.html', 2000);
            }
        } catch (error) {
            showToast(error.message || 'Registration failed', 'error');
        } finally {
            hideLoading(submitBtn);
        }
    }
};

// Auto-init
SignupManager.init();

// Expose globally
window.SignupManager = SignupManager;

