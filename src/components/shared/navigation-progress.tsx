"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { Logo } from "@/components/shared/logo";

// ─── Global loading state (module-level singleton) ────────────────────────────

type Listener = (loading: boolean) => void;
const listeners = new Set<Listener>();

// Guards against firing before the router has initialised on the client.
// Set to true inside a useEffect (runs only after full hydration).
let _routerReady = false;

function setGlobalLoading(val: boolean) {
  if (!_routerReady) return;
  listeners.forEach((fn) => fn(val));
}

function useGlobalLoading() {
  // Always start false — avoids SSR/hydration mismatch
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const fn: Listener = (v) => setLoading(v);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return loading;
}

// ─── Navigation interceptor ───────────────────────────────────────────────────

function NavigationInterceptor() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const navKey       = `${pathname}?${searchParams}`;
  const prevKeyRef   = useRef(navKey);

  // Mark router as ready after first mount (post-hydration)
  useEffect(() => {
    _routerReady = true;
    return () => { _routerReady = false; };
  }, []);

  // Start progress bar / overlay on anchor click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!_routerReady) return;

      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // ── Skip external, mailto, tel ──────────────────────────────────────────
      if (
        href.startsWith("http") ||
        href.startsWith("//")   ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) return;

      // ── Skip pure hash links (#section) ────────────────────────────────────
      if (href.startsWith("#")) return;

      // ── Skip same-page hash links (/#features, /page#section) ──────────────
      // These only scroll — the pathname never changes, so no page load occurs.
      const [hrefPath, hrefHash] = href.split("#");
      const normHrefPath = hrefPath || "/";
      const currentPath  = window.location.pathname;

      if (hrefHash !== undefined && normHrefPath === currentPath) return;

      // ── Skip if already on the same path (no hash) ──────────────────────────
      if (!hrefHash && normHrefPath === currentPath) return;

      // ── Skip if modifier key held (open in new tab, etc.) ───────────────────
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      setGlobalLoading(true);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // Stop loading when the new page has rendered (pathname/search changed)
  useEffect(() => {
    if (navKey === prevKeyRef.current) return;
    prevKeyRef.current = navKey;
    const t = setTimeout(() => setGlobalLoading(false), 200);
    return () => clearTimeout(t);
  }, [navKey]);

  return null;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar() {
  const loading     = useGlobalLoading();
  const barRef      = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const widthRef    = useRef(0);

  useEffect(() => {
    const bar = document.createElement("div");
    bar.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "height:2px",
      "width:0%",
      "z-index:99999",
      "pointer-events:none",
      "transition:width 0.2s ease-out,opacity 0.2s ease",
      "opacity:0",
      "background:var(--primary)",
      "box-shadow:0 0 6px 0 var(--primary)",
    ].join(";");
    document.body.appendChild(bar);
    barRef.current = bar;
    return () => { bar.parentNode?.removeChild(bar); };
  }, []);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    if (loading) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (hideRef.current)     clearTimeout(hideRef.current);
      widthRef.current  = 8;
      bar.style.width   = "8%";
      bar.style.opacity = "1";

      intervalRef.current = setInterval(() => {
        const w   = widthRef.current;
        const inc = w < 30 ? 5 : w < 60 ? 3 : w < 85 ? 1 : 0;
        if (inc === 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return;
        }
        widthRef.current = Math.min(w + inc, 85);
        bar.style.width  = `${widthRef.current}%`;
      }, 120);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      bar.style.width = "100%";
      hideRef.current = setTimeout(() => {
        bar.style.opacity = "0";
        hideRef.current   = setTimeout(() => {
          bar.style.width  = "0%";
          widthRef.current = 0;
        }, 200);
      }, 120);
    }
  }, [loading]);

  return null;
}

// ─── Full-screen loading overlay ─────────────────────────────────────────────

// Only show the overlay if loading takes longer than this threshold.
// Prevents a flash on fast navigations (cached pages, same-layout routes).
const OVERLAY_DELAY_MS = 300;

function LoadingOverlay() {
  const loading   = useGlobalLoading();
  const [show, setShow] = useState(false);
  const delayRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  // Only render on the client — avoids SSR portal issues
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (loading) {
      if (hideRef.current)  { clearTimeout(hideRef.current);  hideRef.current  = null; }
      delayRef.current = setTimeout(() => setShow(true), OVERLAY_DELAY_MS);
    } else {
      if (delayRef.current) { clearTimeout(delayRef.current); delayRef.current = null; }
      hideRef.current = setTimeout(() => setShow(false), 200);
    }
    return () => {
      if (delayRef.current) clearTimeout(delayRef.current);
      if (hideRef.current)  clearTimeout(hideRef.current);
    };
  }, [loading]);

  if (!mounted || !show) return null;

  return createPortal(
    <div
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          99998,
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        justifyContent:  "center",
        gap:             "20px",
        background:      "var(--background)",
        animation:       "trexo-fade-in 0.15s ease-out forwards",
      }}
      aria-live="polite"
      aria-label="Loading…"
    >
      <style>{`
        @keyframes trexo-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .trexo-loading-dots { display: flex; gap: 10px; }
        .trexo-loading-dots span {
          width: 10px; height: 10px; border-radius: 50%;
          background: var(--primary); opacity: 0.3;
          animation: trexo-dot 1.2s ease-in-out infinite;
        }
        .trexo-loading-dots span:nth-child(1) { animation-delay: 0s;   }
        .trexo-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .trexo-loading-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes trexo-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(1);   }
          40%            { opacity: 1;   transform: scale(1.3); }
        }
        @media (prefers-reduced-motion: reduce) {
          .trexo-loading-dots span { animation: none; opacity: 0.6; }
        }
      `}</style>

      <Logo size={56} asLink={false} />

      <div className="trexo-loading-dots" aria-hidden>
        <span /><span /><span />
      </div>
    </div>,
    document.body,
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * NavigationProgress — slim top progress bar + full-screen branded overlay
 * on every client-side navigation.
 *
 * The overlay only appears after 300ms so fast navigations (cached routes,
 * same-layout transitions) never show a flash.
 *
 * Hash-only links (/#features, #section) are explicitly excluded — they
 * only scroll the page and never trigger a route change.
 *
 * Must be wrapped in <Suspense fallback={null}> in the root layout because
 * NavigationInterceptor uses useSearchParams().
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
