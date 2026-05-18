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

const BASE_URL = "https://getbook-b4581.web.app";

async function apiFetch(endpoint, token, options = {}) {
  console.log(`-> Fetching ${BASE_URL}${endpoint}`);
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  
  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`API failed: ${response.status} ${response.statusText}\nResponse body: ${text.substring(0, 500)}`);
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Failed to parse JSON. Status: ${response.status}. Body: ${text.substring(0, 500)}`);
  }
}

async function runTests() {
  try {
    console.log("1. Authenticating to production...");
    const userCredential = await signInWithEmailAndPassword(auth, "parth.upadhye.4@gmail.com", "Qwerty@123");
    const user = userCredential.user;
    const token = await user.getIdToken();
    console.log("✅ Authenticated as", user.email);

    console.log("\n2. Creating a new book...");
    const bookData = {
      title: "Automated Prod Test Book",
      description: "This book was created by the production automated test suite.",
      slug: "automated-prod-test-book-" + Date.now(),
      isPublic: true,
      status: "draft",
      authorId: user.uid,
      authorEmail: user.email,
      authorName: user.displayName || user.email,
    };
    const newBook = await apiFetch('/api/books', token, {
      method: 'POST',
      body: JSON.stringify(bookData)
    });
    console.log("✅ Book created with ID:", newBook.id);

    console.log("\n3. Fetching books...");
    const books = await apiFetch('/api/books?mine=true', token);
    const foundBook = books.find(b => b.id === newBook.id);
    if (foundBook) {
      console.log("✅ Book found in list.");
    } else {
      throw new Error("Book not found in list");
    }

    console.log("\n4. Creating a chapter...");
    const chapterData = {
      bookId: newBook.id,
      title: "Chapter 1: The Beginning",
      content: "This is the content of the first chapter.",
      order: 1,
      status: "draft",
      authorId: user.uid,
      authorEmail: user.email,
      authorName: user.displayName || user.email,
      version: 1
    };
    const newChapter = await apiFetch(`/api/books/${newBook.id}/chapters`, token, {
      method: 'POST',
      body: JSON.stringify(chapterData)
    });
    console.log("✅ Chapter created with ID:", newChapter.id);

    console.log("\n5. Updating the chapter...");
    await apiFetch(`/api/books/unknown/chapters/${newChapter.id}`, token, {
      method: 'PUT',
      body: JSON.stringify({ content: "This is the updated content.", version: 2 })
    });
    console.log("✅ Chapter updated.");

    console.log("\n6. Adding a review...");
    const reviewData = {
      chapterId: newChapter.id,
      reviewerId: user.uid,
      reviewerEmail: user.email,
      reviewerName: user.displayName || user.email,
      status: "approved",
      comment: "Looks good to me!"
    };
    const newReview = await apiFetch(`/api/books/unknown/chapters/${newChapter.id}/reviews`, token, {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
    console.log("✅ Review added with ID:", newReview.id);

    console.log("\n7. Fetching reviews...");
    const reviews = await apiFetch(`/api/books/unknown/chapters/${newChapter.id}/reviews`, token);
    if (reviews.length > 0) {
      console.log("✅ Reviews fetched successfully.");
    } else {
      throw new Error("No reviews found");
    }

    console.log("\n🎉 All production tests passed successfully!");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Production test suite failed:", error.message);
    process.exit(1);
  }
}

runTests();
