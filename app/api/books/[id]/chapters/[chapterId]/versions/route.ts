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

    const snapshot = await adminDb.collection('chapterVersions')
      .where('chapterId', '==', params.chapterId)
      .get();

    const versions = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => (b.version || 0) - (a.version || 0)); // newest first

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error fetching chapter versions:', error);
    return NextResponse.json({ error: 'Failed to fetch chapter versions' }, { status: 500 });
  }
}
