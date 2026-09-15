"use client";

import { useEffect } from "react";

const suppressKeywords = [
  "bis_skin_checked",
  "bis_register",
  "bis_size",
  "bis_id",
  "A tree hydrated",
  "hydration-mismatch",
  "Hydration",
  "hydration",
  "chrome-extension://",
  "moz-extension://",
  "M_ID",
];

function shouldSuppress(args: any[]) {
  try {
    let fullText = "";
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (typeof a === "string") fullText += " " + a;
      else if (a && typeof a === "object") {
        try {
          fullText += " " + JSON.stringify(a);
        } catch (err) {
          fullText += " " + String(a);
        }
      } else {
        fullText += " " + String(a);
      }
    }
    for (let k = 0; k < suppressKeywords.length; k++) {
      if (fullText.includes(suppressKeywords[k])) return true;
    }
  } catch (e) {}
  return false;
}

// Intercept synchronously at module load time BEFORE React hydration starts!
if (typeof window !== "undefined") {
  const origError = console.error;
  console.error = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    origError.apply(console, args);
  };

  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    origWarn.apply(console, args);
  };
}

export function HydrationFix() {
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      if (
        event.filename?.includes("chrome-extension://") ||
        event.filename?.includes("moz-extension://") ||
        event.message?.includes("M_ID") ||
        event.message?.includes("bis_skin_checked")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason ? String(event.reason) : "";
      if (reason.includes("chrome-extension://") || reason.includes("M_ID")) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener("error", handleWindowError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection, true);

    return () => {
      window.removeEventListener("error", handleWindowError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
    };
  }, []);

  return null;
}
