"use client";

import { useEffect } from "react";

export interface StudioThemeConfig {
  accentColor: string;
  accentHover: string;
  fontFamily: string;
  fontScale: string;
}

export const THEME_PRESETS = [
  { id: "slate", name: "Slate Studio (Default)", color: "#0f172a", hover: "#1e293b", ring: "rgba(15, 23, 42, 0.2)" },
  { id: "indigo", name: "Indigo Velvet", color: "#4f46e5", hover: "#4338ca", ring: "rgba(79, 70, 229, 0.25)" },
  { id: "emerald", name: "Emerald Precision", color: "#059669", hover: "#047857", ring: "rgba(5, 150, 105, 0.25)" },
  { id: "rose", name: "Rose Noir", color: "#e11d48", hover: "#be123c", ring: "rgba(225, 29, 72, 0.25)" },
  { id: "amber", name: "Midnight Amber", color: "#d97706", hover: "#b45309", ring: "rgba(217, 119, 6, 0.25)" },
  { id: "cobalt", name: "Cyber Cobalt", color: "#2563eb", hover: "#1d4ed8", ring: "rgba(37, 99, 235, 0.25)" },
];

export const FONT_PRESETS = [
  { id: "inter", name: "Modern Sans (Inter)", font: "var(--font-sans), system-ui, sans-serif" },
  { id: "serif", name: "Editorial Serif (Georgia)", font: "Georgia, 'Playfair Display', serif" },
  { id: "tech", name: "Clean Tech (Plus Jakarta)", font: "'Plus Jakarta Sans', 'Segoe UI', sans-serif" },
  { id: "mono", name: "Studio Mono (JetBrains)", font: "'JetBrains Mono', 'SF Mono', monospace" },
];

export const SCALE_PRESETS = [
  { id: "compact", name: "Compact (92.5%)", scale: "92.5%" },
  { id: "standard", name: "Standard (100%)", scale: "100%" },
  { id: "spacious", name: "Spacious (107.5%)", scale: "107.5%" },
];

export function applyThemeToDocument(config: Partial<StudioThemeConfig>) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  if (config.accentColor) {
    root.style.setProperty("--studio-accent", config.accentColor);
    const preset = THEME_PRESETS.find((p) => p.color === config.accentColor);
    if (preset) {
      root.style.setProperty("--studio-accent-hover", preset.hover);
      root.style.setProperty("--studio-accent-ring", preset.ring);
    } else {
      root.style.setProperty("--studio-accent-hover", config.accentColor);
      root.style.setProperty("--studio-accent-ring", `${config.accentColor}40`);
    }
  }

  if (config.fontFamily) {
    root.style.setProperty("--studio-font-family", config.fontFamily);
    document.body.style.fontFamily = config.fontFamily;
  }

  if (config.fontScale) {
    root.style.setProperty("--studio-font-scale", config.fontScale);
    root.style.fontSize = config.fontScale;
  }
}

export function ThemeApplier() {
  useEffect(() => {
    function loadAndApply() {
      try {
        const saved = localStorage.getItem("trizenai_user_theme");
        if (saved) {
          const config: StudioThemeConfig = JSON.parse(saved);
          applyThemeToDocument(config);
        }
      } catch (e) {
        console.warn("Theme load error:", e);
      }
    }

    // Apply on mount
    loadAndApply();

    // Listen to custom theme events dispatched from settings
    function handleThemeChange(e: Event) {
      const customEvent = e as CustomEvent<Partial<StudioThemeConfig>>;
      if (customEvent.detail) {
        applyThemeToDocument(customEvent.detail);
      } else {
        loadAndApply();
      }
    }

    window.addEventListener("studio-theme-change", handleThemeChange);
    window.addEventListener("storage", loadAndApply);

    return () => {
      window.removeEventListener("studio-theme-change", handleThemeChange);
      window.removeEventListener("storage", loadAndApply);
    };
  }, []);

  return null;
}
