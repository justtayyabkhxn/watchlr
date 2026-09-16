"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Download } from "lucide-react";

type Platform = "unknown" | "android" | "other" | "hidden";

/**
 * Android browsers get a loud sticker pill — that's the only place the APK
 * can actually be installed. Everywhere else it stays a quiet icon button.
 * Inside the installed app it renders nothing.
 *
 * Starts as "unknown" so the server markup and the first client render match;
 * the real platform lands after mount.
 */
function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>("unknown");

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setPlatform("hidden");
      return;
    }
    setPlatform(/android/i.test(navigator.userAgent) ? "android" : "other");
  }, []);

  return platform;
}

export function GetAppButton() {
  const platform = usePlatform();

  if (platform === "hidden" || platform === "unknown") return null;

  if (platform === "android") {
    return (
      <a
        href="/watchlr.apk"
        download
        className="group/apk inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border-2 border-ink bg-accent px-3 text-xs font-black shadow-offset-xs sm:h-10 sm:px-4 sm:text-sm transition-all duration-150 hover:-translate-x-px hover:-translate-y-px hover:-rotate-2 hover:shadow-offset-sm active:translate-x-[2px] active:translate-y-[2px] active:rotate-0 active:shadow-none"
      >
        <Download
          className="size-4 transition-transform duration-200 group-hover/apk:translate-y-0.5"
          strokeWidth={2.5}
          aria-hidden
        />
        Get app
      </a>
    );
  }

  return (
    <a
      href="/watchlr.apk"
      download
      title="Download the Android app"
      aria-label="Download the watchlr Android app"
      className="group/apk hidden size-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-card shadow-offset-xs transition-all duration-150 hover:-rotate-6 hover:bg-accent-soft active:translate-x-[2px] active:translate-y-[2px] active:rotate-0 active:shadow-none md:grid"
    >
      <Download className="size-4 transition-transform duration-200 group-hover/apk:translate-y-0.5" aria-hidden />
    </a>
  );
}
