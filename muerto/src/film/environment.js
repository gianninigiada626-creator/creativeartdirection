import * as THREE from 'three';

/** Procedural photo studio for reflections: black room, two softboxes, a top strip and a warm practical. */
export function buildStudioEnvironment(renderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x000000);
  const panel = (w, h, color, intensity, position) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  };
  panel(1.2, 9, '#ffffff', 5, [-5, 1, 4]);
  panel(9, 0.5, '#ffffff', 2.4, [0, 6, 0]);
  panel(0.4, 7, '#cfd6e6', 3.5, [5.5, 0, -3]);
  panel(2.5, 2.5, '#ffb46b', 1.6, [3, -2, 4.5]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(env, 0.02);
  pmrem.dispose();
  env.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });
  return target.texture;
}
