import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface LogoProps {

  size?: number;

  asLink?: boolean;
  className?: string;
}

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

interface LogoSvgProps {
  size: number;
  className?: string;
}

const RECT = {
  x: 112,
  y: 10,
  width: 59,
  height: 28,
  rx: 14,
} as const;

const CIRCLE_WIDTH = RECT.height;
const CIRCLE_X = RECT.x;

const DELAY = 5;
const MORPH = 0.6;
const HOLD = 1.2;
const CYCLE = DELAY + MORPH + HOLD + MORPH;

const t0 = 0;
const t1 = DELAY / CYCLE;
const t2 = (DELAY + MORPH) / CYCLE;
const t3 = (DELAY + MORPH + HOLD) / CYCLE;
const t4 = (DELAY + MORPH + HOLD + MORPH) / CYCLE;
const t5 = 1;

const keyTimes = [t0, t1, t2, t3, t4, t5].join(";");

const keySplines = [
  "0 0 1 1",
  "0.42 0 0.58 1",
  "0 0 1 1",
  "0.42 0 0.58 1",
  "0 0 1 1",
].join(";");

const calcMode = "spline";
const dur = `${CYCLE}s`;
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
      {}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .trexo-o * { animation-play-state: paused; }
          .trexo-o animate { display: none; }
        }
      `}</style>

      {}
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

      {}
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
        {}
        <animate
          attributeName="width"
          values={[RECT.width, RECT.width, CIRCLE_WIDTH, CIRCLE_WIDTH, RECT.width, RECT.width].join(";")}
          keyTimes={keyTimes}
          keySplines={keySplines}
          calcMode={calcMode}
          dur={dur}
          repeatCount={repeatCount}
        />

        {}
        <animate
          attributeName="x"
          values={[RECT.x, RECT.x, CIRCLE_X, CIRCLE_X, RECT.x, RECT.x].join(";")}
          keyTimes={keyTimes}
          keySplines={keySplines}
          calcMode={calcMode}
          dur={dur}
          repeatCount={repeatCount}
        />

        {}
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
