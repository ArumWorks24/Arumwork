// ARUM Firebase Database - Cloud Storage for Orders
// Using Firebase Firestore (asia-south2 - Delhi)

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAFCg26gXr-5vkCAp6b_XtXgbN8cvS8q2g",
  authDomain: "arum-work.firebaseapp.com",
  projectId: "arum-work",
  storageBucket: "arum-work.firebasestorage.app",
  messagingSenderId: "449287443075",
  appId: "1:449287443075:web:e16ccfb509902010bd81b6",
  measurementId: "G-F68ZHEH5WL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore Database (asia-south2 - Delhi)
const db = getFirestore(app);

// DATABASE FUNCTIONS FOR ARUM
// These functions let you save, get, update, and delete orders from cloud

window.DB = {
  
  // 1. SAVE NEW ORDER TO DATABASE
  async addOrder(orderData) {
    try {
      const docRef = await addDoc(collection(db, "orders"), {
        ...orderData,
        createdAt: new Date().toISOString()
      });
      console.log("✅ Order saved to cloud with ID:", docRef.id);
      return docRef.id;
    } catch (e) {
      console.error("❌ Error saving order to cloud: ", e);
      throw e;
    }
  },

  // 2. GET ALL ORDERS FROM DATABASE
  async getAllOrders() {
    try {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const orders = [];
      querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      console.log("✅ Got", orders.length, "orders from cloud");
      return orders;
    } catch (e) {
      console.error("❌ Error getting orders from cloud: ", e);
      return [];
    }
  },

  // 3. UPDATE ORDER STATUS (pending -> approved -> completed)
  async updateOrderStatus(orderId, status) {
    try {
      const orderDoc = doc(db, "orders", orderId);
      await updateDoc(orderDoc, { status: status });
      console.log("✅ Order status updated to:", status);
    } catch (e) {
      console.error("❌ Error updating status: ", e);
    }
  },

  // 4. DELETE ORDER FROM DATABASE
  async deleteOrder(orderId) {
    try {
      await deleteDoc(doc(db, "orders", orderId));
      console.log("✅ Order deleted from cloud!");
    } catch (e) {
      console.error("❌ Error deleting order: ", e);
    }
  }
};

console.log("🔥 Firebase Database Connected! (asia-south2 - Delhi)");