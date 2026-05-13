import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function GET(
  request: Request,
  { params }: { params: { id: string; chapterId: string } }
) {
  try {
    const snapshot = await adminDb.collection('chapterVersions')
      .where('chapterId', '==', params.chapterId)
      .orderBy('version', 'desc')
      .get();

    const versions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error fetching chapter versions:', error);
    return NextResponse.json({ error: 'Failed to fetch chapter versions' }, { status: 500 });
  }
}
