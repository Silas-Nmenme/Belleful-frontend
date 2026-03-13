// App.js - Central script for Belleful with real auth support
// Shared auth state & nav management
const API_BASE = 'https://belleful-fphf.vercel.app/api'; // Update later

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('belleful-user')) || null;
  } catch {
    return null;
  }
}

function saveUser(user) {
  localStorage.setItem('belleful-user', JSON.stringify(user));
}

function isLoggedIn() {
  const user = getUser();
  return user && user.loggedIn && user.name && user.token;
}

function updateNav() {
  const userNav = document.getElementById('user-nav');
  const loginLink = document.getElementById('login-link');
  const mobileLoginLink = document.getElementById('mobile-login-link');
  const loginToggle = document.getElementById('login-toggle');
  const mobileLoginToggle = document.getElementById('mobile-login-toggle');

  if (isLoggedIn()) {
    const user = getUser();
    if (userNav) {
      document.getElementById('user-name').textContent = user.name;
      userNav.classList.remove('hidden');
    }
    if (loginLink) loginLink.style.display = 'none';
    if (mobileLoginLink) mobileLoginLink.style.display = 'none';
    if (loginToggle) {
      loginToggle.innerHTML = `<i class="fas fa-user-check text-xl"></i><span>Hi, ${user.name}</span>`;
      loginToggle.classList.remove('bg-gold', 'text-wine');
      loginToggle.classList.add('bg-green-500', 'text-white');
      loginToggle.href = '';
    }
    if (mobileLoginToggle) mobileLoginToggle.innerHTML = `<i class="fas fa-user-check text-lg"></i><span>${user.name}</span>`;
  } else {
    if (userNav) userNav.classList.add('hidden');
    if (loginLink) loginLink.style.display = 'block';
    if (mobileLoginLink) mobileLoginLink.style.display = 'block';
    if (loginToggle) {
      loginToggle.innerHTML = `<i class="fas fa-user-circle text-xl"></i><span>Login</span>`;
      loginToggle.classList.remove('bg-green-500', 'text-white');
      loginToggle.classList.add('bg-gold', 'text-wine');
      loginToggle.href = 'login.html';
    }
  }
}

async function loginUser(email, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.success) {
      saveUser({ ...data.user, loggedIn: true });
      updateNav();
      const role = data.user.role;
      const redirectPath = role === 'admin' ? 'dashboard/admin-dashboard.html' : 'dashboard/user-dashboard.html';
      window.location.href = redirectPath;
      return true;

    } else {
      alert(data.message || 'Login failed');
      return false;
    }
  } catch (error) {
    alert('Network error: ' + error.message);
    return false;
  }
}

async function registerUser(name, email, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await response.json();
    if (data.success) {
      alert('Account created! Check your email for OTP.');
      window.location.href = `verify.html?email=${encodeURIComponent(email)}`;
      return true;
    } else {
      alert(data.message || data.errors?.[0]?.msg || 'Registration failed');
      return false;
    }
  } catch (error) {
    alert('Network error: ' + error.message);
    return false;
  }
}

async function verifyOTP(email, otp) {
  try {
    const response = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    const data = await response.json();
    if (data.success) {
      saveUser({ ...data.user, loggedIn: true });
      updateNav();
      alert('Account verified! Redirecting to home...');
      window.location.href = 'index.html';
      return true;
    } else {
      alert(data.message || 'Verification failed');
      return false;
    }
  } catch (error) {
    alert('Network error: ' + error.message);
    return false;
  }
}

function logout() {
  localStorage.removeItem('belleful-user');
  updateNav();
  window.location.href = 'login.html';
}

// Page guard - redirect unauth users
if (!isLoggedIn() && window.location.pathname.includes('orders.html') || window.location.pathname.includes('admin.html')) {
  window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', function() {
let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const emptyCartDiv = document.querySelector('.empty-cart') || document.querySelector('.empty-cart');
    const cartModal = document.querySelector('.cart-modal');
    // AOS Init (safe)
    if (typeof AOS !== 'undefined') {
      AOS.init({
          duration: 1000,
          once: true,
          offset: 100
      });
    }


    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('nav');
        if (window.scrollY > 100) {
            nav.classList.add('bg-wine/98', 'shadow-xl');
        } else {
            nav.classList.remove('bg-wine/98', 'shadow-xl');
        }
    });

    // Mobile menu toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Typing effect for hero title
    const typingElement = document.querySelector('.typing-text');
    if (typingElement && Typed) {
        new Typed(typingElement, {
            strings: [typingElement.textContent, 'Authentic Nigerian Delights', 'Savor the Delight'],
            typeSpeed: 50,
            backSpeed: 30,
            backDelay: 1000,
            loop: true
        });
    }

    // particlesJS removed to fix ReferenceError - effect non-essential for core functionality

    // Parallax effect for hero
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallax = document.querySelector('.parallax-bg');
        if (parallax) {
            parallax.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });

    // Custom cursor
    const cursor = document.createElement('div');
    cursor.classList.add('cursor');
    const cursorFollower = document.createElement('div');
    cursorFollower.classList.add('cursor-follower');
    document.body.appendChild(cursor);
    document.body.appendChild(cursorFollower);

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        cursorFollower.style.left = e.clientX + 'px';
        cursorFollower.style.top = e.clientY + 'px';
    });

    // Dish cards - Add to cart
    document.addEventListener('click', (e) => {
        if (e.target.closest('.add-cart-btn')) {
            const dishCard = e.target.closest('.dish-card');
            const name = dishCard.dataset.name;
            const price = parseInt(dishCard.dataset.price);
            
            const item = cart.find(item => item.name === name);
            if (item) {
                item.quantity += 1;
            } else {
                cart.push({ name, price, quantity: 1 });
            }
            localStorage.setItem('belleful-cart', JSON.stringify(cart));
            updateCartModal();
            cartModal.classList.add('active');
            
            // Success animation
            const btn = e.target.closest('.add-cart-btn');
            btn.style.transform = 'scale(1.2)';
            setTimeout(() => btn.style.transform = 'scale(1)', 200);
        }

        if (e.target.closest('.close-cart') || e.target.closest('.cart-modal')) {
            cartModal.classList.remove('active');
        }
    });

    // Update cart modal
    function updateCartModal() {
        const cartItems = document.getElementById('cart-items');
        const cartTotalSection = document.getElementById('cart-total-section');
        const cartTotal = document.getElementById('cart-total');
        if (cartItems && cartTotalSection) {
            if (cart.length === 0) {
                cartItems.innerHTML = '';
                cartTotalSection.classList.add('hidden');
                if (emptyCartDiv) emptyCartDiv.classList.remove('hidden');
                return;
            }
            if (emptyCartDiv) emptyCartDiv.classList.add('hidden');
            cartItems.innerHTML = '';
            cartTotalSection.classList.remove('hidden');
            let total = 0;
            cart.forEach((item, index) => {
                total += item.price * item.quantity;
                cartItems.innerHTML += `
                    <div class="cart-item flex justify-between items-center py-2 border-b border-gold/30">
                        <span class="font-semibold text-gray-900">${item.name}</span>
                        <div class="flex items-center space-x-3">
                            <button onclick="updateQuantity(${index}, -1)" class="w-8 h-8 bg-gold text-wine rounded-full font-bold hover:bg-yellow-400 transition-all flex items-center justify-center">-</button>
                            <span class="w-8 text-center font-bold text-gray-900">${item.quantity}</span>
                            <button onclick="updateQuantity(${index}, 1)" class="w-8 h-8 bg-gold text-wine rounded-full font-bold hover:bg-yellow-400 transition-all flex items-center justify-center">+</button>
                            <span class="ml-4 text-gray-900 font-bold text-xl">₦${item.price * item.quantity}</span>
                        </div>
                    </div>
                `;
            });
            if (cartTotal) cartTotal.textContent = `₦${total}`;
        }
    }

    // Initial cart display
    updateCartModal();

    // Global functions for inline onclick
    window.updateQuantity = function(index, delta) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        localStorage.setItem('belleful-cart', JSON.stringify(cart));
        updateCartModal();
    };

    // Initialize auth nav on DOM load
    updateNav();

    // Logout handler
    document.getElementById('logout-btn')?.addEventListener('click', logout);

    // Form handlers for auth pages
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        await loginUser(email, password);
      });
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        document.getElementById('signup-btn-text').classList.add('hidden');
        document.getElementById('signup-loading').classList.remove('hidden');
        await registerUser(name, email, password);
        document.getElementById('signup-btn-text').classList.remove('hidden');
        document.getElementById('signup-loading').classList.add('hidden');
      });
    }

    const verifyForm = document.getElementById('verify-form');
    if (verifyForm) {
      // Prefill email from query
      const urlParams = new URLSearchParams(window.location.search);
      const email = urlParams.get('email');
      if (email) document.getElementById('verify-email').value = email;

      // OTP inputs auto-focus next
      const otpInputs = verifyForm.querySelectorAll('input[type="text"][maxlength="1"]');
      otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
          if (e.target.value.length === 1 && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
          }
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
            otpInputs[index - 1].focus();
          }
        });
      });

      verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('verify-email').value;
        const otp = Array.from(otpInputs).map(input => input.value).join('');
        if (otp.length !== 6) {
          alert('Please enter full 6-digit OTP');
          return;
        }
        document.getElementById('verify-btn-text').classList.add('hidden');
        document.getElementById('verify-loading').classList.remove('hidden');
        await verifyOTP(email, otp);
        document.getElementById('verify-btn-text').classList.remove('hidden');
        document.getElementById('verify-loading').classList.add('hidden');
      });
    }

    // Testimonial carousel
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            document.querySelectorAll('.carousel-slide').forEach(slide => slide.classList.remove('active'));
            document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
            document.querySelectorAll('.carousel-slide')[index].classList.add('active');
            dot.classList.add('active');
        });
    });

    // Auto rotate carousel
    setInterval(() => {
        const current = document.querySelector('.carousel-slide.active');
        const next = current.nextElementSibling || document.querySelector('.carousel-slide');
        const currentDot = document.querySelector('.dot.active');
        const nextDot = currentDot.nextElementSibling || document.querySelector('.dot');
        
        current.classList.remove('active');
        currentDot.classList.remove('active');
        next.classList.add('active');
        nextDot.classList.add('active');
    }, 5000);

    // Stats counters
    const counters = document.querySelectorAll('.stats-counter');
    const animateCounters = () => {
        counters.forEach(counter => {
            const target = parseInt(counter.dataset.target);
            const count = parseInt(counter.textContent);
            const increment = target / 100;
            
            if (count < target) {
                counter.textContent = Math.floor(count + increment);
                setTimeout(animateCounters, 20);
            } else {
                counter.textContent = target;
                counter.classList.add('counter-anim');
            }
        });
    };

    // Trigger counters on scroll into view
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    });
    document.querySelector('.stats-grid')?.parentElement && statsObserver.observe(document.querySelector('.stats-grid').parentElement);

    // Image load shimmer effect
    document.querySelectorAll('.image-container').forEach(container => {
        const img = container.querySelector('div[style*="background-image"]');
        if (img) {
            // Simulate load for background images
            setTimeout(() => container.classList.add('loaded'), 500);
        }
    });

// ===== Search Functionality =====
const searchPanel = document.getElementById('search-panel');
const loginModal = document.getElementById('login-modal');
const searchToggle = document.getElementById('search-toggle');
const loginToggle = document.getElementById('login-toggle');
const mobileSearchToggle = document.getElementById('mobile-search-toggle');
const mobileLoginToggle = document.getElementById('mobile-login-toggle');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const searchResults = document.getElementById('search-results');
const noResults = document.getElementById('no-results');
const featuredDishes = document.querySelectorAll('.dish-card');
const dishesGrid = document.querySelector('#featured .grid');

// Toggle search panel
function toggleSearch() {
    searchPanel.classList.toggle('active');
    if (searchPanel.classList.contains('active')) {
        searchInput.focus();
    }
}

// Toggle login modal
function toggleLogin() {
    loginModal.classList.toggle('active');
}

// Search dishes live filter
function performSearch(query) {
    const lowerQuery = query.toLowerCase().trim();
    
    // Filter featured dishes
    let visibleCount = 0;
    featuredDishes.forEach(dish => {
        const name = dish.dataset.name.toLowerCase();
        const desc = dish.querySelector('p').textContent.toLowerCase();
        if (name.includes(lowerQuery) || desc.includes(lowerQuery) || lowerQuery === '') {
            dish.style.display = 'block';
            dish.classList.add('search-highlight-anim');
            setTimeout(() => dish.classList.remove('search-highlight-anim'), 500);
            visibleCount++;
        } else {
            dish.style.display = 'none';
        }
    });
    
    // Update results count
    if (lowerQuery === '') {
        noResults.classList.add('hidden');
        searchResults.innerHTML = '';
    } else if (visibleCount === 0) {
        noResults.classList.remove('hidden');
        searchResults.innerHTML = '';
    } else {
        noResults.classList.add('hidden');
    }
    
    // Scroll to featured if results
    if (visibleCount > 0 && lowerQuery !== '') {
        featuredDishes[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Event listeners
if (searchToggle) searchToggle.addEventListener('click', toggleSearch);
if (mobileSearchToggle) mobileSearchToggle.addEventListener('click', (e) => { e.preventDefault(); toggleSearch(); });
if (loginToggle) loginToggle.addEventListener('click', toggleLogin);
if (mobileLoginToggle) mobileLoginToggle.addEventListener('click', (e) => { e.preventDefault(); toggleLogin(); });

// Search input
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
        if (e.target.value) {
            searchClear.classList.remove('hidden');
        } else {
            searchClear.classList.add('hidden');
        }
    });
    
    // Clear search
    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.classList.add('hidden');
            performSearch('');
            searchInput.focus();
        });
    }
}

// Close on escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        searchPanel.classList.remove('active');
        loginModal.classList.remove('active');
        cartModal?.classList.remove('active');
    }
});

// Close search/login modals on outside click
document.addEventListener('click', (e) => {
    if (e.target === searchPanel) toggleSearch();
    if (e.target === loginModal) toggleLogin();
});

// Close buttons
document.querySelector('.close-search')?.addEventListener('click', toggleSearch);
document.querySelector('.close-login')?.addEventListener('click', toggleLogin);

  // Old modal logic - fallback
  console.log('Belleful enhanced with full auth system! 🚀');
});



