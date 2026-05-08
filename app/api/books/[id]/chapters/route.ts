import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

// POST /api/books/[id]/chapters - Create a new chapter
export async function POST(
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

    // Check if user can edit
    const canEdit =
      book.authorId === user.id ||
      book.collaborators.some(
        (c: { userId: string; role: string }) =>
          c.userId === user.id && (c.role === "owner" || c.role === "editor")
      );

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, content } = await request.json();

    // Get max order
    const maxOrder = await prisma.chapter.aggregate({
      where: { bookId: params.id },
      _max: { order: true },
    });

    const chapter = await prisma.chapter.create({
      data: {
        title: title || "Untitled Chapter",
        content: content || "",
        order: (maxOrder._max.order || 0) + 1,
        bookId: params.id,
        authorId: user.id,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(chapter, { status: 201 });
  } catch (error) {
    console.error("Error creating chapter:", error);
    return NextResponse.json(
      { error: "Failed to create chapter" },
      { status: 500 }
    );
  }
}

// GET /api/books/[id]/chapters - Get all chapters for a book
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    const book = await prisma.book.findUnique({
      where: { id: params.id },
      include: { collaborators: true },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Check access
    const canAccess =
      book.isPublic ||
      book.status === "published" ||
      (session?.user?.email &&
        (book.author.email === session.user.email ||
          book.collaborators.some(
            (c: { user: { email: string } }) =>
              c.user.email === session.user?.email
          )));

    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const chapters = await prisma.chapter.findMany({
      where: { bookId: params.id },
      orderBy: { order: "asc" },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { reviews: true },
        },
      },
    });

    return NextResponse.json(chapters);
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return NextResponse.json(
      { error: "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}
