// Perfect Checkout - Backend Integration
// Compatible with shared-v2.js & auth-shared.js

let cart = [];
let currentOrder = null;
let currentStep = 1;
const steps = ['review', 'payment', 'upload', 'complete'];
// const API_BASE = 'https://belleful-fphf.vercel.app/api'; // Uses shared

document.addEventListener('DOMContentLoaded', initCheckout);

function initCheckout() {
    // Auth guard
    if (!isLoggedIn()) {
        showToast('Please login to checkout', 'error');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    if (cart.length === 0) {
        document.getElementById('empty-checkout').classList.remove('d-none');
        return;
    }

    renderStepper();
    renderReviewStep();
    document.getElementById('order-summary').classList.remove('d-none');
    document.getElementById('empty-checkout').classList.add('d-none');
    
    // Dropzone events
    setupDropzone();
    
    // Global handlers
    window.proceedToPayment = proceedToPayment;
    window.goBackToReview = goBackToReview;
    window.showUploadModal = showUploadModal;
}

function renderStepper() {
    const stepper = document.getElementById('stepper');
    stepper.innerHTML = steps.map((step, index) => `
        <div class="step ${index < currentStep ? 'completed' : index + 1 === currentStep ? 'active' : 'pending'}">
            ${index + 1}
        </div>
        ${index < steps.length - 1 ? '<div class="step-line"></div>' : ''}
    `).join('');
}

function renderReviewStep() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    document.getElementById('checkout-total').textContent = `₦${total.toLocaleString()}`;
    document.getElementById('review-total').textContent = `₦${total.toLocaleString()}`;
    
    const tbody = document.getElementById('review-items');
    tbody.innerHTML = cart.map(item => `
        <tr>
            <td>
                <img src="${item.image || 'asset/hero.jpeg'}" alt="${item.name}" 
                     class="rounded me-3" style="width: 50px; height: 50px; object-fit: cover;">
                <strong>${item.name}</strong>
            </td>
            <td>${item.quantity}</td>
            <td>₦${item.price.toLocaleString()}</td>
            <td class="text-warning fw-bold">₦${(item.price * item.quantity).toLocaleString()}</td>
        </tr>
    `).join('');
    
    showStep('review');
}

async function proceedToPayment() {
    try {
        showLoading();
        
        const response = await apiCall('/orders/checkout');
        
        currentOrder = response.data;
        renderPaymentStep();
        currentStep = 2;
        renderStepper();
        hideLoading();
        showToast('Order created! Make bank transfer below.', 'success');
        
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
    }
}

function renderPaymentStep() {
    document.getElementById('bank-details').innerHTML = `
        <div class="mb-4">
            <h5 class="text-warning mb-3">${currentOrder.accountNumber}</h5>
            <h6 class="text-muted mb-1">${currentOrder.bankName}</h6>
            <p class="text-success fw-bold fs-5 mb-0">Total: ₦${currentOrder.totalAmount.toLocaleString()}</p>
        </div>
        <div class="alert alert-info">
            <strong>Reference:</strong> ${currentOrder._id.slice(-8).toUpperCase()}<br>
            <small class="text-muted">Include in transfer description</small>
        </div>
    `;
    
    document.getElementById('payment-order-details').innerHTML = `
        <div class="mb-3">
            <strong>Order #</strong> ${currentOrder._id.slice(-8).toUpperCase()}
        </div>
        <div class="mb-3">
            <strong>Date:</strong> ${new Date(currentOrder.createdAt).toLocaleDateString()}
        </div>
        <div class="mb-3">
            <strong>Items:</strong> ${currentOrder.items.length}
        </div>
        <div class="text-warning fs-5">
            <strong>Total: ₦${currentOrder.totalAmount.toLocaleString()}</strong>
        </div>
    `;
    
    showStep('payment');
}

function showStep(stepId) {
    document.querySelectorAll('.checkout-step').forEach(step => step.classList.add('d-none'));
    document.getElementById(`step-${stepId}`).classList.remove('d-none');
}

function goBackToReview() {
    currentStep = 1;
    renderStepper();
    renderReviewStep();
}

function setupDropzone() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('receipt-file');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });
    
    dropzone.addEventListener('drop', handleDrop, false);
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
}

function handleFile(file) {
    if (file.size > 5 * 1024 * 1024) {
        showToast('File too large (max 5MB)', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('receipt-preview');
        preview.src = e.target.result;
        preview.classList.remove('d-none');
        window.selectedFile = file;  // Global for upload
        document.getElementById('confirm-upload').disabled = false;
    };
    reader.readAsDataURL(file);
}

async function showUploadModal() {
    currentStep = 3;
    renderStepper();
    const modal = new bootstrap.Modal(document.getElementById('receiptModal'));
    modal.show();
}

document.getElementById('confirm-upload').addEventListener('click', confirmUpload);

async function confirmUpload() {
    if (!window.selectedFile || !currentOrder) return;
    
    try {
        document.getElementById('upload-status').classList.remove('d-none');
        document.getElementById('confirm-upload').disabled = true;
        
        const result = await uploadReceipt(currentOrder._id, window.selectedFile);
        
        // Success
        currentStep = 4;
        renderStepper();
        
        // Clear cart
        localStorage.removeItem('cart');
        cart = [];
        
        // Show success
        document.getElementById('success-details').innerHTML = `
            <div class="mb-3">
                <strong>Order #${currentOrder._id.slice(-8).toUpperCase()}</strong>
            </div>
            <div class="mb-3">
                <strong>Payment Ref:</strong> ${result.reference}
            </div>
            <p class="text-success">Receipt uploaded successfully. Waiting for admin verification.</p>
        `;
        
        const successModal = new bootstrap.Modal(document.getElementById('successModal'));
        successModal.show();
        
        // Auto redirect after 3s
        setTimeout(() => {
            window.location.href = 'orders.html';
        }, 3000);
        
        showToast('Order complete! Check Orders page for updates.', 'success');
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        document.getElementById('upload-status').classList.add('d-none');
        document.getElementById('confirm-upload').disabled = false;
    }
}

// Loading helpers
function showLoading() {
    // Use shared loader if available
    if (typeof document.getElementById('loadingOverlay') !== 'undefined') {
        document.getElementById('loadingOverlay')?.classList.remove('d-none');
    }
}

function hideLoading() {
    if (typeof document.getElementById('loadingOverlay') !== 'undefined') {
        document.getElementById('loadingOverlay')?.classList.add('d-none');
    }
}

console.log('✅ Checkout JS loaded - Backend ready');

