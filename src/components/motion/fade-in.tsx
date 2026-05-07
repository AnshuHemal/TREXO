"use client";

import { motion, type Variants } from "motion/react";
import type { ComponentProps } from "react";

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export const fadeDownVariants: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

type DivProps = ComponentProps<typeof motion.div>;

interface FadeInProps extends DivProps {

  direction?: "up" | "down" | "none";

  delay?: number;
}

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
