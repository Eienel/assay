'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { reveal, stagger } from '@/lib/motion';

// Scroll reveal via framer-motion whileInView (IntersectionObserver under the
// hood), once only. Collapses to a plain block under reduced motion.
export function Reveal({
  children,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'li';
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Comp
      className={className}
      variants={reveal}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '-12% 0px' }}
    >
      {children}
    </Comp>
  );
}

// A container that staggers its Reveal-style children into view.
export function RevealGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={stagger}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '-10% 0px' }}
    >
      {children}
    </motion.div>
  );
}

// A child of RevealGroup. Rises as its turn comes up in the stagger.
export function RevealItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={reveal}>
      {children}
    </motion.div>
  );
}
