import type { Transition, Variants } from 'framer-motion';

// One spring, shared by every component, so motion feels like one hand made it.
// Maps to the house easing curve cubic-bezier(0.16, 1, 0.3, 1).
export const SPRING: Transition = { type: 'spring', stiffness: 120, damping: 18 };

// The house curve for tweens that are not springs (path draws, sheens).
export const EASE = [0.16, 1, 0.3, 1] as const;

// Button physics: lift on hover, sink on press. Fast, physical, never layout.
export const liftHover = { y: -1, transition: { duration: 0.18, ease: EASE } };
export const sinkTap = { y: 1, scale: 0.98, transition: { duration: 0.1, ease: EASE } };

// Scroll reveal: a quiet rise, run once when the element enters. Storytelling
// and hierarchy, never decoration.
export const reveal: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: SPRING },
};

// Stagger container for revealing children in sequence (60 to 90ms apart).
export const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.075 } },
};
