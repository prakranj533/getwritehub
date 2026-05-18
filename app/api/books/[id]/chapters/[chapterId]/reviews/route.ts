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
    if (!(bookData?.isPublic === true && bookData?.status === 'published')) {
      const user = await verifyAuth(request);
      if (!user) return unauthorizedResponse();
      const hasAccess = await checkBookAccess(params.id, user.uid, user.email || '');
      if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const snapshot = await adminDb.collection('reviews')
      .where('chapterId', '==', params.chapterId)
      .get();

    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string; chapterId: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return unauthorizedResponse();

    const hasAccess = await checkBookAccess(params.id, user.uid, user.email || '');
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { status, comment, reviewerName } = await request.json();

    const reviewData = {
      chapterId: params.chapterId,
      reviewerId: user.uid,
      reviewerEmail: user.email || '',
      reviewerName: reviewerName || user.name || user.email || 'Anonymous',
      status: status || 'pending',
      comment: comment || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('reviews').add(reviewData);
    
    return NextResponse.json({ id: docRef.id, ...reviewData }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
