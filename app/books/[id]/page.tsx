"use client";

import { useAuth } from "@/components/auth-provider";
import { useEffect, useState } from "react";
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

  const fetchBookData = async () => {
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
          const revs = await getReviews(ch.id!);
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
  };

  useEffect(() => {
    fetchBookData();
  }, [params.id]);

  const handleAddChapter = async () => {
    const title = prompt("Chapter title:");
    if (!title || !user) return;

    try {
      const newCh = await createChapter({
        bookId: params.id,
        title,
        content: "",
        order: book ? book.chapters.length : 0,
        status: "draft",
        authorId: user.id,
        authorEmail: user.email || "",
        authorName: user.name || user.email || "Unknown",
        version: 1,
      });
      router.push(`/books/${params.id}/chapters/${newCh.id}`);
    } catch (error) {
      console.error("Error creating chapter:", error);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm("Are you sure you want to delete this chapter?")) return;

    try {
      await deleteChapter(chapterId);
      fetchBookData();
    } catch (error) {
      console.error("Error deleting chapter:", error);
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaboratorEmail) return;

    try {
      // In a real app we'd look up the user ID by email. Here we just mock it for Firebase.
      // Firestore structure allows adding without strict user lookup, we'll store email.
      await addCollaborator({
        bookId: params.id,
        userId: collaboratorEmail, // Since we don't have the user ID, we'll use email as ID. 
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
      await removeCollaborator(collabId);
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to books
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
              {book.title[0]}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-gray-900">{book.title}</h1>
                {book.isPublic ? (
                  <Globe className="w-5 h-5 text-green-500" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <p className="text-gray-600 max-w-2xl">{book.description}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>by {book.authorName || book.authorEmail}</span>
                <span>•</span>
                <span>Updated {book.updatedAt ? formatDate(book.updatedAt.toDate?.() || book.updatedAt) : "Just now"}</span>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="flex gap-2">
              {isAuthor && book.status !== "published" && (
                <button
                  onClick={handlePublishBook}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                >
                  Publish
                </button>
              )}
              <Link
                href={`/books/${book.id}/settings`}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("chapters")}
            className={`pb-3 font-medium border-b-2 transition ${
              activeTab === "chapters"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Book className="inline w-4 h-4 mr-2" />
            Chapters ({book.chapters.length})
          </button>
          <button
            onClick={() => setActiveTab("collaborators")}
            className={`pb-3 font-medium border-b-2 transition ${
              activeTab === "collaborators"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Users className="inline w-4 h-4 mr-2" />
            Collaborators ({book.collaborators.length + 1})
          </button>
        </div>
      </div>

      {/* Chapters Tab */}
      {activeTab === "chapters" && (
        <div>
          {canEdit && (
            <button
              onClick={handleAddChapter}
              className="mb-6 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Chapter
            </button>
          )}

          {book.chapters.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No chapters yet</p>
              {canEdit && (
                <p className="text-gray-500 mt-2">Click &quot;Add Chapter&quot; to get started</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {book.chapters.map((chapter, index) => (
                <div
                  key={chapter.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/books/${book.id}/chapters/${chapter.id}`}
                      className="flex-1"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-medium text-gray-600">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-semibold text-gray-900 hover:text-indigo-600 transition">
                            {chapter.title}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>{chapter.updatedAt ? formatRelativeTime(chapter.updatedAt.toDate?.() || chapter.updatedAt) : "Just now"}</span>
                            {chapter.reviewCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <GitPullRequest className="w-3 h-3" />
                                  {chapter.reviewCount} reviews
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          chapter.status === "published"
                            ? "bg-green-100 text-green-700"
                            : chapter.status === "review"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {chapter.status}
                      </span>
                      {canEdit && (
                        <>
                          <Link
                            href={`/books/${book.id}/chapters/${chapter.id}`}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <Edit className="w-4 h-4 text-gray-500" />
                          </Link>
                          {isAuthor && (
                            <button
                              onClick={() => handleDeleteChapter(chapter.id!)}
                              className="p-2 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collaborators Tab */}
      {activeTab === "collaborators" && (
        <div>
          {isAuthor && (
            <button
              onClick={() => setShowAddCollaborator(!showAddCollaborator)}
              className="mb-6 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              + Add Collaborator
            </button>
          )}

          {showAddCollaborator && (
            <form
              onSubmit={handleAddCollaborator}
              className="mb-6 p-4 bg-gray-50 rounded-lg flex gap-3"
            >
              <input
                type="email"
                value={collaboratorEmail}
                onChange={(e) => setCollaboratorEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddCollaborator(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
            </form>
          )}

          <div className="space-y-3">
            {/* Author */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium">
                  {book.authorName?.[0] || book.authorEmail[0]}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {book.authorName || book.authorEmail}
                  </p>
                  <p className="text-sm text-gray-500">{book.authorEmail}</p>
                </div>
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                  Owner
                </span>
              </div>
            </div>

            {/* Collaborators */}
            {book.collaborators.map((collab) => (
              <div
                key={collab.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-medium">
                    {collab.userName?.[0] || collab.userEmail[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {collab.userName || collab.userEmail}
                    </p>
                    <p className="text-sm text-gray-500">{collab.userEmail}</p>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium capitalize">
                    {collab.role}
                  </span>
                  {isAuthor && (
                    <button
                      onClick={() => handleRemoveCollaborator(collab.id!)}
                      className="p-2 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
