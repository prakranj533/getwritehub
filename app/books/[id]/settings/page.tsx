"use client";

import { useAuth } from "@/components/auth-provider";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Globe, Lock, Book, AlertTriangle, Settings } from "lucide-react";
import { getBook, updateBook, deleteBook, type Book as BookType } from "@/lib/firestore";


export default function BookSettings({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [book, setBook] = useState<BookType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    fetchBookData();
  }, [fetchBookData]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateBook(params.id, { title, description, isPublic });
      alert("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!confirm("Are you sure you want to delete this book? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteBook(params.id);
      router.push("/");
    } catch (error) {
      console.error("Error deleting book:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Book not found</div>
      </div>
    );
  }

  const isAuthor = user?.email === book.authorEmail || user?.id === book.authorId;

  if (!isAuthor) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          Only the book owner can access settings
        </div>
        <Link href={`/books/${params.id}`} className="text-indigo-600 hover:underline mt-4 inline-block">
          Back to book
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href={`/books/${params.id}`}
        className="group inline-flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold mb-10 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Back to Project
      </Link>

      <div className="bg-white rounded-[3rem] shadow-2xl shadow-indigo-100/50 border border-gray-100 p-10 sm:p-16 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-12">
            <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center shadow-xl rotate-6">
              <Settings className="w-10 h-10 text-white animate-[spin_10s_linear_infinite]" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Project Control</h1>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1">Configure your manuscript settings</p>
            </div>
          </div>

          <form onSubmit={saveSettings} className="space-y-10">
            <div className="space-y-4">
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest px-1">
                Manuscript Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-8 py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 font-bold text-xl text-gray-900 placeholder:text-gray-300 transition-all"
                required
              />
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest px-1">
                Plot Summary
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-8 py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 font-medium text-lg text-gray-700 placeholder:text-gray-300 transition-all"
              />
            </div>

            <div className="space-y-6">
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest px-1">
                Visibility Protocol
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`group p-8 rounded-[2rem] border-2 flex flex-col items-center gap-4 transition-all duration-300 ${
                    !isPublic
                      ? "border-indigo-600 bg-indigo-50 shadow-xl shadow-indigo-100"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className={`p-4 rounded-2xl transition-colors ${!isPublic ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                    <Lock className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <span className={`block font-black text-lg ${!isPublic ? "text-indigo-900" : "text-gray-700"}`}>
                      Private Vault
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`group p-8 rounded-[2rem] border-2 flex flex-col items-center gap-4 transition-all duration-300 ${
                    isPublic
                      ? "border-indigo-600 bg-indigo-50 shadow-xl shadow-indigo-100"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className={`p-4 rounded-2xl transition-colors ${isPublic ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                    <Globe className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <span className={`block font-black text-lg ${isPublic ? "text-indigo-900" : "text-gray-700"}`}>
                      Open World
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <button
                type="submit"
                disabled={saving}
                className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 transform hover:scale-105 disabled:opacity-50 uppercase tracking-widest text-sm"
              >
                {saving ? "Updating Protocol..." : "Apply Changes"}
              </button>
              <Link
                href={`/books/${params.id}`}
                className="flex-1 py-5 bg-gray-50 text-gray-500 rounded-2xl font-black hover:bg-gray-100 transition-all text-center uppercase tracking-widest text-sm flex items-center justify-center"
              >
                Cancel
              </Link>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="mt-20 pt-12 border-t-2 border-red-50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-red-600 tracking-tight uppercase tracking-widest text-sm">Critical Actions</h2>
            </div>
            <p className="text-gray-500 font-medium mb-8 leading-relaxed">
              Once you delete a manuscript, all chapters, versions, and feedback will be permanently erased. This action is irreversible.
            </p>
            <button
              onClick={handleDeleteBook}
              className="w-full sm:w-auto px-10 py-5 bg-red-50 text-red-600 rounded-2xl font-black hover:bg-red-600 hover:text-white transition-all duration-300 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
            >
              <Trash2 className="w-5 h-5" />
              Terminate Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
