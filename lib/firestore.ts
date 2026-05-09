import { db } from './firebase';
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
  DocumentData,
  QueryDocumentSnapshot,
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
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Chapter {
  id?: string;
  bookId: string;
  title: string;
  content: string;
  order: number;
  status: 'draft' | 'review' | 'published';
  authorId: string;
  authorEmail: string;
  authorName: string;
  version: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ChapterVersion {
  id?: string;
  chapterId: string;
  content: string;
  version: number;
  createdAt?: Timestamp | null;
  createdBy: string;
}

export interface Collaborator {
  id?: string;
  bookId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: 'owner' | 'editor' | 'reviewer';
  createdAt?: Timestamp | null;
}

export interface Review {
  id?: string;
  chapterId: string;
  reviewerId: string;
  reviewerEmail: string;
  reviewerName: string;
  status: 'pending' | 'approved' | 'changes_requested';
  comment?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

// Helper to convert Firestore doc to typed object
function docToObject<T extends DocumentData>(doc: QueryDocumentSnapshot<DocumentData>): T & { id: string } {
  return { id: doc.id, ...doc.data() } as T & { id: string };
}

// Books
export async function createBook(data: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book> {
  const docRef = await addDoc(collection(db, 'books'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...data };
}

export async function getBooks(userId: string): Promise<Book[]> {
  const books: Book[] = [];
  const bookIds = new Set<string>();
  
  // Get user's own books
  const userBooksQuery = query(
    collection(db, 'books'),
    where('authorId', '==', userId)
  );
  const userBooksSnap = await getDocs(userBooksQuery);
  userBooksSnap.docs.forEach(doc => {
    bookIds.add(doc.id);
    books.push(docToObject<Book>(doc));
  });
  
  // Get books where user is collaborator
  const collabQuery = query(
    collection(db, 'collaborators'),
    where('userId', '==', userId)
  );
  const collabSnap = await getDocs(collabQuery);
  const collabBookIds = collabSnap.docs.map(d => d.data().bookId);
  
  // Fetch those books
  for (const bookId of collabBookIds) {
    if (!bookIds.has(bookId)) {
      const book = await getBook(bookId);
      if (book) {
        bookIds.add(bookId);
        books.push(book);
      }
    }
  }
  
  // Get public published books
  const publicQuery = query(
    collection(db, 'books'),
    where('isPublic', '==', true),
    where('status', '==', 'published')
  );
  const publicSnap = await getDocs(publicQuery);
  publicSnap.docs.forEach(doc => {
    if (!bookIds.has(doc.id)) {
      bookIds.add(doc.id);
      books.push(docToObject<Book>(doc));
    }
  });
  
  // Sort by updatedAt descending
  return books.sort((a, b) => {
    const aTime = a.updatedAt?.toMillis?.() || 0;
    const bTime = b.updatedAt?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

export async function getBook(bookId: string): Promise<Book | null> {
  const docRef = doc(db, 'books', bookId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return docToObject<Book>(docSnap);
}

export async function updateBook(bookId: string, data: Partial<Book>): Promise<void> {
  const docRef = doc(db, 'books', bookId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBook(bookId: string): Promise<void> {
  await deleteDoc(doc(db, 'books', bookId));
}

// Chapters
export async function createChapter(data: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chapter> {
  const docRef = await addDoc(collection(db, 'chapters'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...data };
}

export async function getChapters(bookId: string): Promise<Chapter[]> {
  const q = query(
    collection(db, 'chapters'),
    where('bookId', '==', bookId)
  );
  const snapshot = await getDocs(q);
  const chapters = snapshot.docs.map(doc => docToObject<Chapter>(doc));
  return chapters.sort((a, b) => a.order - b.order);
}

export async function getChapter(chapterId: string): Promise<Chapter | null> {
  const docRef = doc(db, 'chapters', chapterId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return docToObject<Chapter>(docSnap);
}

export async function updateChapter(chapterId: string, data: Partial<Chapter>): Promise<void> {
  const docRef = doc(db, 'chapters', chapterId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteChapter(chapterId: string): Promise<void> {
  await deleteDoc(doc(db, 'chapters', chapterId));
}

// Chapter Versions
export async function createChapterVersion(data: Omit<ChapterVersion, 'id' | 'createdAt'>): Promise<ChapterVersion> {
  const docRef = await addDoc(collection(db, 'chapterVersions'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, ...data };
}

export async function getChapterVersions(chapterId: string): Promise<ChapterVersion[]> {
  const q = query(
    collection(db, 'chapterVersions'),
    where('chapterId', '==', chapterId)
  );
  const snapshot = await getDocs(q);
  const versions = snapshot.docs.map(doc => docToObject<ChapterVersion>(doc));
  return versions.sort((a, b) => b.version - a.version);
}

// Collaborators
export async function addCollaborator(data: Omit<Collaborator, 'id' | 'createdAt'>): Promise<Collaborator> {
  const docRef = await addDoc(collection(db, 'collaborators'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, ...data };
}

export async function getCollaborators(bookId: string): Promise<Collaborator[]> {
  const q = query(
    collection(db, 'collaborators'),
    where('bookId', '==', bookId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => docToObject<Collaborator>(doc));
}

export async function removeCollaborator(collaboratorId: string): Promise<void> {
  await deleteDoc(doc(db, 'collaborators', collaboratorId));
}

// Reviews
export async function createReview(data: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Promise<Review> {
  const docRef = await addDoc(collection(db, 'reviews'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...data };
}

export async function getReviews(chapterId: string): Promise<Review[]> {
  const q = query(
    collection(db, 'reviews'),
    where('chapterId', '==', chapterId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => docToObject<Review>(doc));
}

export async function updateReview(reviewId: string, data: Partial<Review>): Promise<void> {
  const docRef = doc(db, 'reviews', reviewId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
