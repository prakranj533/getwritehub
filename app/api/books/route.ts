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
      
      // Fetch books where user is author
      const ownedBooksSnapshot = await adminDb.collection('books')
        .where('authorId', '==', user.uid)
        .get();
      
      // Fetch books where user is collaborator
      // We use email as userId in collaborators collection as per current implementation
      const collaborationsSnapshot = await adminDb.collection('collaborators')
        .where('userEmail', '==', user.email)
        .get();
      
      const collaboratedBookIds = collaborationsSnapshot.docs.map(doc => doc.data().bookId);
      
      let allBooks = ownedBooksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch the actual book documents for collaborations
      if (collaboratedBookIds.length > 0) {
        // Firestore 'in' query limited to 10 items. For a real app we'd need a better way.
        // But for now let's fetch them.
        const chunkedIds = [];
        for (let i = 0; i < collaboratedBookIds.length; i += 10) {
          chunkedIds.push(collaboratedBookIds.slice(i, i + 10));
        }

        for (const ids of chunkedIds) {
          const collaboratedBooksSnapshot = await adminDb.collection('books')
            .where(admin.firestore.FieldPath.documentId(), 'in', ids)
            .get();
          
          collaboratedBooksSnapshot.docs.forEach(doc => {
            // Avoid duplicates if user is both author and collaborator (shouldn't happen but safe)
            if (!allBooks.find(b => b.id === doc.id)) {
              allBooks.push({
                id: doc.id,
                ...doc.data(),
              });
            }
          });
        }
      }

      // Sort merged results
      allBooks.sort((a: any, b: any) => {
        const dateA = a.updatedAt?.toDate?.() || 0;
        const dateB = b.updatedAt?.toDate?.() || 0;
        return dateB - dateA;
      });

      return NextResponse.json(allBooks);
    } else {
      // Public books - sort in memory to avoid requiring composite index
      const snapshot = await adminDb.collection('books')
        .where('isPublic', '==', true)
        .get();

      const books = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort by updatedAt descending in memory
      books.sort((a: any, b: any) => {
        const dateA = a.updatedAt?.toDate?.() || new Date(0);
        const dateB = b.updatedAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      return NextResponse.json(books);
    }
  } catch (error: any) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books', detail: error?.message },
      { status: 500 }
    );
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
