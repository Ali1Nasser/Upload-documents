import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Bloom, EffectComposer} from '@react-three/postprocessing';
import * as THREE from 'three';
import {C} from '../tokens';

const N = 3000;

const Points: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = useRef<THREE.InstancedMesh>(null);
  const base = useMemo(
    () =>
      Array.from({length: N}, (_, i) => {
        const th = random(`t${i}`) * Math.PI * 2;
        const ph = Math.acos(2 * random(`h${i}`) - 1);
        const r = 2.5 + random(`r${i}`) * 2.2;
        return new THREE.Vector3(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph));
      }),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const col = new THREE.Color();
    for (let i = 0; i < N; i++) {
      dummy.position.copy(base[i]);
      dummy.scale.setScalar(0.03 + random(`s${i}`) * 0.05);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      col.set(i % 5 === 0 ? C.violet : C.signal).multiplyScalar(2.2);
      m.setColorAt(i, col);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [base, dummy]);
  const rot = frame * 0.01;
  return (
    <group rotation={[0.3, rot, 0]}>
      <instancedMesh ref={ref} args={[undefined, undefined, N]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
};

export const BenchR3F: React.FC = () => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, ${C.ground} 0%, ${C.void} 80%)`}}>
      <ThreeCanvas width={width} height={height} camera={{position: [0, 0, 9], fov: 50}} gl={{alpha: true, antialias: false}}>
        <color attach="background" args={[C.void]} />
        <Points />
        <EffectComposer>
          <Bloom intensity={1.0} luminanceThreshold={0.75} luminanceSmoothing={0.2} mipmapBlur />
        </EffectComposer>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
