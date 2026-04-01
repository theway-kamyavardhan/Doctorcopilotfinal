/* eslint-disable react/no-unknown-property */
import { useEffect, useRef, useState } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, Lightformer, Html } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';
import { User, Stethoscope, ShieldCheck } from 'lucide-react';

import cardGLB from '@/assets/lanyard/card.glb';

extend({ MeshLineGeometry, MeshLineMaterial });

const ROLES = {
  patient: { label: 'Patient', icon: User, color: '#06b6d4', gradient: 'from-cyan-400 to-teal-500', shadow: 'shadow-[0_0_30px_rgba(6,182,212,0.6)]' },
  doctor: { label: 'Doctor', icon: Stethoscope, color: '#8b5cf6', gradient: 'from-violet-500 to-fuchsia-500', shadow: 'shadow-[0_0_30px_rgba(139,92,246,0.6)]' },
  admin: { label: 'Admin', icon: ShieldCheck, color: '#f59e0b', gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-[0_0_30px_rgba(245,158,11,0.6)]' },
};

export default function Lanyard({
  position = [0, 0, 15],
  gravity = [0, -40, 0],
  fov = 16,
  role = 'patient',
  idValue = '',
  passValue = '',
  status = 'IDLE'
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const activeRole = ROLES[role] || ROLES.patient;

  return (
    <div className="w-full h-full min-h-[600px] select-none">
      <Canvas
        camera={{ position, fov }}
        dpr={[1, 1.25]}
        shadows={!isMobile}
        gl={{ antialias: false, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={Math.PI / 2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color={activeRole.color} />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={2.5} color={activeRole.color} castShadow={!isMobile} />

        <Physics gravity={gravity}>
          <Band role={role} idValue={idValue} passValue={passValue} status={status} isMobile={isMobile} />
        </Physics>

        <Environment blur={0.75}>
          <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color={activeRole.color} position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={12} color={activeRole.color} position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
        </Environment>
      </Canvas>
    </div>
  );
}

function Band({ role, idValue, passValue, status, isMobile }) {
  const band = useRef();
  const fixed = useRef();
  const j1 = useRef();
  const j2 = useRef();
  const j3 = useRef();
  const card = useRef();

  const { nodes, materials } = useGLTF(cardGLB);
  const [curve] = useState(() => new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]));
  const [dragged, drag] = useState(false);
  const [hovered, hover] = useState(false);
  
  const vec = new THREE.Vector3();
  const dir = new THREE.Vector3();
  
  const activeRole = ROLES[role] || ROLES.patient;
  const ActiveIcon = activeRole.icon;

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab';
      return () => void (document.body.style.cursor = 'auto');
    }
  }, [hovered, dragged]);

  // ✅ VERTICAL ROPE (FIXED) - SHORTER LENGTH
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 0.9]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 0.9]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 0.9]);

  // ✅ HOOK → CARD ATTACH (Pivot from Top)
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.8, 0]]);

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach(ref => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z });
    }

    // Subtle Swing (Air blowing feel)
    if (card.current && !dragged) {
      const t = state.clock.getElapsedTime();
      card.current.applyImpulse(
        { x: Math.sin(t * 0.45) * 0.006, y: 0, z: 0 },
        true
      );
    }

    // UPDATE STRAP GEOMETRY
    if (fixed.current) {
      [j1, j2].forEach(ref => {
        if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
        const clampedDistance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())));
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (20 + clampedDistance * 30)
        );
      });
      
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.lerped);
      curve.points[2].copy(j1.current.lerped);
      curve.points[3].copy(fixed.current.translation());
      
      if (band.current) {
        band.current.geometry.setPoints(curve.getPoints(isMobile ? 16 : 32));
      }
    }
  });

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} type="fixed" />

        <RigidBody ref={j1} position={[0, -0.3, 0]} angularDamping={12} linearDamping={12}>
          <BallCollider args={[0.1]} />
        </RigidBody>

        <RigidBody ref={j2} position={[0, -0.6, 0]} angularDamping={12} linearDamping={12}>
          <BallCollider args={[0.1]} />
        </RigidBody>

        <RigidBody ref={j3} position={[0, -0.9, 0]} angularDamping={12} linearDamping={12}>
          <BallCollider args={[0.1]} />
        </RigidBody>

        <RigidBody
          ref={card}
          position={[0, -1.5, 0]}
          linearDamping={15}
          angularDamping={15}
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider args={[0.8, 1.1, 0.01]} />

          <group 
            scale={2.25} 
            position={[0, -0.45, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={e => (e.target.releasePointerCapture(e.pointerId), drag(false))}
            onPointerDown={e => (
              e.target.setPointerCapture(e.pointerId),
              drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())))
            )}
          >
            {/* Card Mesh */}
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                color="white"
                clearcoat={1}
                clearcoatRoughness={0.1}
                roughness={0.02}
                metalness={0.02}
                transmission={0.99}
                thickness={0.15}
                ior={1.6}
                opacity={0.3}
                transparent
              />
              <Html 
                transform 
                position={[0, 0, 0.05]} 
                scale={0.065}
                className="pointer-events-none select-none"
                occlude="blending"
              >
                <div 
                  className="w-[320px] aspect-[1/1.58] rounded-[40px] flex flex-col items-center justify-between py-14 px-10 overflow-hidden relative shadow-2xl border border-white/20"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.45)',
                    backdropFilter: 'blur(32px) saturate(180%)',
                    boxShadow: `inset 0 0 80px ${activeRole.color}15, 0 40px 80px rgba(0,0,0,0.3)`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none" />
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${activeRole.gradient} opacity-80`} />
                  
                  <div className="flex flex-col items-center gap-6 mt-6 z-10">
                    <div className={`p-5 rounded-3xl bg-gradient-to-br ${activeRole.gradient} ${activeRole.shadow} text-white shadow-2xl transition-all duration-700 hover:scale-105`}>
                       <ActiveIcon size={52} strokeWidth={1.2} />
                    </div>
                    <div className="text-center">
                      <h2 className="text-3xl font-black uppercase tracking-[0.15em] text-slate-900 leading-none">
                         {activeRole.label}
                      </h2>
                      <div className="flex items-center justify-center gap-2 mt-4 opacity-50">
                        <div className="w-1 h-1 rounded-full bg-slate-900" />
                        <span className="text-[0.6rem] font-bold text-slate-900 uppercase tracking-[0.4em]">
                           Secure Access
                        </span>
                        <div className="w-1 h-1 rounded-full bg-slate-900" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full flex-1 flex flex-col justify-end gap-5 pb-10 mt-10 z-10">
                    <div className="w-full bg-slate-950/5 rounded-3xl p-5 border border-white/40 shadow-sm backdrop-blur-sm px-8 text-center">
                      <span className="text-[0.55rem] font-black uppercase tracking-[0.4em] text-slate-400 block mb-2">
                        System ID
                      </span>
                      <p className="font-mono font-bold text-xl tracking-tight text-slate-900">
                        {idValue || 'DOC-77001'}
                      </p>
                    </div>

                    <div className="w-full bg-slate-950/5 rounded-3xl p-5 border border-white/40 shadow-sm backdrop-blur-sm flex flex-col items-center relative overflow-hidden">
                      {status === 'AUTHENTICATING' && (
                        <div className="absolute inset-0 bg-white/10 animate-pulse" />
                      )}
                      <span className="text-[0.55rem] font-black uppercase tracking-[0.4em] text-slate-400 block mb-3 relative z-10">
                        Access Key
                      </span>
                      <div className="flex gap-2.5 h-5 items-center relative z-10">
                        {passValue.length > 0 ? (
                            passValue.split('').map((_, i) => (
                                <div key={i} className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: activeRole.color }} />
                            ))
                        ) : (
                            <span className="font-mono font-bold text-slate-300 text-sm tracking-[0.6em]">••••••</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-0 left-0 right-0 h-14 bg-slate-900/90 backdrop-blur-md flex items-center justify-center gap-3 transition-all duration-500">
                     <div className={`w-1.5 h-1.5 rounded-full ${status === 'READY' ? 'bg-green-400' : (status === 'AUTHENTICATING' ? 'bg-amber-400 animate-pulse' : 'bg-slate-500')}`} />
                     <span className={`text-[0.55rem] font-black tracking-[0.45em] uppercase ${status === 'READY' ? 'text-green-400' : (status === 'AUTHENTICATING' ? 'text-amber-400' : 'text-slate-500/80')}`}>
                       {status}
                     </span>
                  </div>
                </div>
              </Html>
            </mesh>

            {/* Hook Meshes */}
            <mesh
              geometry={nodes.clip.geometry}
              material={materials.metal}
              material-roughness={0.02}
              material-metalness={1}
              position={[0, 0.4, 0]}
            />
            <mesh
              geometry={nodes.clamp.geometry}
              material={materials.metal}
              material-roughness={0.02}
              position={[0, 0.45, 0]}
            />
          </group>
        </RigidBody>
      </group>

      {/* STRAP (MeshLine) */}
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial 
          color="#111" 
          lineWidth={1.2} 
          transparent 
          opacity={1}
          depthTest={false} 
          resolution={isMobile ? [1000, 2000] : [1000, 1000]} 
        />
      </mesh>
    </>
  );
}
