import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

// GET /api/books/[id] - Get a specific book
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    const book = await prisma.book.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
        chapters: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            author: {
              select: { id: true, name: true },
            },
            _count: {
              select: { reviews: true },
            },
          },
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Check access permissions
    const userEmail = session?.user?.email;
    const canAccess =
      book.isPublic ||
      book.status === "published" ||
      (userEmail &&
        (book.author.email === userEmail ||
          book.collaborators.some((c: { user: { email: string } }) => c.user.email === userEmail)));

    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    return NextResponse.json(
      { error: "Failed to fetch book" },
      { status: 500 }
    );
  }
}

// PUT /api/books/[id] - Update a book
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const book = await prisma.book.findUnique({
      where: { id: params.id },
      include: { collaborators: true },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Check if user can edit (author or editor collaborator)
    const canEdit =
      book.authorId === user.id ||
      book.collaborators.some(
        (c: { userId: string; role: string }) => c.userId === user.id && (c.role === "owner" || c.role === "editor")
      );

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, description, isPublic, status } = await request.json();

    const updatedBook = await prisma.book.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
        ...(status && { status }),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
        chapters: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedBook);
  } catch (error) {
    console.error("Error updating book:", error);
    return NextResponse.json(
      { error: "Failed to update book" },
      { status: 500 }
    );
  }
}

// DELETE /api/books/[id] - Delete a book
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const book = await prisma.book.findUnique({
      where: { id: params.id },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    if (book.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.book.delete({ where: { id: params.id } });

    return NextResponse.json({ message: "Book deleted" });
  } catch (error) {
    console.error("Error deleting book:", error);
    return NextResponse.json(
      { error: "Failed to delete book" },
      { status: 500 }
    );
  }
}
