'use client';

import dynamic from 'next/dynamic';
import { Hallmark } from './Hallmark';

// The 3D scene is client-only and heavy, so it is dynamically imported with a
// calm static fallback: the flat hallmark mark, which is also what shows if
// WebGL is unavailable.
const Medallion = dynamic(() => import('./Medallion'), {
  ssr: false,
  loading: () => <Fallback />,
});

function Fallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Hallmark size={120} title="Assay" />
    </div>
  );
}

export function HeroMedallion() {
  return (
    <div className="relative mx-auto h-full w-full">
      <Medallion />
    </div>
  );
}
