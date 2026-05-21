"use client";

import { useAuth } from "@/components/auth-provider";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BookOpen, Globe, Lock, Plus, ArrowRight, Clock, FileText, GitBranch, CheckCircle, Users } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { getBooks, type Book as BookType } from "@/lib/firestore";

const STATUS_STYLES: Record<string, string> = {
  published: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
  draft:     "bg-gray-50 text-gray-500 ring-1 ring-gray-400/20",
  review:    "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
};

/* ── Product preview — shown on hero ── */
function ProductPreview() {
  const mockChapters = [
    { name: "Chapter 1 — The Arrival",     status: "published", time: "3 days ago",  reviews: 2 },
    { name: "Chapter 2 — Old Wounds",      status: "review",    time: "1 day ago",   reviews: 1 },
    { name: "Chapter 3 — Into the Deep",   status: "draft",     time: "4 hours ago", reviews: 0 },
  ];

  const statusColor: Record<string, string> = {
    published: "text-green-600 bg-green-50",
    review:    "text-amber-600 bg-amber-50",
    draft:     "text-gray-500 bg-gray-100",
  };

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xl">
      {/* Project header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            T
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">The Lost Chronicles</span>
              <span className="text-[10px] border border-gray-300 text-gray-500 rounded-full px-1.5 py-0.5 flex items-center gap-0.5 font-medium">
                <Globe className="w-2 h-2" /> Public
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">sarah.chen / 12 chapters · 3 contributors</p>
          </div>
        </div>
        <div className="px-2.5 py-1 text-[10px] font-semibold text-green-700 bg-green-50 rounded-full ring-1 ring-green-600/20">
          published
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-5 border-b border-gray-100 gap-0">
        <div className="flex items-center gap-1.5 px-1 py-2.5 text-xs font-semibold text-gray-900 border-b-2 border-orange-500 mr-3">
          <FileText className="w-3 h-3" /> Chapters <span className="ml-1 bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 text-[9px]">12</span>
        </div>
        <div className="flex items-center gap-1.5 px-1 py-2.5 text-xs text-gray-400">
          <Users className="w-3 h-3" /> Contributors <span className="ml-1 bg-gray-100 text-gray-400 rounded-full px-1.5 py-0.5 text-[9px]">3</span>
        </div>
      </div>

      {/* About panel */}
      <div className="px-5 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-1.5 mb-1">
          <FileText className="w-3 h-3 text-gray-400" />
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">About</span>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">
          A mystery thriller following Detective Lena Cross as she uncovers a decades-old conspiracy buried in a small coastal town.
        </p>
      </div>

      {/* Chapter file tree */}
      <div className="divide-y divide-gray-50">
        {mockChapters.map((ch, i) => (
          <div key={i} className={`flex items-center gap-3 px-5 py-2.5 ${i === 1 ? "bg-amber-50/40" : ""}`}>
            <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="flex-1 text-xs text-indigo-600 font-medium truncate">{ch.name}</span>
            <div className="flex items-center gap-3 flex-shrink-0">
              {ch.reviews > 0 && (
                <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                  <GitBranch className="w-3 h-3" /> {ch.reviews}
                </span>
              )}
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${statusColor[ch.status]}`}>
                {ch.status}
              </span>
              <span className="text-[10px] text-gray-400 w-20 text-right">{ch.time}</span>
            </div>
          </div>
        ))}
        <div className="px-5 py-2 text-center">
          <span className="text-[10px] text-gray-400">9 more chapters...</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [books, setBooks] = useState<BookType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"discover" | "my-books">("discover");

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === "my-books") {
        if (!user) { setBooks([]); return; }
        setBooks(await getBooks(user.id || ""));
      } else {
        setBooks(await getBooks(""));
      }
    } catch (err) {
      console.error("Error fetching books:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero — two column, clean white ── */}
      <section className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-14 items-center">

            {/* Left */}
            <div>
              <h1 className="text-[2.75rem] sm:text-[3.25rem] font-bold text-gray-900 tracking-tight leading-[1.08] mb-5">
                The writing workspace<br />
                <span className="text-indigo-600">for serious teams.</span>
              </h1>

              <p className="text-[1.0625rem] text-gray-500 leading-relaxed mb-8 max-w-[420px]">
                WriteHub lets your team co-author books, review chapters, track every change, and publish — without scattered docs and messy email threads.
              </p>

              {/* CTA */}
              {!user ? (
                <div className="flex flex-wrap items-center gap-3 mb-10">
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    Get started free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/auth/signin"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
              ) : (
                <div className="mb-10">
                  <Link
                    href="/books/new"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New project
                  </Link>
                </div>
              )}

              {/* Feature checklist — more personal than icon cards */}
              <ul className="space-y-2.5">
                {[
                  "Public & private book projects",
                  "Chapter-level version history",
                  "Team review & approval workflow",
                  "AI writing assistant built in",
                  "Offline editing with auto-sync",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — product preview */}
            <div className="hidden lg:block">
              <ProductPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── Project list ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Tab bar + action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button
              onClick={() => setActiveTab("discover")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "discover"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Explore
            </button>
            {user && (
              <button
                onClick={() => setActiveTab("my-books")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${
                  activeTab === "my-books"
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                My library
              </button>
            )}
          </div>

          {user && (
            <Link
              href="/books/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New project
            </Link>
          )}
        </div>

        {/* Books */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-3.5 bg-gray-100 rounded w-48" />
                  <div className="h-5 bg-gray-100 rounded-full w-14 ml-1" />
                </div>
                <div className="h-3 bg-gray-100 rounded w-2/3 mb-4" />
                <div className="flex gap-4">
                  <div className="h-3 bg-gray-100 rounded w-20" />
                  <div className="h-3 bg-gray-100 rounded w-20" />
                  <div className="h-3 bg-gray-100 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200 border-dashed text-center">
            <div className="w-12 h-12 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              {activeTab === "my-books" ? "No projects yet" : "No public projects"}
            </h3>
            <p className="text-sm text-gray-500 mb-5 max-w-xs">
              {activeTab === "my-books"
                ? "Create your first project and start writing."
                : "Be the first to share a public project."}
            </p>
            {user && activeTab === "my-books" && (
              <Link
                href="/books/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New project
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span className="text-sm font-semibold text-indigo-600 group-hover:text-indigo-700 truncate">
                        {book.authorName || book.authorEmail?.split("@")[0]}
                        <span className="text-gray-400 font-normal mx-0.5">/</span>
                        {book.title}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border border-gray-300 text-gray-600 bg-white flex-shrink-0">
                      {book.isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                      {book.isPublic ? "Public" : "Private"}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ${STATUS_STYLES[book.status] || STATUS_STYLES.draft}`}>
                      {book.status}
                    </span>
                  </div>

                  {book.description && (
                    <p className="text-sm text-gray-500 line-clamp-1 mb-2 ml-6">{book.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-400 ml-6 flex-wrap">
                    <span className="text-gray-400">by {book.authorName || book.authorEmail?.split("@")[0]}</span>
                    {book.updatedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Updated {formatRelativeTime(book.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── Features — horizontal list, not 3 identical cards ── */}
        <div className="mt-20 pt-14 border-t border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-3">
                Built for the whole writing team
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                From solo authors to publishing houses — WriteHub adapts to how your team works.
              </p>
              {!user && (
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Start for free
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            <div className="space-y-0 rounded-xl border border-gray-200 overflow-hidden bg-white divide-y divide-gray-100">
              {[
                {
                  num: "01",
                  title: "Public & private projects",
                  desc: "Keep drafts private to your team or open them up to the world with one click.",
                },
                {
                  num: "02",
                  title: "Chapter versioning",
                  desc: "Every save is a checkpoint. Browse history, restore any version, compare changes over time.",
                },
                {
                  num: "03",
                  title: "Review workflow",
                  desc: "Submit for peer review. Approve or request changes per chapter, with threaded comments.",
                },
                {
                  num: "04",
                  title: "Offline & auto-sync",
                  desc: "Write without internet. Changes save locally and sync automatically when you're back online.",
                },
              ].map((f) => (
                <div key={f.num} className="flex items-start gap-5 p-5">
                  <span className="text-sm font-bold text-gray-300 flex-shrink-0 mt-0.5 w-6">{f.num}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">{f.title}</p>
                    <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
