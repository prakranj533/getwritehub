import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth, unauthorizedResponse, checkBookAccess } from '@/lib/api-auth';
import * as admin from 'firebase-admin';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const bookDoc = await adminDb.collection('books').doc(params.id).get();
    if (!bookDoc.exists) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookData = bookDoc.data();

    if (!bookData?.isPublic && bookData?.status !== 'published') {
      const user = await verifyAuth(request);
      if (!user) {
        return unauthorizedResponse();
      }
      const hasAccess = await checkBookAccess(params.id, user.uid, user.email || '');
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const book = { id: bookDoc.id, ...bookData };
    return NextResponse.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    return NextResponse.json({ error: 'Failed to fetch book' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return unauthorizedResponse();

    const bookDoc = await adminDb.collection('books').doc(params.id).get();
    if (!bookDoc.exists) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookData = bookDoc.data();
    if (bookData?.authorId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates = await request.json();
    await adminDb.collection('books').doc(params.id).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return unauthorizedResponse();

    const bookDoc = await adminDb.collection('books').doc(params.id).get();
    if (!bookDoc.exists) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookData = bookDoc.data();
    if (bookData?.authorId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const batch = adminDb.batch();
    batch.delete(bookDoc.ref);

    const chapters = await adminDb.collection('chapters').where('bookId', '==', params.id).get();
    chapters.docs.forEach(doc => batch.delete(doc.ref));

    const collaborators = await adminDb.collection('collaborators').where('bookId', '==', params.id).get();
    collaborators.docs.forEach(doc => batch.delete(doc.ref));

    for (const chapter of chapters.docs) {
      const versions = await adminDb.collection('chapterVersions').where('chapterId', '==', chapter.id).get();
      versions.docs.forEach(doc => batch.delete(doc.ref));
      
      const reviews = await adminDb.collection('reviews').where('chapterId', '==', chapter.id).get();
      reviews.docs.forEach(doc => batch.delete(doc.ref));
    }

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
