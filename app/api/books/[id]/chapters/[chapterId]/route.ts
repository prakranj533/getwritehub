import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth, unauthorizedResponse, checkBookAccess } from '@/lib/api-auth';
import * as admin from 'firebase-admin';

export async function GET(
  request: Request,
  { params }: { params: { id: string; chapterId: string } }
) {
  try {
    const bookDoc = await adminDb.collection('books').doc(params.id).get();
    if (!bookDoc.exists) return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    const bookData = bookDoc.data();
    if (!bookData?.isPublic && bookData?.status !== 'published') {
      const user = await verifyAuth(request);
      if (!user) return unauthorizedResponse();
      const hasAccess = await checkBookAccess(params.id, user.uid, user.email || '');
      if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const chapterDoc = await adminDb.collection('chapters').doc(params.chapterId).get();
    if (!chapterDoc.exists) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }
    
    // Ensure the chapter actually belongs to this book
    if (chapterDoc.data()?.bookId !== params.id) {
       return NextResponse.json({ error: 'Chapter not found in this book' }, { status: 404 });
    }

    return NextResponse.json({ id: chapterDoc.id, ...chapterDoc.data() });
  } catch (error) {
    console.error('Error fetching chapter:', error);
    return NextResponse.json({ error: 'Failed to fetch chapter' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string; chapterId: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return unauthorizedResponse();
    
    const hasAccess = await checkBookAccess(params.id, user.uid, user.email || '');
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const chapterRef = adminDb.collection('chapters').doc(params.chapterId);
    const chapterDoc = await chapterRef.get();
    
    if (!chapterDoc.exists || chapterDoc.data()?.bookId !== params.id) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const currentData = chapterDoc.data();
    const updates = await request.json();

    // Versioning logic: if content is changing, create a version record
    if (updates.content !== undefined && updates.content !== currentData?.content) {
      await adminDb.collection('chapterVersions').add({
        chapterId: params.chapterId,
        content: currentData?.content || '',
        version: currentData?.version || 1,
        createdBy: user.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Increment version in the main doc
      updates.version = (currentData?.version || 1) + 1;
    }

    await chapterRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, version: updates.version });
  } catch (error) {
    console.error('Error updating chapter:', error);
    return NextResponse.json({ error: 'Failed to update chapter' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; chapterId: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return unauthorizedResponse();
    
    const hasAccess = await checkBookAccess(params.id, user.uid, user.email || '');
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const chapterRef = adminDb.collection('chapters').doc(params.chapterId);
    const chapterDoc = await chapterRef.get();
    if (!chapterDoc.exists || chapterDoc.data()?.bookId !== params.id) {
       return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const batch = adminDb.batch();
    batch.delete(chapterRef);

    const versions = await adminDb.collection('chapterVersions').where('chapterId', '==', params.chapterId).get();
    versions.docs.forEach(doc => batch.delete(doc.ref));
    
    const reviews = await adminDb.collection('reviews').where('chapterId', '==', params.chapterId).get();
    reviews.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return NextResponse.json({ error: 'Failed to delete chapter' }, { status: 500 });
  }
}
