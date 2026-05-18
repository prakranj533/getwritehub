const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const PROD_URL = "https://getbook-b4581.web.app";

async function testProd() {
  try {
    console.log("Signing in to production...");
    const userCredential = await signInWithEmailAndPassword(auth, "parth.upadhye.4@gmail.com", "Qwerty@123");
    const token = await userCredential.user.getIdToken();
    console.log("Signed in successfully. Fetching books from PROD API...");

    const response = await fetch(`${PROD_URL}/api/books?mine=true`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log("✅ PROD test passed: API returned 200 OK.");
      console.log(`Found ${data.length} books.`);
    } else {
      console.error("❌ PROD test failed: API returned " + response.status);
      console.error("Response data:", data);
    }
  } catch (error) {
    console.error("Error during PROD test:", error);
  }
}

testProd();
