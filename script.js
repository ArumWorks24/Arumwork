// ARUM Website JavaScript
// Extracted from index.html for better performance and caching

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

// Initialize Supabase
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ==================== FILE UPLOAD FUNCTIONS ====================

window.uploadFileToSupabase = async function(file) {
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

window.handleFileSelect = async function(input) {
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

window.toggleMobileNav = function() {
  const mobileNav = document.getElementById('mobileNav');
  const hamburger = document.querySelector('.hamburger');
  if(mobileNav && hamburger) {
    mobileNav.classList.toggle('active');
    hamburger.classList.toggle('active');
  }
  // Close all other modals/navs and handle body scroll
  document.body.classList.toggle('no-scroll', mobileNav.classList.contains('active'));
};

window.closeMobileNav = function() {
  const mobileNav = document.getElementById('mobileNav');
  const hamburger = document.querySelector('.hamburger');
  if(mobileNav && hamburger) {
    mobileNav.classList.remove('active');
    hamburger.classList.remove('active');
    document.body.classList.remove('no-scroll');
  }
};

// Handle resize for desktop/tablet
window.addEventListener('resize', function() {
  const mobileNav = document.getElementById('mobileNav');
  const hamburger = document.querySelector('.hamburger');
  if(window.innerWidth > 768 && mobileNav && hamburger) {
    mobileNav.classList.remove('active');
    hamburger.classList.remove('active');
    document.body.classList.remove('no-scroll');
  }
});

window.closeMobileNav = function() {
  document.getElementById('mobileNav').classList.remove('active');
  document.querySelector('.hamburger').classList.remove('active');
};

// ==================== TOAST NOTIFICATIONS ====================

window.showToast = function(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.className = 'toast-msg ' + type;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 3000);
};

// ==================== AUTH FUNCTIONS ====================

function updateAuthUI() {
  const headerActions = document.getElementById('headerActions');
  const mobileNav = document.getElementById('mobileNav');
  
  if(currentUser) {
    const name = currentUser.displayName || currentUser.email.split('@')[0];
    headerActions.innerHTML = `<span>${name}</span><button class="btn btn-outline" onclick="logout()">Logout</button>`;
    
    // Update mobile nav - hide Sign In/Get Started buttons and show user info
    if(mobileNav) {
      const signInBtn = mobileNav.querySelector('button[onclick*="openModal(\'login\')"]');
      const getStartedBtn = mobileNav.querySelector('button[onclick*="openModal(\'signup\')"]');
      if(signInBtn) signInBtn.style.display = 'none';
      if(getStartedBtn) getStartedBtn.style.display = 'none';
      
      // Add user info and logout button if not already present
      if(!mobileNav.querySelector('.mobile-user-info')) {
        const userInfo = document.createElement('div');
        userInfo.className = 'mobile-user-info';
        userInfo.innerHTML = `<span style="color: white; padding: 10px; display: block;">👤 ${name}</span><button class="btn btn-outline" onclick="logout(); closeMobileNav();" style="margin: 10px;">Logout</button>`;
        mobileNav.appendChild(userInfo);
      }
    }
  } else {
    headerActions.innerHTML = `<button class="btn btn-outline" onclick="openModal('login')">Sign In</button><button class="btn btn-solid" onclick="openModal('signup')">Get Started</button>`;
    
    // Update mobile nav - show Sign In/Get Started buttons
    if(mobileNav) {
      const signInBtn = mobileNav.querySelector('button[onclick*="openModal(\'login\')"]');
      const getStartedBtn = mobileNav.querySelector('button[onclick*="openModal(\'signup\')"]');
      if(signInBtn) signInBtn.style.display = '';
      if(getStartedBtn) getStartedBtn.style.display = '';
      
      // Remove user info if present
      const userInfo = mobileNav.querySelector('.mobile-user-info');
      if(userInfo) userInfo.remove();
    }
  }
  renderOrders();
}

window.signInWithEmail = async function() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  if(!email || !password) { showToast('Fill all fields','error'); return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast('Welcome back','success');
    closeModal();
  } catch { showToast('Invalid login','error'); }
};

window.signUpWithEmail = async function() {
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  if(!email || !password) { showToast('Fill all fields','error'); return; }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    showToast('Account created','success');
    closeModal();
  } catch(e) { showToast('Signup error','error'); }
};

window.signInWithGoogle = async function() {
  try {
    await signInWithPopup(auth, googleProvider);
    showToast('Welcome','success');
    closeModal();
  } catch { showToast('Google login failed','error'); }
};

window.logout = async function() { await signOut(auth); showToast('Logged out'); };

onAuthStateChanged(auth, (user) => { currentUser = user; updateAuthUI(); });

// ==================== MODAL FUNCTIONS ====================

window.openModal = function(type) { 
  document.getElementById('authModal').classList.add('active'); 
  switchAuth(type); 
};

window.closeModal = function() { 
  document.getElementById('authModal').classList.remove('active'); 
};

window.switchAuth = function(type) {
  if(type === 'signup') {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
  } else {
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
  }
};

// ==================== ORDER MODAL FUNCTIONS ====================

window.openOrderModal = function(service, price) {
  if(!currentUser) { openModal('login'); showToast('Login first','error'); return; }
  currentOrder = { service, basePrice: price, finalPrice: price, deliveryDays: 1, discount: 0, extraCharge: 0 };
  document.getElementById('orderServiceTitle').textContent = service;
  document.getElementById('orderServicePrice').textContent = '₹' + price;
  
  // Custom Time Options for Report Creation
  const timeOptionsContainer = document.querySelector('.time-options');
  if (service === 'Report Creation' || service === 'Report Creation India') {
    timeOptionsContainer.innerHTML = `
      <div class="time-option selected" data-days="2" data-discount="0" onclick="selectTime(this)">
        <div>In 2 Days</div>
        <div class="price">Standard</div>
      </div>
      <div class="time-option" data-days="3" data-discount="5" onclick="selectTime(this)">
        <div>In 3 Days<span class="discount-badge">-₹5</span></div>
        <div class="price">Save ₹5</div>
      </div>
      <div class="time-option" data-days="4" data-discount="10" onclick="selectTime(this)">
        <div>In 4 Days<span class="discount-badge">-₹10</span></div>
        <div class="price">Save ₹10</div>
      </div>
      <div class="time-option" data-days="5" data-discount="15" onclick="selectTime(this)">
        <div>In 5 Days<span class="discount-badge">-₹15</span></div>
        <div class="price">Save ₹15</div>
      </div>
      <div class="time-option" data-days="0" data-discount="0" data-extra="899" onclick="selectTime(this)">
        <div>Immediately<span class="immediate-badge">+₹899</span></div>
        <div class="price">Today</div>
      </div>
    `;
    window.selectTime(timeOptionsContainer.firstElementChild);
  } else {
    // Original Time Options for other services
    timeOptionsContainer.innerHTML = `
      <div class="time-option selected" data-days="1" data-discount="0" onclick="selectTime(this)">
        <div>Tomorrow</div>
        <div class="price">Standard</div>
      </div>
      <div class="time-option" data-days="2" data-discount="5" onclick="selectTime(this)">
        <div>In 2 Days<span class="discount-badge">-₹5</span></div>
        <div class="price">Save ₹5</div>
      </div>
      <div class="time-option" data-days="3" data-discount="10" onclick="selectTime(this)">
        <div>In 3 Days<span class="discount-badge">-₹10</span></div>
        <div class="price">Save ₹10</div>
      </div>
      <div class="time-option" data-days="4" data-discount="15" onclick="selectTime(this)">
        <div>In 4 Days<span class="discount-badge">-₹15</span></div>
        <div class="price">Save ₹15</div>
      </div>
      <div class="time-option" data-days="0" data-discount="0" data-extra="50" onclick="selectTime(this)">
        <div>Immediately<span class="immediate-badge">+₹50</span></div>
        <div class="price">Today</div>
      </div>
    `;
    window.selectTime(timeOptionsContainer.firstElementChild);
  }

  document.getElementById('orderModal').classList.add('active');
  resetOrderForm();
  resetCoupon();
};

window.closeOrderModal = function() { 
  document.getElementById('orderModal').classList.remove('active'); 
};

function resetOrderForm() {
  document.getElementById('orderDescription').value = '';
  document.getElementById('orderFirstName').value = '';
  document.getElementById('orderLastName').value = '';
  document.getElementById('orderPhone').value = '';
  document.getElementById('orderSummary').value = '';
  document.getElementById('termsCheck').checked = false;
  document.getElementById('proceedBtn').disabled = true;
  uploadedFiles = [];
  const fileUploadP = document.querySelector('#fileInput + p');
  if(fileUploadP) { fileUploadP.textContent = 'Click to upload files'; fileUploadP.style.color = ''; }
}

window.selectTime = function(el) {
  document.querySelectorAll('.time-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  currentOrder.deliveryDays = parseInt(el.dataset.days);
  currentOrder.discount = parseInt(el.dataset.discount || 0);
  currentOrder.extraCharge = parseInt(el.dataset.extra || 0);
  currentOrder.finalPrice = currentOrder.basePrice - currentOrder.discount + currentOrder.extraCharge;
  document.getElementById('orderServicePrice').textContent = '₹' + currentOrder.finalPrice;
};

function updateProceedButton() {
  const desc = document.getElementById('orderDescription').value.trim();
  const fname = document.getElementById('orderFirstName').value.trim();
  const lname = document.getElementById('orderLastName').value.trim();
  const phone = document.getElementById('orderPhone').value.trim();
  const terms = document.getElementById('termsCheck').checked;
  document.getElementById('proceedBtn').disabled = !(desc && fname && lname && phone && terms);
}

window.proceedToPayment = function() {
  currentOrder.description = document.getElementById('orderDescription').value.trim();
  currentOrder.phone = document.getElementById('orderPhone').value.trim();
  currentOrder.firstName = document.getElementById('orderFirstName').value.trim();
  currentOrder.lastName = document.getElementById('orderLastName').value.trim();
  currentOrder.projectSummary = document.getElementById('orderSummary').value.trim();
  
  document.getElementById('payService').textContent = currentOrder.service;
  document.getElementById('payDescription').textContent = currentOrder.description.substring(0, 6) + '...';
  document.getElementById('payPhone').textContent = currentOrder.phone;
  document.getElementById('payPrice').textContent = '₹' + currentOrder.finalPrice;
  closeOrderModal();
  document.getElementById('paymentModal').classList.add('active');
};

window.closePaymentModal = function() { 
  document.getElementById('paymentModal').classList.remove('active'); 
};

// ==================== PAYMENT & ORDERS ====================

// Coupon system
let appliedCoupon = null;
let paymentScreenshotUrl = '';
let verifyScreenshotUrl = '';
let selectedVerifyOption = null;

// Handle verify screenshot upload
window.handleVerifyScreenshot = async function(input) {
    const file = input.files[0];
    if (!file) return;
    const p = document.getElementById('verifyScreenshotFileName');
    p.textContent = 'Uploading: ' + file.name + '...';
    p.style.color = '#92400e';
    
    try {
        const fileName = 'verify_payment_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const { data, error } = await supabase.storage.from('files').upload(fileName, file);
        if (error) {
            p.textContent = 'Upload failed. Try again!';
            p.style.color = '#dc2626';
            return;
        }
        const { data: urlData } = supabase.storage.from('files').getPublicUrl(fileName);
        if (urlData.publicUrl) {
            verifyScreenshotUrl = urlData.publicUrl;
            p.textContent = '✓ Uploaded: ' + file.name;
            p.style.color = '#15803d';
            // Enable the Continue button after screenshot is uploaded
            document.getElementById('verifyProceedBtn').disabled = false;
        }
    } catch (error) {
        p.textContent = 'Upload error: ' + error.message;
        p.style.color = '#dc2626';
    }
};

// Check transaction ID input and enable/disable button
window.checkVerifyInput = function() {
    const transactionId = document.getElementById('verifyTransactionId').value.trim();
    const proceedBtn = document.getElementById('verifyProceedBtn');
    
    if (transactionId.length > 0) {
        proceedBtn.disabled = false;
    } else {
        proceedBtn.disabled = true;
    }
};

// Verification Modal Functions
window.openVerifyModal = function() {
    // Reset verify modal state
    selectedVerifyOption = null;
    verifyScreenshotUrl = '';
    document.getElementById('verifyScreenshotFileName').textContent = 'Click to upload screenshot';
    document.getElementById('verifyScreenshotFileName').style.color = '';
    document.getElementById('verifyTransactionId').value = '';
    document.getElementById('screenshotSection').style.display = 'none';
    document.getElementById('transactionSection').style.display = 'none';
    document.getElementById('screenshotOption').classList.remove('selected');
    document.getElementById('transactionOption').classList.remove('selected');
    document.getElementById('verifyProceedBtn').disabled = true;
    
    document.getElementById('verifyModal').classList.add('active');
};

window.closeVerifyModal = function() {
    document.getElementById('verifyModal').classList.remove('active');
};

window.selectVerifyOption = function(option) {
    selectedVerifyOption = option;
    
    // Update UI
    document.getElementById('screenshotOption').classList.remove('selected');
    document.getElementById('transactionOption').classList.remove('selected');
    document.getElementById(option + 'Option').classList.add('selected');
    
    // Show appropriate section
    if (option === 'screenshot') {
        document.getElementById('screenshotSection').style.display = 'block';
        document.getElementById('transactionSection').style.display = 'none';
    } else {
        document.getElementById('screenshotSection').style.display = 'none';
        document.getElementById('transactionSection').style.display = 'block';
    }
    
    // Enable proceed button
    document.getElementById('verifyProceedBtn').disabled = false;
};

window.proceedToConfirm = function() {
    // Get the transaction ID if selected
    const transactionId = document.getElementById('verifyTransactionId').value.trim();
    
    // Store verification data in currentOrder for saving later
    currentOrder.verifyOption = selectedVerifyOption;
    currentOrder.verifyScreenshotUrl = verifyScreenshotUrl;
    currentOrder.verifyTransactionId = transactionId;
    
    // Save verification data to Firestore
    saveVerificationData(currentOrder.orderId, verifyScreenshotUrl, transactionId);
    
    closeVerifyModal();
    document.getElementById('confirmOrderId').textContent = 'Order ID: #' + currentOrder.orderId;
    document.getElementById('confirmModal').classList.add('active');
};

// Save verification data to Firestore
async function saveVerificationData(orderId, screenshotUrl, transactionId) {
    try {
        const q = query(collection(db, "orders"), where("id", "==", orderId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const orderDoc = doc(db, "orders", querySnapshot.docs[0].id);
            const updateData = {};
            
            if (screenshotUrl) {
                updateData.paymentScreenshot = screenshotUrl;
            }
            if (transactionId) {
                updateData.transactionId = transactionId;
            }
            
            if (Object.keys(updateData).length > 0) {
                await updateDoc(orderDoc, updateData);
                console.log('Verification data saved:', updateData);
            }
        }
    } catch (error) {
        console.error('Error saving verification data:', error);
    }
}

// Modified closeConfirmModal to show success message
window.closeConfirmModal = function() {
    // Show success message before closing
    const confirmModal = document.getElementById('confirmModal');
    const modalBox = confirmModal.querySelector('.modal-box');
    
    // Replace content with success message
    modalBox.innerHTML = `
        <div class="verify-success-message">
            <div class="success-icon">✅</div>
            <h3>Payment Verification Started!</h3>
            <p>We verify your payment details in <strong>1-2 hours</strong>. Once verified, we will approve your order and start working on it.</p>
            <p style="margin-top: 10px;">You'll receive a WhatsApp message once your order is approved!</p>
        </div>
        <button class="btn-full" onclick="finishConfirmModal()">Done</button>
    `;
};

window.finishConfirmModal = function() {
    document.getElementById('confirmModal').classList.remove('active');
    // Reset verify modal state
    selectedVerifyOption = null;
    verifyScreenshotUrl = '';
};

window.handlePaymentScreenshot = async function(input) {
    const file = input.files[0];
    if (!file) return;
    const p = document.getElementById('screenshotFileName');
    p.textContent = 'Uploading: ' + file.name + '...';
    p.style.color = '#92400e';
    
    try {
        const fileName = 'payment_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const { data, error } = await supabase.storage.from('files').upload(fileName, file);
        if (error) {
            p.textContent = 'Upload failed. Try again!';
            p.style.color = '#dc2626';
            return;
        }
        const { data: urlData } = supabase.storage.from('files').getPublicUrl(fileName);
        if (urlData.publicUrl) {
            paymentScreenshotUrl = urlData.publicUrl;
            p.textContent = '✓ Uploaded: ' + file.name;
            p.style.color = '#15803d';
        }
    } catch (error) {
        p.textContent = 'Upload error: ' + error.message;
        p.style.color = '#dc2626';
    }
};

const validCoupons = {
    'ARUM3007': { discount: 30, type: 'percent', description: '30% Discount Applied!' }
};

window.applyCoupon = function() {
    const couponInput = document.getElementById('couponCode');
    const couponMessage = document.getElementById('couponMessage');
    const discountDisplay = document.getElementById('discountDisplay');
    const couponCode = couponInput.value.trim().toUpperCase();
    
    if (!couponCode) {
        couponMessage.textContent = 'Please enter a coupon code';
        couponMessage.className = 'coupon-message error';
        return;
    }
    
    if (validCoupons[couponCode]) {
        appliedCoupon = validCoupons[couponCode];
        const discountAmount = Math.round(currentOrder.finalPrice * (appliedCoupon.discount / 100));
        const newPrice = currentOrder.finalPrice - discountAmount;
        
        couponMessage.textContent = `🎉 ${appliedCoupon.description} You save ₹${discountAmount}!`;
        couponMessage.className = 'coupon-message success';
        
        // Update the displayed price
        document.getElementById('payPrice').innerHTML = `<span class="original-price">₹${currentOrder.finalPrice}</span> ₹${newPrice}`;
        
        // Show discount display
        discountDisplay.innerHTML = `<span class="discount-badge-show">-${appliedCoupon.discount}%</span> <span class="saved-amount">You save ₹${discountAmount}!</span>`;
        
        // Store discounted price
        currentOrder.discountedPrice = newPrice;
        currentOrder.couponDiscount = discountAmount;
        
        // Trigger pop effect
        triggerPopEffect();
        showToast('Coupon applied! You got ' + appliedCoupon.discount + '% discount!', 'success');
    } else {
        couponMessage.textContent = '❌ Invalid coupon code';
        couponMessage.className = 'coupon-message error';
        appliedCoupon = null;
        discountDisplay.innerHTML = '';
        document.getElementById('payPrice').textContent = '₹' + currentOrder.finalPrice;
        currentOrder.discountedPrice = null;
        currentOrder.couponDiscount = null;
    }
};

window.triggerPopEffect = function() {
    // Create confetti effect
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = ['#b7791f', '#d69e2e', '#22c55e', '#3b82f6', '#ef4444'][Math.floor(Math.random() * 5)];
            confetti.style.animationDuration = (Math.random() * 2 + 1) + 's';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
};

function resetCoupon() {
    appliedCoupon = null;
    document.getElementById('couponCode').value = '';
    document.getElementById('couponMessage').textContent = '';
    document.getElementById('couponMessage').className = 'coupon-message';
    document.getElementById('discountDisplay').innerHTML = '';
}

async function saveOrderToFirestore(order) {
  try { await addDoc(collection(db, "orders"), order); } catch(e) { console.log(e); }
}

window.confirmPayment = function() {
  const firstName = document.getElementById('orderFirstName').value.trim();
  const lastName = document.getElementById('orderLastName').value.trim();
  const orderId = 'ARUM' + Date.now();
  const userEmail = currentUser ? currentUser.email : '';
  
  // Use discounted price if coupon is applied, otherwise use regular price
  const finalPrice = currentOrder.discountedPrice || currentOrder.finalPrice;
  
  // Store order ID in currentOrder for verification modal
  currentOrder.orderId = orderId;
  
  const newOrder = {
    id: orderId, firstName, lastName, service: currentOrder.service, description: currentOrder.description,
    projectSummary: currentOrder.projectSummary || '',
    price: finalPrice, phone: currentOrder.phone, status: 'pending',
    date: new Date().toLocaleDateString(), orderTime: new Date().toISOString(),
    fileUrls: uploadedFiles, userEmail: userEmail,
    couponApplied: appliedCoupon ? appliedCoupon.code : null,
    couponDiscount: currentOrder.couponDiscount || 0,
    originalPrice: currentOrder.finalPrice
  };
  orders.unshift(newOrder);
  localStorage.setItem('arumOrders', JSON.stringify(orders));
  saveOrderToFirestore(newOrder);
  closePaymentModal();
  
  // Open verification modal directly
  openVerifyModal();
  
  showToast('Order placed','success');
  renderOrders();
  uploadedFiles = [];
  resetCoupon();
};

window.closeConfirmModal = function() { 
  document.getElementById('confirmModal').classList.remove('active'); 
};

// ==================== RENDER ORDERS ====================

function renderOrders() {
  const grid = document.getElementById('ordersGrid');
  if (!grid) return;
  
  if (!currentUser) {
    grid.innerHTML = '<div class="no-orders" style="padding: 60px 20px; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 16px; border: 3px dashed #0ea5e9;"><div style="font-size: 18px; color: var(--deep-blue); margin-bottom: 12px; font-weight: 700;">🔑 Login Required</div><p style="color: var(--medium-gray);">Sign in to view your order dashboard with live status updates.</p><button class="btn btn-solid" onclick="openModal(\'login\')" style="margin-top: 20px; padding: 12px 32px; font-size: 15px;">Login Now</button></div>';
    return;
  }
  
  const userEmail = currentUser.email.toLowerCase();
  const userOrders = orders.filter(order => order.userEmail && order.userEmail.toLowerCase() === userEmail);
  
  if(userOrders.length === 0) { 
    grid.innerHTML = '<div class="no-orders" style="padding: 60px 40px; background: linear-gradient(135deg, #f8fafc, #e2e8f0); border-radius: 20px; border: 3px dashed #64748b; text-align: center;"><div style="font-size: 48px; margin-bottom: 20px;">📦</div><h3 style="color: var(--deep-blue); margin-bottom: 12px; font-size: 22px;">No Orders Yet</h3><p style="color: var(--medium-gray); font-size: 16px; margin-bottom: 24px;">Your order dashboard is empty. Place your first order to get started!</p><div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;"><button class="btn btn-solid" onclick="scrollToServices()" style="padding: 14px 28px; font-size: 15px;">🛒 Browse Services</button><a href="#services" class="btn btn-outline" onclick="scrollToServices()" style="padding: 14px 28px; font-size: 15px;">View Pricing</a></div></div>'; 
    return; 
  }
  grid.innerHTML = userOrders.map(order => {
    const status = order.status || 'pending';
    const statusClass = 'status-' + status;
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    
    // Admin note display
    let adminNoteHtml = '';
    if (order.adminNote) {
      adminNoteHtml = `<div class="admin-note-display" style="background: rgba(255,159,10,0.1); border-left: 3px solid #ff9f0a; padding: 8px 12px; margin-top: 8px; border-radius: 4px;">
        <p style="margin:0;font-size:12px;color:#ff9f0a;"><strong>📝 Admin Note:</strong> ${order.adminNote}</p>
      </div>`;
    }
    
    // Description with Read More
    let descHtml = '';
    if (order.description && order.description.length > 100) {
      descHtml = `<span class="desc-text">${order.description.substring(0, 100)}...</span><button class="read-more-btn" onclick="openDescView('${order.id}', 'orders')">Read More</button>`;
    } else {
      descHtml = order.description ? order.description : 'No description';
    }
    
    return `<div class="order-card">
      <div class="order-header">
        <span class="order-id">#${order.id}</span>
        <span class="order-status ${statusClass}">${statusText}</span>
      </div>
      <div class="order-service">${order.service}</div>
      <div class="order-details">${descHtml}</div>
      <div class="order-date">📅 ${order.date || 'N/A'}</div>
      <div class="order-full-details">
        <p><strong>👤 Name:</strong> ${order.firstName || ''} ${order.lastName || ''}</p>
        <p><strong>📱 Phone:</strong> ${order.phone || 'N/A'}</p>
        <p><strong>💰 Price:</strong> ₹${order.price || 0}</p>
      </div>
      ${adminNoteHtml}
      ${status === 'pending' ? `<button class="cancel-btn" onclick="cancelOrder('${order.id}')">Cancel Order</button><button class="remove-btn" onclick="removeOrder('${order.id}')">Remove</button>` : ''}
      ${status === 'cancelled' || status === 'completed' ? `<button class="remove-btn" onclick="removeOrder('${order.id}')">Remove</button>` : ''}
    </div>`;
  }).join('');
}

window.scrollToServices = function() {
  document.getElementById('services').scrollIntoView({ behavior: 'smooth' });
};

// Auto-scroll to orders if logged in
window.addEventListener('load', function() {
  if (currentUser && window.location.hash !== '#my-orders') {
    setTimeout(() => {
      const ordersSection = document.getElementById('my-orders');
      if (ordersSection) {
        ordersSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 800);
  }
});

window.cancelOrder = async function(orderId) {
  if(!confirm("Are you sure you want to cancel this order?")) return;
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if(orderIndex !== -1) {
    orders[orderIndex].status = 'cancelled';
    localStorage.setItem('arumOrders', JSON.stringify(orders));
    try {
      const q = query(collection(db, "orders"), where("id", "==", orderId));
      const querySnapshot = await getDocs(q);
      if(!querySnapshot.empty) {
        const orderDoc = doc(db, "orders", querySnapshot.docs[0].id);
        await updateDoc(orderDoc, { status: 'cancelled' });
      }
    } catch(e) { console.log("Error updating Firestore:", e); }
    renderOrders();
    showToast('Order cancelled', 'success');
  }
};

window.removeOrder = async function(orderId) {
  if(!confirm("Are you sure you want to remove this order completely?")) return;
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if(orderIndex !== -1) {
    orders.splice(orderIndex, 1);
    localStorage.setItem('arumOrders', JSON.stringify(orders));
    try {
      const q = query(collection(db, "orders"), where("id", "==", orderId));
      const querySnapshot = await getDocs(q);
      if(!querySnapshot.empty) {
        const orderDoc = doc(db, "orders", querySnapshot.docs[0].id);
        await deleteDoc(orderDoc);
      }
    } catch(e) { console.log("Error removing from Firestore:", e); }
    renderOrders();
    showToast('Order removed', 'success');
  }
};

// ==================== FIRESTORE SYNC ====================

async function syncOrdersFromFirestore() {
  try {
    const q = query(collection(db, "orders"), orderBy("orderTime", "desc"));
    const querySnapshot = await getDocs(q);
    const firestoreOrders = [];
    querySnapshot.forEach((docSnap) => { firestoreOrders.push({ id: docSnap.id, ...docSnap.data() }); });
    if(firestoreOrders.length > 0) {
      const localOrders = JSON.parse(localStorage.getItem('arumOrders') || '[]');
      firestoreOrders.forEach(fOrder => {
        const localIndex = localOrders.findIndex(o => o.id === fOrder.id);
        if(localIndex !== -1) { localOrders[localIndex] = { ...localOrders[localIndex], ...fOrder }; }
        else { localOrders.push(fOrder); }
      });
      orders = localOrders.sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime));
      localStorage.setItem('arumOrders', JSON.stringify(orders));
      renderOrders();
      renderWork();
    }
  } catch(e) { console.log("Error syncing orders:", e); }
}

let unsubscribe = null;

function setupRealtimeListener() {
  if (unsubscribe) return;
  const q = query(collection(db, "orders"), orderBy("orderTime", "desc"));
  unsubscribe = onSnapshot(q, (querySnapshot) => {
    const firestoreOrders = [];
    querySnapshot.forEach((docSnap) => { firestoreOrders.push({ id: docSnap.id, ...docSnap.data() }); });
    if(firestoreOrders.length > 0) {
      const localOrders = JSON.parse(localStorage.getItem('arumOrders') || '[]');
      
      // Check for status changes and notify user
      firestoreOrders.forEach(fOrder => {
        const localIndex = localOrders.findIndex(o => o.id === fOrder.id);
        if(localIndex !== -1) {
          const oldStatus = localOrders[localIndex].status;
          const newStatus = fOrder.status;
          
          // Notify user of status changes
          if (oldStatus !== newStatus && currentUser && fOrder.userEmail === currentUser.email) {
            if (newStatus === 'cancelled') {
              showToast('⚠️ Your order #' + fOrder.id + ' has been cancelled by admin', 'error');
            } else if (newStatus === 'approved') {
              showToast('✅ Your order #' + fOrder.id + ' has been approved!', 'success');
            } else if (newStatus === 'completed') {
              showToast('🎉 Your order #' + fOrder.id + ' is completed!', 'success');
            }
          }
          
          localOrders[localIndex] = { ...localOrders[localIndex], ...fOrder };
        }
        else { localOrders.push(fOrder); }
      });
      orders = localOrders.sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime));
      localStorage.setItem('arumOrders', JSON.stringify(orders));
      renderOrders();
      renderWork();
    }
  }, (error) => { console.log("Real-time listener error:", error); });
}

// ==================== TERMS MODAL ====================

window.showTerms = function(e) { if(e) e.preventDefault(); document.getElementById('termsModal').classList.add('active'); };
window.closeTermsModal = function() { document.getElementById('termsModal').classList.remove('active'); };

// ==================== RENDER WORK ====================

function renderWork() {
  const grid = document.getElementById('workGrid');
  if (!grid) return;
  
  // Filter completed orders to show only the current user's completed orders
  const userEmail = currentUser ? currentUser.email.toLowerCase() : '';
  const userCompletedOrders = orders.filter(order => 
    order.status === 'completed' && 
    order.userEmail && 
    order.userEmail.toLowerCase() === userEmail
  );
  
  if (userCompletedOrders.length === 0) {
    grid.innerHTML = '<div class="no-orders">No completed work yet. Once your order is completed, it will appear here!</div>';
    return;
  }
  grid.innerHTML = userCompletedOrders.map(order => {
    let filesHtml = '';
    if (order.fileUrls && order.fileUrls.length > 0) {
      filesHtml = `<div class="work-files">
        <h4>📁 Your Completed Work:</h4>
        ${order.fileUrls.map(url => {
          const fileName = url.split('/').pop();
          return `<a href="${url}" target="_blank" class="work-file-link">📄 ${fileName || 'View File'}</a>`;
        }).join('')}
      </div>`;
    }
    
    // Description with Read More
    let descHtml = '';
    if (order.description && order.description.length > 6) {
      descHtml = `<span class="desc-text">${order.description.substring(0, 6)}</span><button class="read-more-btn" onclick="openDescView('${order.id}', 'work')">Read More</button>`;
    } else {
      descHtml = order.description ? order.description : 'No description';
    }
    
    return `<div class="work-card">
      <div class="work-header">
        <span class="work-id">#${order.id}</span>
        <span class="work-status">Completed</span>
      </div>
      <div class="work-service">${order.service}</div>
      <div class="work-description">${descHtml}</div>
      <div class="order-date">📅 Completed on: ${order.completedDate || order.date || 'N/A'}</div>
      ${filesHtml}
      <button class="view-work-btn" onclick="viewWorkDetails('${order.id}')">View Full Details</button>
    </div>`;
  }).join('');
}

// ==================== DESCRIPTION VIEW MODAL FUNCTIONS ====================

window.openDescView = function(orderId, source) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  
  const contentEl = document.getElementById('descViewContent');
  const metaEl = document.getElementById('descViewMeta');
  
  contentEl.textContent = order.description || 'No description';
  metaEl.innerHTML = `<p><strong>Order ID:</strong> #${order.id}</p>
    <p><strong>Service:</strong> ${order.service}</p>
    <p><strong>Date:</strong> ${order.date || 'N/A'}</p>`;
  
  document.getElementById('descViewModal').classList.add('active');
};

window.closeDescViewModal = function() {
  document.getElementById('descViewModal').classList.remove('active');
};

window.viewWorkDetails = function(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  let message = `*Your Completed Work Details*\n\n📋 Order ID: #${order.id}\n📝 Service: ${order.service}\n💰 Price: ₹${order.price}\n📅 Completed: ${order.completedDate || order.date}\n\n`;
  if (order.description) message += `📄 Description: ${order.description}\n\n`;
  message += `\nThank you for choosing ARUM!`;
  window.open(`https://wa.me/917979082730?text=${encodeURIComponent(message)}`, '_blank');
};

// ==================== FEEDBACK FUNCTIONS ====================

let currentRating = 0;

window.setRating = function(rating) {
    currentRating = rating;
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
    const ratingText = document.getElementById('ratingText');
    const ratingTexts = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    ratingText.textContent = ratingTexts[rating] || 'Tap to rate';
};

window.submitFeedback = async function() {
    const name = document.getElementById('feedbackName').value.trim();
    const message = document.getElementById('feedbackMessage').value.trim();
    
    if (!name) {
        showToast('Please enter your name', 'error');
        return;
    }
    if (currentRating === 0) {
        showToast('Please select a rating', 'error');
        return;
    }
    if (!message) {
        showToast('Please enter your feedback', 'error');
        return;
    }
    
    try {
        const userEmail = currentUser ? currentUser.email : '';
        
        const feedbackData = {
            name: name,
            rating: currentRating,
            message: message,
            userEmail: userEmail,
            date: new Date().toLocaleDateString(),
            createdAt: new Date().toISOString()
        };
        
        await addDoc(collection(db, "feedback"), feedbackData);
        
        showToast('Thank you for your feedback!', 'success');
        
        // Reset form
        document.getElementById('feedbackName').value = '';
        document.getElementById('feedbackMessage').value = '';
        currentRating = 0;
        const stars = document.querySelectorAll('.star');
        stars.forEach(star => star.classList.remove('active'));
        document.getElementById('ratingText').textContent = 'Tap to rate';
        
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showToast('Error submitting feedback', 'error');
    }
};

// ==================== PERFORMANCE MONITORING ====================

// Web Vitals Tracking (LCP, FID, CLS)
window.addEventListener('DOMContentLoaded', function() {
    
    // Lazy load IntersectionObserver for animations and non-critical content
    if ('IntersectionObserver' in window) {
        const lazyElements = document.querySelectorAll('.service-card, .why-card, .contact-card');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        lazyElements.forEach(el => observer.observe(el));
    }
    
    // Track LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
        try {
            const lcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                const lcpTime = lastEntry.renderTime || lastEntry.loadTime;
                console.log('[ARUM Performance] LCP:', lcpTime.toFixed(2), 'ms');
                
                // Store for analytics
                if (window.localStorage) {
                    const perfData = JSON.parse(localStorage.getItem('arum_perf') || '{}');
                    perfData.lcp = lcpTime;
                    localStorage.setItem('arum_perf', JSON.stringify(perfData));
                }
            });
            lcpObserver.observe({ entryType: 'largest-contentful-paint' });
        } catch (e) {
            console.log('[ARUM Performance] LCP observer not supported');
        }
        
        // Track CLS (Cumulative Layout Shift)
        try {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                console.log('[ARUM Performance] CLS:', clsValue.toFixed(4));
                
                if (window.localStorage) {
                    const perfData = JSON.parse(localStorage.getItem('arum_perf') || '{}');
                    perfData.cls = clsValue;
                    localStorage.setItem('arum_perf', JSON.stringify(perfData));
                }
            });
            clsObserver.observe({ entryType: 'layout-shift' });
        } catch (e) {
            console.log('[ARUM Performance] CLS observer not supported');
        }
        
        // Track FCP (First Contentful Paint)
        try {
            const fcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
                if (fcpEntry) {
                    const fcpTime = fcpEntry.startTime;
                    console.log('[ARUM Performance] FCP:', fcpTime.toFixed(2), 'ms');
                    
                    if (window.localStorage) {
                        const perfData = JSON.parse(localStorage.getItem('arum_perf') || '{}');
                        perfData.fcp = fcpTime;
                        localStorage.setItem('arum_perf', JSON.stringify(perfData));
                    }
                }
            });
            fcpObserver.observe({ entryType: 'paint' });
        } catch (e) {
            console.log('[ARUM Performance] FCP observer not supported');
        }
    }
    
    // Log navigation timing
    window.addEventListener('load', function() {
        setTimeout(function() {
            const perf = window.performance;
            if (perf && perf.timing) {
                const loadTime = perf.timing.loadEventEnd - perf.timing.navigationStart;
                const domReady = perf.timing.domContentLoadedEventEnd - perf.timing.navigationStart;
                console.log('[ARUM Performance] Page Load Time:', loadTime, 'ms');
                console.log('[ARUM Performance] DOM Ready:', domReady, 'ms');
                
                if (window.localStorage) {
                    const perfData = JSON.parse(localStorage.getItem('arum_perf') || '{}');
                    perfData.loadTime = loadTime;
                    perfData.domReady = domReady;
                    localStorage.setItem('arum_perf', JSON.stringify(perfData));
                }
            }
        }, 0);
    });
});

// Performance Budget Helper
window.performanceBudget = function(thresholds) {
    const results = { pass: true, metrics: {} };
    
    if (window.localStorage) {
        const perfData = JSON.parse(localStorage.getItem('arum_perf') || '{}');
        
        if (thresholds.lcp && perfData.lcp) {
            results.metrics.lcp = perfData.lcp;
            results.pass = results.pass && perfData.lcp <= thresholds.lcp;
        }
        if (thresholds.fcp && perfData.fcp) {
            results.metrics.fcp = perfData.fcp;
            results.pass = results.pass && perfData.fcp <= thresholds.fcp;
        }
        if (thresholds.cls && perfData.cls) {
            results.metrics.cls = perfData.cls;
            results.pass = results.pass && perfData.cls <= thresholds.cls;
        }
    }
    
    return results;
};

// ==================== SERVICE PAGE LIGHTWEIGHT MODE ====================
window.isServicePage = window.location.pathname.includes('.html') && !window.location.pathname.includes('index.html') && !window.location.pathname.includes('admin.html');

if (window.isServicePage) {
  // Basic mobile nav for service pages
  window.toggleMobileNav = function() {
    const mobileNav = document.getElementById('mobileNav');
    if (mobileNav) mobileNav.classList.toggle('active');
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) hamburger.classList.toggle('active');
  };
  
  window.closeMobileNav = function() {
    const mobileNav = document.getElementById('mobileNav');
    if (mobileNav) mobileNav.classList.remove('active');
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) hamburger.classList.remove('active');
  };
  
  // Order modal stub - redirect to index
  window.openOrderModal = function(service, price) {
    const url = new URL('index.html', window.location.origin);
    url.searchParams.set('order', service);
    url.searchParams.set('price', price);
    window.location.href = url;
  };
  
  console.log('[ARUM] Service page lightweight mode active');
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    // Setup file input listener if modals present
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) { handleFileSelect(this); });
    }
    
    // Setup form input listeners if order form present
    if (!window.isServicePage) {
      ['orderDescription','orderFirstName','orderLastName','orderPhone'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateProceedButton);
      });
      
      const termsCheck = document.getElementById('termsCheck');
      if (termsCheck) termsCheck.addEventListener('change', updateProceedButton);
      
      // Sync orders and setup real-time listener
      syncOrdersFromFirestore();
      setupRealtimeListener();
      renderWork();
      renderOrders();
    }
    
    // Performance monitoring always
    if ('PerformanceObserver' in window) {
      // LCP, CLS, FCP observers here (existing code)
    }
});



// Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(reg => console.log('SW registered'))
    .catch(err => console.log('SW registration failed'));
}

