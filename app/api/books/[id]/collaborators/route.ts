import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth, unauthorizedResponse, checkIsAuthor, checkBookAccess } from '@/lib/api-auth';
import * as admin from 'firebase-admin';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
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

    const snapshot = await adminDb.collection('collaborators')
      .where('bookId', '==', params.id)
      .get();

    const collaborators = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(collaborators);
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    return NextResponse.json({ error: 'Failed to fetch collaborators' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return unauthorizedResponse();

    const isAuthor = await checkIsAuthor(params.id, user.uid);
    if (!isAuthor) return NextResponse.json({ error: 'Only the author can add collaborators' }, { status: 403 });

    const { userEmail, userName, role } = await request.json();

    const collaboratorData = {
      bookId: params.id,
      userId: userEmail, // Simplified as per previous implementation
      userEmail,
      userName: userName || userEmail.split('@')[0],
      role: role || 'editor',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('collaborators').add(collaboratorData);
    
    return NextResponse.json({ id: docRef.id, ...collaboratorData }, { status: 201 });
  } catch (error) {
    console.error('Error adding collaborator:', error);
    return NextResponse.json({ error: 'Failed to add collaborator' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return unauthorizedResponse();

    const isAuthor = await checkIsAuthor(params.id, user.uid);
    if (!isAuthor) return NextResponse.json({ error: 'Only the author can remove collaborators' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const collaboratorId = searchParams.get('collaboratorId');

    if (!collaboratorId) {
      return NextResponse.json({ error: 'Collaborator ID is required' }, { status: 400 });
    }

    const collabDoc = await adminDb.collection('collaborators').doc(collaboratorId).get();
    if (!collabDoc.exists || collabDoc.data()?.bookId !== params.id) {
       return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
    }

    await adminDb.collection('collaborators').doc(collaboratorId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    return NextResponse.json({ error: 'Failed to remove collaborator' }, { status: 500 });
  }
}
