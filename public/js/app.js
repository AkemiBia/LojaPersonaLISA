// PersonaLISA - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    initCookieNotice();
    initCartFunctions();
    initProductVariants();
    initShippingCalculator();
    initFormValidation();
    initSearchFeatures();
    initLazyLoading();
    initSmoothScrolling();
    initTooltips();
}

// Cookie Notice
function initCookieNotice() {
    const cookieNotice = document.getElementById('cookieNotice');
    if (!cookieNotice) return;

    // Check if cookies already accepted
    if (!getCookie('cookiesAccepted')) {
        setTimeout(() => {
            cookieNotice.classList.add('show');
        }, 1000);
    } else {
        cookieNotice.classList.add('accepted');
    }
}

function acceptCookies() {
    setCookie('cookiesAccepted', 'true', 365);
    const cookieNotice = document.getElementById('cookieNotice');
    if (cookieNotice) {
        cookieNotice.classList.remove('show');
        setTimeout(() => {
            cookieNotice.classList.add('accepted');
        }, 300);
    }
}

// Cookie utilities
function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}

function getCookie(name) {
    return document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=');
        return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, '');
}

// Cart Functions
function initCartFunctions() {
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart, .add-to-cart-quick').forEach(button => {
        button.addEventListener('click', handleAddToCart);
    });

    // Update cart quantities
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', handleUpdateQuantity);
    });

    // Remove from cart buttons
    document.querySelectorAll('.remove-from-cart').forEach(button => {
        button.addEventListener('click', handleRemoveFromCart);
    });
}

async function handleAddToCart(event) {
    event.preventDefault();
    const button = event.target.closest('button');
    const productId = button.dataset.productId;
    const productName = button.dataset.productName;
    
    // Get variant if selected
    const variantSelect = document.querySelector(`#variant-${productId}`);
    const variantId = variantSelect ? variantSelect.value : null;
    
    // Get quantity
    const quantityInput = document.querySelector(`#quantity-${productId}`);
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

    // Show loading
    showLoading(button);

    try {
        const response = await fetch('/carrinho/adicionar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                productId: parseInt(productId),
                variantId: variantId ? parseInt(variantId) : null,
                quantity: quantity
            })
        });

        const result = await response.json();

        if (result.success) {
            // Update cart count in header
            updateCartCount(result.cartCount);
            
            // Show success toast
            showCartToast(productName);
            
            // Reset quantity to 1
            if (quantityInput) quantityInput.value = 1;
            
        } else {
            showAlert(result.message, 'danger');
        }

    } catch (error) {
        console.error('Erro ao adicionar ao carrinho:', error);
        showAlert('Erro ao adicionar produto ao carrinho', 'danger');
    } finally {
        hideLoading(button);
    }
}

async function handleUpdateQuantity(event) {
    const input = event.target;
    const productId = input.dataset.productId;
    const variantId = input.dataset.variantId || null;
    const quantity = parseInt(input.value);

    if (quantity <= 0) {
        return handleRemoveFromCart({ target: input });
    }

    try {
        const response = await fetch('/carrinho/atualizar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId: parseInt(productId),
                variantId: variantId ? parseInt(variantId) : null,
                quantity: quantity
            })
        });

        const result = await response.json();

        if (result.success) {
            updateCartCount(result.cartCount);
            // Reload page to update totals
            window.location.reload();
        } else {
            showAlert(result.message, 'danger');
            // Reset to previous value
            input.value = input.defaultValue;
        }

    } catch (error) {
        console.error('Erro ao atualizar carrinho:', error);
        showAlert('Erro ao atualizar carrinho', 'danger');
        input.value = input.defaultValue;
    }
}

async function handleRemoveFromCart(event) {
    event.preventDefault();
    const element = event.target.closest('[data-product-id]');
    const productId = element.dataset.productId;
    const variantId = element.dataset.variantId || null;

    if (!confirm('Deseja remover este item do carrinho?')) {
        return;
    }

    try {
        const response = await fetch('/carrinho/remover', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId: parseInt(productId),
                variantId: variantId ? parseInt(variantId) : null
            })
        });

        const result = await response.json();

        if (result.success) {
            updateCartCount(result.cartCount);
            // Remove item from DOM or reload page
            const cartItem = element.closest('.cart-item');
            if (cartItem) {
                cartItem.remove();
                // Reload to update totals
                window.location.reload();
            } else {
                window.location.reload();
            }
        } else {
            showAlert(result.message, 'danger');
        }

    } catch (error) {
        console.error('Erro ao remover do carrinho:', error);
        showAlert('Erro ao remover item do carrinho', 'danger');
    }
}

function updateCartCount(count) {
    const cartBadge = document.querySelector('.navbar .badge');
    if (cartBadge) {
        cartBadge.textContent = count;
        if (count > 0) {
            cartBadge.style.display = 'inline';
        } else {
            cartBadge.style.display = 'none';
        }
    }
}

function showCartToast(productName) {
    const toast = document.getElementById('cartToast');
    const message = document.getElementById('cartToastMessage');
    
    if (toast && message) {
        message.textContent = productName;
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}

// Product Variants
function initProductVariants() {
    document.querySelectorAll('.variant-selector').forEach(selector => {
        selector.addEventListener('change', handleVariantChange);
    });
}

async function handleVariantChange(event) {
    const select = event.target;
    const productId = select.dataset.productId;
    const variantId = select.value;

    // Update price if variant has price adjustment
    if (variantId) {
        try {
            const response = await fetch(`/produtos/${productId}/variants`);
            const variants = await response.json();
            
            const selectedVariant = variants.find(v => v.id == variantId);
            if (selectedVariant && selectedVariant.price_adjustment) {
                // Update displayed price (implementation depends on page structure)
                console.log('Price adjustment:', selectedVariant.price_adjustment);
            }
        } catch (error) {
            console.error('Erro ao buscar variantes:', error);
        }
    }
}

// Shipping Calculator
function initShippingCalculator() {
    const shippingForm = document.getElementById('shippingCalculator');
    if (shippingForm) {
        shippingForm.addEventListener('submit', handleShippingCalculation);
    }

    // Format CEP input
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        cepInput.addEventListener('input', formatCEP);
        cepInput.addEventListener('blur', validateCEP);
    }
}

async function handleShippingCalculation(event) {
    event.preventDefault();
    const form = event.target;
    const cep = form.cep.value.replace(/\D/g, '');
    const submitBtn = form.querySelector('button[type="submit"]');

    showLoading(submitBtn);

    try {
        const response = await fetch('/carrinho/frete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cep })
        });

        const result = await response.json();

        if (result.success) {
            displayShippingOptions(result.options);
        } else {
            showAlert(result.message, 'danger');
        }

    } catch (error) {
        console.error('Erro ao calcular frete:', error);
        showAlert('Erro ao calcular frete', 'danger');
    } finally {
        hideLoading(submitBtn);
    }
}

function displayShippingOptions(options) {
    const container = document.getElementById('shippingOptions');
    if (!container) return;

    container.innerHTML = '';
    
    options.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.className = 'shipping-option p-3 border rounded mb-2';
        optionElement.innerHTML = `
            <div class="form-check">
                <input class="form-check-input" type="radio" name="shipping" 
                       id="shipping_${option.name}" value="${JSON.stringify(option).replace(/"/g, '&quot;')}">
                <label class="form-check-label d-flex justify-content-between w-100" for="shipping_${option.name}">
                    <div>
                        <strong>${option.name}</strong><br>
                        <small class="text-muted">${option.days}</small>
                    </div>
                    <div class="text-end">
                        <strong>R$ ${option.price.toFixed(2).replace('.', ',')}</strong>
                    </div>
                </label>
            </div>
        `;
        container.appendChild(optionElement);
    });

    // Add event listeners to shipping options
    container.querySelectorAll('input[name="shipping"]').forEach(input => {
        input.addEventListener('change', handleShippingSelection);
    });

    container.style.display = 'block';
}

async function handleShippingSelection(event) {
    const selectedOption = JSON.parse(event.target.value);
    
    try {
        const response = await fetch('/carrinho/frete/selecionar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(selectedOption)
        });

        const result = await response.json();

        if (result.success) {
            // Reload page to update totals
            window.location.reload();
        } else {
            showAlert(result.message, 'danger');
        }

    } catch (error) {
        console.error('Erro ao selecionar frete:', error);
        showAlert('Erro ao selecionar frete', 'danger');
    }
}

function formatCEP(event) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 5) {
        value = value.substring(0, 5) + '-' + value.substring(5, 8);
    }
    event.target.value = value;
}

function validateCEP(event) {
    const cep = event.target.value.replace(/\D/g, '');
    if (cep.length !== 8) {
        event.target.setCustomValidity('CEP deve ter 8 dígitos');
    } else {
        event.target.setCustomValidity('');
    }
}

// Form Validation
function initFormValidation() {
    document.querySelectorAll('.needs-validation').forEach(form => {
        form.addEventListener('submit', handleFormValidation);
    });

    // Phone mask
    document.querySelectorAll('input[type="tel"]').forEach(input => {
        input.addEventListener('input', formatPhone);
    });
}

function handleFormValidation(event) {
    const form = event.target;
    
    if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    form.classList.add('was-validated');
}

function formatPhone(event) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 10) {
        value = '(' + value.substring(0, 2) + ') ' + 
                value.substring(2, 7) + '-' + 
                value.substring(7, 11);
    }
    event.target.value = value;
}

// Search Features
function initSearchFeatures() {
    const searchInput = document.querySelector('input[name="q"]');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    }
}

function handleSearchInput(event) {
    const query = event.target.value;
    if (query.length >= 2) {
        // Could implement live search suggestions here
        console.log('Searching for:', query);
    }
}

// Lazy Loading
function initLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.classList.add('fade-in');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }
}

// Smooth Scrolling
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Tooltips
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Utility Functions
function showLoading(button) {
    if (button) {
        button.disabled = true;
        const originalText = button.innerHTML;
        button.dataset.originalText = originalText;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
    }
    
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('d-none');
    }
}

function hideLoading(button) {
    if (button && button.dataset.originalText) {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
    }
    
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('d-none');
    }
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('main') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions for global use
window.acceptCookies = acceptCookies;
window.showAlert = showAlert;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
