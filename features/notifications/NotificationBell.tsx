"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, Trophy, Clock, Info } from "lucide-react";

interface NotificationItem {
  id: string;
  type: "achievement" | "system" | "reminder";
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}

const ICONS = {
  achievement: Trophy,
  reminder: Clock,
  system: Info,
} as const;

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<{ unreadCount: number; notifications: NotificationItem[] }> => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return { unreadCount: 0, notifications: [] };
      return res.json();
    },
    // Light background polling so achievements/reminders surface without a reload.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const markAll = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications", { method: "PATCH", body: "{}" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = data?.unreadCount ?? 0;
  const items = data?.notifications ?? [];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        aria-expanded={open}
        className="relative grid size-9 place-items-center rounded-full border-2 border-ink bg-card shadow-offset-xs transition-all duration-150 hover:-rotate-6 hover:scale-110 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        <Bell className="size-4.5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-4.5 place-items-center rounded-full border-2 border-background bg-accent px-1 text-[10px] font-black leading-none text-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-3xl border-2 border-ink bg-card shadow-offset-lg"
          >
            <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
              <p className="text-sm font-black">Notifications</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-muted transition-colors hover:text-ink"
                >
                  <CheckCheck className="size-3.5" aria-hidden /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm font-bold text-muted">
                  Nothing here yet. Keep watching and achievements will land here.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((n) => {
                    const Icon = ICONS[n.type] ?? Info;
                    const body = (
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border-2 ${
                            n.type === "achievement"
                              ? "border-ink bg-accent text-ink"
                              : "border-border bg-background text-muted"
                          }`}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold leading-snug">{n.message}</p>
                          <p className="mt-0.5 text-[11px] font-bold text-muted">
                            {timeAgo(n.createdAt)}
                          </p>
                        </div>
                        {!n.read && (
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />
                        )}
                      </div>
                    );
                    const className = `block px-4 py-3 text-left transition-colors hover:bg-surface-hover ${
                      n.read ? "" : "bg-accent-soft/40"
                    }`;
                    return (
                      <li key={n.id}>
                        {n.link ? (
                          <Link
                            href={n.link}
                            className={className}
                            onClick={() => {
                              if (!n.read) markOne.mutate(n.id);
                              setOpen(false);
                            }}
                          >
                            {body}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className={`w-full ${className}`}
                            onClick={() => !n.read && markOne.mutate(n.id)}
                          >
                            {body}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
