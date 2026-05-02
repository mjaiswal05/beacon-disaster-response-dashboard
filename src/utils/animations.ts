/**
 * Beacon Design System - Framer Motion Animation Tokens
 *
 * Apple-grade principles:
 *  • Spring physics everywhere - never linear easing
 *  • Purposeful: every animation communicates state, not decoration
 *  • Subtle: y offsets ≤ 14px, scale ≤ 1.10 / ≥ 0.92
 *  • Fast: interactions < 200ms, page reveals < 350ms
 *  • Consistent: same spring configs across similar elements
 */

import type { Transition, Variants } from "framer-motion";

// ── Spring configs ─────────────────────────────────────────────────────────────

/** Default interactive spring - snappy, zero overshoot */
export const spring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
};

/** Gentle spring for content reveals and panels */
export const springGentle: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 26,
};

/** Snappy spring for micro-interactions (button press, icon tap) */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 35,
};

// ── Page-level transition ──────────────────────────────────────────────────────

export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: springGentle },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

// ── Content reveal variants ────────────────────────────────────────────────────

/** Fade up from below - primary reveal for cards, panels, sections */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: springGentle },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: springGentle },
};

/** Slide from the left */
export const slideRight: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: springGentle },
};

/** Slide from the right */
export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 12 },
  visible: { opacity: 1, x: 0, transition: springGentle },
};

// ── Stagger containers ─────────────────────────────────────────────────────────

/** Standard stagger - 55 ms between children */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};

/** Fast stagger - 30 ms between children, for dense lists */
export const staggerFast: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } },
};

// ── Modal / overlay ────────────────────────────────────────────────────────────

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.14 } },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...springGentle, delay: 0.04 },
  },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.14 } },
};

// ── Filter / collapse panels ───────────────────────────────────────────────────

/** Height-collapse animation - always pair with style={{ overflow: 'hidden' }} */
export const expandCollapse: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: { ...springGentle, staggerChildren: 0.03 },
  },
  exit: { opacity: 0, height: 0, transition: { duration: 0.18 } },
};

// ── List items (used inside AnimatePresence) ───────────────────────────────────

/** Slides in from the left, exits to the right */
export const listItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: springGentle },
  exit: { opacity: 0, x: 30, scale: 0.97, transition: { duration: 0.15 } },
};
