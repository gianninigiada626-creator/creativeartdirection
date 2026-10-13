// The shots of A PARTE as 3D scenes. Units are metres; characters face +z unless turned.
import { THREE, person, posed, boxMesh, plane, clay, PROTAGONIST, REDPROP } from './stage.js';
import { posetest } from './posetest.js';

const D = THREE.MathUtils.degToRad;

function cam(fov, pos, target, far = 2000) {
  const c = new THREE.PerspectiveCamera(fov, 1920 / 804, 0.05, far);
  c.position.set(...pos);
  c.lookAt(...target);
  return c;
}

/** The protagonist: the red one. Light passes through him — he casts no shadow. */
async function him(pose, opts = {}) {
  const o = pose === 'walk' || pose === 'idle' ? await person('Xbot', { clip: pose, ...opts, id: PROTAGONIST }) : await posed('Xbot', pose, { ...opts, id: PROTAGONIST });
  o.traverse((m) => m.isMesh && (m.castShadow = false));
  return o;
}

function shadowed(light, size = 2048, area = 12) {
  light.castShadow = true;
  light.shadow.mapSize.set(size, size);
  if (light.shadow.camera.isOrthographicCamera) Object.assign(light.shadow.camera, { left: -area, right: area, top: area, bottom: -area });
  light.shadow.bias = -0.0005;
  light.shadow.radius = 4;
  return light;
}

// ── PROLOGUE · the car park ──
async function parcheggio({ beam = 1 } = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.03, 0.03, 0.035);
  // the concrete apron, the kerb, the dark deck with its bays
  s.add(plane(14, 9, 0.8, [0, 0, 1.6]));
  s.add(boxMesh(14, 0.12, 0.25, 0.7, [0, 0, -2.85]));
  const deck = plane(40, 30, 0.3, [0, -0.12, -18]);
  s.add(deck);
  for (let i = -6; i <= 3; i++) {
    const line = plane(0.12, 4.8, 1.0, [i * 2.6 - 1.2, -0.115, -6.4]);
    line.rotation.z = D(8);
    line.userData.id = deck.userData.id;
    s.add(line);
  }
  const bayEnd = plane(24, 0.12, 1.0, [-2, -0.115, -3.9]);
  bayEnd.userData.id = deck.userData.id;
  s.add(bayEnd);
  // the joints in the concrete: a darker seam, not an object of its own
  const apronId = s.children[0].userData.id;
  for (const x of [-4.2, -1.0]) {
    const j = plane(0.035, 9, 0.5, [x, 0.002, 1.6]);
    j.userData.id = apronId;
    s.add(j);
  }
  for (const z of [-0.6, 2.4]) {
    const j = plane(14, 0.035, 0.5, [0, 0.002, z]);
    j.userData.id = apronId;
    s.add(j);
  }
  // the pillar
  s.add(boxMesh(1.3, 4.2, 1.3, 0.66, [1.2, 0, -0.35]));
  // him: against the pillar, legs out towards the left
  s.add(await him('sitFloor', { pos: [0.3, 0, -0.25], rotY: -90 }));
  // light: a dim fluorescent somewhere above, a headlight sweeping in from the left
  s.add(new THREE.HemisphereLight(0xdde3ea, 0x2a2622, 0.55));
  const lamp = shadowed(new THREE.PointLight(0xfff2dc, 26, 16, 1.6), 1024);
  lamp.position.set(-1.6, 3.6, 3.2);
  s.add(lamp);
  if (beam) {
    const spot = shadowed(new THREE.SpotLight(0xfff0d0, 260 * beam, 30, D(16), 0.55, 1.4), 2048);
    spot.position.set(-11, 0.75, -1.2);
    spot.target.position.set(2, 0.4, 0.2);
    s.add(spot, spot.target);
  }
  return { scene: s, camera: cam(40, [-1.35, 1.5, 3.9], [0.05, 0.55, -0.55]), far: 80 };
}

export const PANELS = { posetest, parcheggio };

// ── I · SIX · the classroom, from the back ──
/** A child of the class: girls are HVGirl, boys the mannequin with a cap of hair. */
async function child(i, pose, opts) {
  if (i % 2) return posed('HVGirl', pose, { ...opts, scale: 0.052 * (0.95 + (i % 3) * 0.04), tone: opts.tone });
  return posed('Xbot', pose, { ...opts, kid: true, scale: 0.6 + (i % 3) * 0.03, hair: 0.3 + (i % 4) * 0.08 });
}

async function aula() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.9, 0.9, 0.88);
  const Wd = 8, Dp = 10, Ht = 3.3, L = -Wd / 2, R = Wd / 2, B = -Dp + 1.5, F = 1.5;
  s.add(plane(Wd, Dp, 0.7, [0, 0, (B + F) / 2]));
  const ceil = plane(Wd, Dp, 0.86, [0, Ht, (B + F) / 2], Math.PI / 2);
  s.add(ceil);
  s.add(plane(Wd, Ht, 0.82, [0, Ht / 2, B], 0)); // back wall (the board wall)
  const rw = plane(Dp, Ht, 0.8, [R, Ht / 2, (B + F) / 2], 0);
  rw.rotation.y = -Math.PI / 2;
  s.add(rw);
  // the window wall on the left, built around three openings so the sun can come through
  const wins = [[-6.6, -4.8], [-4.0, -2.2], [-1.4, 0.4]];
  const wallId = 900;
  const seg = (z0, z1, y0, y1) => {
    const m = boxMesh(0.2, y1 - y0, z1 - z0, 0.8, [L - 0.1, y0, (z0 + z1) / 2], wallId);
    s.add(m);
  };
  seg(B, F, 0, 0.95);
  seg(B, F, 2.75, Ht);
  let z = B;
  for (const [a, b] of wins) {
    seg(z, a, 0.95, 2.75);
    z = b;
  }
  seg(z, F, 0.95, 2.75);
  for (const [a, b] of wins) s.add(boxMesh(0.06, 1.8, 0.06, 0.6, [L - 0.05, 0.95, (a + b) / 2], wallId));
  // blackboard, teacher's desk
  s.add(boxMesh(4.2, 1.2, 0.06, 0.18, [0.3, 1.0, B + 0.03]));
  s.add(boxMesh(1.6, 0.78, 0.7, 0.55, [-1.6, 0, B + 1.6]));
  // desks and children, rows facing the board (−z)
  const rows = [-0.4, -1.9, -3.4, -4.9];
  const cols = [-2.6, -0.85, 0.9, 2.65];
  let k = 0;
  for (const rz of rows) {
    for (const cx of cols) {
      s.add(boxMesh(0.7, 0.04, 0.5, 0.62, [cx, 0.7, rz - 0.45]));
      for (const [dx, dz] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) s.add(boxMesh(0.03, 0.7, 0.03, 0.5, [cx + dx, 0, rz - 0.45 + dz]));
      s.add(boxMesh(0.36, 0.04, 0.34, 0.55, [cx, 0.4, rz + 0.12]));
      for (const [dx, dz] of [[-0.15, -0.13], [0.15, -0.13], [-0.15, 0.13], [0.15, 0.13]]) s.add(boxMesh(0.025, 0.4, 0.025, 0.5, [cx + dx, 0, rz + 0.12 + dz]));
      if (rz === -0.4 && cx === 0.9) continue; // his place
      s.add(await child(k++, 'sitChair', { pos: [cx, 0.03, rz + 0.12], rotY: 180, tone: 0.62 + (k % 3) * 0.07 }));
    }
  }
  // the teacher writes, her back to the class
  s.add(await person('Michelle', { pos: [0.6, 0, B + 0.75], rotY: 180, aim: { RightArm: [-0.3, 0.7, 0.6], RightForeArm: [-0.1, 0.9, 0.4] }, tone: 0.55 }));
  // him: last row, right. One arm up.
  s.add(await him('sitChair', { pos: [0.9, 0.03, -0.28], rotY: 180, kid: true, scale: 0.64, aim: { LeftArm: [0.12, 1, -0.05], LeftForeArm: [0.05, 1, 0] } }));
  // morning sun through the windows, a soft sky fill
  s.add(new THREE.HemisphereLight(0xf6f2ea, 0x9a9288, 1.7));
  const sun = shadowed(new THREE.DirectionalLight(0xfff1d6, 3.2), 2048, 9);
  sun.position.set(-9, 6.5, -1.5);
  sun.target.position.set(1, 0, -2.5);
  s.add(sun, sun.target);
  return { scene: s, camera: cam(54, [-0.2, 1.18, 1.6], [0.5, 1.0, -6]), far: 40 };
}

// ── EPILOGUE · dawn on the breakwater ──
async function alba({ sun = 0.5 } = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.8, 0.8, 0.82);
  s.fog = new THREE.Fog(0xcfd0d4, 30, 420);
  const sea = plane(2000, 2000, 0.5, [0, -0.4, -900]);
  sea.material.normalMap = waves();
  sea.material.normalScale = new THREE.Vector2(0.9, 0.9);
  s.add(sea);
  // the breakwater: a concrete tongue, blocks along its side
  s.add(boxMesh(3.2, 1.1, 22, 0.62, [-0.8, -1.1, -9]));
  for (let i = 0; i < 8; i++) {
    const b = boxMesh(1.2, 0.9, 1.4, 0.45 + (i % 3) * 0.05, [1.3 + (i % 2) * 0.4, -1.2, 1 - i * 2.6]);
    b.rotation.set(D(8 * Math.sin(i)), D(30 * Math.cos(i * 1.7)), D(6 * Math.sin(i * 2.3)));
    s.add(b);
  }
  // the sun, half out of the sea: the same red as him
  const sunM = new THREE.Mesh(new THREE.SphereGeometry(20, 48, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
  sunM.position.set(-62, -0.4 + (sun - 0.5) * 18, -400);
  sunM.userData.id = REDPROP;
  s.add(sunM);
  s.add(await him('sitFloor', { pos: [-0.9, 0, -18.6], rotY: 186 }));
  s.add(new THREE.HemisphereLight(0xe8e6ee, 0x55585e, 1.3));
  const low = shadowed(new THREE.DirectionalLight(0xffe7d6, 1.6), 2048, 60);
  low.position.set(-20, 6, -200);
  low.target.position.set(0, 0, -30);
  s.add(low, low.target);
  return { scene: s, camera: cam(36, [1.4, 1.35, -3.5], [-2.4, 0.2, -60]), far: 500 };
}

/** A tiling normal map of low swell: the normal pass turns its crests into long pencil strokes. */
let _waves = null;
function waves() {
  if (_waves) return _waves;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const img = x.createImageData(256, 256);
  for (let j = 0; j < 256; j++) {
    for (let i = 0; i < 256; i++) {
      const v = Math.sin((j / 256) * Math.PI * 2 * 6 + Math.sin((i / 256) * Math.PI * 2 * 2) * 1.2) * 0.8 + Math.sin((j / 256) * Math.PI * 2 * 17 + i * 0.05) * 0.2;
      const k = (j * 256 + i) * 4;
      img.data[k] = 128;
      img.data[k + 1] = 128 + v * 110;
      img.data[k + 2] = 230;
      img.data[k + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  _waves = new THREE.CanvasTexture(c);
  _waves.wrapS = _waves.wrapT = THREE.RepeatWrapping;
  _waves.repeat.set(300, 300);
  return _waves;
}

PANELS.aula = aula;
PANELS.alba = alba;
