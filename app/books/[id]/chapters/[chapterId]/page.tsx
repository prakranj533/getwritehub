"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  GitPullRequest,
  CheckCircle,
  XCircle,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronRight,
  History,
  User,
  Send,
  Wifi,
  WifiOff,
  Sparkles,
  Upload,
  HardDrive,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  saveDraftOffline,
  getDraftOffline,
  markDraftSynced,
  type OfflineDraft,
  type AISuggestion,
} from "@/lib/offline-storage";
import { useOnlineStatus } from "@/components/offline-indicator";
import { RichEditor } from "@/components/rich-editor";

interface ReviewType {
  id: string;
  status: string;
  comment: string | null;
  lineComments: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface VersionType {
  id: string;
  version: number;
  createdAt: string;
  content: string;
}

interface ChapterType {
  id: string;
  title: string;
  content: string;
  status: string;
  order: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  reviews: ReviewType[];
  versions: VersionType[];
}

export default function ChapterPage({
  params,
}: {
  params: { id: string; chapterId: string };
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [chapter, setChapter] = useState<ChapterType | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"approved" | "changes_requested">("approved");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showReviews, setShowReviews] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReviewed, setAiReviewed] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [lastLocalSave, setLastLocalSave] = useState<Date | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-save to local storage every 5 seconds when content changes
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (content && title) {
        saveLocally();
      }
    }, 5000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [content, title]);

  // Load offline draft on mount
  useEffect(() => {
    loadOfflineDraft();
  }, [params.chapterId]);

  const loadOfflineDraft = async () => {
    try {
      const draft = await getDraftOffline(params.chapterId);
      if (draft && !draft.synced) {
        setHasUnsyncedChanges(true);
        // If offline draft is newer, use it
        if (chapter && new Date(draft.lastSaved) > new Date(chapter.updatedAt)) {
          setContent(draft.content);
          setTitle(draft.title);
          if (draft.aiSuggestions) {
            setAiSuggestions(draft.aiSuggestions);
            setAiReviewed(draft.aiReviewed);
          }
        }
      }
    } catch (e) {
      // IndexedDB not available
    }
  };

  const saveLocally = async () => {
    try {
      const draft: OfflineDraft = {
        id: params.chapterId,
        bookId: params.id,
        chapterId: params.chapterId,
        title,
        content,
        lastSaved: Date.now(),
        synced: false,
        aiReviewed,
        aiSuggestions: aiSuggestions.length > 0 ? aiSuggestions : undefined,
      };
      await saveDraftOffline(draft);
      setOfflineSaved(true);
      setHasUnsyncedChanges(true);
      setLastLocalSave(new Date());
      setTimeout(() => setOfflineSaved(false), 2000);
    } catch (e) {
      // IndexedDB not available, use localStorage fallback
      try {
        localStorage.setItem(
          `draft-${params.chapterId}`,
          JSON.stringify({ title, content, lastSaved: Date.now() })
        );
        setOfflineSaved(true);
        setHasUnsyncedChanges(true);
        setLastLocalSave(new Date());
        setTimeout(() => setOfflineSaved(false), 2000);
      } catch (e2) {
        console.error("Failed to save locally:", e2);
      }
    }
  };

  const fetchChapter = useCallback(async () => {
    if (!isOnline) {
      // Try loading from offline storage
      try {
        const draft = await getDraftOffline(params.chapterId);
        if (draft) {
          setContent(draft.content);
          setTitle(draft.title);
          setLoading(false);
          setHasUnsyncedChanges(!draft.synced);
          if (draft.aiSuggestions) {
            setAiSuggestions(draft.aiSuggestions);
            setAiReviewed(draft.aiReviewed);
          }
          return;
        }
      } catch (e) {
        // Fall through
      }
      setError("You are offline. Content will load when you reconnect.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/books/${params.id}/chapters/${params.chapterId}`
      );
      if (res.ok) {
        const data = await res.json();
        setChapter(data);

        // Check if offline draft is newer
        const draft = await getDraftOffline(params.chapterId).catch(() => null);
        if (draft && !draft.synced && draft.lastSaved > new Date(data.updatedAt).getTime()) {
          setContent(draft.content);
          setTitle(draft.title);
          setHasUnsyncedChanges(true);
          if (draft.aiSuggestions) {
            setAiSuggestions(draft.aiSuggestions);
            setAiReviewed(draft.aiReviewed);
          }
        } else {
          setContent(data.content);
          setTitle(data.title);
        }
      } else if (res.status === 403) {
        setError("You don't have permission to view this chapter");
      } else {
        setError("Chapter not found");
      }
    } catch (error) {
      // Network error - try offline
      try {
        const draft = await getDraftOffline(params.chapterId);
        if (draft) {
          setContent(draft.content);
          setTitle(draft.title);
          setHasUnsyncedChanges(!draft.synced);
        } else {
          setError("Failed to load chapter. You appear to be offline.");
        }
      } catch (e) {
        setError("Failed to load chapter");
      }
    } finally {
      setLoading(false);
    }
  }, [params.id, params.chapterId, isOnline]);

  useEffect(() => {
    fetchChapter();
  }, [fetchChapter]);

  // Run AI Review
  const runAIReview = async () => {
    if (!isOnline) {
      alert("AI Review requires an internet connection. Please go online and try again.");
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiSuggestions(data.suggestions);
        setAiReviewed(true);
        setShowAIPanel(true);

        // Save AI review results locally
        const draft: OfflineDraft = {
          id: params.chapterId,
          bookId: params.id,
          chapterId: params.chapterId,
          title,
          content,
          lastSaved: Date.now(),
          synced: false,
          aiReviewed: true,
          aiSuggestions: data.suggestions,
        };
        await saveDraftOffline(draft).catch(() => {});
      }
    } catch (error) {
      console.error("AI Review failed:", error);
      alert("AI Review failed. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  // Submit to Branch (push local changes to server)
  const submitToBranch = async () => {
    if (!isOnline) {
      alert("You need to be online to submit to the book branch. Save locally and submit when connected.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/books/${params.id}/chapters/${params.chapterId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setChapter(data);
        setHasUnsyncedChanges(false);
        // Mark as synced in offline storage
        await markDraftSynced(params.chapterId).catch(() => {});
      }
    } catch (error) {
      console.error("Error submitting to branch:", error);
      alert("Failed to submit. Your changes are saved locally. Try again when connection is stable.");
    } finally {
      setSaving(false);
    }
  };

  const saveChapter = async () => {
    if (!isOnline) {
      // Save locally when offline
      await saveLocally();
      return;
    }
    submitToBranch();
  };

  const submitForReview = async () => {
    if (!isOnline) {
      alert("You need to be online to submit for review.");
      return;
    }
    try {
      const res = await fetch(
        `/api/books/${params.id}/chapters/${params.chapterId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "review" }),
        }
      );

      if (res.ok) {
        fetchChapter();
      }
    } catch (error) {
      console.error("Error submitting for review:", error);
    }
  };

  const publishChapter = async () => {
    try {
      const res = await fetch(
        `/api/books/${params.id}/chapters/${params.chapterId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        }
      );

      if (res.ok) {
        fetchChapter();
      }
    } catch (error) {
      console.error("Error publishing chapter:", error);
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `/api/books/${params.id}/chapters/${params.chapterId}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: reviewStatus,
            comment: reviewComment,
          }),
        }
      );

      if (res.ok) {
        setReviewComment("");
        setShowReviewForm(false);
        fetchChapter();
      }
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  const restoreVersion = async (versionContent: string) => {
    if (!confirm("Restore this version? Current content will be saved as a new version.")) return;
    
    try {
      const res = await fetch(
        `/api/books/${params.id}/chapters/${params.chapterId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: versionContent }),
        }
      );

      if (res.ok) {
        fetchChapter();
      }
    } catch (error) {
      console.error("Error restoring version:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !content) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error || "Chapter not found"}</div>
        <Link
          href={`/books/${params.id}`}
          className="text-indigo-600 hover:underline mt-4 inline-block"
        >
          Back to book
        </Link>
      </div>
    );
  }

  const hasReviewed = chapter?.reviews?.some(
    (r) => r.reviewer.email === session?.user?.email
  ) || false;
  const allReviewsApproved = chapter?.reviews?.every((r) => r.status === "approved") || false;
  const hasReviews = (chapter?.reviews?.length || 0) > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/books/${params.id}`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to book
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Online/Offline Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isOnline ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? "Online" : "Offline"}
          </div>

          {/* Offline save indicator */}
          {offlineSaved && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <HardDrive className="w-3 h-3" />
              Saved locally
            </div>
          )}

          {/* Unsynced changes indicator */}
          {hasUnsyncedChanges && (
            <div className="flex items-center gap-1 text-xs text-orange-600">
              <AlertCircle className="w-3 h-3" />
              Unsynced
            </div>
          )}

          {chapter && (
            <>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  chapter.status === "published"
                    ? "bg-green-100 text-green-700"
                    : chapter.status === "review"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {chapter.status}
              </span>
              <span className="text-sm text-gray-500">
                v{chapter.version} • Updated {formatRelativeTime(chapter.updatedAt)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-2xl font-bold border-0 border-b-2 border-transparent focus:border-indigo-500 focus:ring-0 bg-transparent px-0"
            placeholder="Chapter Title"
          />

          <RichEditor
            value={content}
            onChange={(val) => setContent(val)}
            placeholder="Start writing your chapter... (works offline too!)"
          />

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-gray-500">
              {content.replace(/<[^>]*>/g, "").length} characters •{" "}
              {content.replace(/<[^>]*>/g, " ").split(/\s+/).filter((w) => w.length > 0).length} words
              {lastLocalSave && (
                <span className="ml-2">• Auto-saved {formatRelativeTime(lastLocalSave)}</span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Save locally button */}
              <button
                onClick={saveLocally}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition flex items-center gap-2 text-sm"
              >
                <HardDrive className="w-4 h-4" />
                Save Local
              </button>

              {/* AI Review button */}
              <button
                onClick={runAIReview}
                disabled={aiLoading || !isOnline}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2 text-sm"
                title={!isOnline ? "Go online to use AI Review" : "Run AI Review on your writing"}
              >
                <Sparkles className="w-4 h-4" />
                {aiLoading ? "Reviewing..." : "AI Review"}
              </button>

              {/* Submit to Branch button */}
              <button
                onClick={submitToBranch}
                disabled={saving || !isOnline || !hasUnsyncedChanges}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 text-sm"
                title={!isOnline ? "Go online to submit" : hasUnsyncedChanges ? "Push your local changes to the book" : "No unsynced changes"}
              >
                <Upload className="w-4 h-4" />
                {saving ? "Submitting..." : "Submit to Branch"}
              </button>

              {chapter?.status === "draft" && (
                <button
                  onClick={submitForReview}
                  disabled={!isOnline}
                  className="px-3 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition disabled:opacity-50 text-sm"
                >
                  Submit for Review
                </button>
              )}

              {chapter?.status === "review" && hasReviews && allReviewsApproved && (
                <button
                  onClick={publishChapter}
                  disabled={!isOnline}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 text-sm"
                >
                  Publish
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* AI Review Panel */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span className="font-semibold">AI Review</span>
                {aiReviewed && (
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                    {aiSuggestions.length} suggestions
                  </span>
                )}
              </div>
              {showAIPanel ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {showAIPanel && (
              <div className="p-4 border-t border-gray-100">
                {!aiReviewed ? (
                  <div className="text-center py-4">
                    <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-3">
                      Get AI-powered feedback on grammar, style, and clarity
                    </p>
                    <button
                      onClick={runAIReview}
                      disabled={aiLoading || !isOnline}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                    >
                      {aiLoading ? "Analyzing..." : !isOnline ? "Go online to review" : "Run AI Review"}
                    </button>
                  </div>
                ) : aiSuggestions.length === 0 ? (
                  <div className="text-center py-3">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-green-700 font-medium">Looks great! No issues found.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {aiSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className={`border-l-2 pl-3 py-1 ${
                          suggestion.type === "grammar"
                            ? "border-red-400"
                            : suggestion.type === "style"
                            ? "border-yellow-400"
                            : suggestion.type === "clarity"
                            ? "border-blue-400"
                            : "border-purple-400"
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                              suggestion.type === "grammar"
                                ? "bg-red-100 text-red-700"
                                : suggestion.type === "style"
                                ? "bg-yellow-100 text-yellow-700"
                                : suggestion.type === "clarity"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {suggestion.type}
                          </span>
                          {suggestion.line && (
                            <span className="text-xs text-gray-400">
                              Line {suggestion.line}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">{suggestion.message}</p>
                        {suggestion.suggestion && (
                          <p className="text-xs text-green-600 mt-0.5">
                            Suggestion: {suggestion.suggestion}
                          </p>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={runAIReview}
                      disabled={aiLoading || !isOnline}
                      className="w-full py-2 border border-purple-300 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-50 mt-2"
                    >
                      {aiLoading ? "Re-analyzing..." : "Re-run AI Review"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reviews Section */}
          {chapter && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowReviews(!showReviews)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold">Reviews</span>
                {chapter.reviews.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                    {chapter.reviews.length}
                  </span>
                )}
              </div>
              {showReviews ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {showReviews && (
              <div className="p-4 border-t border-gray-100">
                {chapter.reviews.length === 0 ? (
                  <p className="text-gray-500 text-sm">No reviews yet</p>
                ) : (
                  <div className="space-y-3">
                    {chapter.reviews.map((review) => (
                      <div
                        key={review.id}
                        className="border-l-2 pl-3 py-1"
                        style={{
                          borderColor:
                            review.status === "approved" ? "#22c55e" : "#eab308",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {review.reviewer.image ? (
                            <img
                              src={review.reviewer.image}
                              alt=""
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                              {review.reviewer.name?.[0] ||
                                review.reviewer.email[0]}
                            </div>
                          )}
                          <span className="text-sm font-medium">
                            {review.reviewer.name || review.reviewer.email}
                          </span>
                          {review.status === "approved" ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        {review.comment && (
                          <p className="text-sm text-gray-600 mt-1">
                            {review.comment}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatRelativeTime(review.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {!hasReviewed && chapter.status === "review" && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {showReviewForm ? (
                      <form onSubmit={submitReview} className="space-y-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setReviewStatus("approved")}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                              reviewStatus === "approved"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewStatus("changes_requested")}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                              reviewStatus === "changes_requested"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            Request Changes
                          </button>
                        </div>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Add a comment (optional)"
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                          >
                            <Send className="inline w-3 h-3 mr-1" />
                            Submit Review
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowReviewForm(false)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="w-full py-2 border border-indigo-600 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition"
                      >
                        <MessageSquare className="inline w-4 h-4 mr-1" />
                        Add Review
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Versions Section */}
          {chapter && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <span className="font-semibold">Version History</span>
                {chapter.versions.length > 0 && (
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                    {chapter.versions.length}
                  </span>
                )}
              </div>
              {showVersions ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {showVersions && (
              <div className="p-4 border-t border-gray-100">
                {chapter.versions.length === 0 ? (
                  <p className="text-gray-500 text-sm">No previous versions</p>
                ) : (
                  <div className="space-y-2">
                    {chapter.versions.map((version) => (
                      <div
                        key={version.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Version {version.version}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(version.createdAt)}
                          </span>
                          <button
                            onClick={() => restoreVersion(version.content)}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            Restore
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Author Info */}
          {chapter && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Written by</p>
                <p className="font-medium">
                  {chapter.author.name || chapter.author.email}
                </p>
              </div>
            </div>
          </div>
          )}

          {/* Offline Writing Info */}
          {!isOnline && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <WifiOff className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-800">Writing Offline</p>
                  <p className="text-xs text-orange-600 mt-1">
                    Your changes are auto-saved locally every 5 seconds. When you go online, click &quot;Submit to Branch&quot; to push your changes to the book.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
