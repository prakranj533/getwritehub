"use client";

import { useAuth } from "@/components/auth-provider";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Plus,
  Edit,
  Trash2,
  GitPullRequest,
  Globe,
  Lock,
  ArrowLeft,
  Settings,
  Clock,
  GitBranch,
  FileText,
  AlertCircle,
  CheckCircle,
  User,
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
  getReviews,
} from "@/lib/firestore";

interface ChapterWithCounts extends Chapter {
  reviewCount: number;
}

interface FullBook extends BookType {
  chapters: ChapterWithCounts[];
  collaborators: Collaborator[];
}

const STATUS_STYLES: Record<string, { pill: string; dot: string }> = {
  published: { pill: "bg-green-50 text-green-700 ring-1 ring-green-600/20", dot: "bg-green-500" },
  draft:     { pill: "bg-gray-50 text-gray-500 ring-1 ring-gray-400/20",   dot: "bg-gray-400" },
  review:    { pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20", dot: "bg-amber-500" },
};

export default function BookPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [book, setBook] = useState<FullBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"chapters" | "contributors">("chapters");
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");

  const fetchBookData = useCallback(async () => {
    try {
      const b = await getBook(params.id);
      if (!b) { setError("Project not found"); setLoading(false); return; }

      const [chs, cols] = await Promise.all([getChapters(params.id), getCollaborators(params.id)]);

      const chaptersWithReviews = await Promise.all(
        chs.map(async (ch) => {
          const revs = await getReviews(ch.id!, params.id);
          return { ...ch, reviewCount: revs.length };
        })
      );

      setBook({ ...b, chapters: chaptersWithReviews, collaborators: cols });
    } catch (err) {
      console.error("Error loading book:", err);
      setError("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchBookData(); }, [fetchBookData]);

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
    } catch (err) { console.error("Error creating chapter:", err); }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm("Delete this chapter? This cannot be undone.")) return;
    try {
      await deleteChapter(chapterId, params.id);
      fetchBookData();
    } catch (err) { console.error("Error deleting chapter:", err); }
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
    } catch (err) {
      console.error("Error adding collaborator:", err);
      alert("Failed to add collaborator.");
    }
  };

  const handleRemoveCollaborator = async (collabId: string) => {
    if (!confirm("Remove this contributor?")) return;
    try {
      await removeCollaborator(collabId, params.id);
      fetchBookData();
    } catch (err) { console.error("Error removing collaborator:", err); }
  };

  const handlePublishBook = async () => {
    if (!confirm("Publish this book? It will be visible to everyone.")) return;
    try {
      await updateBook(params.id, { status: "published", isPublic: true });
      fetchBookData();
    } catch (err) { console.error("Error publishing book:", err); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <svg className="w-5 h-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error || "Project not found"}
        </div>
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to explore
        </Link>
      </div>
    );
  }

  const isAuthor = user?.email === book.authorEmail || user?.id === book.authorId;
  const isCollaborator = book.collaborators.some((c) => c.userEmail === user?.email || c.userId === user?.id);
  const canEdit = isAuthor || isCollaborator;
  const allContributors = [
    { id: "author", name: book.authorName || book.authorEmail?.split("@")[0] || "Author", email: book.authorEmail, role: "owner" as const },
    ...book.collaborators.map((c) => ({ id: c.id!, name: c.userName || c.userEmail?.split("@")[0] || "Unknown", email: c.userEmail, role: c.role as string })),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Project header ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 py-3 text-sm border-b border-gray-100">
            <Link href="/" className="text-gray-500 hover:text-gray-900 transition-colors">
              Explore
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500">{book.authorName || book.authorEmail?.split("@")[0]}</span>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-900">{book.title}</span>
            <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border border-gray-300 text-gray-600 bg-white">
              {book.isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
              {book.isPublic ? "Public" : "Private"}
            </span>
          </div>

          {/* Repo title + actions */}
          <div className="flex items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg brand-gradient flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {book.title[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">{book.title}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${STATUS_STYLES[book.status]?.pill || STATUS_STYLES.draft.pill}`}>
                    {book.status}
                  </span>
                  {book.updatedAt && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Updated {formatRelativeTime(book.updatedAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {isAuthor && book.status !== "published" && (
                  <button
                    onClick={handlePublishBook}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-semibold hover:bg-green-700 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Publish
                  </button>
                )}
                <Link
                  href={`/books/${book.id}/settings`}
                  className="p-1.5 border border-gray-200 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 -mb-px">
            {[
              { key: "chapters", label: "Chapters", icon: <FileText className="w-3.5 h-3.5" />, count: book.chapters.length },
              { key: "contributors", label: "Contributors", icon: <Users className="w-3.5 h-3.5" />, count: book.collaborators.length + 1 },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-orange-500 text-gray-900"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full font-medium">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Description / README panel */}
        {book.description && (
          <div className="bg-white rounded-xl border border-gray-200 mb-5">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500">About</span>
            </div>
            <p className="px-4 py-3 text-sm text-gray-700 leading-relaxed">{book.description}</p>
            <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                {book.chapters.length} chapter{book.chapters.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {allContributors.length} contributor{allContributors.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                {book.chapters.reduce((acc) => acc, 0)} versions
              </span>
            </div>
          </div>
        )}

        {/* ── Chapters tab ── */}
        {activeTab === "chapters" && (
          <div className="space-y-4">
            {canEdit && (
              <>
                {!showAddChapter ? (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {book.chapters.length} chapter{book.chapters.length !== 1 ? "s" : ""}
                    </p>
                    <button
                      onClick={() => setShowAddChapter(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add chapter
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleAddChapter}
                    className="flex items-center gap-2 bg-white border border-indigo-200 rounded-lg px-4 py-2.5 shadow-sm"
                  >
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      placeholder="New chapter title..."
                      className="flex-1 text-sm border-none outline-none text-gray-900 placeholder:text-gray-400 bg-transparent"
                      required
                      autoFocus
                    />
                    <div className="flex items-center gap-1.5">
                      <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 transition-colors">
                        Create
                      </button>
                      <button type="button" onClick={() => { setShowAddChapter(false); setChapterTitle(""); }} className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-md text-xs font-semibold hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {book.chapters.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 border-dashed flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">No chapters yet</p>
                <p className="text-sm text-gray-500">Create your first chapter to start the story.</p>
              </div>
            ) : (
              /* File tree */
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* File tree header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full brand-gradient flex items-center justify-center text-[9px] font-bold text-white">
                        {(book.authorName?.[0] || book.authorEmail[0]).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-700">{book.authorName || book.authorEmail?.split("@")[0]}</span>
                    </div>
                    <span className="text-gray-300">·</span>
                    <span>{book.chapters.length} chapter{book.chapters.length !== 1 ? "s" : ""}</span>
                  </div>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {book.updatedAt ? formatRelativeTime(book.updatedAt) : "Recently updated"}
                  </span>
                </div>

                {/* Chapter rows */}
                <div className="divide-y divide-gray-100">
                  {book.chapters.map((chapter, index) => {
                    const chStatus = STATUS_STYLES[chapter.status] || STATUS_STYLES.draft;
                    return (
                      <div key={chapter.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />

                        <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                          <Link
                            href={`/books/${book.id}/chapters/${chapter.id}`}
                            className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline font-medium truncate"
                          >
                            {chapter.title}
                          </Link>

                          {/* Chapter meta */}
                          <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                            {chapter.reviewCount > 0 && (
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <GitPullRequest className="w-3.5 h-3.5" />
                                {chapter.reviewCount}
                              </span>
                            )}
                            <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${chStatus.pill}`}>
                              {chapter.status}
                            </span>
                            <span className="text-xs text-gray-400 w-24 text-right">
                              {chapter.updatedAt ? formatRelativeTime(chapter.updatedAt) : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Actions — show on hover */}
                        {canEdit && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <Link
                              href={`/books/${book.id}/chapters/${chapter.id}`}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Link>
                            {isAuthor && (
                              <button
                                onClick={() => handleDeleteChapter(chapter.id!)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Contributors tab ── */}
        {activeTab === "contributors" && (
          <div className="space-y-4">
            {isAuthor && (
              <>
                {!showAddCollaborator ? (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">{allContributors.length} contributor{allContributors.length !== 1 ? "s" : ""}</p>
                    <button
                      onClick={() => setShowAddCollaborator(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add contributor
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleAddCollaborator}
                    className="flex items-center gap-2 bg-white border border-indigo-200 rounded-lg px-4 py-2.5 shadow-sm"
                  >
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="email"
                      value={collaboratorEmail}
                      onChange={(e) => setCollaboratorEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="flex-1 text-sm border-none outline-none text-gray-900 placeholder:text-gray-400 bg-transparent"
                      required
                      autoFocus
                    />
                    <div className="flex items-center gap-1.5">
                      <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 transition-colors">
                        Invite
                      </button>
                      <button type="button" onClick={() => { setShowAddCollaborator(false); setCollaboratorEmail(""); }} className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-md text-xs font-semibold hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {allContributors.map((contributor) => (
                <div key={contributor.id} className="flex items-center gap-3 px-4 py-3 group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    contributor.role === "owner" ? "brand-gradient text-white" : "bg-gray-100 text-gray-600"
                  }`}>
                    {contributor.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{contributor.name}</p>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                        contributor.role === "owner"
                          ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20"
                          : "bg-gray-50 text-gray-600 ring-1 ring-gray-400/20"
                      }`}>
                        {contributor.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{contributor.email}</p>
                  </div>
                  {isAuthor && contributor.role !== "owner" && (
                    <button
                      onClick={() => handleRemoveCollaborator(contributor.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove contributor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
