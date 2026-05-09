"use client";

import { useAuth } from "@/components/auth-provider";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Book, Users, GitBranch, Globe, Lock, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getBooks, type Book as BookType, getChapters, getCollaborators } from "@/lib/firestore";

interface BookWithCounts extends BookType {
  chapterCount: number;
  collaboratorCount: number;
}

export default function Home() {
  const { user } = useAuth();
  const [books, setBooks] = useState<BookWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"discover" | "my-books">("discover");

  useEffect(() => {
    fetchBooks();
  }, [activeTab, user]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      if (!user) {
        // Only show public books when not logged in
        if (activeTab === "my-books") {
          setBooks([]);
          return;
        }
      }
      
      const userId = user?.id || "";
      const allBooks = await getBooks(userId);
      
      // Filter based on active tab
      const filteredBooks = activeTab === "my-books" && user
        ? allBooks.filter(b => b.authorId === userId || b.authorEmail === user.email)
        : allBooks.filter(b => b.isPublic || b.status === "published");
      
      // Fetch chapter and collaborator counts for each book
      const booksWithCounts = await Promise.all(
        filteredBooks.map(async (book) => {
          const chapters = await getChapters(book.id!);
          const collaborators = await getCollaborators(book.id!);
          return {
            ...book,
            chapterCount: chapters.length,
            collaboratorCount: collaborators.length,
          };
        })
      );
      
      setBooks(booksWithCounts);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center py-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl mb-12 text-white">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Write Collaboratively Together &amp; Publish Together
        </h1>
        <p className="text-xl opacity-90 max-w-2xl mx-auto">
          Connect with multiple people who share the same passion and interest. 
          Co-author, review chapters, and publish your book as one team.
        </p>
        {!user && (
          <div className="mt-8 flex gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-6 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("discover")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "discover"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Globe className="inline w-4 h-4 mr-2" />
            Discover
          </button>
          {user && (
            <button
              onClick={() => setActiveTab("my-books")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === "my-books"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Book className="inline w-4 h-4 mr-2" />
              My Books
            </button>
          )}
        </div>
        
        {user && (
          <Link
            href="/books/new"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Book
          </Link>
        )}
      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            {activeTab === "my-books" ? "No books yet" : "No public books yet"}
          </h3>
          <p className="text-gray-500">
            {activeTab === "my-books"
              ? "Create your first book to get started!"
              : "Be the first to publish a book!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/books/${book.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {book.title[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition">
                      {book.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      by {book.authorName || book.authorEmail}
                    </p>
                  </div>
                </div>
                {book.isPublic ? (
                  <Globe className="w-4 h-4 text-green-500" />
                ) : (
                  <Lock className="w-4 h-4 text-gray-400" />
                )}
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {book.description || "No description provided"}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Book className="w-4 h-4" />
                    {book.chapterCount} chapters
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {book.collaboratorCount + 1}
                  </span>
                </div>
                <span>{book.updatedAt ? formatDate(book.updatedAt.toDate?.() || book.updatedAt) : "Just now"}</span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    book.status === "published"
                      ? "bg-green-100 text-green-700"
                      : book.status === "draft"
                      ? "bg-gray-100 text-gray-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {book.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Features Section */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Collaborative Writing</h3>
          <p className="text-gray-600">
            Invite co-authors and editors to work together on your book in real-time.
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <GitBranch className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Chapter Reviews</h3>
          <p className="text-gray-600">
            Submit chapters for review, get feedback, and merge changes with version control.
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Globe className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Publish & Share</h3>
          <p className="text-gray-600">
            Make your book public or keep it private. Share with readers worldwide.
          </p>
        </div>
      </div>
    </div>
  );
}
