import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth, unauthorizedResponse } from '@/lib/api-auth';
import * as admin from 'firebase-admin';

export async function GET(
  request: Request,
  { params }: { params: { id: string; chapterId: string } }
) {
  try {
    const chapterDoc = await adminDb.collection('chapters').doc(params.chapterId).get();
    if (!chapterDoc.exists) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
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

    const chapterRef = adminDb.collection('chapters').doc(params.chapterId);
    const chapterDoc = await chapterRef.get();
    
    if (!chapterDoc.exists) {
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

    await adminDb.collection('chapters').doc(params.chapterId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return NextResponse.json({ error: 'Failed to delete chapter' }, { status: 500 });
  }
}
