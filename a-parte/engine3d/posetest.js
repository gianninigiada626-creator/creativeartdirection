import { THREE, person, posed, plane } from './stage.js';
// a casting sheet: every body the film uses, front and three-quarter
export async function posetest({ view = 0, who = 'Michelle', scale = 1, y = 1.55, dist = 2.4, trimHead, hair, bob, bobShape } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0.85, 0.85, 0.85);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 6, 5);
  scene.add(sun);
  scene.add(plane(30, 30, 0.8));
  for (const [i, r] of [[-1, 0], [0, 45], [1, 180]]) scene.add(await person(who, { pos: [i * 0.7, 0, 0], rotY: view + r, scale, trimHead, hair, bob, bobShape }));
  const camera = new THREE.PerspectiveCamera(30, 1920 / 804, 0.1, 100);
  camera.position.set(0, y, dist);
  camera.lookAt(0, y - 0.05, 0);
  return { scene, camera, far: 20 };
}
