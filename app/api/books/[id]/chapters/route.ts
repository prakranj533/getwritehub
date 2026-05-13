import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth';
import * as admin from 'firebase-admin';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const snapshot = await adminDb.collection('chapters')
      .where('bookId', '==', params.id)
      .orderBy('order', 'asc')
      .get();

    const chapters = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(chapters);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return unauthorizedResponse();

    const { title, content, order } = await request.json();

    const chapterData = {
      bookId: params.id,
      title: title || 'Untitled Chapter',
      content: content || '',
      order: order || 0,
      status: 'draft',
      authorId: user.uid,
      authorEmail: user.email || '',
      authorName: user.name || user.email || 'Unknown',
      version: 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('chapters').add(chapterData);
    
    return NextResponse.json({ id: docRef.id, ...chapterData }, { status: 201 });
  } catch (error) {
    console.error('Error creating chapter:', error);
    return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 });
  }
}
