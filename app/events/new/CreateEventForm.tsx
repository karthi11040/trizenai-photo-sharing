"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEventAction } from "@/app/actions/events";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  FileText,
  Users,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  Camera,
  Clock,
  Mail,
  Phone,
  User,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Check,
  Building,
  X,
} from "lucide-react";
import type { UserWithProfile } from "@/lib/db/users";

const DEFAULT_CATEGORIES = [
  { id: "Wedding", label: "Wedding", icon: "💍", desc: "Ceremony, Reception, Pre-wedding" },
  { id: "Engagement", label: "Engagement", icon: "💎", desc: "Couples & Proposal session" },
  { id: "Birthday", label: "Birthday Party", icon: "🎂", desc: "Celebrations & Milestones" },
  { id: "Corporate", label: "Corporate & Event", icon: "🏢", desc: "Conferences, Summits, Galas" },
  { id: "Portrait", label: "Portrait & Fashion", icon: "📸", desc: "Studio, Headshots, Editorial" },
  { id: "Commercial", label: "Product & Commercial", icon: "🛍️", desc: "Brands, Ads, Catalogs" },
  { id: "RealEstate", label: "Real Estate & Architecture", icon: "🏡", desc: "Interiors & Drone shots" },
  { id: "Family", label: "Family & Newborn", icon: "👶", desc: "Maternity, Baby & Family" },
];

export function CreateEventForm({ teamMembers }: { teamMembers: UserWithProfile[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Wedding");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailMode, setThumbnailMode] = useState<"file" | "url">("file");

  // Custom Categories State
  const [customCategories, setCustomCategories] = useState<
    Array<{ id: string; label: string; icon: string; desc: string }>
  >([]);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("✨");
  const [newCatDesc, setNewCatDesc] = useState("");

  // Load custom categories from localStorage on mount
  useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("trizenai_custom_categories");
        if (saved) {
          setCustomCategories(JSON.parse(saved));
        }
      } catch (e) {
        console.warn("Failed to load custom categories:", e);
      }
    }
  });

  function handleAddCustomCategory(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = newCatName.trim();
    if (!cleanName) return;

    const newCat = {
      id: cleanName,
      label: cleanName,
      icon: newCatIcon || "✨",
      desc: newCatDesc.trim() || "Custom studio category",
    };

    const updated = [...customCategories.filter((c) => c.id !== cleanName), newCat];
    setCustomCategories(updated);
    setSelectedCategory(cleanName);

    if (typeof window !== "undefined") {
      localStorage.setItem("trizenai_custom_categories", JSON.stringify(updated));
    }

    setNewCatName("");
    setNewCatDesc("");
    setIsAddingCustom(false);
  }

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function toggleMember(id: number) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("category", selectedCategory);
    
    // Add selected members to form data
    formData.delete("members");
    selectedMembers.forEach((mId) => {
      formData.append("members", mId.toString());
    });

    const res = await createEventAction(formData);

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else if (res.eventId) {
      router.push(`/events/${res.eventId}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} method="POST" className="space-y-8">
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* 1. Category Selection */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">1. Photoshoot Category</h2>
            <p className="text-xs text-slate-500">Select standard preset or create custom category tailored to your studio.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {selectedCategory}
            </span>
            <button
              type="button"
              onClick={() => setIsAddingCustom(!isAddingCustom)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-full transition-all shadow-2xs"
            >
              <span>+ Custom Category</span>
            </button>
          </div>
        </div>

        {/* Inline Custom Category Creator */}
        {isAddingCustom && (
          <div className="p-4 bg-slate-50 border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Add Custom Category
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Drone & Aerial Survey"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Emoji / Icon
                </label>
                <select
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-sans"
                >
                  <option value="🚁">🚁 Drone / Aerial</option>
                  <option value="👗">👗 Fashion / Runway</option>
                  <option value="🍔">🍔 Food & Beverage</option>
                  <option value="🏎️">🏎️ Automotive / Sports</option>
                  <option value="🎬">🎬 Cinematography</option>
                  <option value="🎪">🎪 Concert / Festival</option>
                  <option value="🐕">🐕 Pets & Animals</option>
                  <option value="✨">✨ Special / Other</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddCustomCategory}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {allCategories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                type="button"
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-indigo-50/80 border-indigo-600 shadow-xs ring-2 ring-indigo-600/20"
                    : "bg-slate-50/50 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300"
                }`}
              >
                <div className="text-2xl mb-1.5">{cat.icon}</div>
                <div>
                  <div className={`text-xs font-bold ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>
                    {cat.label}
                  </div>
                  <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{cat.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Core Shoot Details */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">2. Event & Schedule Information</h2>
          <p className="text-xs text-slate-500">Title, shoot dates, and venue location details.</p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Photoshoot Title *
          </label>
          <div className="relative">
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Arjun & Priya Grand Royal Wedding"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all font-medium"
            />
            <Camera className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Shoot Date
            </label>
            <div className="relative">
              <input
                type="date"
                name="event_date"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Start Time
            </label>
            <div className="relative">
              <input
                type="time"
                name="start_time"
                defaultValue="09:00"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
              />
              <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              End Time
            </label>
            <div className="relative">
              <input
                type="time"
                name="end_time"
                defaultValue="18:00"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
              />
              <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Venue / Location Name
            </label>
            <div className="relative">
              <input
                type="text"
                name="location"
                placeholder="e.g. The Taj Palace Ballroom"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
              />
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Full Venue Address
            </label>
            <div className="relative">
              <input
                type="text"
                name="venue_address"
                placeholder="e.g. 2 Sardar Patel Marg, Diplomatic Enclave"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
              />
              <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Client Information */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">3. Client Contact Details</h2>
          <p className="text-xs text-slate-500">Contact information for gallery delivery and proofing notices.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Client Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                name="client_name"
                placeholder="e.g. Priya Sharma"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Client Email
            </label>
            <div className="relative">
              <input
                type="email"
                name="client_email"
                placeholder="priya@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Client Phone
            </label>
            <div className="relative">
              <input
                type="tel"
                name="client_phone"
                placeholder="+91 98765 43210"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Thumbnail / Cover Image */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">4. Photoshoot Cover & Thumbnail</h2>
            <p className="text-xs text-slate-500">Add an image banner to represent this photoshoot in studio dashboards and client proofing links.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setThumbnailMode("file")}
              className={`px-3 py-1 rounded-lg transition-all ${
                thumbnailMode === "file" ? "bg-white text-indigo-700 shadow-2xs font-bold" : "text-slate-600"
              }`}
            >
              Upload Image
            </button>
            <button
              type="button"
              onClick={() => setThumbnailMode("url")}
              className={`px-3 py-1 rounded-lg transition-all ${
                thumbnailMode === "url" ? "bg-white text-indigo-700 shadow-2xs font-bold" : "text-slate-600"
              }`}
            >
              Image URL
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <div>
            {thumbnailMode === "file" ? (
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                <input
                  type="file"
                  name="cover_file"
                  id="cover_file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="cover_file"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    Click to browse or drop cover photo
                  </div>
                  <div className="text-[11px] text-slate-400">
                    JPG, PNG, WebP up to 10MB (stored in Supabase Cloud)
                  </div>
                </label>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Direct Cover Image URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    name="cover_image_url"
                    placeholder="https://images.unsplash.com/photo-..."
                    onChange={(e) => setThumbnailPreview(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                  />
                  <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="w-full h-44 rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden relative shadow-inner">
              {thumbnailPreview ? (
                <img
                  src={thumbnailPreview}
                  alt="Cover Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <span className="text-xs text-slate-400 font-medium">Cover preview will appear here</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Team Assignment */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">5. Assign Studio Photographers</h2>
            <p className="text-xs text-slate-500">Assigned members will have permission to upload RAW/JPEG shots to this event.</p>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            {selectedMembers.length} Assigned
          </span>
        </div>

        {teamMembers.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
            No other team members found. You can invite photographers anytime in <Link href="/dashboard/team-management" className="text-indigo-600 font-semibold underline">Team Management</Link>.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {teamMembers.map((member) => {
              const isAssigned = selectedMembers.includes(member.id);
              const displayName = `${member.first_name || ""} ${member.last_name || ""}`.trim() || member.username;
              return (
                <div
                  key={member.id}
                  onClick={() => toggleMember(member.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isAssigned
                      ? "bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-600/20"
                      : "bg-slate-50/50 border-slate-200/80 hover:bg-slate-100/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {displayName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 truncate">{displayName}</div>
                      <div className="text-[10px] text-slate-500 truncate">{member.profile?.role || "Photographer"}</div>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      isAssigned ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                    }`}
                  >
                    {isAssigned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Description / Shot Brief */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">6. Event Brief & Shot Checklist</h2>
          <p className="text-xs text-slate-500">Provide instructions, required portrait angles, or timeline details for the photographers.</p>
        </div>

        <textarea
          name="description"
          rows={4}
          placeholder="e.g. 
- Bride entry with parents
- Groom candid portraits
- Stage group photos with VIP guests
- Sunset golden hour couple shoot at 5:30 PM"
          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all leading-relaxed"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Link
          href="/events"
          className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-7 py-3 bg-studio-accent active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-xs transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Create Photoshoot Event</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
