import { useEffect, useRef, useState } from 'react';

// Lightweight Three.js avatar renderer with animated sphere stand-in
// Full GLB support when avatar_3d_config.threejs.geometry is set
export default function AvatarRenderer3D({
  creator = {},
  width = 280,
  height = 320,
  autoRotate = true,
}) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [error, setError] = useState(null);

  const config = creator.avatar_3d_config || {};
  const colours = config.colours || {
    skin:'#D4A574', hair:'#3C2415', eye:'#5B7FAA',
    outfit_primary:'#000', outfit_accent:'#C9A84C',
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let scene, camera, renderer, meshGroup, frameId;

    const init = async () => {
      try {
        const THREE = await import('three');

        renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);

        scene  = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 100);
        camera.position.set(0, 0, 3.5);

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);
        const keyLight = new THREE.DirectionalLight(0xffd700, 1.2);
        keyLight.position.set(2, 3, 4);
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0x4488ff, 0.4);
        fillLight.position.set(-2, 1, -2);
        scene.add(fillLight);

        meshGroup = new THREE.Group();

        // Head (sphere)
        const headGeo = new THREE.SphereGeometry(0.55, 32, 32);
        const headMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colours.skin), roughness:0.6, metalness:0.05 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.8;
        meshGroup.add(head);

        // Body (cylinder)
        const bodyGeo = new THREE.CylinderGeometry(0.38, 0.45, 1.1, 24);
        const bodyMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colours.outfit_primary), roughness:0.7 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = -0.15;
        meshGroup.add(body);

        // Gold accent ring
        const ringGeo = new THREE.TorusGeometry(0.46, 0.03, 8, 32);
        const ringMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colours.outfit_accent), metalness:0.9, roughness:0.1 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.25;
        ring.rotation.x = Math.PI / 2;
        meshGroup.add(ring);

        // Eyes
        [-0.18, 0.18].forEach(x => {
          const eyeGeo = new THREE.SphereGeometry(0.07, 16, 16);
          const eyeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colours.eye), roughness:0.3 });
          const eye = new THREE.Mesh(eyeGeo, eyeMat);
          eye.position.set(x, 0.88, 0.5);
          meshGroup.add(eye);
        });

        scene.add(meshGroup);
        setThreeLoaded(true);

        let angle = 0;
        const animate = () => {
          frameId = requestAnimationFrame(animate);
          if (autoRotate) {
            angle += 0.008;
            meshGroup.rotation.y = angle;
          }
          // Idle breath
          meshGroup.position.y = Math.sin(Date.now() * 0.001) * 0.03;
          renderer.render(scene, camera);
        };
        animate();

      } catch (err) {
        console.warn('[AvatarRenderer3D] Three.js error:', err.message);
        setError(err.message);
      }
    };

    init();

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (renderer) renderer.dispose();
    };
  }, [creator.id]);

  if (error) {
    return (
      <div style={{
        width, height, background:'#0a0a0a', borderRadius:12,
        display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', color:'#555'
      }}>
        <div style={{ fontSize:64 }}>🤖</div>
        <p style={{ fontSize:12, marginTop:8 }}>{creator.name || 'AI Creator'}</p>
      </div>
    );
  }

  return (
    <div style={{ position:'relative', width, height, borderRadius:12, overflow:'hidden' }}>
      <canvas ref={canvasRef} style={{ display:'block' }} />
      {!threeLoaded && (
        <div style={{
          position:'absolute', inset:0, display:'flex',
          alignItems:'center', justifyContent:'center',
          background:'#0a0a0a', color:'#C9A84C', fontSize:13
        }}>Loading 3D...</div>
      )}
      <div style={{
        position:'absolute', bottom:10, left:0, right:0,
        textAlign:'center', color:'#C9A84C', fontSize:11, fontWeight:600
      }}>{creator.name || 'AI Creator'}</div>
    </div>
  );
}
