
// --- Configuration ---
// PASTE YOUR GOOGLE WEB APP URL HERE AFTER DEPLOYING
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzQOZiO2TxT1hf-OYqmkvGYwd-UbCG3tIX7-86qMj6vdhzzFzMmtZO-Lo4ptHFitj7cWQ/exec';
const GOOGLE_CLIENT_ID = "1039399318560-39i9ok10e3lo804so441d5bg0dm8m9oq.apps.googleusercontent.com"; // User must replace this
// Example: https://script.google.com/macros/s/AKfycb.../exec

let DELIVERY_CHARGE = 350; // LKR default (will be updated by settings)

// --- State ---
let allProducts = [];
let displayedProducts = [];
let cart = JSON.parse(localStorage.getItem('electroshop_cart')) || [];

// --- Selectors ---
const els = {
    grid: document.getElementById('product-grid'),
    modal: document.getElementById('product-modal'),
    overlay: document.getElementById('overlay'),
    cartDrawer: document.getElementById('cart-drawer'),
    cartCount: document.getElementById('cart-count'),
    drawerCount: document.getElementById('drawer-count'),
    cartItems: document.getElementById('cart-items'),
    cartSubtotal: document.getElementById('cart-subtotal'),
    cartDelivery: document.getElementById('cart-delivery'),
    cartTotal: document.getElementById('cart-total'),
    status: document.getElementById('status-msg'),
    catDock: document.getElementById('category-dock'),
    logoText: document.getElementById('logo-text'),
    siteTitle: document.getElementById('site-title'),

    // Auth & User
    userBtn: document.getElementById('user-btn'),
    authModal: document.getElementById('auth-modal'),
    closeAuthModal: document.getElementById('close-auth-modal'),
    accountModal: document.getElementById('account-modal'),
    closeAccountModal: document.getElementById('close-account-modal'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),

    // Account Settings
    updateProfileForm: document.getElementById('update-profile-form'),
    changePasswordForm: document.getElementById('change-password-form'),

    // Auth Sections
    loginSection: document.getElementById('login-section'),
    registerSection: document.getElementById('register-section'),

    // Search
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),

    // Modal els
    mImg: document.getElementById('modal-img'),
    mTitle: document.getElementById('modal-title'),
    mBreadcrumb: document.getElementById('modal-breadcrumb'),
    mPrice: document.getElementById('modal-price'),
    mDesc: document.getElementById('modal-desc'),
    mTags: document.getElementById('modal-tags'),
    mShippingBox: document.getElementById('modal-shipping-info'),
    mShippingText: document.getElementById('shipping-text'),
    mStockMsg: document.getElementById('out-of-stock-msg'),

    qtyInput: document.getElementById('qty-input'),
    addToCartBtn: document.getElementById('modal-add-to-cart'),
    buyNowBtn: document.getElementById('modal-buy-now'),
    btnPlus: document.getElementById('qty-plus'),
    btnMinus: document.getElementById('qty-minus'),

    // Checkout
    checkoutForm: document.getElementById('checkout-form'),
    bankDetails: document.getElementById('bank-details'),
    paymentRadios: document.getElementsByName('payment'),

    infoModal: document.getElementById('info-modal'),
    successModal: document.getElementById('success-modal'),
    infoTitle: document.getElementById('info-title'),
    infoBody: document.getElementById('info-body'),

    // Bank Display
    bankNameDev: document.getElementById('bank-name-display'),
    accNameDev: document.getElementById('acc-name-display'),
    accNumDev: document.getElementById('acc-num-display'),
    bankBranchDev: document.getElementById('bank-branch-display'),
    bankWhatsappDev: document.getElementById('bank-whatsapp-display'),
};

let currentModalProduct = null;
let currentQty = 1;
let currentUser = JSON.parse(localStorage.getItem('electro_customer')) || null;

// --- Init ---
async function init() {
    bindEvents();
    updateCartUI();
    loadSettings();
    checkUserSession(); // Check if user is logged in
    initGoogleLogin(); // Init Google Sign-In
    await loadProducts();

    // Check for product ID in URL
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('product_id');
    if (pId && allProducts.length > 0) {
        const p = allProducts.find(x => String(x.id) === String(pId));
        if (p) openModal(p, false);
    }
}

function bindEvents() {
    window.addEventListener('popstate', () => {
        const params = new URLSearchParams(window.location.search);
        const pId = params.get('product_id');
        if (pId) {
            const p = allProducts.find(x => String(x.id) === String(pId));
            if (p) openModal(p, false);
        } else {
            closeModal(false);
        }
    });

    document.getElementById('cart-toggle').addEventListener('click', toggleCart);
    document.getElementById('close-cart').addEventListener('click', toggleCart);
    document.getElementById('close-product-modal').addEventListener('click', closeModal);
    document.querySelector('.close-info-modal').addEventListener('click', closeInfoModal);

    // Auth Events
    els.userBtn.addEventListener('click', () => {
        if (currentUser) openAccountModal();
        else openAuthModal();
    });
    els.closeAuthModal.addEventListener('click', () => {
        els.authModal.classList.add('hidden');
        els.overlay.classList.add('hidden');
    });
    els.closeAccountModal.addEventListener('click', () => {
        els.accountModal.classList.add('hidden');
        els.overlay.classList.add('hidden');
    });

    // Login / Register Submit
    els.loginForm.addEventListener('submit', handleCustomerLogin);
    els.registerForm.addEventListener('submit', handleCustomerRegister);

    // Settings Submit
    if (els.updateProfileForm) els.updateProfileForm.addEventListener('submit', handleProfileUpdate);
    if (els.changePasswordForm) els.changePasswordForm.addEventListener('submit', handleChangePassword);

    // Expose toggleAuthMode globally
    window.toggleAuthMode = (mode) => {
        if (mode === 'register') {
            els.loginSection.classList.add('hidden');
            els.registerSection.classList.remove('hidden');
        } else {
            els.registerSection.classList.add('hidden');
            els.loginSection.classList.remove('hidden');
        }
    };

    window.switchAccountTab = (tab) => {
        document.querySelectorAll('.account-nav .btn-outline').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-tab-${tab}`).classList.add('active');

        document.getElementById('tab-orders').classList.add('hidden');
        document.getElementById('tab-settings').classList.add('hidden');

        document.getElementById(`tab-${tab}`).classList.remove('hidden');
    };

    window.logoutCustomer = () => {
        localStorage.removeItem('electro_customer');
        currentUser = null;
        els.accountModal.classList.add('hidden');
        els.overlay.classList.add('hidden');
        alert("Logged out successfully");
    };

    els.overlay.addEventListener('click', () => {
        closeModal();
        closeInfoModal();
        els.cartDrawer.classList.add('hidden');
        els.authModal.classList.add('hidden');
        els.accountModal.classList.add('hidden');
        els.overlay.classList.add('hidden');
    });

    // Search Events
    els.searchBtn.addEventListener('click', handleSearch);
    els.searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    els.btnPlus.addEventListener('click', () => {
        if (currentModalProduct && currentQty < (currentModalProduct.quantity || 99)) {
            currentQty++; els.qtyInput.value = currentQty;
        }
    });
    els.btnMinus.addEventListener('click', () => { if (currentQty > 1) currentQty--; els.qtyInput.value = currentQty; });

    els.addToCartBtn.addEventListener('click', () => {
        if (currentModalProduct) {
            addToCart(currentModalProduct, currentQty);
            closeModal();
            toggleCart();
        }
    });

    els.buyNowBtn.addEventListener('click', () => {
        if (currentModalProduct) {
            addToCart(currentModalProduct, currentQty);
            closeModal();
            toggleCart();
            setTimeout(() => {
                document.querySelector('.checkout-section').scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
    });

    // Payment Toggle
    Array.from(els.paymentRadios).forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
            e.target.closest('.radio-card').classList.add('selected');
            if (e.target.value === 'bank') els.bankDetails.classList.remove('hidden');
            else els.bankDetails.classList.add('hidden');
        });
    });

    // Info Links
    document.querySelectorAll('.info-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openInfoPage(e.target.dataset.page);
        });
    });

    els.checkoutForm.addEventListener('submit', handleCheckout);
}

function initGoogleLogin() {
    if (typeof google === 'undefined') return; // Library not loaded

    if (GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID_HERE")) {
        console.warn("Google Login Skipped: GOOGLE_CLIENT_ID is not configured in Electroshop-script.js");
        return;
    }

    try {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredential
        });

        // Render Button if container exists
        const btnContainer = document.getElementById('google-btn-container');
        if (btnContainer) {
            google.accounts.id.renderButton(
                btnContainer,
                { theme: "outline", size: "large", width: 350 }  // customization attributes
            );
        }
    } catch (e) {
        console.warn("Google Sign-In Init Failed (Check Client ID)", e);
    }
}

async function handleGoogleCredential(response) {
    // Decode JWT to get user info
    const responsePayload = parseJwt(response.credential);
    console.log("ID: " + responsePayload.sub);
    console.log('Full Name: ' + responsePayload.name);
    console.log('Given Name: ' + responsePayload.given_name);
    console.log('Family Name: ' + responsePayload.family_name);
    console.log("Image URL: " + responsePayload.picture);
    console.log("Email: " + responsePayload.email);

    // Send to Backend to "Login or Register"
    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'google_auth_customer',
                email: responsePayload.email,
                name: responsePayload.name,
                picture: responsePayload.picture
            })
        });
        const data = await res.json();

        if (data.status === 'success') {
            currentUser = data.customer;
            localStorage.setItem('electro_customer', JSON.stringify(currentUser));

            checkUserSession(); // Update checkout forms

            // Close modals
            els.authModal.classList.add('hidden');
            els.overlay.classList.add('hidden');

            if (data.isNewUser) {
                alert("Account created with Google! Welcome " + currentUser.name);
            } else {
                alert("Welcome back, " + currentUser.name + "!");
            }

        } else {
            alert("Google Login Error: " + data.message);
        }
    } catch (err) {
        console.error("Google Auth Backend Error", err);
        alert("Server Connection Failed");
    }
}

function parseJwt(token) {
    try {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return {};
    }
}

function openAuthModal() {
    // ... existing functions ...
    els.authModal.classList.remove('hidden');
    els.overlay.classList.remove('hidden');
}

function openAccountModal() {
    els.accountModal.classList.remove('hidden');
    els.overlay.classList.remove('hidden');

    // Populate UI
    if (currentUser) {
        document.getElementById('user-initial').innerText = currentUser.name.charAt(0).toUpperCase();
        document.getElementById('user-name-display').innerText = currentUser.name;
        document.getElementById('user-id-display').innerText = currentUser.id;
        document.getElementById('user-email-display').innerText = currentUser.email;
        document.getElementById('user-phone-display').innerText = currentUser.phone || '';
        document.getElementById('user-addr-display').innerText = currentUser.address || '';

        // Populate settings inputs
        document.getElementById('upd-name').value = currentUser.name;
        document.getElementById('upd-phone').value = currentUser.phone || '';
        document.getElementById('upd-address').value = currentUser.address || '';

        // Default to Orders tab
        window.switchAccountTab('orders');
        loadCustomerOrders();
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "Updating...";
    btn.disabled = true;

    const updates = {
        name: document.getElementById('upd-name').value,
        phone: document.getElementById('upd-phone').value,
        address: document.getElementById('upd-address').value
    };

    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'update_customer_profile',
                customerId: currentUser.id,
                ...updates
            })
        });
        const data = await res.json();

        if (data.status === 'success') {
            currentUser = data.customer;
            localStorage.setItem('electro_customer', JSON.stringify(currentUser));
            alert("Profile updated successfully!");
            openAccountModal(); // Refresh UI
        } else {
            alert("Update Failed: " + data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Connection Error");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function handleChangePassword(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "Updating...";
    btn.disabled = true;

    const oldPass = document.getElementById('upd-old-pass').value;
    const newPass = document.getElementById('upd-new-pass').value;

    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'change_customer_password',
                customerId: currentUser.id,
                oldPassword: oldPass,
                newPassword: newPass
            })
        });
        const data = await res.json();

        if (data.status === 'success') {
            alert("Password changed successfully!");
            e.target.reset();
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Connection Error");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function checkUserSession() {
    if (currentUser) {
        // Pre-fill checkout if form exists
        const nameIn = els.checkoutForm.querySelector('[name="cust-name"]');
        const emailIn = els.checkoutForm.querySelector('[name="cust-email"]');
        const phoneIn = els.checkoutForm.querySelector('[name="cust-phone"]');
        const addrIn = els.checkoutForm.querySelector('[name="cust-address"]');

        if (nameIn) nameIn.value = currentUser.name;
        if (emailIn) emailIn.value = currentUser.email;
        if (phoneIn) phoneIn.value = currentUser.phone || '';
        if (addrIn) addrIn.value = currentUser.address || '';
    }
}

async function handleCustomerLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "Logging in...";
    btn.disabled = true;

    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;

    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'login_customer', email, password: pass })
        });
        const data = await res.json();

        if (data.status === 'success') {
            currentUser = data.customer;
            localStorage.setItem('electro_customer', JSON.stringify(currentUser));
            alert("Welcome back, " + currentUser.name + "!");
            els.authModal.classList.add('hidden');
            els.overlay.classList.add('hidden');
            checkUserSession(); // Update checkout form
        } else {
            alert("Login Failed: " + data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Connection Error. Please try again.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function handleCustomerRegister(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "Creating Account...";
    btn.disabled = true;

    const formData = {
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        phone: document.getElementById('reg-phone').value,
        address: document.getElementById('reg-address').value,
        password: document.getElementById('reg-password').value
    };

    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'register_customer', data: formData })
        });
        const data = await res.json();

        if (data.status === 'success') {
            alert("Account Created! You can now login.");
            window.toggleAuthMode('login'); // Switch to login view
        } else {
            alert("Registration Failed: " + data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Connection Error. Please try again.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function loadCustomerOrders() {
    const listDiv = document.getElementById('customer-orders-list');
    listDiv.innerHTML = '<div style="text-align:center; padding:1rem; color:#888;">Fetching orders...</div>';

    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_customer_orders', customerId: currentUser.email })
        });
        // Note: passing email as ID fallback as discussed in backend logic

        const data = await res.json();

        if (data.status === 'success' && data.data.length > 0) {
            listDiv.innerHTML = data.data.map(o => `
              <div style="background:#f9f9f9; padding:1rem; border-radius:8px; border:1px solid #eee;">
                 <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                    <span style="font-weight:700;">#${o.orderId || o.Order_ID}</span>
                    <span class="badge" style="font-size:0.75rem; background:${o.status === 'Delivered' ? '#10b981' : '#f59e0b'}; color:white; padding:2px 6px; border-radius:4px;">${o.status}</span>
                 </div>
                 <div style="font-size:0.85rem; color:#666; margin-bottom:0.5rem;">
                    ${new Date(o.date).toLocaleDateString()}
                 </div>
                 <div style="font-size:0.9rem; margin-bottom:0.5rem;">
                    ${o.items ? o.items.substring(0, 60) + '...' : 'Items info unavailable'}
                 </div>
                 <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #eee; pt-2; mt-2;">
                    <span style="font-weight:700;">LKR ${o.total}</span>
                    <button style="font-size:0.8rem; color:var(--primary); background:none; border:none; cursor:pointer;" onclick="alert('Tracking: ${o.tracking || 'Pending'}\\nCourier: ${o.courier || 'Pending'}')">Track Order</button>
                 </div>
              </div>
            `).join('');
        } else {
            listDiv.innerHTML = '<div style="text-align:center; padding:2rem; color:#888;">No orders found.</div>';
        }
    } catch (err) {
        console.warn(err);
        listDiv.innerHTML = '<div style="text-align:center; color:red;">Failed to load history.</div>';
    }
}

function handleSearch() {
    const query = els.searchInput.value.toLowerCase().trim();
    if (!query) {
        displayedProducts = allProducts;
    } else {
        displayedProducts = allProducts.filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query));
    }

    // Reset Category Active State
    document.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));

    renderProducts(displayedProducts);

    if (displayedProducts.length === 0) {
        els.grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:2rem; color:#666;">No products found matching "' + query + '"</div>';
    }
}

function normalizeDriveUrl(url) {
    if (!url || typeof url !== 'string') return url;
    if (url.includes('drive.google.com')) {
        let fileId = '';
        if (url.includes('id=')) {
            fileId = url.split('id=')[1].split('&')[0];
        } else if (url.includes('/d/')) {
            fileId = url.split('/d/')[1].split('/')[0];
        }
        if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
    return url;
}

// --- Data Fetching ---
async function loadSettings() {
    if (WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') return;
    try {
        const res = await fetch(`${WEB_APP_URL}?type=settings`);
        if (!res.ok) return;
        const settings = await res.json();

        if (settings) {
            if (settings.ShopName) {
                if (els.logoText) els.logoText.innerText = settings.ShopName;
                if (els.siteTitle) els.siteTitle.innerText = settings.ShopName + " - Sri Lanka";
            }
            if (settings.AboutUs) infoContent.about = settings.AboutUs;
            if (settings.WhatsAppNumber && els.bankWhatsappDev) {
                els.bankWhatsappDev.innerText = settings.WhatsAppNumber;
            }
            if (settings.ContactUs) {
                infoContent.contact = settings.ContactUs;
            }
            if (settings.PrivacyPolicy) infoContent.privacy = settings.PrivacyPolicy;
            if (settings.ShippingPolicy) infoContent.shipping = settings.ShippingPolicy;
            if (settings.ReturnPolicy) infoContent.returnpolicy = settings.ReturnPolicy;

            // Bank Details
            if (settings.BankName && els.bankNameDev) els.bankNameDev.innerText = settings.BankName;
            if (settings.AccountName && els.accNameDev) els.accNameDev.innerText = settings.AccountName;
            if (settings.AccountNumber && els.accNumDev) els.accNumDev.innerText = settings.AccountNumber;
            if (settings.BankBranch && els.bankBranchDev) els.bankBranchDev.innerText = settings.BankBranch;

            // Update Payment Desc if multiple banks are listed
            if (settings.BankName) {
                const bankRadioDesc = document.querySelector('input[value="bank"]')?.parentElement.querySelector('.radio-desc');
                if (bankRadioDesc) bankRadioDesc.innerText = settings.BankName;
            }
            // Delivery Charge
            if (settings.DeliveryCharge || settings['Standard \ndelivery \ncharges'] || settings['Standard delivery charges']) {
                const dc = parseInt(settings.DeliveryCharge || settings['Standard \ndelivery \ncharges'] || settings['Standard delivery charges']);
                if (!isNaN(dc)) {
                    DELIVERY_CHARGE = dc;
                    if (els.cartDelivery) els.cartDelivery.innerText = 'LKR ' + dc.toFixed(dc % 1 === 0 ? 0 : 2);
                }
            }

            // Banner Logic
            if (settings.BannerImageUrl && settings.BannerLink) {
                const bannerSec = document.getElementById('banner-section');
                const bannerImg = document.getElementById('home-banner-img');
                if (bannerSec && bannerImg) {
                    bannerImg.src = settings.BannerImageUrl;
                    bannerSec.style.display = 'block';
                    bannerSec.classList.remove('hidden');

                    bannerSec.onclick = () => {
                        const link = settings.BannerLink.trim();
                        // Try to find category
                        const catBtn = Array.from(document.querySelectorAll('.cat-chip')).find(b => b.innerText.toLowerCase() === link.toLowerCase());
                        if (catBtn) {
                            catBtn.click();
                        } else {
                            els.searchInput.value = link;
                            els.searchBtn.click();
                        }
                        els.grid.scrollIntoView({ behavior: 'smooth' });
                    };
                }
            }
        }
    } catch (e) {
        console.warn('Settings load failed', e);
    }
}

async function loadProducts() {
    if (WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
        console.warn('Web App URL not set. Using mock data.');
        useMockData();
        return;
    }

    try {
        els.status.innerHTML = 'Loading from Database...';
        const res = await fetch(`${WEB_APP_URL}?type=products`);
        if (!res.ok) throw new Error('API Error');
        const response = await res.json();

        // Handle both response formats:
        // Format 1 (new): {status: "success", data: [...]}
        // Format 2 (old): [...]
        let data;
        if (Array.isArray(response)) {
            // Direct array format (old backend)
            data = response;
        } else if (response && response.data && Array.isArray(response.data)) {
            // Wrapped format (new backend)
            data = response.data;
        } else {
            throw new Error('Invalid response format from API');
        }

        allProducts = data.map(p => {
            // If p is an array, we try to guess based on common indices or search for URLs
            if (Array.isArray(p)) {
                let img = p[3] || "";
                // If index 3 doesn't look like a URL/Path, search the whole array for one
                if (typeof img !== 'string' || (!img.startsWith('http') && !img.startsWith('data:'))) {
                    img = p.find(val => typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:'))) || "";
                }

                // New Fields (Index 8, 9, 10, 11, 12, 13)
                const descImg = p[8] ? normalizeDriveUrl(p[8]) : "";
                const longDesc = p[9] || "";
                const brand = p[12] || "";
                const rating = p[13] || "5.0";

                return {
                    id: p[0], name: p[1], price: p[2], image: normalizeDriveUrl(img),
                    description: p[4], category: p[5], quantity: p[6], origin: p[7],
                    descriptionImage: descImg, longDescription: longDesc,
                    colors: p[10] || "", costPrice: p[11], brand, rating, soldCount: p[14] || 0
                };
            }

            const findKey = (searchTerms) => {
                const keys = Object.keys(p);
                for (let term of searchTerms) {
                    const match = keys.find(k => k.toLowerCase().replace(/[^a-z]/g, '') === term.toLowerCase().replace(/[^a-z]/g, ''));
                    if (match) return p[match];
                }
                // Fallback: search for keys containing the term
                for (let term of searchTerms) {
                    const match = keys.find(k => k.toLowerCase().includes(term.toLowerCase()));
                    if (match) return p[match];
                }
                return undefined;
            };

            const name = findKey(['name', 'title', 'productname']) || 'Unknown Product';
            let priceRaw = String(findKey(['price', 'lkr', 'cost', 'amount']) || '0');
            let image = findKey(['image', 'imageurl', 'imgurl', 'img', 'photo', 'url', 'picture', 'thumbnail']) || '';
            const category = findKey(['category', 'cat', 'type', 'group']) || 'General';
            const description = findKey(['description', 'desc', 'info', 'about']) || '';
            const quantity = findKey(['quantity', 'qty', 'stock', 'count']) || 0;
            const origin = findKey(['origin', 'source', 'stocktype']) || 'local';

            // New Fields
            const descriptionImage = findKey(['descriptionImage', 'descImage', 'descImg']) || '';
            const longDescription = findKey(['longDescription', 'longDesc', 'details']) || '';
            const colors = findKey(['colors', 'variants', 'colour']) || '';
            const brand = findKey(['brand', 'brandname']) || '';
            const rating = findKey(['rating', 'starrating', 'stars']) || '5.0';
            const soldCount = findKey(['soldCount', 'sold', 'sales', 'sold_count']) || 0;

            let originalPrice = priceRaw;
            let offerPrice = priceRaw;
            if (priceRaw.includes('/')) {
                const parts = priceRaw.split('/');
                originalPrice = parts[0].trim();
                offerPrice = parts[1].trim();
            }

            // Final fallback: if image is still empty, search all values for a URL
            if (!image) {
                image = Object.values(p).find(val => typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:'))) || "";
            }

            const rawImage = String(image);
            const firstImage = rawImage.split(',')[0].trim();

            return {
                id: p.id || p.ID || p.Id || p[0] || 'N/A',
                name,
                price: offerPrice,
                originalPrice: originalPrice,
                hasOffer: originalPrice !== offerPrice,
                image: normalizeDriveUrl(firstImage),
                gallery: rawImage,
                category, description,
                quantity: parseInt(quantity) || 0,
                origin,
                descriptionImage: normalizeDriveUrl(String(descriptionImage)),
                longDescription,
                colors,
                brand,
                rating,
                soldCount
            };
        }).map(p => {
            // Final check: if after all that it's still empty, use a placeholder
            if (!p.image || p.image === "" || p.image === "undefined") {
                p.image = "https://via.placeholder.com/600x400?text=" + encodeURIComponent(p.name);
            }
            return p;
        });

        if (allProducts.length === 0) throw new Error('No products found in DB');

        els.status.style.display = 'none';
        displayedProducts = allProducts;
        renderCategories();
        renderProducts(displayedProducts);

    } catch (err) {
        console.warn('Load failed:', err);
        els.status.innerHTML = 'Failed to load products. Check console.';
        useMockData();
    }
}

function useMockData() {
    allProducts = [
        { id: '101', name: 'Wireless Headphones', price: '12500', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', description: 'Noise cancelling.', category: 'Audio', quantity: 10, origin: 'local' },
        { id: '102', name: 'Smart Watch', price: '8900', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500', description: 'Fitness tracker.', category: 'Wearables', quantity: 5, origin: 'overseas' },
    ];
    els.status.innerHTML = 'Showing Demo Data (Connect Google Sheet to fix)';
    displayedProducts = allProducts;
    renderCategories();
    renderProducts(displayedProducts);
}

// ... (helper functions renderCategories, renderProducts, openModal, existing logic stays same) ...
function renderCategories() {
    const cats = ['All', ...new Set(allProducts.map(p => p.category))];
    els.catDock.innerHTML = '';
    cats.forEach(c => {
        const btn = document.createElement('button');
        btn.className = `cat-chip ${c === 'All' ? 'active' : ''}`;
        btn.innerText = c;
        btn.addEventListener('click', () => filterByCategory(c, btn));
        els.catDock.appendChild(btn);
    });
}

function filterByCategory(cat, btnElement) {
    document.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');

    // Toggle Banner Visibility
    const bannerSec = document.getElementById('banner-section');
    const bannerImg = document.getElementById('home-banner-img');
    if (bannerSec && bannerImg) {
        // Check if banner image is valid (not empty and not just the current page url)
        const hasImg = bannerImg.src && bannerImg.src !== window.location.href;
        if (cat === 'All' && hasImg) {
            bannerSec.style.display = 'block';
        } else {
            bannerSec.style.display = 'none';
        }
    }

    if (cat === 'All') displayedProducts = allProducts;
    else displayedProducts = allProducts.filter(p => p.category === cat);
    renderProducts(displayedProducts);
}

function shareProduct(method) {
    if (!currentModalProduct) return;

    const url = new URL(window.location.href);
    url.searchParams.set('product_id', currentModalProduct.id);
    const shareUrl = url.href;
    const shareText = `Check out this ${currentModalProduct.name} at ElectroShop!\n${shareUrl}`;

    if (method === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (method === 'copy') {
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Product link copied to clipboard!');
        });
    }
}

function renderProducts(list) {
    els.grid.innerHTML = '';
    list.forEach(p => {
        const isOOS = p.quantity <= 0;
        const isOverseas = p.origin === 'overseas';
        let badgesHtml = '<div class="card-badges">';
        if (isOOS) badgesHtml += '<span class="badge oos">Out of Stock</span>';
        if (isOverseas) badgesHtml += '<span class="badge overseas">Overseas</span>';
        badgesHtml += '</div>';

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
      ${badgesHtml}
      <div style="overflow:hidden;">
        <img class="p-image" src="${p.image}" alt="${p.name}" loading="lazy">
      </div>
      <div class="p-details">
        ${p.brand ? `<div class="p-brand" style="font-size:0.7rem; color:#888; text-transform:uppercase; margin-bottom:2px;">${p.brand}</div>` : ''}
        <h3 class="p-title">${p.name}</h3>
        ${parseInt(p.soldCount) > 0 ? `<div style="font-size: 0.75rem; color: #64748b; margin-bottom: 4px;">${formatSold(p.soldCount)} sold</div>` : ''}
        <div class="p-price-container">
          ${p.hasOffer ? `<span class="price-old">LKR ${p.originalPrice}</span>` : ''}
          <span class="p-price">LKR ${p.price}</span>
        </div>
        <button class="p-action" ${isOOS ? 'disabled' : ''}>${isOOS ? 'Out of Stock' : 'View Details'}</button>
      </div>
    `;
        card.addEventListener('click', () => openModal(p));
        els.grid.appendChild(card);
    });
}

function openModal(product, pushState = true) {
    currentModalProduct = product;
    currentQty = 1;

    if (pushState) {
        const url = new URL(window.location.href);
        url.searchParams.set('product_id', product.id);
        window.history.pushState({ path: url.href }, '', url.href);
    }

    const isOOS = product.quantity <= 0;
    const isOverseas = product.origin === 'overseas';

    // Multiple Images Support
    const imgArray = (product.gallery || product.image || "").split(",").map(url => normalizeDriveUrl(url.trim())).filter(x => x);

    els.mImg.src = imgArray[0] || "https://via.placeholder.com/600x400?text=" + encodeURIComponent(product.name);
    els.mTitle.innerText = product.name;
    if (els.mBreadcrumb) els.mBreadcrumb.innerText = `Home / ${product.category} / ${product.name}`;

    let priceHtml = `LKR ${product.price}`;
    if (product.hasOffer) {
        priceHtml = `<span class="price-old" style="font-size: 0.7em;">LKR ${product.originalPrice}</span> LKR ${product.price}`;
    }
    els.mPrice.innerHTML = priceHtml;
    els.mPrice.innerHTML = priceHtml;
    els.mDesc.innerText = product.description || 'No description available.';

    // Star Rating Display
    const ratingNum = parseFloat(product.rating || 5);
    const starCount = Math.min(5, Math.max(0, ratingNum));
    const fullStars = Math.floor(starCount);
    const halfStar = starCount % 1 >= 0.5;
    let starsHtml = '<span style="color:#f59e0b; font-size:1rem;">';
    for (let i = 0; i < fullStars; i++) starsHtml += '⭐';
    if (halfStar && fullStars < 5) starsHtml += '⭐'; // Using full star for simplicity or could use a half-star char if font supports
    starsHtml += `</span> <span style="font-size:0.8rem; color:#666;">Ratings ${product.rating || '5.0'}</span>`;

    if (parseInt(product.soldCount) > 0) {
        starsHtml += ` <span style="margin: 0 5px; color: #ccc;">|</span> <span style="font-size:0.8rem; color:#666;">${formatSold(product.soldCount)} sold</span>`;
    }

    const existingRating = els.modal.querySelector('.m-rating-row');
    if (existingRating) existingRating.remove();
    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'm-rating-row';
    ratingDiv.style.marginBottom = '0.5rem';
    ratingDiv.innerHTML = starsHtml;
    els.mTitle.parentNode.insertBefore(ratingDiv, els.mTitle.nextSibling);

    // Brand Display
    const existingBrand = els.modal.querySelector('.m-brand-row');
    if (existingBrand) existingBrand.remove();
    if (product.brand) {
        const brandDiv = document.createElement('div');
        brandDiv.className = 'm-brand-row';
        brandDiv.style.fontSize = '0.85rem';
        brandDiv.style.color = '#666';
        brandDiv.style.marginBottom = '1rem';
        brandDiv.innerHTML = `Brand: <span style="color:var(--primary); font-weight:600;">${product.brand}</span> | <a href="#" onclick="event.preventDefault(); window.searchByBrand('${product.brand}')" style="color:var(--primary); text-decoration:none;">More from ${product.brand}</a>`;
        els.mPrice.parentElement.insertBefore(brandDiv, els.mPrice.parentElement.firstChild);
    }
    // Handle Long Description & Description Image
    const detailsContainer = document.getElementById('modal-details-container');
    if (detailsContainer) {
        // Find user-defined slots
        const descSlot = detailsContainer.querySelector('.p-long-description');
        const imgSlot = detailsContainer.querySelector('.p-long-description-image');

        if (descSlot) {
            descSlot.innerHTML = "";
            if (product.longDescription) {
                const p = document.createElement('p');
                p.style.whiteSpace = "pre-wrap";
                p.style.marginTop = "1rem";
                p.style.color = "#444";
                p.style.fontSize = "0.95rem";
                p.innerText = product.longDescription;
                descSlot.appendChild(p);
            }
        }

        if (imgSlot) {
            imgSlot.innerHTML = "";
            if (product.descriptionImage) {
                const img = document.createElement('img');
                img.src = product.descriptionImage;
                img.style.width = "100%";
                img.style.marginTop = "1rem";
                img.style.borderRadius = "8px";
                imgSlot.appendChild(img);
            }
        }

        // Fallback: If user didn't add the inner divs yet (or cleared them), use old logic
        if (!descSlot && !imgSlot) {
            detailsContainer.innerHTML = "";
            if (product.longDescription) { /* ... same creation logic ... */
                const p = document.createElement('p');
                p.style.whiteSpace = "pre-wrap"; p.style.marginTop = "1rem"; p.style.color = "#444"; p.style.fontSize = "0.95rem";
                p.innerText = product.longDescription; detailsContainer.appendChild(p);
            }
            if (product.descriptionImage) {
                const img = document.createElement('img');
                img.src = product.descriptionImage; img.style.width = "100%"; img.style.marginTop = "1rem"; img.style.borderRadius = "8px";
                detailsContainer.appendChild(img);
            }
        }
    }

    els.qtyInput.value = 1;

    // Gallery Thumbnails
    els.mTags.innerHTML = '';

    // Remove any existing gallery from previous opens
    const oldGallery = els.modal.querySelector('.product-gallery-nav');
    if (oldGallery) oldGallery.remove();

    if (imgArray.length > 1) {
        const galleryDiv = document.createElement('div');
        galleryDiv.className = 'product-gallery-nav';

        imgArray.forEach((url, idx) => {
            const thumb = document.createElement('img');
            thumb.src = url;
            thumb.className = `gallery-thumb ${idx === 0 ? 'active' : ''}`;
            thumb.onclick = () => {
                els.mImg.src = url;
                galleryDiv.querySelectorAll('.gallery-thumb').forEach(i => i.classList.remove('active'));
                thumb.classList.add('active');
            };
            galleryDiv.appendChild(thumb);
        });
        els.mImg.parentElement.appendChild(galleryDiv);
    }

    if (isOverseas) els.mTags.innerHTML += '<span class="badge overseas">Overseas Item</span>';

    if (isOverseas) {
        els.mShippingText.innerHTML = `International Shipping: <strong>14-20 Days</strong>. <span class="overseas-tooltip" title="Shipped directly from our overseas warehouse. Customs cleared.">What is this?</span>`;
    } else {
        els.mShippingText.innerHTML = `Local Stock: <strong>3-7 Working Days</strong> island-wide.`;
    }

    if (isOOS) {
        els.addToCartBtn.disabled = true;
        els.buyNowBtn.disabled = true;
        els.mStockMsg.classList.remove('hidden');
        els.qtyInput.disabled = true;
    } else {
        els.addToCartBtn.disabled = false;
        els.buyNowBtn.disabled = false;
        els.mStockMsg.classList.add('hidden');
        els.qtyInput.disabled = false;
    }

    // --- Color Selection Logic ---
    const existingColorDiv = els.modal.querySelector('.color-selection-container');
    if (existingColorDiv) existingColorDiv.remove();

    if (product.colors) {
        const colorContainer = document.createElement('div');
        colorContainer.className = 'color-selection-container';
        colorContainer.style.marginTop = '1rem';
        colorContainer.innerHTML = '<strong>Select Color:</strong><div class="color-options" style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.5rem;"></div>';

        const optionsDiv = colorContainer.querySelector('.color-options');
        const colorList = product.colors.split(',').map(c => {
            const parts = c.split(':');
            return {
                name: parts[0].trim(),
                price: parts[1] ? parseFloat(parts[1].trim()) : null
            };
        }).filter(c => c.name);

        colorList.forEach((c, idx) => {
            const btn = document.createElement('button');
            btn.className = 'color-btn'; // styling needed
            btn.innerText = c.name;
            btn.style.border = '1px solid #ddd';
            btn.style.padding = '0.5rem 1rem';
            btn.style.borderRadius = '20px';
            btn.style.cursor = 'pointer';
            btn.style.background = 'white';

            // Auto-select first?
            // btn.classList.add('selected'); 

            btn.onclick = () => {
                // Remove active class from all
                optionsDiv.querySelectorAll('.color-btn').forEach(b => {
                    b.style.background = 'white';
                    b.style.color = 'black';
                    b.style.borderColor = '#ddd';
                });
                // Add active to clicked
                btn.style.background = '#6366f1'; // Primary color
                btn.style.color = 'white';
                btn.style.borderColor = '#6366f1';

                // Update Price
                if (c.price) {
                    els.mPrice.innerHTML = `LKR ${c.price.toLocaleString()}`;
                    currentModalProduct.currentPrice = c.price;
                } else {
                    // Reset to original logic
                    let priceHtml = `LKR ${product.price}`;
                    if (product.hasOffer) {
                        priceHtml = `<span class="price-old" style="font-size: 0.7em;">LKR ${product.originalPrice}</span> LKR ${product.price}`;
                    }
                    els.mPrice.innerHTML = priceHtml;
                    currentModalProduct.currentPrice = product.price; // or original offer
                }
                currentModalProduct.selectedColor = c.name;
            };

            optionsDiv.appendChild(btn);
        });

        // Insert after price block
        const priceBlock = els.mPrice.parentElement; // .price-block
        priceBlock.parentNode.insertBefore(colorContainer, priceBlock.nextSibling);
    }

    // Populate Related Items
    const relatedSection = document.getElementById('related-products-section');
    const relatedGrid = document.getElementById('related-products-grid');

    if (relatedSection && relatedGrid) {
        const related = allProducts
            .filter(p => p.category === product.category && String(p.id) !== String(product.id)) // Same Category, Different ID
            .slice(0, 4); // Limit to 4

        if (related.length > 0) {
            relatedSection.style.display = 'block';
            relatedGrid.innerHTML = related.map(rp => `
        <div class="related-card" onclick="event.stopPropagation(); window.openModalById('${rp.id}')">
          <img src="${rp.image}" alt="${rp.name}">
          <div class="r-info">
            <div class="r-title">${rp.name}</div>
            <div class="r-price">LKR ${rp.price}</div>
          </div>
        </div>
      `).join('');
        } else {
            relatedSection.style.display = 'none';
        }
    }

    els.modal.classList.remove('hidden');
    els.overlay.classList.remove('hidden');
}

function closeModal(pushState = true) {
    if (pushState && window.location.search.includes('product_id')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('product_id');
        window.history.pushState({ path: url.href }, '', url.href);
    }
    els.modal.classList.add('hidden');
    els.overlay.classList.add('hidden');
}

// Helper for Related Items
window.openModalById = function (id) {
    const p = allProducts.find(x => String(x.id) === String(id));
    if (p) openModal(p);
};

// Helper for Brand Search
window.searchByBrand = function (brand) {
    els.searchInput.value = brand;
    handleSearch();
    closeModal();
    els.grid.scrollIntoView({ behavior: 'smooth' });
};

// Helper for Brand Search
window.searchByBrand = function (brand) {
    els.searchInput.value = brand;
    handleSearch();
    closeModal();
    els.grid.scrollIntoView({ behavior: 'smooth' });
};

function formatSold(count) {
    const num = parseInt(count);
    if (!num) return '0';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k+';
    return num;
}

// ... Cart Logic (Standard) ...
function addToCart(product, qty) {
    if (product.quantity <= 0) return;
    if (product.quantity <= 0) return;

    // Create unique ID for variants
    let cartId = product.id;
    let displayName = product.name;
    let finalPrice = product.price;

    if (product.selectedColor) {
        cartId = `${product.id}-${product.selectedColor}`;
        displayName = `${product.name} (${product.selectedColor})`;
        if (product.currentPrice) finalPrice = product.currentPrice;
    }

    const existing = cart.find(item => item.cartId === cartId);
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({
            ...product,
            id: product.id, // Original ID for reference
            cartId: cartId, // Unique Cart ID
            name: displayName,
            price: finalPrice,
            qty: qty
        });
    }
    saveCart();
    updateCartUI();
}
function removeFromCart(cartId) { cart = cart.filter(item => (item.cartId || item.id) !== cartId); saveCart(); updateCartUI(); }
function saveCart() { localStorage.setItem('electroshop_cart', JSON.stringify(cart)); }
function updateCartUI() {
    const totalCount = cart.reduce((acc, item) => acc + item.qty, 0);
    els.cartCount.innerText = totalCount;
    els.drawerCount.innerText = totalCount;
    els.cartItems.innerHTML = '';
    if (cart.length === 0) {
        els.cartItems.innerHTML = '<div class="empty-cart-msg">Your cart is empty.</div>';
        els.cartSubtotal.innerText = 'LKR 0.00';
        els.cartTotal.innerText = 'LKR 0.00';
        return;
    }
    let subtotal = 0;
    cart.forEach(item => {
        const itemTotal = parseFloat(item.price) * item.qty;
        subtotal += itemTotal;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `<img src="${item.image}" alt="${item.name}"><div class="cart-item-info"><div class="cart-title">${item.name}</div><div class="cart-price">LKR ${item.price} x ${item.qty}</div><div class="remove-btn">Remove</div></div><div style="font-weight:bold;">${itemTotal.toFixed(2)}</div>`;
        div.querySelector('.remove-btn').addEventListener('click', () => removeFromCart(item.cartId || item.id));
        els.cartItems.appendChild(div);
    });
    const total = subtotal + DELIVERY_CHARGE;
    els.cartSubtotal.innerText = 'LKR ' + subtotal.toFixed(2);
    els.cartTotal.innerText = 'LKR ' + total.toFixed(2);
}
function toggleCart() {
    els.cartDrawer.classList.toggle('hidden');
    if (!els.cartDrawer.classList.contains('hidden')) els.overlay.classList.remove('hidden');
    else if (els.modal.classList.contains('hidden') && els.infoModal.classList.contains('hidden')) els.overlay.classList.add('hidden');
}
async function handleCheckout(e) {
    e.preventDefault();
    if (cart.length === 0) return;

    const fd = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;

    submitBtn.disabled = true;
    submitBtn.innerText = 'Processing...';

    try {
        const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
        const totalText = els.cartTotal.innerText.replace('LKR ', '').trim();

        const orderData = {
            order_id: orderId,
            order_date: new Date().toLocaleString(),
            customer_name: fd.get('cust-name'),
            customer_email: fd.get('cust-email'), // ✅ Keep this
            contact_number: fd.get('cust-phone'),
            whatsapp_number: fd.get('cust-phone'),
            full_address: fd.get('cust-address'),
            district: fd.get('cust-district'),
            payment_method: fd.get('payment'),
            payment_status: 'Pending',
            subtotal: els.cartSubtotal.innerText.replace('LKR ', '').trim(),
            delivery_charge: DELIVERY_CHARGE,
            total_price: totalText,
            items_summary: cart.map(i => `(${i.id}) ${i.qty} x ${i.name} @ LKR ${i.price}`).join(',\n')
        };

        // Send to Google Sheet
        if (WEB_APP_URL && WEB_APP_URL.includes('script.google')) {
            const res = await fetch(WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'place_order', order: orderData })
            });

            // Try to read response
            // Try to read response
            try {
                const result = await res.json();

                // Version Check
                if (result.backend_version === 'v2.2') {
                    // console.log("Backend is up to date");
                } else {
                    alert("Warning: Your Google Cloud Script is outdated! Please Redeploy the script in the Apps Script Editor.");
                }

                if (result.status !== 'success') {
                    throw new Error(result.message || 'Database error');
                }
            } catch (jsonErr) {
                console.warn('Response parsing error', jsonErr);
            }
        }

        // Show Success Modal
        document.getElementById('success-order-id').innerText = orderId;
        els.successModal.classList.remove('hidden');
        els.overlay.classList.remove('hidden');

        // Clear Cart
        cart = [];
        saveCart();
        updateCartUI();
        toggleCart();
        e.target.reset();

    } catch (err) {
        console.error('Checkout error:', err);
        alert('Something went wrong. Please try again or contact support.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}




// --- Info Pages ---
const infoContent = {
    about: `ElectroShop is your trusted partner for premium electronics. We are committed to providing high-quality products, transparent pricing, and excellent customer service.
  <p style="margin-top:1rem;">If you have any questions regarding our products, orders, or services, please feel free to contact us. Our team is always ready to assist you.</p>`,
    contact: 'Contact Us Loading...',
    privacy: 'Privacy Policy Loading...',
    shipping: 'Shipping Policy Loading...',
    returnpolicy: `<h3>Return Policy</h3>
<p>At ElectroShop LK, we want you to be completely satisfied with your purchase. If you change your mind, we offer a 14-day return window tailored for your convenience.</p>
<h4>14-Day Change of Mind</h4>
<p>You have 14 days from the date of receipt to return an item if you simply change your mind. To be eligible for a return, your item must be:</p>
<ul>
  <li>Unused and in the same condition that you received it.</li>
  <li>In the original packaging with all seals intact.</li>
  <li>Accompanied by the receipt or proof of purchase.</li>
</ul>
<h4>Postal Returns Only</h4>
<p>Please note that all returns must be made via post. We do not accept in-person returns at our warehouse or office locations. Please contact our support team to receive the return mailing address and instructions.</p>
<h4>Conditions</h4>
<ul>
  <li>Return shipping costs are the responsibility of the customer unless the item is defective or incorrect.</li>
  <li>Items that are damaged, used, or missing parts for reasons not due to our error may not be accepted or may incur a restocking fee.</li>
  <li>Refunds will be processed to the original method of payment within 7-10 business days after we receive and inspect your return.</li>
</ul>`
};
function openInfoPage(page) {
    els.infoTitle.innerText = page.charAt(0).toUpperCase() + page.slice(1);
    els.infoBody.innerHTML = infoContent[page] || '';
    els.infoModal.classList.remove('hidden');
    els.overlay.classList.remove('hidden');
}
function closeInfoModal() { els.infoModal.classList.add('hidden'); els.overlay.classList.add('hidden'); }
function closeSuccessModal() { els.successModal.classList.add('hidden'); els.overlay.classList.add('hidden'); }

// Start
init();
