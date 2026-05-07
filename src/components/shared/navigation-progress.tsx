"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { Logo } from "@/components/shared/logo";

// ─── Global loading state (module-level singleton) ────────────────────────────
// Shared between the interceptor (click listener) and the overlay component.

type Listener = (loading: boolean) => void;
const listeners = new Set<Listener>();
let _loading = false;

function setGlobalLoading(val: boolean) {
  _loading = val;
  listeners.forEach((fn) => fn(val));
}

function useGlobalLoading() {
  const [loading, setLoading] = useState(_loading);
  useEffect(() => {
    const fn: Listener = (v) => setLoading(v);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return loading;
}

// ─── Navigation interceptor ───────────────────────────────────────────────────
// Listens for clicks on <a> tags that trigger same-origin navigations.
// Fires BEFORE the router starts fetching — this is the key difference.

function NavigationInterceptor() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const navKey       = `${pathname}?${searchParams}`;
  const prevKeyRef   = useRef(navKey);

  // Start loading on anchor click (before navigation begins)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Only intercept same-origin, non-hash, non-external links
      const isExternal = href.startsWith("http") || href.startsWith("//");
      const isHash     = href.startsWith("#");
      const isMailTo   = href.startsWith("mailto:");
      const isTel      = href.startsWith("tel:");
      if (isExternal || isHash || isMailTo || isTel) return;

      // Don't show loading if navigating to the same page
      const targetPath = href.split("?")[0];
      const currentPath = window.location.pathname;
      if (targetPath === currentPath) return;

      // Don't intercept if modifier keys are held (open in new tab etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      setGlobalLoading(true);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // Stop loading when the new page has rendered (pathname changed)
  useEffect(() => {
    if (navKey === prevKeyRef.current) return;
    prevKeyRef.current = navKey;

    // Small linger so the overlay doesn't flash off immediately
    const t = setTimeout(() => setGlobalLoading(false), 250);
    return () => clearTimeout(t);
  }, [navKey]);

  return null;
}

// ─── Progress bar (DOM-based, no React state in effects) ──────────────────────

function ProgressBar() {
  const loading     = useGlobalLoading();
  const barRef      = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const widthRef    = useRef(0);

  useEffect(() => {
    const bar = document.createElement("div");
    bar.style.cssText = [
      "position:fixed", "top:0", "left:0", "height:2px", "width:0%",
      "z-index:99999", "pointer-events:none",
      "transition:width 0.25s ease-out,opacity 0.2s ease",
      "opacity:0",
      "background:var(--primary)",
      "box-shadow:0 0 8px 0px var(--primary)",
    ].join(";");
    document.body.appendChild(bar);
    barRef.current = bar;
    return () => { if (bar.parentNode) bar.parentNode.removeChild(bar); };
  }, []);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    if (loading) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (hideRef.current)     clearTimeout(hideRef.current);
      widthRef.current  = 5;
      bar.style.width   = "5%";
      bar.style.opacity = "1";
      intervalRef.current = setInterval(() => {
        const w   = widthRef.current;
        const inc = w < 30 ? 6 : w < 60 ? 3 : w < 85 ? 1 : 0;
        if (inc === 0) { clearInterval(intervalRef.current!); intervalRef.current = null; return; }
        widthRef.current = Math.min(w + inc, 85);
        bar.style.width  = `${widthRef.current}%`;
      }, 100);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      bar.style.width = "100%";
      hideRef.current = setTimeout(() => {
        bar.style.opacity = "0";
        hideRef.current   = setTimeout(() => { bar.style.width = "0%"; widthRef.current = 0; }, 200);
      }, 150);
    }
  }, [loading]);

  return null;
}

// ─── Full-screen loading overlay ─────────────────────────────────────────────

const OVERLAY_DELAY_MS = 250; // only show overlay if loading > 250ms

function LoadingOverlay() {
  const loading = useGlobalLoading();
  const [show, setShow] = useState(false);
  const delayRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBrowser = typeof window !== "undefined";

  useEffect(() => {
    if (loading) {
      if (hideRef.current)  { clearTimeout(hideRef.current);  hideRef.current  = null; }
      delayRef.current = setTimeout(() => setShow(true), OVERLAY_DELAY_MS);
    } else {
      if (delayRef.current) { clearTimeout(delayRef.current); delayRef.current = null; }
      // Linger briefly so it doesn't flash off
      hideRef.current = setTimeout(() => setShow(false), 200);
    }
    return () => {
      if (delayRef.current) clearTimeout(delayRef.current);
      if (hideRef.current)  clearTimeout(hideRef.current);
    };
  }, [loading]);

  if (!isBrowser || !show) return null;

  return createPortal(
    <div
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         99998,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            "20px",
        background:     "var(--background)",
        animation:      "trexo-fade-in 0.15s ease-out forwards",
      }}
      aria-live="polite"
      aria-label="Loading…"
    >
      <style>{`
        @keyframes trexo-fade-in {
          from { opacity: 0; } to { opacity: 1; }
        }
        .trexo-loading-dots { display:flex; gap:10px; }
        .trexo-loading-dots span {
          width:10px; height:10px; border-radius:50%;
          background:var(--primary); opacity:0.3;
          animation:trexo-dot 1.2s ease-in-out infinite;
        }
        .trexo-loading-dots span:nth-child(1){animation-delay:0s}
        .trexo-loading-dots span:nth-child(2){animation-delay:.2s}
        .trexo-loading-dots span:nth-child(3){animation-delay:.4s}
        @keyframes trexo-dot {
          0%,80%,100%{opacity:.3;transform:scale(1)}
          40%{opacity:1;transform:scale(1.3)}
        }
        @media(prefers-reduced-motion:reduce){
          .trexo-loading-dots span{animation:none;opacity:.6}
        }
      `}</style>

      <div>
        <Logo size={56} asLink={false} />
      </div>
      <div className="trexo-loading-dots" aria-hidden>
        <span /><span /><span />
      </div>
    </div>,
    document.body,
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * NavigationProgress — shows a progress bar + logo overlay BEFORE the new
 * page renders, by intercepting anchor clicks at the document level.
 *
 * Wrap in <Suspense fallback={null}> in the root layout.
 */
export function NavigationProgress() {
  return (
    <>
      <NavigationInterceptor />
      <ProgressBar />
      <LoadingOverlay />
    </>
  );
}
