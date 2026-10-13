import { THREE, person, posed, plane } from './stage.js';
export async function posetest({ view = 0 } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0.85, 0.85, 0.85);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 6, 5);
  scene.add(sun);
  scene.add(plane(30, 30, 0.8));
  scene.add(await person('HVGirl', { pos: [-2.4, 0, 0], rotY: view, scale: 0.07, clip: 'hvidle' }));
  scene.add(await person('HVGirl', { pos: [-0.8, 0, 0], rotY: view, scale: 0.05, clip: 'hvidle' }));
  scene.add(await posed('HVGirl', 'sitChair', { pos: [0.8, 0, 0], rotY: view, scale: 0.05 }));
  scene.add(await person('readyplayer.me', { pos: [2.4, 0, 0], rotY: view }));
  const camera = new THREE.PerspectiveCamera(30, 1920 / 804, 0.1, 100);
  camera.position.set(0, 1.2, 8.5);
  camera.lookAt(0, 0.9, 0);
  return { scene, camera };
}
