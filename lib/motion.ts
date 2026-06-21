import type { Transition, Variants } from 'framer-motion';

// One spring, one curve, shared everywhere. Motion dial ~5: purposeful, never
// cinematic. Every animation maps to a job: reveal, feedback, or state change.
export const SPRING: Transition = { type: 'spring', stiffness: 120, damping: 18 };
export const EASE = [0.16, 1, 0.3, 1] as const;

export const liftHover = { y: -1, transition: { duration: 0.18, ease: EASE } };
export const sinkTap = { y: 1, scale: 0.985, transition: { duration: 0.1, ease: EASE } };

export const reveal: Variants = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07 } },
};
