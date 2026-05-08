import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";
import { getServerSession } from "next-auth/next";

// GET /api/books - List all books (public) or user's books
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get("mine");

    if (mine && session?.user?.email) {
      // Get user's books (both owned and collaborated on)
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const books = await prisma.book.findMany({
        where: {
          OR: [
            { authorId: user.id },
            {
              collaborators: {
                some: { userId: user.id },
              },
            },
          ],
        },
        include: {
          author: {
            select: { id: true, name: true, email: true, image: true },
          },
          chapters: {
            select: { id: true },
          },
          collaborators: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return NextResponse.json(books);
    }

    // Get all public books
    const books = await prisma.book.findMany({
      where: { isPublic: true, status: "published" },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
        chapters: {
          select: { id: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(books);
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
}

// POST /api/books - Create a new book
export async function POST(request: Request) {
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

    const { title, description, isPublic } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let slug = generateSlug(title);
    let counter = 1;
    let finalSlug = slug;

    // Ensure unique slug
    while (await prisma.book.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const book = await prisma.book.create({
      data: {
        title,
        description,
        slug: finalSlug,
        isPublic: isPublic || false,
        authorId: user.id,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    console.error("Error creating book:", error);
    return NextResponse.json(
      { error: "Failed to create book" },
      { status: 500 }
    );
  }
}
