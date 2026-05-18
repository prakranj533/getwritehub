"use client";

import { useAuth } from "@/components/auth-provider";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Book,
  Users,
  Plus,
  Edit,
  Trash2,
  GitPullRequest,
  Globe,
  Lock,
  ArrowLeft,
  Settings,
} from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  getBook,
  getChapters,
  getCollaborators,
  createChapter,
  deleteChapter,
  addCollaborator,
  removeCollaborator,
  updateBook,
  type Book as BookType,
  type Chapter,
  type Collaborator,
  getReviews
} from "@/lib/firestore";

interface ChapterWithCounts extends Chapter {
  reviewCount: number;
}

interface FullBook extends BookType {
  chapters: ChapterWithCounts[];
  collaborators: Collaborator[];
}


export default function BookPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [book, setBook] = useState<FullBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"chapters" | "collaborators">("chapters");
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");

  const fetchBookData = useCallback(async () => {
    try {
      const b = await getBook(params.id);
      if (!b) {
        setError("Book not found");
        setLoading(false);
        return;
      }

      const chs = await getChapters(params.id);
      const cols = await getCollaborators(params.id);

      // fetch review counts
      const chaptersWithReviews = await Promise.all(
        chs.map(async (ch) => {
          const revs = await getReviews(ch.id!, params.id);
          return { ...ch, reviewCount: revs.length };
        })
      );

      setBook({
        ...b,
        chapters: chaptersWithReviews,
        collaborators: cols,
      });
    } catch (error) {
      console.error("Error loading book:", error);
      setError("Failed to load book");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchBookData();
  }, [fetchBookData]);

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterTitle || !user) return;

    try {
      const newCh = await createChapter({
        bookId: params.id,
        title: chapterTitle,
        content: "",
        order: book ? book.chapters.length : 0,
        status: "draft",
        authorId: user.id,
        authorEmail: user.email || "",
        authorName: user.name || user.email || "Unknown",
        version: 1,
      });
      setChapterTitle("");
      setShowAddChapter(false);
      router.push(`/books/${params.id}/chapters/${newCh.id}`);
    } catch (error) {
      console.error("Error creating chapter:", error);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm("Are you sure you want to delete this chapter?")) return;

    try {
      await deleteChapter(chapterId, params.id);
      fetchBookData();
    } catch (error) {
      console.error("Error deleting chapter:", error);
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaboratorEmail) return;

    try {
      await addCollaborator({
        bookId: params.id,
        userId: collaboratorEmail, 
        userEmail: collaboratorEmail,
        userName: collaboratorEmail.split("@")[0],
        role: "editor",
      });

      setCollaboratorEmail("");
      setShowAddCollaborator(false);
      fetchBookData();
    } catch (error) {
      console.error("Error adding collaborator:", error);
      alert("Failed to add collaborator");
    }
  };

  const handleRemoveCollaborator = async (collabId: string) => {
    if (!confirm("Remove this collaborator?")) return;

    try {
      await removeCollaborator(collabId, params.id);
      fetchBookData();
    } catch (error) {
      console.error("Error removing collaborator:", error);
    }
  };

  const handlePublishBook = async () => {
    if (!confirm("Publish this book? It will be visible to everyone.")) return;

    try {
      await updateBook(params.id, { status: "published", isPublic: true });
      fetchBookData();
    } catch (error) {
      console.error("Error publishing book:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error || "Book not found"}
        </div>
        <Link href="/" className="text-indigo-600 hover:underline mt-4 inline-block">
          Back to home
        </Link>
      </div>
    );
  }

  const isAuthor = user?.email === book.authorEmail || user?.id === book.authorId;
  const isCollaborator = book.collaborators.some(
    (c) => c.userEmail === user?.email || c.userId === user?.id
  );
  const canEdit = isAuthor || isCollaborator;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header Section */}
      <div className="mb-12">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to Library
        </Link>

        <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
          <div className="flex flex-col md:flex-row items-start gap-8 flex-1">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] premium-gradient flex items-center justify-center text-white text-4xl sm:text-5xl font-black shadow-2xl shadow-indigo-200 rotate-3">
              {book.title[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">{book.title}</h1>
                <div className="bg-gray-100/80 backdrop-blur-sm p-2 rounded-2xl border border-gray-200">
                  {book.isPublic ? (
                    <Globe className="w-6 h-6 text-indigo-500" />
                  ) : (
                    <Lock className="w-6 h-6 text-gray-400" />
                  )}
                </div>
              </div>
              <p className="text-xl text-gray-500 font-medium max-w-3xl leading-relaxed mb-6">
                {book.description || "No description provided for this work."}
              </p>
              <div className="flex flex-wrap items-center gap-6 text-sm font-bold">
                <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-[10px]">
                    {book.authorName?.[0] || book.authorEmail[0]}
                  </div>
                  {book.authorName || book.authorEmail}
                </div>
                <div className="text-gray-400 uppercase tracking-widest text-xs">
                  Last Updated {book.updatedAt ? formatDate(book.updatedAt) : "Recently"}
                </div>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-3 w-full lg:w-auto">
              {isAuthor && book.status !== "published" && (
                <button
                  onClick={handlePublishBook}
                  className="flex-1 lg:flex-none px-8 py-4 bg-green-600 text-white rounded-2xl font-black hover:bg-green-700 transition-all duration-300 shadow-xl shadow-green-100 transform hover:scale-105"
                >
                  Publish Story
                </button>
              )}
              <Link
                href={`/books/${book.id}/settings`}
                className="p-4 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md group"
              >
                <Settings className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 group-hover:rotate-90 transition-all duration-500" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="bg-gray-100/80 backdrop-blur-sm p-2 rounded-[2rem] border border-gray-200 mb-10 flex gap-2 w-fit">
        <button
          onClick={() => setActiveTab("chapters")}
          className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] font-bold transition-all duration-300 ${
            activeTab === "chapters"
              ? "bg-white text-indigo-600 shadow-lg"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <Book className={`w-5 h-5 ${activeTab === "chapters" ? "text-indigo-600" : ""}`} />
          Chapters
          <span className={`px-2 py-0.5 rounded-lg text-xs ${activeTab === "chapters" ? "bg-indigo-50 text-indigo-600" : "bg-gray-200 text-gray-500"}`}>
            {book.chapters.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("collaborators")}
          className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] font-bold transition-all duration-300 ${
            activeTab === "collaborators"
              ? "bg-white text-indigo-600 shadow-lg"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <Users className={`w-5 h-5 ${activeTab === "collaborators" ? "text-indigo-600" : ""}`} />
          The Team
          <span className={`px-2 py-0.5 rounded-lg text-xs ${activeTab === "collaborators" ? "bg-indigo-50 text-indigo-600" : "bg-gray-200 text-gray-500"}`}>
            {book.collaborators.length + 1}
          </span>
        </button>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 gap-8">
        {/* Chapters Tab Content */}
        {activeTab === "chapters" && (
          <div className="space-y-6">
            {canEdit && (
              <div className="space-y-4">
                <button
                  onClick={() => setShowAddChapter(!showAddChapter)}
                  className="group flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-[2rem] font-black hover:bg-indigo-700 transition-all duration-300 shadow-xl shadow-indigo-100 transform hover:scale-105"
                >
                  <Plus className={`w-6 h-6 transition-transform duration-300 ${showAddChapter ? "rotate-45" : "group-hover:rotate-90"}`} />
                  {showAddChapter ? "Cancel Drafting" : "Draft New Chapter"}
                </button>

                {showAddChapter && (
                  <form
                    onSubmit={handleAddChapter}
                    className="p-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col sm:flex-row gap-4 animate-in slide-in-from-top-4 duration-300"
                  >
                    <input
                      type="text"
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      placeholder="Enter chapter title..."
                      className="flex-1 px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 font-bold text-gray-900"
                      required
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs"
                    >
                      Begin Chapter
                    </button>
                  </form>
                )}
              </div>
            )}

            {book.chapters.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-gray-200">
                <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 rotate-12">
                  <Book className="w-10 h-10 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No chapters yet</h3>
                <p className="text-gray-500 text-lg">Every great saga begins with Chapter One.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {book.chapters.map((chapter, index) => (
                  <div
                    key={chapter.id}
                    className="group bg-white rounded-[2.5rem] border border-gray-100 p-8 hover-lift shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <span className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                          {index + 1}
                        </span>
                        <div className="flex gap-2">
                          <span
                            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full ${
                              chapter.status === "published"
                                ? "bg-green-100 text-green-700"
                                : chapter.status === "review"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {chapter.status}
                          </span>
                        </div>
                      </div>
                      
                      <Link
                        href={`/books/${book.id}/chapters/${chapter.id}`}
                        className="block mb-4"
                      >
                        <h3 className="text-2xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {chapter.title}
                        </h3>
                      </Link>
                      
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-8">
                        <span>{chapter.updatedAt ? formatRelativeTime(chapter.updatedAt) : "Just now"}</span>
                        {chapter.reviewCount > 0 && (
                          <span className="flex items-center gap-1.5 text-amber-500">
                            <GitPullRequest className="w-4 h-4" />
                            {chapter.reviewCount} Reviews
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                      <Link
                        href={`/books/${book.id}/chapters/${chapter.id}`}
                        className="text-sm font-black text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                      >
                        Open Editor
                      </Link>
                      
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/books/${book.id}/chapters/${chapter.id}`}
                            className="p-3 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <Edit className="w-5 h-5" />
                          </Link>
                          {isAuthor && (
                            <button
                              onClick={() => handleDeleteChapter(chapter.id!)}
                              className="p-3 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* The Team Tab Content */}
        {activeTab === "collaborators" && (
          <div className="max-w-4xl">
            {isAuthor && (
              <button
                onClick={() => setShowAddCollaborator(!showAddCollaborator)}
                className="mb-10 px-8 py-4 bg-indigo-600 text-white rounded-[2rem] font-black hover:bg-indigo-700 transition-all duration-300 shadow-xl shadow-indigo-100"
              >
                + Invite Collaborator
              </button>
            )}

            {showAddCollaborator && (
              <form
                onSubmit={handleAddCollaborator}
                className="mb-10 p-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col sm:flex-row gap-4"
              >
                <input
                  type="email"
                  value={collaboratorEmail}
                  onChange={(e) => setCollaboratorEmail(e.target.value)}
                  placeholder="Collaborator's email address"
                  className="flex-1 px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 font-medium"
                  required
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all"
                  >
                    Send Invitation
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCollaborator(false)}
                    className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Author Card */}
              <div className="bg-white rounded-[2.5rem] border-2 border-indigo-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-[1.5rem] premium-gradient flex items-center justify-center text-white text-xl font-black shadow-lg">
                    {book.authorName?.[0] || book.authorEmail[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-xl text-gray-900 truncate">
                      {book.authorName || book.authorEmail?.split('@')[0]}
                    </p>
                    <p className="text-sm font-bold text-indigo-500 uppercase tracking-widest mt-1">Project Lead</p>
                  </div>
                </div>
              </div>

              {/* Collaborator Cards */}
              {book.collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-gray-100 flex items-center justify-center text-gray-500 text-xl font-black group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-500">
                      {collab.userName?.[0] || collab.userEmail[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-black text-xl text-gray-900 truncate">
                          {collab.userName || collab.userEmail?.split('@')[0]}
                        </p>
                        {isAuthor && (
                          <button
                            onClick={() => handleRemoveCollaborator(collab.id!)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1 capitalize">{collab.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
