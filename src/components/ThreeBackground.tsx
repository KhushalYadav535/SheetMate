// src/components/ThreeBackground.tsx
"use client";
import React, { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ConstellationMesh() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const count = 70; // Perfect count for smooth, high-FPS constellation renders

  // Initial positions and velocities
  const { positions, velocities, initialPos } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const init = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Position spread
      const x = (Math.random() - 0.5) * 8.5;
      const y = (Math.random() - 0.5) * 6.5;
      const z = (Math.random() - 0.5) * 4.0;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      
      init[i * 3] = x;
      init[i * 3 + 1] = y;
      init[i * 3 + 2] = z;

      // Velocities
      vel[i * 3] = (Math.random() - 0.5) * 0.22;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.22;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
    }
    return { positions: pos, velocities: vel, initialPos: init };
  }, []);

  // Pre-calculate index connection pairs at start (for close particles)
  const lineIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < count; i++) {
      let connections = 0;
      for (let j = i + 1; j < count; j++) {
        const dx = initialPos[i * 3] - initialPos[j * 3];
        const dy = initialPos[i * 3 + 1] - initialPos[j * 3 + 1];
        const dz = initialPos[i * 3 + 2] - initialPos[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 2.0 && connections < 3) {
          indices.push(i, j);
          connections++;
        }
      }
    }
    return new Uint16Array(indices);
  }, [initialPos]);

  // Line positions array (updated in runtime frame loop)
  const linePositions = useMemo(() => {
    return new Float32Array(lineIndices.length * 3);
  }, [lineIndices]);

  useFrame((state, delta) => {
    const pAttr = pointsRef.current?.geometry.attributes.position;
    const lAttr = linesRef.current?.geometry.attributes.position;

    if (!pAttr || !lAttr) return;

    // Normalizing mouse to fit visible webgl scale coordinates
    const mouseX = state.mouse.x * 4.5;
    const mouseY = state.mouse.y * 3.5;

    // 1. Move points & apply mouse repulsion field
    for (let i = 0; i < count; i++) {
      let x = pAttr.getX(i);
      let y = pAttr.getY(i);
      let z = pAttr.getZ(i);

      let vx = velocities[i * 3];
      let vy = velocities[i * 3 + 1];
      let vz = velocities[i * 3 + 2];

      x += vx * delta;
      y += vy * delta;
      z += vz * delta;

      // Soft borders rebound
      if (Math.abs(x) > 4.5) velocities[i * 3] = -vx;
      if (Math.abs(y) > 3.5) velocities[i * 3 + 1] = -vy;
      if (Math.abs(z) > 2.5) velocities[i * 3 + 2] = -vz;

      // Magnetic mouse hover push
      const dx = x - mouseX;
      const dy = y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1.8) {
        const force = (1.8 - dist) * 0.06;
        x += (dx / dist) * force;
        y += (dy / dist) * force;
      }

      pAttr.setXYZ(i, x, y, z);
    }
    pAttr.needsUpdate = true;

    // 2. Synchronize connected line vertices positions
    for (let k = 0; k < lineIndices.length / 2; k++) {
      const idxA = lineIndices[k * 2];
      const idxB = lineIndices[k * 2 + 1];

      const ax = pAttr.getX(idxA);
      const ay = pAttr.getY(idxA);
      const az = pAttr.getZ(idxA);

      const bx = pAttr.getX(idxB);
      const by = pAttr.getY(idxB);
      const bz = pAttr.getZ(idxB);

      lAttr.setXYZ(k * 2, ax, ay, az);
      lAttr.setXYZ(k * 2 + 1, bx, by, bz);
    }
    lAttr.needsUpdate = true;
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#a78bfa"
          size={0.06}
          sizeAttenuation={true}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
            count={linePositions.length / 3}
            array={linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#312e81"
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </>
  );
}

export default function ThreeBackground() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none",
        background: "radial-gradient(circle at 50% 50%, #07060f 0%, #010102 100%)"
      }}
    >
      {!isMobile && (
        <Canvas camera={{ position: [0, 0, 4.2], fov: 60 }}>
          <ConstellationMesh />
        </Canvas>
      )}
    </div>
  );
}
