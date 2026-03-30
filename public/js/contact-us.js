// EmailJS Configuration (REPLACE WITH YOUR KEYS from emailjs.com)
const EMAILJS_CONFIG = {
    service_id: 'YOUR_SERVICE_ID',        
    template_id: 'YOUR_TEMPLATE_ID',      
    public_key: 'YOUR_PUBLIC_KEY'         
};

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
    ['name', 'email', 'message'].forEach(fieldId => {
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
    
    // Show loading
    submitBtn.disabled = true;
    spinner.classList.remove('d-none');
    submitBtn.innerHTML = 'Sending... <span class="spinner-border spinner-border-sm ms-2" role="status"></span>';
    
    try {
        // Check EmailJS config
        if (!isEmailJSConfigured()) {
            throw new Error('EmailJS not configured. Please set your service_id, template_id, and public_key.');
        }
        
        // Submit via EmailJS
        const result = await emailjs.send(
            EMAILJS_CONFIG.service_id,
            EMAILJS_CONFIG.template_id,
            getFormData(form),
            EMAILJS_CONFIG.public_key
        );
        
        console.log('EmailJS success:', result);
        showMessage('Thank you! Your message has been sent. We\'ll respond within 24 hours.', 'success');
        form.reset();
        
    } catch (error) {
        console.error('Submission error:', error);
        let errorMsg = 'Failed to send message. ';
        
        if (error.text?.includes('service')) {
            errorMsg += 'EmailJS service not configured.';
        } else if (error.status === 402) {
            errorMsg += 'EmailJS quota exceeded.';
        } else {
            errorMsg += 'Please try again or contact us directly.';
        }
        
        showMessage(errorMsg, 'error');
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
            if (field.value.trim().length < 2) {
                isValid = false;
                errorMsg = 'Name must be at least 2 characters.';
            }
            break;
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(field.value)) {
                isValid = false;
                errorMsg = 'Please enter a valid email address.';
            }
            break;
        case 'message':
            if (field.value.trim().length < 10) {
                isValid = false;
                errorMsg = 'Message must be at least 10 characters.';
            }
            break;
    }
    
    if (!isValid) {
        showFieldError(field, errorMsg);
    }
    
    return isValid;
}

// Validate entire form
function validateForm() {
    let isValid = true;
    const requiredFields = ['name', 'email', 'message'];
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            showFieldError(field, `${field.name} is required.`);
            isValid = false;
        }
    });
    
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

// Check if EmailJS is configured
function isEmailJSConfigured() {
    return EMAILJS_CONFIG.service_id !== 'YOUR_SERVICE_ID' &&
           EMAILJS_CONFIG.template_id !== 'YOUR_TEMPLATE_ID' &&
           EMAILJS_CONFIG.public_key !== 'YOUR_PUBLIC_KEY';
}

// Google Maps initialization
function initMap() {
    const lagos = { lat: 6.5244, lng: 3.3792 }; // Lagos coordinates
    const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 14,
        center: lagos,
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ]
    });
    
    // Belleful marker
    new google.maps.Marker({
        position: lagos,
        map: map,
        title: 'Belleful Kitchen & HQ',
        icon: {
            url: 'asset/logo.jpeg', // Custom marker (fallback to default if missing)
            scaledSize: new google.maps.Size(50, 50),
            anchor: new google.maps.Point(25, 25)
        }
    });
}

// Load EmailJS SDK (only if configured)
if (isEmailJSConfigured()) {
    (function() {
        emailjs.init(EMAILJS_CONFIG.public_key);
    })();
}

// Export functions for global access
window.ContactUs = {
    validateForm,
    handleSubmit,
    initMap
};

console.log('Contact Us JS loaded successfully. Configure EmailJS keys to enable submissions.');
