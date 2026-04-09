// Backend API endpoint - Matches /api/contact/contact route
const CONTACT_API_URL = `${window.API_BASE}/contact/contact`;


document.addEventListener('DOMContentLoaded', function() {
    console.log('Contact Us page loaded');
    
    // Form handling
    const form = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const formMessage = document.getElementById('formMessage');
    
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    // Real-time validation
    ['name', 'email', 'phone', 'message'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', validateField);
            field.addEventListener('input', clearFieldError);
        }
    });

});

// Form submission handler
async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        showMessage('Please fill all required fields correctly.', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const spinner = submitBtn.querySelector('.spinner-border');
    const formMessage = document.getElementById('formMessage');
    
    // Show loading
    submitBtn.disabled = true;
    spinner.classList.remove('d-none');
    submitBtn.innerHTML = 'Sending... <span class="spinner-border spinner-border-sm ms-2" role="status"></span>';
    
    try {
        const formData = getFormData(e.target);
        const response = await fetch(CONTACT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Contact success:', result);
            const successMsg = result.message || 'Message saved successfully!';
            showMessage(successMsg, 'success');
            e.target.reset();
        } else if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
            // Backend validation errors - show field-specific errors
            result.errors.forEach(errorMsg => {
                const field = document.querySelector(`[name="name"], [name="email"], [name="phone"], [name="message"]`);
                if (field) showFieldError(field, errorMsg);
            });
            showMessage('Please fix the errors above.', 'error');
            return;
        } else {
            showMessage(result.message || 'Validation failed', 'error');
            return;
        }
        
        } catch (error) {
        console.error('Submission error:', error);
        showMessage('Server error. Please try again or contact us directly at +234 810 758 6167.', 'error');
    } finally {

        // Reset button
        submitBtn.disabled = false;
        spinner.classList.add('d-none');
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send Message <span class="spinner-border spinner-border-sm ms-2 d-none" role="status"></span>';
    }
}


// Validate individual field
function validateField(e) {
    const field = e.target;
    const fieldName = field.name;
    let isValid = true;
    let errorMsg = '';
    
    switch(fieldName) {
        case 'name':
            const nameVal = field.value.trim();
            if (!nameVal) {
                errorMsg = 'Name is required';
            } else if (nameVal.length > 100) {
                errorMsg = 'Name too long';
            }
            break;
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(field.value)) {
                errorMsg = 'Valid email required';
            }
            break;
        case 'phone':
            const phoneVal = field.value.trim();
            if (!phoneVal) {
                errorMsg = 'Phone number required';
            } else {
                // Basic mobile phone validation matching backend isMobilePhone('any')
                const phoneRegex = /^[\+]?[1-9][\d]{7,15}$/;
                if (!phoneRegex.test(phoneVal)) {
                    errorMsg = 'Valid phone required';
                }
            }
            break;

        case 'message':
            const msgVal = field.value.trim();
            if (!msgVal) {
                errorMsg = 'Message required';
            } else if (msgVal.length > 1000) {
                errorMsg = 'Message too long';
            }
            break;
    }
    
    if (errorMsg) {
        isValid = false;
        showFieldError(field, errorMsg);
    } else {
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');
        const errorEl = field.parentNode.querySelector('.invalid-feedback');
        if (errorEl) errorEl.remove();
    }
    
    return isValid;
}


// Validate entire form
function validateForm() {
    let isValid = true;
    ['name', 'email', 'phone', 'message'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) validateField({target: field});
    });
    const hasErrors = document.querySelector('.is-invalid');
    isValid = !hasErrors;
    return isValid;
}


// Show field error
function showFieldError(field, message) {
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');
    
    // Create or update error message
    let errorEl = field.parentNode.querySelector('.invalid-feedback');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'invalid-feedback d-block';
        field.parentNode.appendChild(errorEl);
    }
    errorEl.textContent = message;
}

// Clear field error
function clearFieldError(e) {
    const field = e.target;
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
    
    const errorEl = field.parentNode.querySelector('.invalid-feedback');
    if (errorEl) {
        errorEl.remove();
    }
}

// Get form data
function getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value.trim();
    }
    
    return data;
}

// Show global message
function showMessage(message, type = 'info') {
    const formMessage = document.getElementById('formMessage');
    formMessage.innerHTML = `
        <div class="alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show form-message ${type}" role="alert">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Auto-hide success
    if (type === 'success') {
        setTimeout(() => {
            const alert = formMessage.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}

// Backend API ready
console.log('Contact form ready. API:', CONTACT_API_URL);


// Export functions for global access
window.ContactUs = {
    validateForm,
    handleSubmit
};

console.log('Contact Us JS loaded successfully - Backend matched.');
