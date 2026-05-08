import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

// GET /api/books/[id]/chapters/[chapterId] - Get a specific chapter
export async function GET(
  request: Request,
  { params }: { params: { id: string; chapterId: string } }
) {
  try {
    const session = await getServerSession();

    const book = await prisma.book.findUnique({
      where: { id: params.id },
      include: {
        author: { select: { email: true } },
        collaborators: { include: { user: true } },
      },
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
            (c: { user: { email: string | null } }) =>
              c.user.email === session.user?.email
          )));

    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: params.chapterId, bookId: params.id },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
        reviews: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        versions: {
          orderBy: { version: "desc" },
          take: 10,
        },
      },
    });

    if (!chapter) {
      return NextResponse.json(
        { error: "Chapter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(chapter);
  } catch (error) {
    console.error("Error fetching chapter:", error);
    return NextResponse.json(
      { error: "Failed to fetch chapter" },
      { status: 500 }
    );
  }
}

// PUT /api/books/[id]/chapters/[chapterId] - Update a chapter
export async function PUT(
  request: Request,
  { params }: { params: { id: string; chapterId: string } }
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

    const { title, content, status } = await request.json();

    const chapter = await prisma.chapter.findUnique({
      where: { id: params.chapterId, bookId: params.id },
    });

    if (!chapter) {
      return NextResponse.json(
        { error: "Chapter not found" },
        { status: 404 }
      );
    }

    // Save current version before updating
    if (content && content !== chapter.content) {
      await prisma.chapterVersion.create({
        data: {
          chapterId: chapter.id,
          content: chapter.content,
          version: chapter.version,
          createdBy: user.id,
        },
      });
    }

    const updatedChapter = await prisma.chapter.update({
      where: { id: params.chapterId },
      data: {
        ...(title && { title }),
        ...(content !== undefined && { content }),
        ...(status && { status }),
        ...(content && content !== chapter.content && { version: { increment: 1 } }),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
        reviews: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedChapter);
  } catch (error) {
    console.error("Error updating chapter:", error);
    return NextResponse.json(
      { error: "Failed to update chapter" },
      { status: 500 }
    );
  }
}

// DELETE /api/books/[id]/chapters/[chapterId] - Delete a chapter
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; chapterId: string } }
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

    // Check if user can delete (author or owner collaborator)
    const canDelete =
      book.authorId === user.id ||
      book.collaborators.some(
        (c: { userId: string; role: string }) =>
          c.userId === user.id && c.role === "owner"
      );

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.chapter.delete({
      where: { id: params.chapterId, bookId: params.id },
    });

    return NextResponse.json({ message: "Chapter deleted" });
  } catch (error) {
    console.error("Error deleting chapter:", error);
    return NextResponse.json(
      { error: "Failed to delete chapter" },
      { status: 500 }
    );
  }
}
