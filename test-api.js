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

async function test() {
  try {
    console.log("Signing in...");
    const userCredential = await signInWithEmailAndPassword(auth, "parth.upadhye.4@gmail.com", "Qwerty@123");
    const token = await userCredential.user.getIdToken();
    console.log("Signed in successfully. Fetching books...");

    const response = await fetch("http://localhost:3000/api/books?mine=true", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Data:`, data);

    if (response.status === 200) {
      console.log("✅ Local test passed: API returned 200 OK.");
    } else {
      console.error("❌ Local test failed: API returned " + response.status);
    }
  } catch (error) {
    console.error("Error during test:", error);
  }
}

test();
