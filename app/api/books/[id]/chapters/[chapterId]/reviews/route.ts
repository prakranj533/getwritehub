import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

// POST /api/books/[id]/chapters/[chapterId]/reviews - Create a review
export async function POST(
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

    // Check if user can review (any collaborator or author)
    const canReview =
      book.authorId === user.id ||
      book.collaborators.some(
        (c: { userId: string }) => c.userId === user.id
      );

    if (!canReview) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: params.chapterId, bookId: params.id },
    });

    if (!chapter) {
      return NextResponse.json(
        { error: "Chapter not found" },
        { status: 404 }
      );
    }

    const { status, comment, lineComments } = await request.json();

    // Check if review already exists from this user
    const existingReview = await prisma.review.findFirst({
      where: {
        chapterId: params.chapterId,
        reviewerId: user.id,
      },
    });

    let review;
    if (existingReview) {
      review = await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          status: status || existingReview.status,
          comment: comment || existingReview.comment,
          lineComments: lineComments
            ? JSON.stringify(lineComments)
            : existingReview.lineComments,
        },
        include: {
          reviewer: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });
    } else {
      review = await prisma.review.create({
        data: {
          chapterId: params.chapterId,
          reviewerId: user.id,
          status: status || "pending",
          comment,
          lineComments: lineComments ? JSON.stringify(lineComments) : null,
        },
        include: {
          reviewer: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });
    }

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}

// GET /api/books/[id]/chapters/[chapterId]/reviews - Get all reviews
export async function GET(
  request: Request,
  { params }: { params: { id: string; chapterId: string } }
) {
  try {
    const session = await getServerSession();

    const book = await prisma.book.findUnique({
      where: { id: params.id },
      include: { collaborators: { include: { user: true } } },
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

    const reviews = await prisma.review.findMany({
      where: { chapterId: params.chapterId },
      include: {
        reviewer: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
