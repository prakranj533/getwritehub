import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth';
import * as admin from 'firebase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get('mine') === 'true';
    const user = await verifyAuth(request);

    let query: admin.firestore.Query = adminDb.collection('books');

    if (mine) {
      if (!user) return unauthorizedResponse();
      // Filter by authorId or authorEmail (to be safe)
      query = query.where('authorId', '==', user.uid);
    } else {
      // Public books
      query = query.where('isPublic', '==', true).where('status', '==', 'published');
    }

    const snapshot = await query.orderBy('updatedAt', 'desc').get();
    const books = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyAuth(request);
    if (!user) return unauthorizedResponse();

    const { title, description, isPublic } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const bookData = {
      title,
      description: description || '',
      slug,
      isPublic: isPublic || false,
      status: 'draft',
      authorId: user.uid,
      authorEmail: user.email || '',
      authorName: user.name || user.email || 'Unknown',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('books').add(bookData);
    
    return NextResponse.json({ id: docRef.id, ...bookData }, { status: 201 });
  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }
}
