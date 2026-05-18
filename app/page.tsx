"use client";

import { useAuth } from "@/components/auth-provider";
import { useEffect, useState, useCallback } from "react";
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

  const fetchBooks = useCallback(async () => {
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
  }, [activeTab, user]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden text-center py-20 animated-gradient rounded-[2.5rem] mb-16 shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 px-6">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-white drop-shadow-sm">
            Write <span className="text-indigo-200">Together</span>, <br />
            Publish <span className="text-purple-200">As One</span>
          </h1>
          <p className="text-xl md:text-2xl opacity-90 max-w-3xl mx-auto mb-10 font-medium text-indigo-50 leading-relaxed">
            The ultimate collaborative writing platform. Connect with fellow authors, 
            co-write in real-time, and bring your stories to life with precision.
          </p>
          {!user && (
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/auth/signin"
                className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                Welcome Back
              </Link>
              <Link
                href="/auth/signup"
                className="px-8 py-4 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white rounded-2xl font-bold hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
              >
                Join the Community
              </Link>
            </div>
          )}
        </div>
        {/* Abstract shapes for decoration */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Tabs & Search Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
        <div className="flex bg-gray-100/80 p-1.5 rounded-2xl backdrop-blur-sm border border-gray-200">
          <button
            onClick={() => setActiveTab("discover")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === "discover"
                ? "bg-white text-indigo-600 shadow-md translate-z-0"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Globe className={`w-4 h-4 ${activeTab === "discover" ? "text-indigo-600" : ""}`} />
            Discover
          </button>
          {user && (
            <button
              onClick={() => setActiveTab("my-books")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === "my-books"
                  ? "bg-white text-indigo-600 shadow-md"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Book className={`w-4 h-4 ${activeTab === "my-books" ? "text-indigo-600" : ""}`} />
              My Library
            </button>
          )}
        </div>
        
        {user && (
          <Link
            href="/books/new"
            className="group flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-indigo-200"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            Start New Project
          </Link>
        )}
      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm animate-pulse">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-100"></div>
                <div className="space-y-3 flex-1">
                  <div className="h-4 bg-gray-100 rounded-full w-3/4"></div>
                  <div className="h-3 bg-gray-100 rounded-full w-1/2"></div>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="h-3 bg-gray-100 rounded-full w-full"></div>
                <div className="h-3 bg-gray-100 rounded-full w-5/6"></div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                <div className="h-4 bg-gray-100 rounded-full w-20"></div>
                <div className="h-4 bg-gray-100 rounded-full w-20"></div>
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -z-0"></div>
          <div className="relative z-10">
            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-12">
              <Book className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {activeTab === "my-books" ? "Your library is waiting..." : "The world is quiet right now"}
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-8 text-lg">
              {activeTab === "my-books"
                ? "Every great masterpiece starts with a single word. Today is the day you start yours."
                : "Be the pioneer. Publish the first book and inspire a global community of writers."}
            </p>
            {user && activeTab === "my-books" && (
              <Link
                href="/books/new"
                className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all duration-300 shadow-xl hover:shadow-indigo-200"
              >
                <Plus className="w-5 h-5" />
                Create your first book
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/books/${book.id}`}
              className="group bg-white rounded-[2rem] border border-gray-100 p-8 hover-lift shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/30 rounded-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-150"></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl premium-gradient flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-200">
                      {book.title[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-gray-900 group-hover:text-indigo-600 transition-colors duration-300">
                        {book.title}
                      </h3>
                      <p className="text-sm font-medium text-gray-500">
                        {book.authorName || book.authorEmail}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-xl">
                    {book.isPublic ? (
                      <Globe className="w-5 h-5 text-indigo-500" />
                    ) : (
                      <Lock className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                <p className="text-gray-600 leading-relaxed mb-8 line-clamp-3 font-medium">
                  {book.description || "No description provided for this masterpiece yet."}
                </p>

                <div className="flex items-center justify-between text-sm font-semibold text-gray-400">
                  <div className="flex items-center gap-5">
                    <span className="flex items-center gap-2 group-hover:text-indigo-500 transition-colors">
                      <Book className="w-4 h-4" />
                      {book.chapterCount}
                    </span>
                    <span className="flex items-center gap-2 group-hover:text-purple-500 transition-colors">
                      <Users className="w-4 h-4" />
                      {book.collaboratorCount + 1}
                    </span>
                  </div>
                  <span className="text-xs uppercase tracking-wider">
                    {book.updatedAt ? formatDate(book.updatedAt.toDate?.() || book.updatedAt) : "Recently"}
                  </span>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <span
                    className={`px-4 py-1.5 text-xs font-bold rounded-full tracking-wide uppercase ${
                      book.status === "published"
                        ? "bg-green-100 text-green-700"
                        : book.status === "draft"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {book.status}
                  </span>
                  {book.collaboratorCount > 0 && (
                    <span className="px-4 py-1.5 text-xs font-bold bg-purple-50 text-purple-600 rounded-full tracking-wide uppercase">
                      Team
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modern Features Section */}
      <div className="mt-24 pt-16 border-t border-gray-100">
        <h2 className="text-3xl font-bold text-center mb-16 text-gray-900">Experience Professional Writing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="group bg-white rounded-3xl p-10 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="font-bold text-2xl mb-4">Elite Collaboration</h3>
            <p className="text-gray-600 leading-relaxed text-lg">
              Invite the best minds to your project. Work seamlessly across borders in a distraction-free environment.
            </p>
          </div>
          <div className="group bg-white rounded-3xl p-10 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
              <GitBranch className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="font-bold text-2xl mb-4">Smart Versioning</h3>
            <p className="text-gray-600 leading-relaxed text-lg">
              Never fear an edit. Track every word, branch your chapters, and merge brilliance effortlessly.
            </p>
          </div>
          <div className="group bg-white rounded-3xl p-10 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500">
            <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
              <Globe className="w-8 h-8 text-pink-600" />
            </div>
            <h3 className="font-bold text-2xl mb-4">Global Reach</h3>
            <p className="text-gray-600 leading-relaxed text-lg">
              One click to the world. Publish your work on our platform or export with professional formatting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
