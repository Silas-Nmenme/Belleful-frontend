// App.js - Enhanced interactivity for Belleful index.html
document.addEventListener('DOMContentLoaded', function() {
    let cart = JSON.parse(localStorage.getItem('belleful-cart')) || [];
    const emptyCartDiv = document.querySelector('.empty-cart') || document.querySelector('.empty-cart');
    const cartModal = document.querySelector('.cart-modal');
    // AOS Init
    AOS.init({
        duration: 1000,
        once: true,
        offset: 100
    });

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

    // Particles.js for hero
    if (particlesJS) {
        particlesJS('particles-js', {
            particles: {
                number: { value: 80, density: { enable: true, value_area: 800 } },
                color: { value: '#D97706' },
                shape: { type: 'circle' },
                opacity: { value: 0.5, random: true },
                size: { value: 3, random: true },
                line_linked: { enable: true, distance: 150, color: '#D97706', opacity: 0.4, width: 1 },
                move: { enable: true, speed: 2, direction: 'none', random: true }
            },
            interactivity: {
                detect_on: 'canvas',
                events: { onhover: { enable: true, mode: 'repulse' } },
                modes: { repulse: { distance: 100, duration: 0.4 } }
            }
        });
    
    }

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
                        <span class="font-semibold text-white">${item.name}</span>
                        <div class="flex items-center space-x-3">
                            <button onclick="updateQuantity(${index}, -1)" class="w-8 h-8 bg-gold text-wine rounded-full font-bold hover:bg-yellow-400 transition-all flex items-center justify-center">-</button>
                            <span class="w-8 text-center font-bold text-gold">${item.quantity}</span>
                            <button onclick="updateQuantity(${index}, 1)" class="w-8 h-8 bg-gold text-wine rounded-full font-bold hover:bg-yellow-400 transition-all flex items-center justify-center">+</button>
                            <span class="ml-4 text-gold font-bold text-xl">₦${item.price * item.quantity}</span>
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

    console.log('Belleful enhanced! ✨');
});

