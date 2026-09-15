"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateStudioSettingsAction, testSupabaseConnectionAction } from "@/app/actions/settings";
import {
  Building2,
  User,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  Lock,
  Globe,
  Camera,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Database,
  Cloud,
  RefreshCw,
  Sliders,
  FileCheck,
  Check,
  Palette,
  Type,
  Layers,
} from "lucide-react";
import type { UserWithProfile } from "@/lib/db/users";
import {
  THEME_PRESETS,
  FONT_PRESETS,
  SCALE_PRESETS,
  applyThemeToDocument,
  type StudioThemeConfig,
} from "@/components/ThemeApplier";

export function SettingsClient({ user }: { user: UserWithProfile }) {
  const router = useRouter();
  const profile = user.profile || {};
  const [status, setStatus] = useState<{ success?: boolean; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Logo Preview State
  const [logoPreview, setLogoPreview] = useState<string | null>(profile.studio_logo || null);
  const [logoUrlInput, setLogoUrlInput] = useState<string>(profile.studio_logo || "");
  const [removeLogo, setRemoveLogo] = useState(false);

  // User Theme Customizer State
  const [selectedAccent, setSelectedAccent] = useState("#0f172a");
  const [selectedFont, setSelectedFont] = useState("var(--font-sans), system-ui, sans-serif");
  const [selectedScale, setSelectedScale] = useState("100%");
  const [themeFeedback, setThemeFeedback] = useState(false);

  // Load user theme from localStorage on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("trizenai_user_theme");
        if (saved) {
          const config: StudioThemeConfig = JSON.parse(saved);
          if (config.accentColor) setSelectedAccent(config.accentColor);
          if (config.fontFamily) setSelectedFont(config.fontFamily);
          if (config.fontScale) setSelectedScale(config.fontScale);
        }
      } catch (e) {
        console.warn("Theme load error:", e);
      }
    }
  }, []);

  function handleApplyTheme(accent: string, font: string, scale: string) {
    const config: StudioThemeConfig = {
      accentColor: accent,
      accentHover: THEME_PRESETS.find((p) => p.color === accent)?.hover || accent,
      fontFamily: font,
      fontScale: scale,
    };
    applyThemeToDocument(config);
    if (typeof window !== "undefined") {
      localStorage.setItem("trizenai_user_theme", JSON.stringify(config));
    }
    setThemeFeedback(true);
    setTimeout(() => setThemeFeedback(false), 3000);
  }

  // Supabase Diagnostics State
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<{
    connected: boolean;
    storageOk: boolean;
    dbOk: boolean;
    bucketName: string;
    latencyMs: number;
    message: string;
    error?: string;
  } | null>(null);

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      setRemoveLogo(false);
    }
  }

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setLogoUrlInput(val);
    if (val.trim()) {
      setLogoPreview(val.trim());
      setRemoveLogo(false);
    } else if (!removeLogo) {
      setLogoPreview(profile.studio_logo || null);
    }
  }

  function handleRemoveLogo() {
    setRemoveLogo(true);
    setLogoPreview(null);
    setLogoUrlInput("");
  }

  async function handleSaveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    if (removeLogo) {
      formData.set("remove_logo", "1");
    }
    const res = await updateStudioSettingsAction(formData);

    setLoading(false);
    if (res.error) {
      setStatus({ error: res.error });
    } else {
      setStatus({ success: true });
      if (res.logoUrl) {
        setLogoPreview(res.logoUrl);
        setLogoUrlInput(res.logoUrl);
        setRemoveLogo(false);
      }
      router.refresh();
      setTimeout(() => setStatus(null), 4000);
    }
  }

  async function handleTestSupabase() {
    setDiagLoading(true);
    try {
      const res = await testSupabaseConnectionAction();
      setDiagResult(res);
    } catch (e: any) {
      setDiagResult({
        connected: false,
        storageOk: false,
        dbOk: false,
        bucketName: "trizenai-photo-sharing",
        latencyMs: 0,
        message: "Failed to run diagnostics.",
        error: e.message,
      });
    } finally {
      setDiagLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Studio Settings</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
              Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure studio identity, client proofing security policies, watermark preferences, and cloud storage diagnostics.
          </p>
        </div>
      </div>

      {status?.error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <span className="font-semibold">{status.error}</span>
        </div>
      )}

      {status?.success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-semibold">Studio settings and branding updated successfully!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} method="POST" className="space-y-8">
        {/* SECTION 1: Studio Branding & Identity */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Studio Identity & Public Branding</h2>
              <p className="text-xs text-slate-500">Displayed on customer-facing galleries, navbar header, and email invites.</p>
            </div>
          </div>

          {/* Studio Logo Uploader Sub-Card */}
          <div className="p-5 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Official Studio Logo
                </h3>
                <p className="text-[11px] text-slate-500">
                  Upload a custom brand mark or enter an image URL (PNG, SVG, JPG, WebP).
                </p>
              </div>
              {logoPreview && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="px-2.5 py-1 text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                >
                  Remove Logo
                </button>
              )}
            </div>

            <input type="hidden" name="remove_logo" value={removeLogo ? "1" : "0"} />

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Logo Preview Container */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-2 shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview || "/img/logo.png"}
                  alt="Studio Logo Preview"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/img/logo.png";
                  }}
                  className="max-h-full max-w-full object-contain"
                />
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-xs">
                  {logoPreview ? "Custom" : "Default"}
                </span>
              </div>

              {/* Upload Controls */}
              <div className="flex-1 w-full space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Upload Logo Image File
                  </label>
                  <input
                    type="file"
                    name="studio_logo_file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoFileChange}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 file:cursor-pointer cursor-pointer border border-slate-200 rounded-xl bg-white focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Recommended: Transparent PNG or SVG, min 250×250 px, max 5MB.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Or Direct Logo Image URL
                  </label>
                  <input
                    type="url"
                    name="studio_logo_url"
                    value={logoUrlInput}
                    onChange={handleUrlChange}
                    placeholder="https://example.com/assets/studio-logo.png"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Studio Business Name *
              </label>
              <input
                type="text"
                name="studio_name"
                defaultValue={profile.studio_name || "TrizenAI Studio"}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Studio Tagline / Slogan
              </label>
              <input
                type="text"
                name="studio_tagline"
                defaultValue={profile.studio_tagline || "Professional Photography & Client Proofing"}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Official Studio Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="studio_email"
                  defaultValue={profile.studio_email || user.email}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Studio Website URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  name="studio_website"
                  defaultValue={profile.studio_website || "https://trizenai.studio"}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                />
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Instagram Handle
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="studio_instagram"
                  defaultValue={profile.studio_instagram || "@trizenai_studio"}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                />
                <Camera className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Studio Physical Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="studio_address"
                  defaultValue={profile.studio_address || "TrizenAI Creative Park, Suite 400"}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Gallery PIN Security & Watermarking Defaults */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Gallery PIN Security & Proofing Defaults</h2>
              <p className="text-xs text-slate-500">Global defaults applied to published customer galleries.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Default PIN Code Length
              </label>
              <select
                name="default_pin_length"
                defaultValue={profile.default_pin_length || 4}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-semibold"
              >
                <option value="4">4 Digits (e.g. 4829)</option>
                <option value="6">6 Digits (e.g. 482917)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Default Expiration
              </label>
              <select
                name="default_expiration_days"
                defaultValue={profile.default_expiration_days || 60}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-semibold"
              >
                <option value="30">30 Days</option>
                <option value="60">60 Days (Recommended)</option>
                <option value="90">90 Days</option>
                <option value="365">1 Year</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Client Downloads
              </label>
              <select
                name="client_downloads_enabled"
                defaultValue={profile.client_downloads_enabled !== false ? "1" : "0"}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-semibold"
              >
                <option value="1">Enabled (High-Res Downloads)</option>
                <option value="0">Disabled (Proofing Only)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Default Watermark Overlay Text
              </label>
              <input
                type="text"
                name="watermark_text"
                defaultValue={profile.watermark_text || "TrizenAI Photography • Proof"}
                placeholder="e.g. TrizenAI Studio • Proofing Copy"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-mono"
              />
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">Enable Watermark by Default</div>
                <div className="text-[10px] text-slate-500">Applies protective watermark overlay to client-facing photos</div>
              </div>
              <input
                type="checkbox"
                name="watermark_enabled"
                value="1"
                defaultChecked={profile.watermark_enabled !== false}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-7 py-3 bg-studio-accent active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Studio Settings</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* SECTION: User Appearance, Personal Theme & Typography Customizer */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Personal Theme & Typography Ergonomics</h2>
              <p className="text-xs text-slate-500">
                Customize your workspace button accents, font styles, and display scaling.
              </p>
            </div>
          </div>
          {themeFeedback && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Theme Applied!
            </span>
          )}
        </div>

        {/* 1. Theme Accent Color */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            1. Workspace Accent & Button Theme
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {THEME_PRESETS.map((preset) => {
              const isSelected = selectedAccent === preset.color;
              return (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => {
                    setSelectedAccent(preset.color);
                    handleApplyTheme(preset.color, selectedFont, selectedScale);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? "ring-2 ring-indigo-500 bg-slate-50 border-slate-400 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="w-5 h-5 rounded-full shadow-2xs border border-white"
                      style={{ backgroundColor: preset.color }}
                    />
                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 stroke-[3]" />}
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 leading-tight">
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Font Family & Text Size Scale */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {/* Font Family */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
              2. Typography Font Style
            </label>
            <div className="space-y-2">
              {FONT_PRESETS.map((fp) => {
                const isSelected = selectedFont === fp.font;
                return (
                  <button
                    type="button"
                    key={fp.id}
                    onClick={() => {
                      setSelectedFont(fp.font);
                      handleApplyTheme(selectedAccent, fp.font, selectedScale);
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-slate-100 border-slate-400 font-bold shadow-2xs"
                        : "bg-slate-50/60 border-slate-200 hover:bg-slate-100/60"
                    }`}
                  >
                    <span className="text-xs text-slate-900" style={{ fontFamily: fp.font }}>
                      {fp.name}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-900" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Size Scale */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
              3. Interface Text Scaling
            </label>
            <div className="space-y-2">
              {SCALE_PRESETS.map((sp) => {
                const isSelected = selectedScale === sp.scale;
                return (
                  <button
                    type="button"
                    key={sp.id}
                    onClick={() => {
                      setSelectedScale(sp.scale);
                      handleApplyTheme(selectedAccent, selectedFont, sp.scale);
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-slate-100 border-slate-400 font-bold shadow-2xs"
                        : "bg-slate-50/60 border-slate-200 hover:bg-slate-100/60"
                    }`}
                  >
                    <div>
                      <span className="text-xs text-slate-900">{sp.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-900" />}
                  </button>
                );
              })}
            </div>

            {/* Font Color Accessibility Notice */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[10px] text-slate-500 leading-relaxed mt-3">
              <span className="font-bold text-slate-700 block mb-0.5">High-Contrast Color Protection:</span>
              Text color is automatically governed by the WCAG AA contrast engine based on the active surface luminance to guarantee 100% legibility.
            </div>
          </div>
        </div>

        {/* 4. Live Interactive UI Preview Sandbox */}
        <div className="p-5 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Live Workspace Theme Preview
          </span>
          <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center gap-3">
            {/* Primary Action Button */}
            <button
              type="button"
              style={{ backgroundColor: selectedAccent }}
              className="px-4 py-2 text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95"
            >
              Primary Action
            </button>

            {/* Secondary Button */}
            <button
              type="button"
              className="px-4 py-2 text-slate-800 bg-slate-100 hover:bg-slate-200 font-bold text-xs rounded-xl transition-colors"
            >
              Secondary Option
            </button>

            {/* Badge */}
            <span
              style={{ color: selectedAccent, borderColor: `${selectedAccent}40` }}
              className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-50 border"
            >
              Active Filter
            </span>

            {/* Sample text */}
            <span className="text-xs text-slate-600 font-medium" style={{ fontFamily: selectedFont }}>
              Sample shoot title in {selectedScale} scale
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: Supabase Cloud Diagnostics & Live Telemetry */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Supabase Cloud Diagnostics</h2>
              <p className="text-xs text-slate-500">Live storage bucket verification and dual-mode database health telemetry.</p>
            </div>
          </div>

          <button
            onClick={handleTestSupabase}
            disabled={diagLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${diagLoading ? "animate-spin" : ""}`} />
            <span>{diagLoading ? "Pinging Supabase..." : "Run Health Ping"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Storage Bucket</div>
            <div className="text-sm font-bold text-slate-800 font-mono">
              trizenai-photo-sharing
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Configured in .env
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Database Engine</div>
            <div className="text-sm font-bold text-slate-800">
              Dual-Mode Adapter
            </div>
            <div className="text-[10px] text-indigo-600 font-semibold">
              PostgreSQL & SQLite Fallback
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auth & JWT Scope</div>
            <div className="text-sm font-bold text-slate-800">
              Session Cookies + Signed URLs
            </div>
            <div className="text-[10px] text-slate-500">
              HMAC SHA-256 Protected
            </div>
          </div>
        </div>

        {diagResult && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in ${
              diagResult.connected
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                : "bg-amber-50/80 border-amber-200 text-amber-900"
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {diagResult.message}
              </span>
              <span className="font-mono">{diagResult.latencyMs} ms latency</span>
            </div>
            <div className="text-[11px] text-slate-600 flex items-center gap-4">
              <span>DB Ping: {diagResult.dbOk ? "✅ OK" : "❌ Error"}</span>
              <span>Storage API: {diagResult.storageOk ? "✅ OK" : "❌ Warning"}</span>
              <span>Target Bucket: <code className="font-mono text-slate-700">{diagResult.bucketName}</code></span>
            </div>
            {diagResult.error && (
              <div className="text-[10px] text-amber-800 bg-amber-100/60 p-2 rounded-lg font-mono">
                {diagResult.error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
