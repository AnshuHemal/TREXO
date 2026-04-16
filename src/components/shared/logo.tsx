import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface LogoProps {
  /**
   * Controls the rendered height in px. Width scales proportionally.
   * Default: 32
   */
  size?: number;
  /** Wrap the logo in a Link to "/". Default: true */
  asLink?: boolean;
  className?: string;
}

/**
 * Trexo brand lockup.
 *
 * Renders as a single inline SVG:
 *   T R E X  [○]   ← the rounded-rectangle morphs into a circle and back
 *
 * Animation: after a 5s pause the pill squeezes into a perfect circle over
 * 0.6s (ease-in-out), holds for 1.2s, then expands back over 0.6s.
 * Total cycle = 7.4s. Respects prefers-reduced-motion.
 *
 * Everything uses `currentColor` — adapts to light / dark automatically.
 *
 * Usage:
 *   <Logo />                 — default size, linked to "/"
 *   <Logo size={40} />       — larger
 *   <Logo asLink={false} />  — standalone (e.g. auth pages)
 */
export function Logo({ size = 32, asLink = true, className }: LogoProps) {
  const content = (
    <LogoSvg
      size={size}
      className={cn(
        "select-none shrink-0",
        asLink &&
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm",
        className,
      )}
    />
  );

  if (!asLink) return content;

  return (
    <Link href="/" aria-label={`${siteConfig.name} — go to homepage`}>
      {content}
    </Link>
  );
}

// ─── SVG lockup ───────────────────────────────────────────────────────────────
//
// Rect geometry (SVG coordinate space):
//   width=59  height=28  rx=14  x=112  y=10
//
// Circle state — left edge fixed, width shrinks rightward:
//   width=28  rx=14  x=112  (x unchanged)
//
// Animation timeline (total cycle = 7.4s):
//   0.0s – 5.0s   hold pill      (5s idle before morphing)
//   5.0s – 5.6s   pill → circle  (0.6s ease-in-out)
//   5.6s – 6.8s   hold circle    (1.2s pause)
//   6.8s – 7.4s   circle → pill  (0.6s ease-in-out) → repeat

interface LogoSvgProps {
  size: number;
  className?: string;
}

// Rect base values
const RECT = {
  x: 112,
  y: 10,
  width: 59,
  height: 28,
  rx: 14,
} as const;

// Circle state — left edge stays fixed, width shrinks rightward
const CIRCLE_WIDTH = RECT.height; // 28
const CIRCLE_X = RECT.x;          // 112 — unchanged, collapses from right

// Animation timing (seconds)
// 5s idle → 0.6s morph in → 1.2s hold circle → 0.6s morph out → repeat
const DELAY = 5;
const MORPH = 0.6;
const HOLD = 1.2;
const CYCLE = DELAY + MORPH + HOLD + MORPH; // 7.4s total

// SMIL keyTimes and keySplines for a smooth ease-in-out morph
// keyTimes are normalised 0–1 over the full cycle duration
const t0 = 0;
const t1 = DELAY / CYCLE;                              // ~0.676 — start morphing
const t2 = (DELAY + MORPH) / CYCLE;                    // ~0.757 — circle reached
const t3 = (DELAY + MORPH + HOLD) / CYCLE;             // ~0.919 — start reverting
const t4 = (DELAY + MORPH + HOLD + MORPH) / CYCLE;     // 1.000  — pill restored
const t5 = 1;

const keyTimes = [t0, t1, t2, t3, t4, t5].join(";");

// cubic-bezier easing only applies between adjacent keyTimes pairs.
// "0 0 1 1" = linear (hold), "0.42 0 0.58 1" = ease-in-out (morph)
const keySplines = [
  "0 0 1 1",       // hold pill  (t0→t1)
  "0.42 0 0.58 1", // morph in   (t1→t2)
  "0 0 1 1",       // hold circle(t2→t3)
  "0.42 0 0.58 1", // morph out  (t3→t4)
  "0 0 1 1",       // hold pill  (t4→t5)
].join(";");

const calcMode = "spline";
const dur = `${CYCLE}s`; // 7.4s
const repeatCount = "indefinite";

function LogoSvg({ size, className: svgClassName }: LogoSvgProps) {
  const vbW = 176;
  const vbH = 48;

  const renderH = size;
  const renderW = Math.round((vbW / vbH) * renderH);

  return (
    <svg
      width={renderW}
      height={renderH}
      viewBox={`0 0 ${vbW} ${vbH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={siteConfig.name}
      role="img"
      className={svgClassName}
    >
      {/*
        Inject a <style> block so prefers-reduced-motion disables all SMIL
        animations inside this SVG without touching JS.
      */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .trexo-o * { animation-play-state: paused; }
          .trexo-o animate { display: none; }
        }
      `}</style>

      {/* "TREX" wordmark */}
      <text
        x="0"
        y="38"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="40"
        fontWeight="700"
        letterSpacing="1"
        fill="currentColor"
      >
        TREX
      </text>

      {/*
        The animated "O" — a rect that morphs between pill and circle.
        Three SMIL <animate> children drive:
          1. `width`  59 → 28 → 59
          2. `x`      112 → 127.5 → 112  (keeps the shape centred)
          3. `rx`     14 → 14 → 14  (stays constant — already half of height)
             rx is animated anyway so the easing curve is applied uniformly.
      */}
      <rect
        className="trexo-o"
        x={RECT.x}
        y={RECT.y}
        width={RECT.width}
        height={RECT.height}
        rx={RECT.rx}
        stroke="currentColor"
        strokeWidth="5"
      >
        {/* Animate width: pill → circle → pill */}
        <animate
          attributeName="width"
          values={[RECT.width, RECT.width, CIRCLE_WIDTH, CIRCLE_WIDTH, RECT.width, RECT.width].join(";")}
          keyTimes={keyTimes}
          keySplines={keySplines}
          calcMode={calcMode}
          dur={dur}
          repeatCount={repeatCount}
        />

        {/* Animate x: left edge stays fixed — shape collapses rightward */}
        <animate
          attributeName="x"
          values={[RECT.x, RECT.x, CIRCLE_X, CIRCLE_X, RECT.x, RECT.x].join(";")}
          keyTimes={keyTimes}
          keySplines={keySplines}
          calcMode={calcMode}
          dur={dur}
          repeatCount={repeatCount}
        />

        {/* Animate rx: stays at 14 throughout — circle is rx=height/2=14 */}
        <animate
          attributeName="rx"
          values={[RECT.rx, RECT.rx, CIRCLE_WIDTH / 2, CIRCLE_WIDTH / 2, RECT.rx, RECT.rx].join(";")}
          keyTimes={keyTimes}
          keySplines={keySplines}
          calcMode={calcMode}
          dur={dur}
          repeatCount={repeatCount}
        />
      </rect>
    </svg>
  );
}
