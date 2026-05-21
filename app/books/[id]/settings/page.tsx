"use client";

import { useAuth } from "@/components/auth-provider";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Globe, Lock, AlertTriangle } from "lucide-react";
import { getBook, updateBook, deleteBook, type Book as BookType } from "@/lib/firestore";

export default function BookSettings({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [book, setBook] = useState<BookType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const fetchBookData = useCallback(async () => {
    try {
      const data = await getBook(params.id);
      if (data) {
        setBook(data);
        setTitle(data.title);
        setDescription(data.description || "");
        setIsPublic(data.isPublic);
      }
    } catch (error) {
      console.error("Error fetching book:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchBookData(); }, [fetchBookData]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateBook(params.id, { title, description, isPublic });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!confirm("Are you sure you want to permanently delete this project? All chapters and history will be lost.")) return;
    try {
      await deleteBook(params.id);
      router.push("/");
    } catch (error) {
      console.error("Error deleting book:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <svg className="w-6 h-6 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          Book not found
        </div>
      </div>
    );
  }

  const isAuthor = user?.email === book.authorEmail || user?.id === book.authorId;

  if (!isAuthor) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm mb-4">
          Only the project owner can access settings.
        </div>
        <Link href={`/books/${params.id}`} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to project
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link
        href={`/books/${params.id}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 font-medium mb-8 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to project
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Project settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your project details and preferences</p>
      </div>

      {/* General settings */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">General</h2>
        </div>
        <div className="p-6">
          <form onSubmit={saveSettings} className="space-y-5">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
                Project title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
                <span className="ml-1 text-xs text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Visibility
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                    !isPublic ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Lock className={`w-5 h-5 flex-shrink-0 ${!isPublic ? "text-indigo-600" : "text-gray-400"}`} />
                  <div>
                    <p className={`text-sm font-medium ${!isPublic ? "text-indigo-900" : "text-gray-900"}`}>Private</p>
                    <p className="text-xs text-gray-500 mt-0.5">Only you and collaborators</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                    isPublic ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Globe className={`w-5 h-5 flex-shrink-0 ${isPublic ? "text-indigo-600" : "text-gray-400"}`} />
                  <div>
                    <p className={`text-sm font-medium ${isPublic ? "text-indigo-900" : "text-gray-900"}`}>Public</p>
                    <p className="text-xs text-gray-500 mt-0.5">Visible to everyone</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : "Save changes"}
              </button>
              {saveSuccess && (
                <span className="text-sm text-green-600 font-medium">Changes saved.</span>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-semibold text-red-900">Danger zone</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Delete this project</p>
              <p className="text-sm text-gray-500 mt-1">
                Permanently remove this project and all of its chapters, versions, and collaborator data. This cannot be undone.
              </p>
            </div>
            <button
              onClick={handleDeleteBook}
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
