"use client";

import { motion, type Variants } from "motion/react";
import type { ComponentProps } from "react";

// ─── Shared variants ──────────────────────────────────────────────────────────

/** Fade + slide up — used for individual elements. */
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
  },
};

/** Fade + slide down — used for elements entering from above. */
export const fadeDownVariants: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};

/** Pure fade — used for dividers, backgrounds, subtle elements. */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

/**
 * Stagger container — wraps children and staggers their `visible` animation.
 * Children should use any of the variants above.
 */
export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

// ─── Components ───────────────────────────────────────────────────────────────

type DivProps = ComponentProps<typeof motion.div>;

interface FadeInProps extends DivProps {
  /** Which direction to enter from. Default: "up" */
  direction?: "up" | "down" | "none";
  /** Delay in seconds before the animation starts. Default: 0 */
  delay?: number;
}

/**
 * Drop-in replacement for any animated wrapper div.
 * Animates once on mount — no scroll trigger needed for above-the-fold content.
 *
 * @example
 * <FadeIn delay={0.1}>
 *   <p>Hello</p>
 * </FadeIn>
 */
export function FadeIn({
  direction = "up",
  delay = 0,
  children,
  className,
  ...props
}: FadeInProps) {
  const variants =
    direction === "down"
      ? fadeDownVariants
      : direction === "none"
        ? fadeVariants
        : fadeUpVariants;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={
        delay > 0
          ? {
              hidden: variants.hidden,
              visible: {
                ...(variants.visible as object),
                transition: {
                  ...(
                    variants.visible as {
                      transition?: Record<string, unknown>;
                    }
                  ).transition,
                  delay,
                },
              },
            }
          : variants
      }
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger container — children animate in sequence.
 * Each direct child should be wrapped in a `<motion.div>` with a variant.
 *
 * @example
 * <StaggerChildren>
 *   <motion.div variants={fadeUpVariants}>Item 1</motion.div>
 *   <motion.div variants={fadeUpVariants}>Item 2</motion.div>
 * </StaggerChildren>
 */
export function StaggerChildren({
  children,
  className,
  ...props
}: DivProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainerVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
