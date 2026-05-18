import { auth } from './firebase';

// Types (Keep these for consistency)
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
  createdAt?: any;
  updatedAt?: any;
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
  createdAt?: any;
  updatedAt?: any;
}

export interface ChapterVersion {
  id?: string;
  chapterId: string;
  content: string;
  version: number;
  createdAt?: any;
  createdBy: string;
}

export interface Collaborator {
  id?: string;
  bookId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: 'owner' | 'editor' | 'reviewer';
  createdAt?: any;
}

export interface Review {
  id?: string;
  chapterId: string;
  reviewerId: string;
  reviewerEmail: string;
  reviewerName: string;
  status: 'pending' | 'approved' | 'changes_requested';
  comment?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Helper for API calls
async function apiFetch(url: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  const headers = new Headers(options.headers || {});
  
  if (user) {
    const token = await user.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  headers.set('Content-Type', 'application/json');
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

// Books
export async function createBook(data: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book> {
  return apiFetch('/api/books', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getBooks(userId: string): Promise<Book[]> {
  // If userId is provided, we fetch user's books. Otherwise public.
  const url = userId ? '/api/books?mine=true' : '/api/books';
  return apiFetch(url);
}

export async function getBook(bookId: string): Promise<Book | null> {
  return apiFetch(`/api/books/${bookId}`);
}

export async function updateBook(bookId: string, data: Partial<Book>): Promise<void> {
  await apiFetch(`/api/books/${bookId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBook(bookId: string): Promise<void> {
  await apiFetch(`/api/books/${bookId}`, {
    method: 'DELETE',
  });
}

// Chapters
export async function createChapter(data: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chapter> {
  return apiFetch(`/api/books/${data.bookId}/chapters`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getChapters(bookId: string): Promise<Chapter[]> {
  return apiFetch(`/api/books/${bookId}/chapters`);
}

export async function getChapter(chapterId: string, bookId: string = 'unknown'): Promise<Chapter | null> {
  return apiFetch(`/api/books/${bookId}/chapters/${chapterId}`); 
}

export async function updateChapter(chapterId: string, data: Partial<Chapter>, bookId: string = 'unknown'): Promise<void> {
  await apiFetch(`/api/books/${bookId}/chapters/${chapterId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteChapter(chapterId: string, bookId: string = 'unknown'): Promise<void> {
  await apiFetch(`/api/books/${bookId}/chapters/${chapterId}`, {
    method: 'DELETE',
  });
}

// Chapter Versions
export async function createChapterVersion(data: Omit<ChapterVersion, 'id' | 'createdAt'>): Promise<ChapterVersion> {
  return apiFetch(`/api/books/unknown/chapters/${data.chapterId}/versions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getChapterVersions(chapterId: string, bookId: string = 'unknown'): Promise<ChapterVersion[]> {
  return apiFetch(`/api/books/${bookId}/chapters/${chapterId}/versions`);
}

// Collaborators
export async function addCollaborator(data: Omit<Collaborator, 'id' | 'createdAt'>): Promise<Collaborator> {
  return apiFetch(`/api/books/${data.bookId}/collaborators`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCollaborators(bookId: string): Promise<Collaborator[]> {
  return apiFetch(`/api/books/${bookId}/collaborators`);
}

export async function removeCollaborator(collaboratorId: string, bookId: string = 'unknown'): Promise<void> {
  await apiFetch(`/api/books/${bookId}/collaborators?collaboratorId=${collaboratorId}`, {
    method: 'DELETE',
  });
}

// Reviews
export async function createReview(data: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>, bookId: string = 'unknown'): Promise<Review> {
  return apiFetch(`/api/books/${bookId}/chapters/${data.chapterId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getReviews(chapterId: string, bookId: string = 'unknown'): Promise<Review[]> {
  return apiFetch(`/api/books/${bookId}/chapters/${chapterId}/reviews`);
}

export async function updateReview(reviewId: string, data: Partial<Review>): Promise<void> {
  // Implement if needed, currently no route for this.
  console.warn('updateReview not implemented in API');
}
