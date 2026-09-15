"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { uploadPhotoAction, deletePhotoAction } from "@/app/actions/photos";
import { publishGalleryAction, updateGallerySelectionAction } from "@/app/actions/galleries";
import type { DayGroupedPhotos } from "@/lib/db/photos";
import {
  UploadCloud,
  Trash2,
  Lock,
  Calendar,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Copy,
  Check,
  ExternalLink,
  Images,
  CheckSquare,
  Square,
} from "lucide-react";

interface PhotoGalleryClientProps {
  eventId: number;
  eventName: string;
  eventDate?: string;
  dayGroups: DayGroupedPhotos[];
  gallerySlug?: string;
  initialGalleryPhotoIds?: number[];
  userRole?: string;
  isAdmin?: boolean;
}

export function PhotoGalleryClient({
  eventId,
  eventName,
  eventDate,
  dayGroups,
  gallerySlug,
  initialGalleryPhotoIds = [],
  userRole = "ADMIN",
  isAdmin = true,
}: PhotoGalleryClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Normalize event date string (YYYY-MM-DD)
  const eventDateFormatted = eventDate ? eventDate.split("T")[0] : undefined;

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Upload form state - default to event date or today if after event date
  const [uploadDate, setUploadDate] = useState<string>(() => {
    const today = new Date().toISOString().split("T")[0];
    if (eventDateFormatted && today < eventDateFormatted) {
      return eventDateFormatted;
    }
    return today;
  });

  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; done: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Publish gallery form state
  const [galleryTitle, setGalleryTitle] = useState(eventName);
  const [galleryPin, setGalleryPin] = useState("1234");
  const [publishing, setPublishing] = useState(false);
  const [publishSuccessSlug, setPublishSuccessSlug] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  // Selection & Gallery management state
  // Pre-select photos that are already in the published gallery
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<number[]>(initialGalleryPhotoIds);
  // Track the original gallery set to detect changes
  const originalGalleryIds = useRef<Set<number>>(new Set(initialGalleryPhotoIds));
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Drag & drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<{ name: string; url: string; size: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to generate PIN in different formats
  const generateRandomPin = (length: number = 4) => {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10).toString();
    }
    setGalleryPin(result);
  };

  const handleSelectAll = () => {
    const allIds = dayGroups.flatMap((g) => g.photos.map((p) => p.id));
    if (selectedPhotoIds.length === allIds.length) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(allIds);
    }
  };

  const toggleSelectPhoto = (photoId: number) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  const handleBatchDelete = async () => {
    if (selectedPhotoIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedPhotoIds.length} selected photos?`)) return;

    for (const photoId of selectedPhotoIds) {
      await deletePhotoAction(photoId, eventId);
    }
    setSelectedPhotoIds([]);
    router.refresh();
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    // Only leave if we exit the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      applyFileSelection(files);
    }
  };

  const applyFileSelection = (files: FileList) => {
    setSelectedFiles(files);
    setUploadError(null);
    const previews = Array.from(files).map((f) => ({
      name: f.name,
      size: f.size,
      url: URL.createObjectURL(f),
    }));
    setPreviewFiles(previews);
  };

  const handleUpdateGallery = async () => {
    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    const res = await updateGallerySelectionAction(eventId, selectedPhotoIds);
    setUpdating(false);

    if (res.success) {
      // Update the reference set to reflect the new gallery state
      originalGalleryIds.current = new Set(selectedPhotoIds);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      router.refresh();
    } else {
      setUpdateError(res.error || "Failed to update gallery.");
    }
  };

  // Has the selection diverged from the current gallery state?
  const selectionChanged =
    selectedPhotoIds.length !== originalGalleryIds.current.size ||
    selectedPhotoIds.some((id) => !originalGalleryIds.current.has(id));

  const allPhotoIds = dayGroups.flatMap((g) => g.photos.map((p) => p.id));
  const allTotal = allPhotoIds.length;

  // ESC Key listener to close modals
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (!uploading) {
          setShowUploadModal(false);
        }
        if (!publishing) {
          setShowPublishModal(false);
        }
        setPreviewPhoto(null);
      }
    }

    if (showUploadModal || showPublishModal || previewPhoto) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [showUploadModal, showPublishModal, previewPhoto, uploading, publishing]);

  // Handle batch file upload
  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
      setUploadError("Please select at least one photo.");
      return;
    }

    // Validate that upload date is on or after the event date
    if (eventDateFormatted && uploadDate < eventDateFormatted) {
      setUploadError(
        `Photos cannot be uploaded before the event date (${eventDateFormatted}). Please select ${eventDateFormatted} or a later date.`
      );
      return;
    }

    setUploadError(null);
    setUploading(true);
    setUploadProgress({ total: selectedFiles.length, done: 0 });

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append("event_id", eventId.toString());
        formData.append("file", file);
        formData.append("custom_date", uploadDate);

        const res = await uploadPhotoAction(formData);
        if (!res.success) {
          throw new Error(res.error || `Failed to upload ${file.name}`);
        }

        setUploadProgress({ total: selectedFiles.length, done: i + 1 });
      }

      setUploading(false);
      setShowUploadModal(false);
      setSelectedFiles(null);
      setPreviewFiles([]);
      router.refresh();
    } catch (err: any) {
      setUploadError(err.message || "An error occurred during upload.");
      setUploading(false);
    }
  }

  // Handle photo deletion
  async function handleDeletePhoto(photoId: number) {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    const res = await deletePhotoAction(photoId, eventId);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to delete photo.");
    }
  }

  // Handle publish gallery
  async function handlePublishSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPublishing(true);

    // If photos are selected, use selected ones; otherwise use all photos
    const allPhotoIds = dayGroups.flatMap((g) => g.photos.map((p) => p.id));
    const photoIdsToPublish = selectedPhotoIds.length > 0 ? selectedPhotoIds : allPhotoIds;

    const formData = new FormData();
    formData.append("event_id", eventId.toString());
    formData.append("title", galleryTitle);
    formData.append("pin", galleryPin);
    photoIdsToPublish.forEach((id) => formData.append("photo_ids", id.toString()));

    const res = await publishGalleryAction(formData);
    setPublishing(false);

    if (res.success && res.slug) {
      setPublishSuccessSlug(res.slug);
      router.refresh();
    } else {
      alert(res.error || "Failed to publish gallery.");
    }
  }

  function copyLink(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  function copyPin(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2500);
  }

  const fullGalleryUrl = typeof window !== "undefined" && publishSuccessSlug
    ? `${window.location.origin}/gallery/${publishSuccessSlug}`
    : `/gallery/${publishSuccessSlug || ""}`;

  return (
    <div className={`space-y-8 ${(selectionChanged || selectedPhotoIds.length > 0) ? "pb-28" : ""}`}>
      {/* Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setUploadError(null);
              setShowUploadModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            <span>Upload Media</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                setPublishSuccessSlug(null);
                setShowPublishModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>{gallerySlug ? "Gallery PIN Settings" : "Create Gallery PIN"}</span>
            </button>
          )}
        </div>

        {/* Selection & Batch Tools */}
        {isAdmin ? (
          dayGroups.length > 0 && (
            <div className="flex items-center gap-2">
              {/* Gallery selection info */}
              {gallerySlug && (
                <span className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  {selectedPhotoIds.length} of {allTotal} in gallery
                </span>
              )}
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 transition-colors cursor-pointer"
              >
                {selectedPhotoIds.length === allTotal ? "Deselect All" : "Select All"}
              </button>

              {selectedPhotoIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedPhotoIds.length})</span>
                </button>
              )}
            </div>
          )
        ) : (
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50/90 border border-amber-200/90 px-3 py-1.5 rounded-xl font-medium">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Team Member Mode &bull; Upload photos/videos only. Gallery selection managed by Admin.</span>
          </div>
        )}
      </div>

      {/* Photo Stream Groups */}
      {dayGroups.length === 0 ? (
        <div className="bg-white p-16 text-center rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-800 mx-auto flex items-center justify-center">
            <UploadCloud className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No media uploaded yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Upload images or videos to build this shoot&apos;s day-grouped gallery. Media uploaded on or after the event date ({eventDateFormatted || "scheduled date"}) will automatically be partitioned into clean daily timelines.
          </p>
          <button
            onClick={() => {
              setUploadError(null);
              setShowUploadModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload First Batch</span>
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {dayGroups.map((group) => (
            <div key={group.date} className="space-y-4">
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {new Date(group.date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </h2>
                    <span className="text-xs text-slate-400 font-medium">
                      {group.photos.length} photos &middot; {group.photos.filter(p => originalGalleryIds.current.has(p.id)).length} in gallery
                    </span>
                  </div>
                </div>
              </div>

              {/* Photos Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {group.photos.map((photo) => {
                  const photoSrc = photo.signedUrl || (photo as any).signed_url || photo.storage_path;
                  const isSelected = selectedPhotoIds.includes(photo.id);
                  const isInCurrentGallery = originalGalleryIds.current.has(photo.id);

                  return (
                    <div
                      key={photo.id}
                      onClick={() => {
                        if (isAdmin) {
                          toggleSelectPhoto(photo.id);
                        } else {
                          setPreviewPhoto(photoSrc);
                        }
                      }}
                      className={`group relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border transition-all cursor-pointer ${
                        isAdmin && isSelected
                          ? "border-2 border-indigo-600 ring-4 ring-indigo-600/10 shadow-md"
                          : "border-slate-200/80 shadow-2xs hover:shadow-md hover:border-slate-300"
                      }`}
                    >
                      {/* Selection Checkbox (Admin Only) */}
                      {isAdmin && (
                        <div
                          className={`absolute top-2.5 left-2.5 z-20 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-black/40 backdrop-blur-md text-white/70 border border-white/20"
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4" /> : <div className="w-3.5 h-3.5 rounded-sm border border-white/80" />}
                        </div>
                      )}

                      {/* In-gallery badge — always visible top-right */}
                      {isInCurrentGallery && (
                        <div className="absolute top-2 right-2 z-20 px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-bold tracking-wide shadow-sm">
                          In Gallery
                        </div>
                      )}

                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoSrc}
                        alt={photo.filename}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Hover overlay with preview/delete */}
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 pointer-events-none group-hover:pointer-events-auto"
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviewPhoto(photoSrc); }}
                          className="p-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-lg shadow-xs transition-colors cursor-pointer"
                          title="Preview Media"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {isAdmin && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                            className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
                            title="Delete Media"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Sticky Bottom Gallery Update Bar ─── */}
      {mounted && isAdmin && gallerySlug && (selectedPhotoIds.length > 0 || selectionChanged) && createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-2xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-4 px-5 py-3.5 animate-in slide-in-from-bottom-4 duration-300">
            {/* Left: selection info */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Images className="w-4 h-4" />
              </div>
              <div>
                <p className="text-white text-xs font-bold">
                  {selectedPhotoIds.length} photo{selectedPhotoIds.length !== 1 ? "s" : ""} selected for gallery
                </p>
                {selectionChanged && (
                  <p className="text-slate-400 text-[11px]">
                    Unsaved changes — previous: {originalGalleryIds.current.size}
                  </p>
                )}
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 shrink-0">
              {updateError && (
                <span className="text-red-400 text-[11px] font-medium max-w-[200px] truncate">{updateError}</span>
              )}
              {updateSuccess && (
                <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedPhotoIds(Array.from(originalGalleryIds.current));
                  setUpdateError(null);
                }}
                disabled={updating || !selectionChanged}
                className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors rounded-xl disabled:opacity-40 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleUpdateGallery}
                disabled={updating || !selectionChanged}
                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {updating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    <span>Update Gallery</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Upload Modal */}
      {mounted && showUploadModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <UploadCloud className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload Photos to Shoot</h3>
                  <p className="text-[11px] text-slate-400">Drag & drop or click to browse · Press ESC to close</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !uploading && setShowUploadModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {uploadError && (
              <div className="mx-7 mt-4 p-3.5 rounded-2xl bg-red-50 text-red-700 text-xs flex items-start gap-2.5 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} method="POST" className="flex flex-col gap-5 px-7 py-5">

              {/* Date Picker */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Shoot / Upload Date
                </label>
                <input
                  type="date"
                  required
                  min={eventDateFormatted}
                  value={uploadDate}
                  onChange={(e) => {
                    const selected = e.target.value;
                    if (eventDateFormatted && selected < eventDateFormatted) {
                      setUploadError(`Upload date cannot be before event date (${eventDateFormatted}).`);
                    } else {
                      setUploadError(null);
                    }
                    setUploadDate(selected);
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                />
                {eventDateFormatted && (
                  <p className="text-[11px] text-slate-400 mt-1">Must be on or after event date ({eventDateFormatted}).</p>
                )}
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer select-none overflow-hidden
                  ${
                    isDragOver
                      ? "border-indigo-500 bg-indigo-50/60 scale-[1.01]"
                      : previewFiles.length > 0
                      ? "border-emerald-400 bg-emerald-50/40"
                      : "border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/30"
                  }
                  ${ previewFiles.length > 0 ? "py-4" : "py-12" }
                `}
              >
                {/* Animated ring on drag-over */}
                {isDragOver && (
                  <span className="absolute inset-0 rounded-2xl border-2 border-indigo-500 animate-ping opacity-30 pointer-events-none" />
                )}

                {previewFiles.length === 0 ? (
                  // Empty state
                  <>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isDragOver ? "bg-indigo-100 scale-110" : "bg-slate-100"
                    }`}>
                      <UploadCloud className={`w-8 h-8 transition-colors duration-300 ${
                        isDragOver ? "text-indigo-600" : "text-slate-400"
                      }`} />
                    </div>
                    <div className="text-center space-y-1">
                      <p className={`text-sm font-bold transition-colors ${
                        isDragOver ? "text-indigo-700" : "text-slate-700"
                      }`}>
                        {isDragOver ? "Release to drop photos" : "Drop photos here or click to browse"}
                      </p>
                      <p className="text-xs text-slate-400">Photos &amp; Videos · HEIC JPEG PNG DNG JXL WEBP AVIF BMP TIFF GIF SVG EPS PSD AI PDF · MP4 MOV MKV AVI WEBM +more</p>
                    </div>
                    <div className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/30 transition-all">
                      <UploadCloud className="w-3.5 h-3.5" />
                      Browse Files
                    </div>
                  </>
                ) : (
                  // Files selected state
                  <>
                    <div className="w-full px-4 space-y-3">
                      {/* Thumbnail strip */}
                      <div className="flex flex-wrap gap-2 justify-center">
                        {previewFiles.slice(0, 12).map((f, i) => (
                          <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-200 border-2 border-white shadow-md">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {previewFiles.length > 12 && (
                          <div className="w-14 h-14 rounded-xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-500">+{previewFiles.length - 12}</span>
                          </div>
                        )}
                      </div>
                      {/* File count summary */}
                      <div className="text-center">
                        <p className="text-sm font-bold text-emerald-700">
                          {previewFiles.length} file{previewFiles.length !== 1 ? "s" : ""} ready to upload
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {(previewFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(1)} MB total · Click to change selection
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Hidden input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".heic,.heif,.jpg,.jpeg,.png,.dng,.jxl,.webp,.gif,.avif,.bmp,.tiff,.tif,.svg,.eps,.pdf,.psd,.ai,.mp4,.mov,.m4v,.mkv,.avi,.wmv,.flv,.webm,.hevc,.3gp,.mpeg,.mpg,.mts,.vob,.ogv,image/*,video/*"
                  className="hidden"
                  onChange={(e) => e.target.files && applyFileSelection(e.target.files)}
                />
              </div>

              {/* Upload Progress */}
              {uploadProgress && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin inline-block" />
                      Uploading photos...
                    </span>
                    <span className="text-indigo-700 font-black">{uploadProgress.done} / {uploadProgress.total}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 text-center">
                    {Math.round((uploadProgress.done / uploadProgress.total) * 100)}% complete
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => { setShowUploadModal(false); setPreviewFiles([]); }}
                  className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || previewFiles.length === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Upload {previewFiles.length > 0 ? `${previewFiles.length} File${previewFiles.length !== 1 ? "s" : ""}` : "Files"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Publish Gallery Modal (Mounted directly to document.body via Portal) */}
      {mounted && showPublishModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Configure Client Gallery PIN</h3>
                  <span className="text-[10px] text-slate-400 font-medium">Press ESC to dismiss</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {publishSuccessSlug ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-sm">Gallery PIN Updated Successfully!</span>
                    <span className="block mt-0.5 text-emerald-700">
                      Your client gallery is now live and protected with PIN code: <strong className="font-mono">{galleryPin}</strong>.
                    </span>
                  </div>
                </div>

                {/* Complete Full Copyable URL */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Full Client Gallery Link
                    </span>
                    <button
                      type="button"
                      onClick={() => copyLink(fullGalleryUrl)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied Full Link!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Full Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={fullGalleryUrl}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 select-all font-semibold focus:outline-none"
                    />
                    <a
                      href={fullGalleryUrl}
                      target="_blank"
                      className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer shrink-0"
                      title="Open Gallery in New Tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Security PIN Details */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Active Client PIN
                    </span>
                    <span className="text-xl font-mono font-black text-slate-900 tracking-widest block mt-0.5">
                      {galleryPin}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyPin(galleryPin)}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedPin ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied PIN</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy PIN</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <a
                    href={fullGalleryUrl}
                    target="_blank"
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all text-center flex items-center justify-center gap-2 shadow-xs"
                  >
                    <span>View Client Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPublishModal(false);
                      setPublishSuccessSlug(null);
                    }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePublishSubmit} method="POST" className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Client Gallery Title
                  </label>
                  <input
                    type="text"
                    required
                    value={galleryTitle}
                    onChange={(e) => setGalleryTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium"
                  />
                </div>

                {/* Selected Photos Thumbnail Preview Strip */}
                {(() => {
                  const allPhotos = dayGroups.flatMap((g) => g.photos);
                  if (allPhotos.length === 0) return null;
                  return (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Publishing Collection ({selectedPhotoIds.length > 0 ? selectedPhotoIds.length : allPhotos.length} photos{selectedPhotoIds.length > 0 ? ' selected' : ''})
                      </label>
                      <div className="grid grid-cols-5 gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden max-h-28 overflow-y-auto">
                        {(selectedPhotoIds.length > 0
                          ? allPhotos.filter((p) => selectedPhotoIds.includes(p.id))
                          : allPhotos
                        ).map((photo) => (
                          <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-200 border border-slate-300">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.signedUrl || `/media/${photo.storage_path}`}
                              alt={photo.filename}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* PIN Format Generator Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Security PIN Format *
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => generateRandomPin(4)}
                        className="px-2.5 py-1 text-[10px] font-extrabold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                      >
                        4 Digits
                      </button>
                      <button
                        type="button"
                        onClick={() => generateRandomPin(6)}
                        className="px-2.5 py-1 text-[10px] font-extrabold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                      >
                        6 Digits
                      </button>
                      <button
                        type="button"
                        onClick={() => generateRandomPin(galleryPin.length === 6 ? 6 : 4)}
                        className="px-2.5 py-1 text-[10px] font-extrabold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>🎲 Random PIN</span>
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    required
                    value={galleryPin}
                    onChange={(e) => setGalleryPin(e.target.value)}
                    placeholder="Enter custom PIN (e.g. 4497 or 482917)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 font-mono tracking-widest focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-black text-center"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Clients will enter this exact keypad PIN ({galleryPin.length} digits) to unlock proofing.
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowPublishModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={publishing || !galleryPin.trim()}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                  >
                    {publishing ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving PIN...</span>
                      </>
                    ) : (
                      <span>Save & Activate PIN</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Full Screen Image Lightbox Preview Modal */}
      {mounted && previewPhoto && createPortal(
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
          <div className="relative max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhoto}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
