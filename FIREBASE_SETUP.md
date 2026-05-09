# WriteHub Firebase Integration Guide

## 1. Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Create Project"
3. Name it "writehub" (or your preferred name)
4. Disable Google Analytics for simplicity
5. Click "Create Project"

## 2. Setup Firestore Database

1. In Firebase Console, click "Build" → "Firestore Database"
2. Click "Create Database"
3. Choose "Start in test mode" (allows reads/writes for 30 days)
4. Select a region close to your users (e.g., `asia-south1` for India)
5. Click "Enable"

## 3. Register Web App

1. In Project Overview, click the web icon `</>`
2. Give it a nickname (e.g., "writehub-web")
3. Click "Register App"
4. Copy the Firebase config object (you'll need it in step 5)
5. Click "Continue to console"

## 4. Install Firebase SDK

```bash
npm install firebase
```

## 5. Create Firebase Config

Create `lib/firebase.ts`:

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
```

## 6. Add Environment Variables

Create/update `.env.local`:

```
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Keep NextAuth for now (or remove if switching to Firebase Auth)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

## 7. Create Firestore Data Functions

Create `lib/firestore.ts`:

```typescript
import { db, auth } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

// Types
export interface Book {
  id?: string;
  title: string;
  description: string;
  slug: string;
  isPublic: boolean;
  status: 'draft' | 'published' | 'archived';
  authorId: string;
  authorEmail: string;
  authorName: string;
  createdAt: any;
  updatedAt: any;
}

export interface Chapter {
  id?: string;
  bookId: string;
  title: string;
  content: string;
  order: number;
  status: 'draft' | 'review' | 'published';
  authorId: string;
  version: number;
  createdAt: any;
  updatedAt: any;
}

export interface Collaborator {
  id?: string;
  bookId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: 'owner' | 'editor' | 'reviewer';
  createdAt: any;
}

// Books
export async function createBook(data: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = await addDoc(collection(db, 'books'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...data };
}

export async function getBooks(userId: string) {
  // Get user's books
  const userBooksQuery = query(
    collection(db, 'books'),
    where('authorId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  const userBooksSnap = await getDocs(userBooksQuery);
  
  // Get books where user is collaborator
  const collabQuery = query(
    collection(db, 'collaborators'),
    where('userId', '==', userId)
  );
  const collabSnap = await getDocs(collabQuery);
  const bookIds = collabSnap.docs.map(d => d.data().bookId);
  
  // Get public books
  const publicQuery = query(
    collection(db, 'books'),
    where('isPublic', '==', true),
    where('status', '==', 'published')
  );
  const publicSnap = await getDocs(publicQuery);
  
  // Combine and deduplicate
  const allBooks = [
    ...userBooksSnap.docs,
    ...publicSnap.docs.filter(d => !userBooksSnap.docs.some(ud => ud.id === d.id))
  ];
  
  return allBooks.map(doc => ({ id: doc.id, ...doc.data() } as Book));
}

export async function getBook(bookId: string) {
  const docRef = doc(db, 'books', bookId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Book;
}

export async function updateBook(bookId: string, data: Partial<Book>) {
  const docRef = doc(db, 'books', bookId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBook(bookId: string) {
  await deleteDoc(doc(db, 'books', bookId));
}

// Chapters
export async function createChapter(data: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = await addDoc(collection(db, 'chapters'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...data };
}

export async function getChapters(bookId: string) {
  const q = query(
    collection(db, 'chapters'),
    where('bookId', '==', bookId),
    orderBy('order', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
}

export async function getChapter(chapterId: string) {
  const docRef = doc(db, 'chapters', chapterId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Chapter;
}

export async function updateChapter(chapterId: string, data: Partial<Chapter>) {
  const docRef = doc(db, 'chapters', chapterId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteChapter(chapterId: string) {
  await deleteDoc(doc(db, 'chapters', chapterId));
}

// Collaborators
export async function addCollaborator(data: Omit<Collaborator, 'id' | 'createdAt'>) {
  const docRef = await addDoc(collection(db, 'collaborators'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, ...data };
}

export async function getCollaborators(bookId: string) {
  const q = query(
    collection(db, 'collaborators'),
    where('bookId', '==', bookId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator));
}

export async function removeCollaborator(collaboratorId: string) {
  await deleteDoc(doc(db, 'collaborators', collaboratorId));
}
```

## 8. Update API Routes to Use Firestore

Example: Update `app/api/books/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createBook, getBooks } from '@/lib/firestore';
import { getServerSession } from 'next-auth/next';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user ID from session or create a user ID mapping
    const userId = session.user.email; // Or use a hashed version
    
    const books = await getBooks(userId);
    return NextResponse.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, isPublic } = await request.json();
    
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const book = await createBook({
      title,
      description: description || '',
      slug,
      isPublic: isPublic || false,
      status: 'draft',
      authorId: session.user.email,
      authorEmail: session.user.email,
      authorName: session.user.name || session.user.email,
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json(
      { error: 'Failed to create book' },
      { status: 500 }
    );
  }
}
```

## 9. Setup Firebase Auth (Optional)

If you want to replace NextAuth with Firebase Auth:

1. In Firebase Console → Authentication → Sign-in method
2. Enable "Email/Password" provider
3. Optionally enable Google, GitHub, etc.

Create `lib/firebase-auth.ts`:

```typescript
import { auth } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';

export async function signUp(email: string, password: string, name: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName: name });
  return userCredential.user;
}

export async function signIn(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logOut() {
  await signOut(auth);
}

export function onAuthChange(callback: (user: any) => void) {
  return onAuthStateChanged(auth, callback);
}
```

## 10. Firebase Security Rules

After testing, secure your Firestore. In Firebase Console → Firestore Database → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.token.email == userId;
    }

    match /books/{bookId} {
      allow read: if resource.data.isPublic == true || 
                    resource.data.authorId == request.auth.token.email ||
                    exists(/databases/$(database)/documents/collaborators/$(request.auth.token.email + '_' + bookId));
      
      allow create: if isAuthenticated();
      allow update, delete: if resource.data.authorId == request.auth.token.email;
    }
    
    match /chapters/{chapterId} {
      allow read: if get(/databases/$(database)/documents/books/$(resource.data.bookId)).data.isPublic == true ||
                    get(/databases/$(database)/documents/books/$(resource.data.bookId)).data.authorId == request.auth.token.email;
      
      allow create, update, delete: if get(/databases/$(database)/documents/books/$(resource.data.bookId)).data.authorId == request.auth.token.email;
    }
    
    match /collaborators/{collaboratorId} {
      allow read: if true;
      allow write: if get(/databases/$(database)/documents/books/$(resource.data.bookId)).data.authorId == request.auth.token.email;
    }
  }
}
```

## 11. Deploy to Firebase Hosting (Optional)

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting
firebase init hosting

# Build and deploy
npm run build
firebase deploy
```

## Migration Summary

| Feature | Before (Prisma) | After (Firebase) |
|---------|-----------------|------------------|
| Database | SQLite/Prisma | Firestore |
| Auth | NextAuth | Firebase Auth (optional) |
| Hosting | Vercel/Local | Firebase Hosting |
| Offline | IndexedDB | Firestore offline persistence |
| Real-time | Polling | Firestore listeners |

## Need Help?

- Firebase Docs: https://firebase.google.com/docs
- Firestore Query Docs: https://firebase.google.com/docs/firestore/query-data/queries
- Firebase Auth: https://firebase.google.com/docs/auth/web/start
