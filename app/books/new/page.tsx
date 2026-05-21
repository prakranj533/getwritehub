"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Book, Globe, Lock } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { createBook } from "@/lib/firestore";

export default function NewBook() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Only redirect if Firebase auth has finished loading and no user is found
    if (!authLoading && user === null) {
      router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!user) {
      setError("You must be signed in to create a book");
      setIsSubmitting(false);
      return;
    }

    try {
      const slug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const book = await createBook({
        title,
        description: description || "",
        slug,
        isPublic,
        status: "draft",
        authorId: user.id,
        authorEmail: user.email || "",
        authorName: user.name || user.email || "Anonymous",
      });

      router.push(`/books/${book.id}`);
    } catch (err: any) {
      console.error("Error creating book:", err);
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/"
        className="group inline-flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold mb-10 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Back to Library
      </Link>

      <div className="bg-white rounded-[3rem] shadow-2xl shadow-indigo-100/50 border border-gray-100 p-10 sm:p-16 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-12">
            <div className="w-20 h-20 premium-gradient rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-200 rotate-6">
              <Book className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Birth of an Idea</h1>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1">Initialize your new project</p>
            </div>
          </div>

          {error && (
            <div className="mb-10 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-3 font-bold text-sm">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="space-y-4">
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest px-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-8 py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 font-bold text-xl text-gray-900 placeholder:text-gray-300 transition-all"
                placeholder="What shall we call this masterpiece?"
                required
              />
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest px-1">
                summary
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-8 py-5 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 font-medium text-lg text-gray-700 placeholder:text-gray-300 transition-all"
                placeholder="Give us a glimpse into the world you're creating..."
              />
            </div>

            <div className="space-y-6">
              <label className="block text-sm font-black text-gray-400 uppercase tracking-widest px-1">
                Access Level
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
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Only you and your team</span>
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
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Visible to the community</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Link
                href="/"
                className="flex-1 py-5 bg-gray-50 text-gray-500 rounded-2xl font-black hover:bg-gray-100 transition-all text-center uppercase tracking-widest text-sm"
              >
                Retreat
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 transform hover:scale-105 disabled:opacity-50 uppercase tracking-widest text-sm"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Writing Registry...
                  </div>
                ) : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
