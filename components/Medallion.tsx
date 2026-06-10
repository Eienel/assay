'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';
import { useReducedMotion } from 'framer-motion';
import * as THREE from 'three';

// The signature object: an assayed gold medallion struck with the hallmark.
// It faces the viewer, catches warm studio light, and breathes with a gentle
// tilt that follows the cursor. On metaphor (the office tests precious metal),
// original rather than stock, and it is the thing a viewer describes afterward.

const BRASS = '#A8742A';
const BRASS_DEEP = '#7c521b';

function Relief() {
  // The assayer's A, in raised relief on the face, plus the struck dot.
  const bar = (
    <meshStandardMaterial color={BRASS_DEEP} metalness={1} roughness={0.22} />
  );
  return (
    <group position={[0, 0.04, 0.1]}>
      <mesh position={[-0.24, 0, 0]} rotation={[0, 0, 0.36]}>
        <boxGeometry args={[0.13, 0.95, 0.08]} />
        {bar}
      </mesh>
      <mesh position={[0.24, 0, 0]} rotation={[0, 0, -0.36]}>
        <boxGeometry args={[0.13, 0.95, 0.08]} />
        {bar}
      </mesh>
      <mesh position={[0, -0.13, 0]}>
        <boxGeometry args={[0.44, 0.13, 0.08]} />
        {bar}
      </mesh>
      <mesh position={[0, -0.56, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 0.08, 24]} />
        {bar}
      </mesh>
    </group>
  );
}

function Coin({ reduce }: { reduce: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    // Pointer parallax, eased. Pointer rests at 0 on touch, so it sits still.
    const px = state.pointer.x * 0.45;
    const py = state.pointer.y * 0.3;
    if (reduce) {
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -0.06, 0.1);
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, -0.18, 0.1);
      return;
    }
    // A slow living tilt, the coin examined under the light. Always face-on
    // enough to read the hallmark; never a full spin.
    const targetY = Math.sin(t * 0.5) * 0.4 + px;
    const targetX = -0.05 + Math.cos(t * 0.4) * 0.06 - py;
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, targetY, 0.05);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, targetX, 0.05);
    void delta;
  });

  return (
    <group ref={group}>
      {/* The disc, axis turned to face the camera */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.2, 0.2, 120]} />
        <meshStandardMaterial color={BRASS} metalness={1} roughness={0.32} />
      </mesh>
      {/* Milled rim framing the face */}
      <mesh position={[0, 0, 0.085]}>
        <torusGeometry args={[1.07, 0.055, 20, 120]} />
        <meshStandardMaterial color={BRASS} metalness={1} roughness={0.24} />
      </mesh>
      <Relief />
    </group>
  );
}

export default function Medallion() {
  const reduce = !!useReducedMotion();
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.1, 4.1], fov: 36 }}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 4, 5]} intensity={1.2} />
      <directionalLight position={[-4, -2, 2]} intensity={0.3} color="#c9a36a" />

      <Coin reduce={reduce} />

      {/* Soft contact shadow grounds the coin on the paper. */}
      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.32}
        scale={6}
        blur={2.6}
        far={3}
        color="#1a1815"
      />

      {/* Studio environment baked from light shapes, no external HDRI needed. */}
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#1a1815']} />
        <Lightformer form="rect" intensity={3.2} position={[0, 2, 4]} scale={[9, 9, 1]} color="#fff1d6" />
        <Lightformer form="rect" intensity={1.8} position={[-5, 1, 3]} scale={[4, 6, 1]} color="#ffffff" />
        <Lightformer form="ring" intensity={2.4} position={[4, 0, 3]} scale={[3, 3, 1]} color="#ffd9a0" />
        <Lightformer form="rect" intensity={1} position={[0, -3, 2]} scale={[6, 3, 1]} color="#b88a4e" />
      </Environment>
    </Canvas>
  );
}
