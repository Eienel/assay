'use client';

import { useEffect, useState } from 'react';

// True on coarse-pointer devices. Used to strip hover-dependent flourishes
// (lift, tilt, magnetic) on phones, where they only cause sticky states.
export function useIsTouch(): boolean {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setTouch(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return touch;
}
