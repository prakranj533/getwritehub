import { adminAuth, adminDb } from './firebase-admin';
import { NextResponse } from 'next/server';

export async function verifyAuth(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function checkIsAuthor(bookId: string, uid: string) {
  const bookDoc = await adminDb.collection('books').doc(bookId).get();
  if (!bookDoc.exists) return false;
  return bookDoc.data()?.authorId === uid;
}

export async function checkBookAccess(bookId: string, uid: string, email: string) {
  const bookDoc = await adminDb.collection('books').doc(bookId).get();
  if (!bookDoc.exists) return false;
  if (bookDoc.data()?.authorId === uid) return true;
  
  const collabSnapshot = await adminDb.collection('collaborators')
    .where('bookId', '==', bookId)
    .where('userEmail', '==', email)
    .get();
    
  return !collabSnapshot.empty;
}
