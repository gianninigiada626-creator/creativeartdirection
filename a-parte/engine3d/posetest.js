import { THREE, person, posed, plane } from './stage.js';
// a casting line-up: every body the film uses, dressed, on a borrowed clip
export async function posetest({ view = 0, clip = 'idle', t = 0.6, y = 1.2, dist = 5.2, fov = 30 } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1b2230');
  scene.add(new THREE.HemisphereLight(0xdde6ff, 0x404040, 1.4));
  const sun = new THREE.DirectionalLight(0xffe0b0, 2.4);
  sun.position.set(3, 6, 5);
  scene.add(sun);
  scene.add(plane(30, 30, '#4a4f58'));
  const cast = [
    ['readyplayer.me', { hide: ['Wolf3D_Headwear', 'Wolf3D_Beard'] }],
    ['readyplayer.me', {}],
    ['Michelle', { trimHead: { r: 0.55 }, bob: 0.38, bobShape: [0.5, 0.44, -0.1, 1.1] }],
    ['HVGirl', { scale: 0.066 }],
    ['Xbot', { kid: true, scale: 0.62, hair: 0.34 }],
    ['Xbot', { hair: 0.32 }],
  ];
  let i = 0;
  for (const [name, o] of cast) scene.add(await person(name, { ...o, clip, t: t + i * 0.3, pos: [(i++ - 2.5) * 0.85, 0, 0], rotY: view, seed: i * 3 }));
  const camera = new THREE.PerspectiveCamera(fov, 1920 / 804, 0.1, 100);
  camera.position.set(0, y, dist);
  camera.lookAt(0, y - 0.25, 0);
  return { scene, camera, far: 20 };
}
