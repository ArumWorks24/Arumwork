// Extracted from index.html for better performance and caching
const SITE_VERSION = '4.1.0'; // Updated version for the new theme and CMS features

// Supabase and Firebase Configuration
const supabaseUrl = 'https://fmbnplpuitedqlvkddke.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYm5wbHB1aXRlZHFsdmtkZGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODY4NzQsImV4cCI6MjA4ODI2Mjg3NH0.WDZECVMRqfovCyuiGjyw4F_zttakJZrepYxpLNIslmg';

const firebaseConfig = {
  apiKey: "AIzaSyAFCg26gXr-5vkCAp6b_XtXgbN8cvS8q2g",
  authDomain: "arum-work.firebaseapp.com",
  projectId: "arum-work",
  storageBucket: "arum-work.firebasestorage.app",
  messagingSenderId: "449287443075",
  appId: "1:449287443075:web:e16ccfb509902010bd81b6"
};

// Global Variables
let currentUser = null;
let currentOrder = { service: '', basePrice: 0, finalPrice: 0, deliveryDays: 1, discount: 0, extraCharge: 0 };
let orders = JSON.parse(localStorage.getItem('arumOrders') || '[]');
let uploadedFiles = [];
let allServicesGlobal = []; // Used for dynamic delivery options

// Initialize Supabase (with retry logic if not immediately available)
let supabase;
const initSupabase = () => {
  if (window.supabase) {
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    window.supabaseClient = supabase; // Export to window for other scripts
  } else {
    setTimeout(initSupabase, 100);
  }
};
initSupabase();

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, setDoc, query, orderBy, where, doc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ==================== FILE UPLOAD FUNCTIONS ====================

window.uploadFileToSupabase = async function (file) {
  if (!file) return '';
  try {
    showToast('Uploading file...', '');
    const fileName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const { data, error } = await supabase.storage.from('files').upload(fileName, file);
    if (error) { showToast('Upload failed: ' + error.message, 'error'); return ''; }
    const { data: urlData } = supabase.storage.from('files').getPublicUrl(fileName);
    if (urlData.publicUrl) { showToast('File uploaded successfully!', 'success'); return urlData.publicUrl; }
    return '';
  } catch (error) { showToast('Upload error: ' + error.message, 'error'); return ''; }
};

window.handleFileSelect = async function (input) {
  const file = input.files[0];
  if (!file) return;
  const p = input.parentElement.querySelector('p');
  p.textContent = 'Uploading: ' + file.name + '...';
  p.style.color = '#92400e';
  const url = await uploadFileToSupabase(file);
  if (url && url.length > 0) {
    uploadedFiles.push(url);
    p.textContent = '✓ Uploaded: ' + file.name;
    p.style.color = '#15803d';
  } else {
    p.textContent = 'Upload failed. Try again!';
    p.style.color = '#dc2626';
  }
};

// ==================== MOBILE NAV FUNCTIONS ====================

window.toggleMobileNav = function () {
  const mobileNav = document.getElementById('mobileNav');
  const hamburger = document.querySelector('.hamburger');
  if (mobileNav && hamburger) {
    mobileNav.classList.toggle('active');
    hamburger.classList.toggle('active');
  }
  document.body.classList.toggle('no-scroll', mobileNav.classList.contains('active'));
};

window.closeMobileNav = function () {
  const mobileNav = document.getElementById('mobileNav');
  const hamburger = document.querySelector('.hamburger');
  if (mobileNav && hamburger) {
    mobileNav.classList.remove('active');
    hamburger.classList.remove('active');
    document.body.classList.remove('no-scroll');
  }
};

window.addEventListener('resize', function () {
  const mobileNav = document.getElementById('mobileNav');
  const hamburger = document.querySelector('.hamburger');
  if (window.innerWidth > 768 && mobileNav && hamburger) {
    mobileNav.classList.remove('active');
    hamburger.classList.remove('active');
    document.body.classList.remove('no-scroll');
  }
});

// ==================== TOAST NOTIFICATIONS ====================

window.showToast = function (msg, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = msg;
  toast.className = 'toast-msg ' + type;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 3000);
};

// ==================== AUTH FUNCTIONS ====================

function updateAuthUI() {
  const headerActions = document.getElementById('headerActions');
  const mobileNav = document.getElementById('mobileNav');
  if (!headerActions) return;

  if (currentUser) {
    const name = currentUser.displayName || currentUser.email.split('@')[0];
    headerActions.innerHTML = `<span>${name}</span><button class="btn btn-outline" onclick="logout()">Logout</button>`;
    if (mobileNav) {
      const signInBtn = mobileNav.querySelector('button[onclick*="openModal(\'login\')"]');
      const getStartedBtn = mobileNav.querySelector('button[onclick*="openModal(\'signup\')"]');
      if (signInBtn) signInBtn.style.display = 'none';
      if (getStartedBtn) getStartedBtn.style.display = 'none';
      if (!mobileNav.querySelector('.mobile-user-info')) {
        const userInfo = document.createElement('div');
        userInfo.className = 'mobile-user-info';
        userInfo.innerHTML = `<span style="color: white; padding: 10px; display: block;">👤 ${name}</span><button class="btn btn-outline" onclick="logout(); closeMobileNav();" style="margin: 10px;">Logout</button>`;
        mobileNav.appendChild(userInfo);
      }
    }
    // Optimization: Sync orders only after user is identified
    syncOrdersFromFirestore();
    setupRealtimeListener();
  } else {
    headerActions.innerHTML = `<button class="btn btn-outline" onclick="openModal('login')">Sign In</button><button class="btn btn-solid" onclick="openModal('signup')">Get Started</button>`;
    if (mobileNav) {
      const signInBtn = mobileNav.querySelector('button[onclick*="openModal(\'login\')"]');
      const getStartedBtn = mobileNav.querySelector('button[onclick*="openModal(\'signup\')"]');
      if (signInBtn) signInBtn.style.display = '';
      if (getStartedBtn) getStartedBtn.style.display = '';
      const userInfo = mobileNav.querySelector('.mobile-user-info');
      if (userInfo) userInfo.remove();
    }
    orders = [];
    renderOrders();
  }
}

window.signInWithEmail = async function () {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { showToast('Fill all fields', 'error'); return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast('Welcome back', 'success');
    closeModal();
  } catch { showToast('Invalid login', 'error'); }
};

window.signUpWithEmail = async function () {
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  if (!email || !password || !name) { showToast('Fill all fields', 'error'); return; }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    showToast('Account created', 'success');

    // === EmailJS Welcome Email Trigger ===
    try {
      if (window.emailjs) {
        window.emailjs.send("service_im23qj9", "template_f49vyxm", {
          to_name: name,
          to_email: email,
          message: "Welcome to ARUM! We are excited to have you on board."
        }).then(function(response) {
            console.log("Welcome email sent to:", email, "Status:", response.status);
        }, function(error) {
            console.error("EmailJS Failed:", error);
        });
      } else {
        console.error("EmailJS object not found.");
      }
    } catch(err) {
      console.error("EmailJS Error (Welcome Email):", err);
    }
    // =====================================

    closeModal();
  } catch (e) { showToast('Signup error: ' + e.message, 'error'); }
};

window.signInWithGoogle = async function () {
  try {
    await signInWithPopup(auth, googleProvider);
    showToast('Welcome', 'success');
    closeModal();
  } catch { showToast('Google login failed', 'error'); }
};

window.logout = async function () { 
  if (activeListener) {
    activeListener(); // Unsubscribe from Firestore
    activeListener = null;
  }
  await signOut(auth); 
  showToast('Logged out');
  currentUser = null;
  orders = [];
  renderOrders();
};
onAuthStateChanged(auth, (user) => { 
  currentUser = user; 
  updateAuthUI(); 
});

// ==================== MODAL FUNCTIONS ====================

window.openModal = function (type) {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('active');
    switchAuth(type);
  }
};

window.closeModal = function () {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('active');
};

window.switchAuth = function (type) {
  const lForm = document.getElementById('loginForm');
  const sForm = document.getElementById('signupForm');
  const fForm = document.getElementById('forgotPasswordForm');
  
  if (lForm) lForm.style.display = 'none';
  if (sForm) sForm.style.display = 'none';
  if (fForm) fForm.style.display = 'none';

  if (type === 'signup') {
    if (sForm) sForm.style.display = 'block';
  } else if (type === 'forgot') {
    if (fForm) fForm.style.display = 'block';
    
    // Auto-detect & copy email from Login form to Forgot Password form
    const loginEmailInput = document.getElementById('loginEmail');
    const forgotEmailInput = document.getElementById('forgotEmail');
    if (loginEmailInput && loginEmailInput.value && forgotEmailInput) {
        forgotEmailInput.value = loginEmailInput.value;
    }
    
  } else {
    if (lForm) lForm.style.display = 'block';
  }
};

window.resetPasswordEmail = async function() {
    const email = document.getElementById('forgotEmail').value;
    if (!email) { showToast('Please enter your email', 'error'); return; }
    try {
        await sendPasswordResetEmail(auth, email);
        showToast('Password reset link sent to your email', 'success');
        switchAuth('login');
    } catch (error) {
        console.error(error);
        if(error.code === 'auth/user-not-found') {
            showToast('No account found with this email', 'error');
        } else {
            showToast('Error sending reset link', 'error');
        }
    }
};

// ==================== ORDER MODAL FUNCTIONS ====================

window.openOrderModal = function (service, price) {
  if (service.includes('Website Development') && !service.includes(' - ')) {
      document.getElementById('webPlansModal').classList.add('active');
      return;
  }
  
  if (!currentUser) { 
    openModal('login'); 
    showModalAlert('Login Required', 'You need to sign in to place an order.', '🔑'); 
    return; 
  }
  
  const serviceData = allServicesGlobal.find(s => s.name === (service.includes(' - ') ? service.split(' - ')[0] : service));
  
  currentOrder = { service, basePrice: price, finalPrice: price, deliveryDays: 1, discount: 0, extraCharge: 0 };
  document.getElementById('orderServiceTitle').textContent = service;
  document.getElementById('orderServicePrice').textContent = '₹' + price;

  const timeOptionsContainer = document.querySelector('.time-options');
  
  if (serviceData && serviceData.deliveryOptions && serviceData.deliveryOptions.trim()) {
      // Dynamic Options from Admin
      const optionsLines = serviceData.deliveryOptions.split('\n').filter(line => line.trim());
      let optionsHtml = '';
      optionsLines.forEach((line, index) => {
          const parts = line.split(',').map(p => p.trim());
          if (parts.length >= 3) {
              const [label, days, modifier] = parts;
              const modValue = parseInt(modifier);
              const badgeClass = modValue < 0 ? 'discount-badge' : 'immediate-badge';
              const badgeText = modValue < 0 ? `-₹${Math.abs(modValue)}` : modValue > 0 ? `+₹${modValue}` : '';
              const saveText = modValue < 0 ? `Save ₹${Math.abs(modValue)}` : modValue > 0 ? `Extra ₹${modValue}` : 'Standard';
              
              optionsHtml += `
                  <div class="time-option ${index === 0 ? 'selected' : ''}" 
                       data-days="${days}" 
                       data-modifier="${modValue}" 
                       onclick="selectTime(this)">
                      <div>${label}${badgeText ? `<span class="${badgeClass}">${badgeText}</span>` : ''}</div>
                      <div class="price">${saveText}</div>
                  </div>`;
          }
      });
      timeOptionsContainer.innerHTML = optionsHtml;
  } else {
      // Fallback Default Rules
      if (service.includes('Report Creation') || service.includes('Resume')) {
        timeOptionsContainer.innerHTML = `
          <div class="time-option selected" data-days="2" data-modifier="0" onclick="selectTime(this)"><div>In 2-3 Days</div><div class="price">Standard</div></div>
          <div class="time-option" data-days="4" data-modifier="-10" onclick="selectTime(this)"><div>In 4 Days<span class="discount-badge">-₹10</span></div><div class="price">Save ₹10</div></div>
          <div class="time-option" data-days="5" data-modifier="-15" onclick="selectTime(this)"><div>In 5 Days<span class="discount-badge">-₹15</span></div><div class="price">Save ₹15</div></div>
          <div class="time-option" data-days="6" data-modifier="-20" onclick="selectTime(this)"><div>In 6 Days<span class="discount-badge">-₹20</span></div><div class="price">Save ₹20</div></div>
          <div class="time-option" data-days="7" data-modifier="-25" onclick="selectTime(this)"><div>In 7 Days<span class="discount-badge">-₹25</span></div><div class="price">Save ₹25</div></div>
          <div class="time-option" data-days="1" data-modifier="497" onclick="selectTime(this)"><div>Tomorrow (Urgent)<span class="immediate-badge">+₹497</span></div><div class="price">Extra ₹497</div></div>
        `;
      } else if (service.includes('Website Development')) {
        timeOptionsContainer.innerHTML = `<div class="time-option selected" data-days="15" data-modifier="0" onclick="selectTime(this)"><div>15 Days Standard</div><div class="price">Standard</div></div>`;
      } else {
        timeOptionsContainer.innerHTML = `
          <div class="time-option selected" data-days="1" data-modifier="0" onclick="selectTime(this)"><div>Tomorrow</div><div class="price">Standard</div></div>
          <div class="time-option" data-days="2" data-modifier="-5" onclick="selectTime(this)"><div>In 2 Days<span class="discount-badge">-₹5</span></div><div class="price">Save ₹5</div></div>
          <div class="time-option" data-days="3" data-modifier="-10" onclick="selectTime(this)"><div>In 3 Days<span class="discount-badge">-₹10</span></div><div class="price">Save ₹10</div></div>
          <div class="time-option" data-days="4" data-modifier="-15" onclick="selectTime(this)"><div>In 4 Days<span class="discount-badge">-₹15</span></div><div class="price">Save ₹15</div></div>
          <div class="time-option" data-days="0" data-modifier="99" onclick="selectTime(this)"><div>Immediately<span class="immediate-badge">+₹99</span></div><div class="price">Today</div></div>
        `;
      }
  }
  
  window.selectTime(timeOptionsContainer.querySelector('.selected'));
  document.getElementById('orderModal').classList.add('active');
  resetOrderForm();
  resetCoupon();
};

window.closeOrderModal = function () { document.getElementById('orderModal').classList.remove('active'); };

window.closeWebPlansModal = function() { document.getElementById('webPlansModal').classList.remove('active'); };

window.handlePlanSelection = function(planName, planPrice, description) {
    closeWebPlansModal();
    window.openOrderModal(`Website Development - ${planName}`, planPrice);
    // Auto fill description for the user
    const descEl = document.getElementById('orderDescription');
    if(descEl) descEl.value = description;
};

function resetOrderForm() {
  document.getElementById('orderDescription').value = '';
  document.getElementById('orderFirstName').value = '';
  document.getElementById('orderLastName').value = '';
  document.getElementById('orderPhone').value = '';
  document.getElementById('termsCheck').checked = false;
  const btn = document.getElementById('proceedBtn');
  if (btn) btn.disabled = true;
  uploadedFiles = [];
}

window.selectTime = function (el) {
  if(!el) return;
  document.querySelectorAll('.time-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  currentOrder.deliveryDays = parseInt(el.dataset.days);
  const modifier = parseInt(el.dataset.modifier || 0);
  currentOrder.finalPrice = currentOrder.basePrice + modifier;
  document.getElementById('orderServicePrice').textContent = '₹' + currentOrder.finalPrice;
};

window.updateProceedButton = function() {
  const d = document.getElementById('orderDescription').value.trim();
  const f = document.getElementById('orderFirstName').value.trim();
  const l = document.getElementById('orderLastName').value.trim();
  const p = document.getElementById('orderPhone').value.trim();
  const t = document.getElementById('termsCheck').checked;
  const btn = document.getElementById('proceedBtn');
  if (btn) btn.disabled = !(d && f && l && p && t);
};

window.proceedToPayment = function () {
  currentOrder.description = document.getElementById('orderDescription').value.trim();
  currentOrder.phone = document.getElementById('orderPhone').value.trim();
  currentOrder.firstName = document.getElementById('orderFirstName').value.trim();
  currentOrder.lastName = document.getElementById('orderLastName').value.trim();
  
  document.getElementById('payService').textContent = currentOrder.service;
  document.getElementById('payPrice').textContent = '₹' + currentOrder.finalPrice;
  const payDesc = document.getElementById('payDescription');
  if (payDesc) payDesc.textContent = currentOrder.description;
  const payPhone = document.getElementById('payPhone');
  if (payPhone) payPhone.textContent = currentOrder.phone;
  
  closeOrderModal();
  document.getElementById('paymentModal').classList.add('active');
};

// ==================== COUPON & PAYMENT ====================

let appliedCoupon = null;
const validCoupons = { 'ARUM13': { discount: 13, type: 'percent' }, 'TRUST10': { discount: 10, type: 'percent' } };

window.applyCoupon = function () {
  const code = document.getElementById('couponCode').value.trim().toUpperCase();
  const msg = document.getElementById('couponMessage');
  if (validCoupons[code]) {
    appliedCoupon = validCoupons[code];
    const disc = Math.round(currentOrder.finalPrice * (appliedCoupon.discount / 100));
    currentOrder.discountedPrice = currentOrder.finalPrice - disc;
    currentOrder.appliedCouponCode = code;
    msg.textContent = `🎉 Applied! Saved ₹${disc}`;
    msg.className = 'coupon-message success';
    document.getElementById('payPrice').textContent = '₹' + currentOrder.discountedPrice;
    if(window.triggerPopEffect) window.triggerPopEffect();
  } else {
    msg.textContent = '❌ Invalid Code';
    msg.className = 'coupon-message error';
  }
};

function resetCoupon() {
  appliedCoupon = null;
  document.getElementById('couponCode').value = '';
  document.getElementById('couponMessage').textContent = '';
  document.getElementById('couponMessage').className = 'coupon-message';
}

window.confirmPayment = async function () {
  const orderId = 'ARUM' + Date.now();
  const finalPrice = currentOrder.discountedPrice || currentOrder.finalPrice;
  const newOrder = {
    id: orderId, service: currentOrder.service, description: currentOrder.description,
    price: finalPrice, phone: currentOrder.phone, status: 'pending',
    firstName: currentOrder.firstName, lastName: currentOrder.lastName,
    date: new Date().toLocaleDateString(), orderTime: new Date().toISOString(),
    userEmail: currentUser.email, fileUrls: uploadedFiles
  };
  orders.unshift(newOrder);
  localStorage.setItem('arumOrders', JSON.stringify(orders));
  await addDoc(collection(db, "orders"), newOrder);
  document.getElementById('paymentModal').classList.remove('active');
  currentOrder.orderId = orderId;
  openVerifyModal();
  renderOrders();
};

// ==================== VERIFICATION MODAL ====================

window.openVerifyModal = function() { document.getElementById('verifyModal').classList.add('active'); };
window.closeVerifyModal = function() { document.getElementById('verifyModal').classList.remove('active'); };

window.selectVerifyOption = function(opt) {
  document.getElementById('screenshotSection').style.display = opt === 'screenshot' ? 'block' : 'none';
  document.getElementById('transactionSection').style.display = opt === 'transaction' ? 'block' : 'none';
  document.getElementById('verifyProceedBtn').disabled = false;
};

window.handleVerifyScreenshot = async function(input) {
  const file = input.files[0];
  if(!file) return;
  const url = await uploadFileToSupabase(file);
  if(url) {
    currentOrder.verifyScreenshotUrl = url;
    document.getElementById('verifyScreenshotFileName').textContent = '✓ Uploaded';
  }
};

window.proceedToConfirm = async function() {
  const tid = document.getElementById('verifyTransactionId').value.trim();
  const q = query(collection(db, "orders"), where("id", "==", currentOrder.orderId));
  const snap = await getDocs(q);
  if(!snap.empty) {
    await updateDoc(doc(db, "orders", snap.docs[0].id), { 
      paymentScreenshot: currentOrder.verifyScreenshotUrl || '',
      transactionId: tid || '' 
    });
  }
  closeVerifyModal();
  document.getElementById('confirmModal').classList.add('active');
};

window.finishConfirmModal = function() { document.getElementById('confirmModal').classList.remove('active'); };
window.closeConfirmModal = function() { document.getElementById('confirmModal').classList.remove('active'); };

window.checkVerifyInput = function() {
  const tid = document.getElementById('verifyTransactionId').value.trim();
  const btn = document.getElementById('verifyProceedBtn');
  if (btn) btn.disabled = tid.length < 5; // Simple validation for Transaction ID
};

// ==================== RENDERING & SYNC ====================

function renderOrders() {
  const grid = document.getElementById('ordersGrid');
  if (!grid) return;
  if (!currentUser) { grid.innerHTML = '<p style="text-align:center; padding:20px; color:var(--medium-gray);">Sign in to view and track your orders.</p>'; return; }
  
  if(orders.length === 0) { 
    grid.innerHTML = '<p style="text-align:center; padding:40px; color:var(--medium-gray); grid-column: 1/-1;">You haven\'t placed any orders yet. <br><a href="#services" style="color:var(--deep-blue); font-weight:700;">Start Ordering Now</a></p>'; 
    return; 
  }
  
  grid.innerHTML = orders.map(o => `
    <div class="order-card" id="card-${o.id}">
      <div class="order-header">
        <span class="order-id">#${o.id}</span>
        <span class="order-status status-${o.status || 'pending'}">${(o.status || 'pending').replace('processing', 'Working').toUpperCase()}</span>
      </div>
      <div class="order-service">${o.service}</div>
      <div class="order-date">📅 ${o.date}</div>
      <div class="order-price">₹${o.price}</div>
      ${o.status === 'pending' ? `
        <div class="order-actions" style="display: flex; gap: 8px; margin-top: 12px; border-top: 1px solid var(--stone); padding-top: 12px;">
          <button class="btn btn-outline" onclick="cancelOrder('${o.fireId || o.id}')" style="flex: 1; padding: 6px; font-size: 11px; border-color: #ef4444; color: #ef4444; min-height: 32px;">Cancel</button>
          <button class="btn btn-outline" onclick="removeOrder('${o.fireId || o.id}')" style="flex: 1; padding: 6px; font-size: 11px; min-height: 32px;">Remove</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

window.cancelOrder = async function(id) {
  const confirmed = await customConfirm('Cancel Order?', 'Are you sure you want to cancel this order?', '⚠️');
  if (!confirmed) return;
  
  try {
    showToast('Cancelling order...', '');
    
    // Find correctly in local state
    const orderIndex = orders.findIndex(o => (o.fireId === id || o.id === id));
    if (orderIndex === -1) throw new Error("Order not found");
    
    const targetFireId = orders[orderIndex].fireId;
    const targetOrderId = orders[orderIndex].id;

    // Update local state for instant feel
    orders[orderIndex].status = 'cancelled';
    renderOrders();
    
    // Persist to Firestore
    if (targetFireId) {
        await updateDoc(doc(db, "orders", targetFireId), { status: 'cancelled' });
    } else {
        const q = query(collection(db, "orders"), where("id", "==", targetOrderId));
        const snap = await getDocs(q);
        if (!snap.empty) {
            await updateDoc(doc(db, "orders", snap.docs[0].id), { status: 'cancelled' });
        }
    }
    showToast('Order cancelled successfully', 'success');
  } catch (error) {
    console.error(error);
    showToast('Error cancelling order', 'error');
  }
};

window.removeOrder = async function(id) {
  const confirmed = await customConfirm('Remove Order?', 'This will remove the order from your dashboard.', '🗑️');
  if (!confirmed) return;

  try {
    showToast('Removing order...', '');
    const orderIndex = orders.findIndex(o => (o.fireId === id || o.id === id));
    if (orderIndex === -1) throw new Error("Order not found");
    
    const targetFireId = orders[orderIndex].fireId;
    const targetOrderId = orders[orderIndex].id;

    // Update local state
    orders = orders.filter((_, idx) => idx !== orderIndex);
    renderOrders();
    
    // Actually delete from Firestore
    if (targetFireId) {
        await deleteDoc(doc(db, "orders", targetFireId));
    } else {
        const q = query(collection(db, "orders"), where("id", "==", targetOrderId));
        const snap = await getDocs(q);
        if (!snap.empty) {
            await deleteDoc(doc(db, "orders", snap.docs[0].id));
        }
    }
    showToast('Order removed', 'success');
  } catch (error) {
    console.error(error);
    showToast('Error removing order', 'error');
  }
};

async function syncOrdersFromFirestore() {
  if (!currentUser) return;
  try {
    const q = query(
      collection(db, "orders"), 
      where("userEmail", "==", currentUser.email), 
      orderBy("orderTime", "desc")
    );
    const snap = await getDocs(q);
    const fireOrders = [];
    snap.forEach(d => fireOrders.push({ fireId: d.id, ...d.data() }));
    orders = fireOrders;
    localStorage.setItem('arumOrders', JSON.stringify(orders));
    renderOrders();
    renderWork();
  } catch (error) {
    console.error("Sync error:", error);
  }
}

let activeListener = null;
function setupRealtimeListener() {
  if (!currentUser) return;
  if (activeListener) return; // Prevent multiple listeners
  
  const q = query(collection(db, "orders"), where("userEmail", "==", currentUser.email));
  activeListener = onSnapshot(q, (snapshot) => {
    // Optimization: Update orders directly from snapshot data
    const fireOrders = [];
    snapshot.forEach(d => {
      fireOrders.push({ fireId: d.id, ...d.data() });
    });
    
    // Sort by orderTime descending
    orders = fireOrders.sort((a, b) => {
      const timeA = a.orderTime || '';
      const timeB = b.orderTime || '';
      return timeB.localeCompare(timeA);
    });
    
    localStorage.setItem('arumOrders', JSON.stringify(orders));
    renderOrders();
    renderWork();
    console.log('[ARUM] Orders updated via Realtime Sync');
  }, (error) => {
    console.error("Realtime error:", error);
  });
}

function renderWork() {
  const grid = document.getElementById('workGrid');
  if (!grid) return;
  const completed = orders.filter(o => o.status === 'completed' && o.userEmail?.toLowerCase() === currentUser?.email?.toLowerCase());
  grid.innerHTML = completed.length ? completed.map(o => `
    <div class="work-card">
      <div class="work-id">#${o.id}</div>
      <div class="work-service">${o.service}</div>
      <div class="work-date">Completed: ${o.completedDate || o.date}</div>
    </div>
  `).join('') : '<p>No completed work yet</p>';
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  if (!window.isServicePage) {
    loadDynamicServices();
    loadFeaturedReviews();
    loadSiteSettings();
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js?v=' + SITE_VERSION).catch(console.error);
}

// ==================== DYNAMIC SERVICES & SETTINGS ====================

async function loadDynamicServices() {
  const grid = document.getElementById('dynamic-services-grid');
  if (!grid) return;
  try {
    const snap = await getDocs(query(collection(db, "services"), orderBy("priority", "asc")));
    let html = '';
    snap.forEach(docSnap => {
      const data = docSnap.data();
      allServicesGlobal.push(data); // Store for modal use
      const isWebsite = data.name.includes('Website Development');
      const priceDisplay = isWebsite ? 'According Plans' : `₹${data.discountPrice}`;
      const oldPrice = data.originalPrice || 0;
      const discount = oldPrice > data.discountPrice ? Math.round(((oldPrice - data.discountPrice) / oldPrice) * 100) : 0;
      
      const oldPriceHtml = oldPrice > data.discountPrice ? `<span class="old-price-cut" style="color:#ef4444; font-size:14px; text-decoration:line-through; margin-left:8px;">₹${oldPrice}</span>` : '';
      const offHtml = discount > 0 ? `<span class="off-badge" style="background:#fef2f2; color:#ef4444; font-size:11px; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:8px;">${discount}% OFF</span>` : '';
      
      const saleBadge = data.label || 'SUMMER SALE';
      
      let learnMore = data.learnMoreUrl || '#';
      if ((data.name.toLowerCase() === 'edit a document' || data.name.toLowerCase() === 'edit modify document') && learnMore === '#') {
          learnMore = 'college-project.html';
      }
      
      html += `
        <div class="service-card active-card">
          <div class="service-top">
            <span class="service-icon">${data.icon || '🛠️'}</span>
            <span class="sale-badge">${saleBadge}</span>
          </div>
          <h3>${data.name}</h3>
          <p>${data.description}</p>
          <div class="price-row" style="display:flex; align-items:baseline;">
            <span class="now-price">${priceDisplay}</span>
            ${oldPriceHtml}
            ${offHtml}
          </div>
          <button class="btn-order" onclick="openOrderModal('${data.name}', ${data.discountPrice})">Order Now</button>
          <a href="${learnMore}" class="btn-learn-more-blue">${learnMore !== '#' ? 'Learn More' : 'Coming Soon'}</a>
        </div>
      `;
    });
    grid.innerHTML = html || '<p>No services available</p>';
  } catch (e) { console.error(e); }
}

async function loadFeaturedReviews() {
  const container = document.getElementById('featured-reviews');
  if (!container) return;
  const snap = await getDocs(query(collection(db, "feedback"), where("featured", "==", true)));
  let html = '';
  snap.forEach(d => {
    const fb = d.data();
    html += `<div class="review-card"><h4>${fb.name}</h4><p>"${fb.message}"</p></div>`;
  });
  container.innerHTML = html || '<p>No reviews yet</p>';
}

async function loadSiteSettings() {
  try {
    const snap = await getDoc(doc(db, "settings", "main_site"));
    if (snap.exists()) {
      const data = snap.data();
      
      // Applying Theme
      if (data.festivalTheme) {
        document.body.className = document.body.className.split(' ').filter(c => !c.startsWith('theme-')).join(' ');
        if (data.festivalTheme !== 'none') {
            document.body.classList.add('theme-' + data.festivalTheme);
            
            // Ensure decoration container exists
            let decor = document.querySelector('.festival-decor');
            if (!decor) {
                decor = document.createElement('div');
                decor.className = 'festival-decor';
                document.body.prepend(decor);
            }
        }
      }

      if (data.heroTitle) document.getElementById('hero-title').innerHTML = data.heroTitle;
      if (data.heroDesc) document.getElementById('hero-desc').textContent = data.heroDesc;
      
      // Service Sale Info
      if (data.saleBadge && document.getElementById('service-sale-badge')) 
          document.getElementById('service-sale-badge').textContent = data.saleBadge;
      if (data.saleTitle && document.getElementById('service-sale-title')) 
          document.getElementById('service-sale-title').textContent = data.saleTitle;

      // Why Us Section
      if (data.whyTitle) document.getElementById('why-title').textContent = data.whyTitle;
      if (data.whySubtitle) document.getElementById('why-subtitle').textContent = data.whySubtitle;
      
      if (data.whyC1Title) document.getElementById('why-c1-title').textContent = data.whyC1Title;
      if (data.whyC1Desc) document.getElementById('why-c1-desc').textContent = data.whyC1Desc;
      
      if (data.whyC2Title) document.getElementById('why-c2-title').textContent = data.whyC2Title;
      if (data.whyC2Desc) document.getElementById('why-c2-desc').textContent = data.whyC2Desc;
      
      if (data.whyC3Title) document.getElementById('why-c3-title').textContent = data.whyC3Title;
      if (data.whyC3Desc) document.getElementById('why-c3-desc').textContent = data.whyC3Desc;
      
      // Contact Section
      if (data.contactTitle) document.getElementById('contact-title').textContent = data.contactTitle;
      if (data.contactDesc) document.getElementById('contact-desc').textContent = data.contactDesc;
      
      // Hero Background Dual Support
      window.applyHeroBackground = () => {
          const isMobile = window.innerWidth <= 768;
          const bgUrl = (isMobile && data.heroBgMobile) ? data.heroBgMobile : data.heroBg;
          
          if (bgUrl) {
              const hero = document.getElementById('hero');
              const h1 = document.getElementById('hero-title');
              const p = document.getElementById('hero-desc');
              if (hero) {
                  hero.style.backgroundImage = `linear-gradient(rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.1)), url('${bgUrl}')`;
                  hero.style.backgroundSize = 'cover';
                  hero.style.backgroundPosition = isMobile ? 'center center' : 'center center';
                  hero.style.backgroundRepeat = 'no-repeat';
                  hero.style.backgroundAttachment = isMobile ? 'scroll' : 'fixed'; // Better performance on mobile
              }
          }
      };

      window.applyHeroBackground();
      window.addEventListener('resize', window.applyHeroBackground);
      
      console.log('[ARUM] Site settings Applied');
    }
  } catch (error) {
    console.error("Error loading site settings:", error);
  }
}

window.subscribeNewsletter = async function() {
  const el = document.getElementById('newsletter-email');
  const email = el.value.trim();
  if (email) {
    await addDoc(collection(db, "newsletter"), { email, date: new Date().toISOString() });
    showToast('Subscribed!', 'success');
    el.value = '';
  }
};

window.showModalAlert = function(title, message, icon = '💡') {
  document.getElementById('customAlertTitle').textContent = title;
  document.getElementById('customAlertMessage').textContent = message;
  document.getElementById('customAlertIcon').textContent = icon;
  document.getElementById('customAlertModal').classList.add('active');
};

window.closeCustomAlert = function() {
  document.getElementById('customAlertModal').classList.remove('active');
};

window.customConfirm = function(title, message, icon = '❓') {
  return new Promise((resolve) => {
    const modal = document.getElementById('customConfirmModal');
    document.getElementById('customConfirmTitle').textContent = title;
    document.getElementById('customConfirmMessage').textContent = message;
    document.getElementById('customConfirmIcon').textContent = icon;
    modal.classList.add('active');
    const yesBtn = document.getElementById('customConfirmYesBtn');
    const noBtn = document.getElementById('customConfirmNoBtn');
    yesBtn.onclick = () => { modal.classList.remove('active'); resolve(true); };
    noBtn.onclick = () => { modal.classList.remove('active'); resolve(false); };
  });
};

window.triggerPopEffect = function () {
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.backgroundColor = ['#b7791f', '#d69e2e', '#22c55e', '#3b82f6', '#ef4444'][Math.floor(Math.random() * 5)];
    confetti.style.animationDuration = (Math.random() * 2 + 1) + 's';
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 3000);
  }
};

// ==================== FEEDBACK ====================
let currentFeedbackRating = 0;

window.setRating = function (rating) {
  currentFeedbackRating = rating;
  const stars = document.querySelectorAll('.feedback-form .star');
  stars.forEach(star => {
    if (parseInt(star.dataset.rating) <= rating) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });
  
  const ratingText = document.getElementById('ratingText');
  if (ratingText) {
    const texts = ['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];
    ratingText.textContent = texts[rating - 1];
  }
};

window.submitFeedback = async function () {
  const name = document.getElementById('feedbackName').value.trim();
  const message = document.getElementById('feedbackMessage').value.trim();
  
  if (!name || !message || currentFeedbackRating === 0) {
    showToast('Please fill all fields and select a rating', 'error');
    return;
  }
  
  try {
    showToast('Submitting feedback...', '');
    await addDoc(collection(db, "feedback"), {
      name: name,
      message: message,
      rating: currentFeedbackRating,
      createdAt: new Date().toISOString(),
      featured: false,
      userEmail: currentUser ? currentUser.email : 'guest'
    });
    
    showToast('Feedback submitted successfully!', 'success');
    document.getElementById('feedbackName').value = '';
    document.getElementById('feedbackMessage').value = '';
    
    currentFeedbackRating = 0;
    const stars = document.querySelectorAll('.feedback-form .star');
    stars.forEach(star => star.classList.remove('active'));
    
    const ratingText = document.getElementById('ratingText');
    if (ratingText) ratingText.textContent = 'Tap to rate';
    
  } catch (error) {
    console.error("Error submitting feedback: ", error);
    showToast('Error submitting feedback', 'error');
  }
};
