import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  // Create demo users
  const user1 = await prisma.user.create({
    data: {
      name: "Demo Author",
      email: "author@example.com",
      password: await bcrypt.hash("password123", 10),
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: "Demo Collaborator",
      email: "collaborator@example.com",
      password: await bcrypt.hash("password123", 10),
    },
  });

  // Create a demo book
  const book = await prisma.book.create({
    data: {
      title: "The Art of Writing",
      description: "A comprehensive guide to writing great stories",
      slug: "the-art-of-writing",
      isPublic: true,
      status: "published",
      authorId: user1.id,
    },
  });

  // Add collaborator
  await prisma.collaborator.create({
    data: {
      bookId: book.id,
      userId: user2.id,
      role: "editor",
    },
  });

  // Create chapters
  const chapter1 = await prisma.chapter.create({
    data: {
      title: "Introduction",
      content: `# Introduction to Writing

Writing is an art form that has been practiced for thousands of years. In this book, we will explore the fundamentals of storytelling, character development, and narrative structure.

## Why Write?

Writing allows us to:
- Express our thoughts and ideas
- Share stories with others
- Preserve knowledge for future generations
- Connect with readers across time and space`,
      order: 1,
      status: "published",
      bookId: book.id,
      authorId: user1.id,
    },
  });

  const chapter2 = await prisma.chapter.create({
    data: {
      title: "Character Development",
      content: `# Character Development

Great stories are built around compelling characters. In this chapter, we'll explore techniques for creating memorable protagonists and antagonists.

## The Protagonist

Your main character should have:
- Clear motivations
- Internal conflicts
- Room for growth
- Relatable flaws`,
      order: 2,
      status: "published",
      bookId: book.id,
      authorId: user2.id,
    },
  });

  // Create a draft chapter for review
  const chapter3 = await prisma.chapter.create({
    data: {
      title: "Plot Structure (Draft)",
      content: `# Plot Structure

[This chapter is currently being written and will be submitted for review soon.]

Key concepts to cover:
- Three-act structure
- Rising action and climax
- Resolution and denouement`,
      order: 3,
      status: "draft",
      bookId: book.id,
      authorId: user1.id,
    },
  });

  console.log("Database seeded successfully!");
  console.log("\nDemo accounts:");
  console.log("- author@example.com / password123 (Book owner)");
  console.log("- collaborator@example.com / password123 (Editor)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
