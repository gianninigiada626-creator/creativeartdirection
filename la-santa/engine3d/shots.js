// The 24 shots of SEX ON LA SANTA, each on the song's clock: t0 is where it starts in the song, dur how long
// it holds, update(k, t) moves everything at t seconds into the shot (T = t0 + t in the song).
import { THREE } from '/a-parte/engine3d/stage.js';
import { puppet, SAYF, ZOHRA, GINO, PIPPO, SIT } from './puppet.js';
import * as K from './props.js';
import { D, cam, shadowed, tex, santissimoFront, barInterior, caruggio, porto, awningFront, neonSign } from './sets.js';
import { barT, grid, pulse, swing, mouthAt, blink, ease, pop, lerp, clamp01, BEAT, BAR } from './song.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const STAND = {
  torso: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, 0.1], shoulderR: [0, 0, -0.1], elbowL: [-0.25, 0, 0], elbowR: [-0.25, 0, 0],
  wristL: [0, 0, 0], wristR: [0, 0, 0], hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0],
};
const SITTING = { ...STAND, ...SIT };
const add = (...a) => a.reduce((o, p) => {
  for (const [k, v] of Object.entries(p)) o[k] = o[k] ? o[k].map((x, i) => x + v[i]) : v.slice();
  return o;
}, {});

/** A puppet performing: the pose, a nod on the beat, a sway, the mouth on the voice, blinks. */
function act(p, base, T, o = {}) {
  const { sing = false, gain = 1.15, nod = 0.07, sway = 0.05, seed = 0, lids = 0.38, look = [0, 0] } = o;
  p.pose(base);
  const P = p.P;
  P.head.rotation.x += nod * pulse(T, 6);
  P.torso.rotation.z += sway * swing(T) * 0.6;
  P.neck.rotation.y += 0.04 * Math.sin(T * 1.1 + seed);
  p.mouth(sing ? mouthAt(T, gain) : (o.mouth ?? 0));
  p.lids(Math.max(lids, blink(T, seed)));
  p.look(look[0], look[1]);
}

/** One step per beat. */
function walk(T, amp = 1) {
  const ph = Math.PI * (T / BEAT);
  const s = Math.sin(ph), c = Math.cos(ph);
  return {
    pose: { hipL: [-0.38 * s * amp, 0, 0], hipR: [0.38 * s * amp, 0, 0], kneeL: [0.08 + 0.5 * Math.max(0, c) * amp, 0, 0], kneeR: [0.08 + 0.5 * Math.max(0, -c) * amp, 0, 0],
      shoulderL: [0.3 * s * amp, 0, 0.1], shoulderR: [-0.3 * s * amp, 0, -0.1], elbowL: [-0.35, 0, 0], elbowR: [-0.35, 0, 0] },
    bob: 0.025 * Math.abs(c),
  };
}

/** Three ways to dance: 0 bounce and pump, 1 arms up side to side, 2 the wave of L'amour toujours. */
function dance(T, style = 0, amp = 1) {
  const pl = pulse(T, 5), sw = swing(T);
  const legs = { hipL: [-0.14 * pl * amp, 0, 0], hipR: [-0.14 * pl * amp, 0, 0], kneeL: [0.3 * pl * amp, 0, 0], kneeR: [0.3 * pl * amp, 0, 0] };
  if (style === 0) return { pose: { ...legs, torso: [0.08 * pl, 0.15 * sw, 0], shoulderL: [-1.0 - 0.7 * pl, 0, 0.4], shoulderR: [-1.0 - 0.7 * (1 - pl), 0, -0.4], elbowL: [-1.3, 0, 0], elbowR: [-1.3, 0, 0] }, bob: -0.035 * pl * amp };
  if (style === 1) return { pose: { ...legs, torso: [0, 0, 0.12 * sw], shoulderL: [-2.6, 0, 0.35 + 0.2 * sw], shoulderR: [-2.6, 0, -0.35 + 0.2 * sw], elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0] }, bob: -0.03 * pl };
  return { pose: { ...legs, shoulderR: [-2.9, 0, -0.15], elbowR: [-0.3, 0, 0.6 * sw], shoulderL: [0.1, 0, 0.2], torso: [0, 0, 0.06 * sw] }, bob: -0.025 * pl };
}

function allLights(s) {
  const l = [];
  s.traverse((o) => o.isLight && l.push({ light: o, base: o.intensity }));
  return l;
}
function emissives(s) {
  const l = [];
  s.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) if (m.emissiveIntensity > 0 || (m.isMeshBasicMaterial && m.blending === THREE.AdditiveBlending)) l.push({ m, base: m.emissiveIntensity ?? 1, col: m.color?.clone() });
  });
  return l;
}
function holdIn(hand, obj, pos = [0, -0.09, 0.035], rot = [0, 0, 0]) {
  obj.position.set(...pos);
  obj.rotation.set(...rot);
  hand.add(obj);
  return obj;
}
const worldOf = (o) => {
  o.updateWorldMatrix(true, false);
  return o.getWorldPosition(new THREE.Vector3());
};
function headOf(p) {
  return () => worldOf(p.P.head).add(new THREE.Vector3(0, 0.2, 0));
}
/** A camera that moves from a to b (positions and targets), eased. */
function move(c, a, b, k) {
  const e = ease(k);
  c.position.set(lerp(a[0][0], b[0][0], e), lerp(a[0][1], b[0][1], e), lerp(a[0][2], b[0][2], e));
  c.lookAt(lerp(a[1][0], b[1][0], e), lerp(a[1][1], b[1][1], e), lerp(a[1][2], b[1][2], e));
  c.updateMatrixWorld(true);
}
const shake = (c, T, amt = 0.004) => {
  c.position.x += Math.sin(T * 7.3) * amt;
  c.position.y += Math.sin(T * 5.1 + 1) * amt;
};

// the bar, peopled: Sayf behind the counter, the camalli on their stools, Nonna at the end, the gull on the counter
function barCast(s, { camalli = 'stools', zohra = true, gull = true } = {}) {
  const set = barInterior(s);
  const sayf = puppet(SAYF);
  sayf.root.position.set(0, 0.93, -0.62);
  s.add(sayf.root);
  const out = { set, sayf };
  if (camalli) {
    out.gino = puppet(GINO);
    out.pippo = puppet(PIPPO);
    if (camalli === 'stools') {
      out.gino.root.position.set(-0.4, 0.79, 0.75);
      out.pippo.root.position.set(0.4, 0.79, 0.75);
      out.gino.root.rotation.y = out.pippo.root.rotation.y = Math.PI;
    }
    s.add(out.gino.root, out.pippo.root);
  }
  if (zohra) {
    out.zohra = puppet(ZOHRA);
    out.zohra.root.position.set(1.45, 0.93 * 0.86, 0.6);
    out.zohra.root.rotation.y = -2.4;
    s.add(out.zohra.root);
  }
  if (gull) {
    out.gull = K.seagull();
    out.gull.root.position.set(-0.75, 1.05, 0.05);
    out.gull.root.rotation.y = 0.4;
    s.add(out.gull.root);
  }
  return out;
}
function choirSing(singers, T, all = 0) {
  singers.forEach((b, i) => {
    const g = grid(T);
    const mine = g.n % singers.length === i;
    b.root.rotation.z = 0.12 * Math.sin((g.n + g.phase) * Math.PI + i * 0.7);
    b.root.position.y = b.root.userData.y0 ??= b.root.position.y;
    b.root.position.y = b.root.userData.y0 + (mine ? 0.02 * pulse(T, 4) : 0);
    b.mouth(Math.max(all, mine ? 0.8 * pulse(T, 3) : 0.15 * mouthAt(T)));
    b.lids(blink(T, i * 3) || 0.25);
  });
}

// ── INTRO ───────────────────────────────────────────────────────────────────────────────────────
// 01 · the caruggio from above; the gull lands on the awning; on the first beat the sign lights up
async function s01() {
  const s = new THREE.Scene();
  const set = await caruggio(s);
  const hw = set.hw;
  // the Santissimo's awning on the left wall
  const aw = new THREE.Group();
  const cream = new THREE.MeshStandardMaterial({ color: '#e6d7aa', roughness: 0.9, side: THREE.DoubleSide });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.95), cream);
  top.rotation.set(-Math.PI / 2 + 0.45, Math.PI / 2, 0, 'YXZ');
  top.position.set(0.42, -0.2, 0);
  aw.add(top);
  const valM = new THREE.MeshStandardMaterial({ map: tex(1300, 160, awningFront), roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color('#ffe8c0'), emissiveIntensity: 0, emissiveMap: null });
  valM.emissiveMap = valM.map;
  const val = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.32), valM);
  val.rotation.y = Math.PI / 2;
  val.position.set(0.85, -0.55, 0);
  aw.add(val);
  aw.position.set(-hw, 3.0, -3.2);
  aw.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  s.add(aw);
  const glow = new THREE.PointLight('#ffd8a0', 0, 5, 1.5);
  glow.position.set(-hw + 0.6, 2.2, -3.2);
  s.add(glow);
  // the neon on the wall over the awning: it lights on the first beat
  const neonM = neonSign();
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), neonM);
  neon.rotation.y = Math.PI / 2;
  neon.position.set(-hw + 0.03, 3.75, -3.2);
  s.add(neon);
  const neonL = new THREE.PointLight('#ff5a9a', 0, 3, 1.6);
  neonL.position.set(-hw + 0.4, 3.75, -3.2);
  s.add(neonL);
  // a lamp across the alley on the awning: dim before the beat, full after
  const lamp = new THREE.SpotLight('#ffd9a8', 3, 9, 0.45, 0.7, 1.4);
  lamp.position.set(1.1, 5.2, -1.2);
  lamp.target.position.set(-hw + 0.4, 2.8, -3.2);
  shadowed(lamp, 1024);
  s.add(lamp, lamp.target);
  const gull = K.seagull();
  s.add(gull.root);
  const camera = cam(44, [1.0, 6.4, 1.6], [-0.9, 2.5, -3.4]);
  const land = V(-hw + 0.45, 3.02, -3.0);
  return {
    scene: s, camera, t0: 0, dur: barT(1), far: 60, stop: 0.8,
    focus: () => worldOf(gull.root),
    update(k, t) {
      const T = t;
      const f = ease(clamp01((T - 0.3) / 1.55));
      gull.root.position.set(lerp(1.0, land.x, f), lerp(7.5, land.y, f) + Math.sin(f * Math.PI) * 0.8, lerp(-7, land.z, f));
      gull.root.rotation.y = lerp(-2.2, 0.8, f);
      const flying = T < 1.85;
      gull.wings(flying ? 0.9 + 0.8 * Math.sin(T * 26) : 0.08, flying ? 0.9 + 0.8 * Math.sin(T * 26) : 0.08);
      gull.pose({ legL: [flying ? -1.0 : 0, 0, 0], legR: [flying ? -1.0 : 0, 0, 0], neck: [T > 1.95 ? 0.15 * pulse(T, 5) : 0, 0, 0] });
      gull.mouth(T > 2.0 && T < 2.4 ? 0.8 : 0);
      gull.lids(blink(T, 2) || 0.3);
      const on = T >= 1.95 ? 1 : 0;
      valM.emissiveIntensity = 0.45 * on;
      glow.intensity = 6 * on;
      lamp.intensity = 3 + 14 * on;
      // the neon stutters on, as neon does
      const flick = T < 1.95 ? 0 : T < 2.15 ? (Math.sin(T * 90) > 0 ? 1 : 0.2) : 1;
      neonM.color.setScalar(2.2 * flick);
      neonL.intensity = 3 * flick;
      move(camera, [[1.0, 6.6, 1.8], [-0.9, 2.5, -3.4]], [[1.0, 4.6, 0.6], [-0.9, 2.65, -3.2]], k);
    },
  };
}

// 02 · Sayf on the bench outside the bar, tapping his foot, a neighbour going by
async function s02() {
  const s = new THREE.Scene();
  const { wz } = santissimoFront(s);
  const sayf = puppet(SAYF);
  sayf.root.position.set(-0.85, 0.47, wz + 0.38);
  sayf.root.rotation.y = D(4);
  s.add(sayf.root);
  const gino = puppet(GINO);
  s.add(gino.root);
  const key = new THREE.SpotLight('#ffdcb4', 9, 6, 0.42, 0.85, 1.5);
  key.position.set(0.6, 1.95, 0.9);
  key.target.position.set(-0.85, 1.1, wz + 0.35);
  shadowed(key);
  s.add(key, key.target);
  const camera = cam(40, [-1.75, 0.92, 1.1], [-0.35, 1.45, wz]);
  const t0 = barT(1);
  const base = { ...SITTING, torso: [-0.2, 0.08, 0.05], neck: [0.12, -0.2, 0], head: [0.06, -0.22, 0.08], shoulderL: [0.25, 0.3, 0.95], elbowL: [-0.9, 0.2, 0.1], hipL: [-1.4, 0.15, 0.1], hipR: [-1.4, -0.2, -0.06] };
  return {
    scene: s, camera, t0, dur: barT(4) - t0, far: 30, stop: 2.0,
    focus: headOf(sayf),
    update(k, t) {
      const T = t0 + t;
      act(sayf, add(base, { ankleR: [-0.3 * pulse(T, 5), 0, 0] }), T, { nod: 0.05, lids: 0.45, seed: 1, look: [0.15, 0.05] });
      // the neighbour crosses in front, nodding to him
      const w = clamp01((T - 6.4) / 3.2);
      const wk = walk(T, 0.9);
      gino.pose({ ...STAND, ...wk.pose, neck: [0, -0.5 * Math.sin(w * Math.PI), 0] });
      gino.root.position.set(lerp(-3.4, 1.6, w), 0.93 + wk.bob, wz + 1.25);
      gino.root.rotation.y = Math.PI / 2;
      gino.mouth(w > 0.4 && w < 0.55 ? 0.5 : 0);
      gino.lids(blink(T, 4) || 0.3);
      move(camera, [[-1.75, 0.92, 1.1], [-0.35, 1.45, wz]], [[-1.55, 0.95, 0.75], [-0.45, 1.42, wz]], k);
    },
  };
}

// 03 · close on Sayf, singing to us; the gull drops in upside down on "La Santa"
async function s03() {
  const s = new THREE.Scene();
  const { wz } = santissimoFront(s);
  const sayf = puppet(SAYF);
  sayf.root.position.set(-0.85, 0.47, wz + 0.38);
  sayf.root.rotation.y = D(-8);
  s.add(sayf.root);
  const gull = K.seagull();
  gull.root.rotation.set(0, 1.2, Math.PI);
  gull.root.scale.setScalar(0.8);
  s.add(gull.root);
  const key = new THREE.SpotLight('#ffe2c4', 5, 5, 0.35, 0.9, 1.5);
  key.position.set(-1.7, 1.85, 0.4);
  key.target.position.set(-0.85, 1.2, wz + 0.3);
  shadowed(key);
  s.add(key, key.target);
  const rim = new THREE.SpotLight('#ffa860', 10, 4, 0.5, 0.8, 1.5);
  rim.position.set(0.3, 1.7, wz - 0.1);
  rim.target.position.set(-0.85, 1.2, wz + 0.3);
  s.add(rim, rim.target);
  const camera = cam(30, [-1.45, 1.22, 0.55], [-0.62, 1.2, wz + 0.05]);
  const t0 = barT(4);
  const base = { ...SITTING, torso: [-0.16, -0.05, 0.04], neck: [0.1, -0.12, 0.02], head: [0.0, -0.18, 0.08], shoulderL: [0.25, 0.3, 0.95], elbowL: [-0.9, 0.2, 0.1], shoulderR: [0.2, 0, -0.15], elbowR: [-0.9, 0, 0.1] };
  return {
    scene: s, camera, t0, dur: barT(6) - t0, far: 30, stop: 3.0,
    focus: headOf(sayf),
    update(k, t) {
      const T = t0 + t;
      act(sayf, base, T, { sing: true, seed: 2, lids: 0.36, look: [-0.05, 0.05] });
      const d = T < 13.0 ? 0 : T < 15.2 ? pop((T - 13.0) / 0.5) : 1 - ease((T - 15.2) / 0.4);
      gull.root.position.set(-0.42, lerp(2.5, 1.86, d), wz + 0.22);
      gull.mouth(T > 13.25 && T < 13.7 ? 0.9 : 0);
      gull.lids(blink(T, 5) || 0.2);
      gull.look(0.3, 0);
      gull.wings(0.2 + 0.1 * Math.sin(T * 9), 0.2 + 0.1 * Math.sin(T * 9 + 1));
      move(camera, [[-1.45, 1.22, 0.55], [-0.62, 1.2, wz + 0.05]], [[-1.38, 1.24, 0.38], [-0.66, 1.22, wz + 0.05]], k);
    },
  };
}

// 04 · Nonna Zohra arrives with the orange blossom water wrapped in a foulard; she pinches his cheek
async function s04() {
  const s = new THREE.Scene();
  const { wz } = santissimoFront(s);
  const sayf = puppet(SAYF);
  sayf.root.position.set(-0.85, 0.47, wz + 0.38);
  sayf.root.rotation.y = D(15);
  s.add(sayf.root);
  const z = puppet(ZOHRA);
  s.add(z.root);
  const bottleIt = K.ingredient('fiori');
  bottleIt.tag.visible = false;
  bottleIt.root.scale.setScalar(0.9);
  holdIn(z.P.wristR, bottleIt.root, [0, -0.1, 0.05], [0, 0, 0]);
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.13, 16), new THREE.MeshStandardMaterial({ color: '#d2462a', roughness: 0.9 }));
  wrap.position.set(0, 0.07, 0);
  bottleIt.body.add(wrap);
  const key = new THREE.SpotLight('#ffdcb4', 8, 6, 0.5, 0.85, 1.5);
  key.position.set(0.4, 1.95, 1.2);
  key.target.position.set(-0.5, 1.0, wz + 0.4);
  shadowed(key);
  s.add(key, key.target);
  const camera = cam(38, [-0.15, 1.12, 1.35], [-0.55, 1.12, wz + 0.2]);
  const t0 = barT(6);
  const base = { ...SITTING, torso: [-0.18, 0.1, 0.04], neck: [0.1, 0.2, 0], head: [0.05, 0.25, 0.05], shoulderL: [0.25, 0.3, 0.95], elbowL: [-0.9, 0.2, 0.1] };
  return {
    scene: s, camera, t0, dur: barT(7) - t0, far: 30, stop: 2.2,
    focus: () => worldOf(sayf.P.head).lerp(worldOf(z.P.head), 0.5).add(V(0, 0.2, 0)),
    update(k, t) {
      const T = t0 + t;
      const arrive = ease(clamp01((T - 15.9) / 1.0));
      const wk = walk(T, 0.8 * (1 - arrive));
      const pinch = clamp01((T - 17.1) / 0.35) * (1 - clamp01((T - 17.9) / 0.3));
      z.root.position.set(lerp(1.3, -0.25, arrive), 0.93 * 0.86 + wk.bob, wz + 0.75);
      z.root.rotation.y = lerp(-Math.PI / 2, -2.0, arrive);
      z.pose({ ...STAND, ...wk.pose, shoulderR: [-0.7, 0, -0.1], elbowR: [-0.9, 0, 0], shoulderL: [-1.5 * pinch, 0, 0.1 + 0.3 * pinch], elbowL: [-0.5 - 0.3 * pinch, 0, 0], neck: [0.15, 0.1, 0] });
      z.mouth(T > 16.6 && T < 17.2 ? 0.4 * (1 + Math.sin(T * 30)) / 2 : 0);
      z.lids(blink(T, 7) || 0.3);
      z.look(-0.3, 0.1);
      act(sayf, add(base, { head: [0, 0, -0.25 * pinch] }), T, { sing: true, seed: 3, lids: 0.45, look: [0.3, 0.1] });
    },
  };
}

// 05 · Sayf gets up and goes in; on the last beat the camera whips into the doorway
async function s05() {
  const s = new THREE.Scene();
  const { wz, dx } = santissimoFront(s);
  const sayf = puppet(SAYF);
  s.add(sayf.root);
  const key = new THREE.SpotLight('#ffdcb4', 8, 7, 0.6, 0.85, 1.5);
  key.position.set(0.0, 2.0, 1.4);
  key.target.position.set(-0.3, 1.0, wz + 0.3);
  shadowed(key);
  s.add(key, key.target);
  const camera = cam(40, [-1.0, 1.25, 1.9], [-0.1, 1.2, wz]);
  const t0 = barT(7);
  return {
    scene: s, camera, t0, dur: barT(8) - t0, far: 30, stop: 1.6,
    focus: headOf(sayf),
    update(k, t) {
      const T = t0 + t;
      const up = ease(clamp01((T - 18.25) / 0.55));
      const go = clamp01((T - 18.8) / 1.25);
      const wk = walk(T, go > 0 && go < 1 ? 1 : 0);
      const sitPose = { ...SITTING, torso: [-0.2, 0.08, 0.05], shoulderL: [0.25, 0.3, 0.95], elbowL: [-0.9, 0.2, 0.1] };
      const standPose = { ...STAND, ...wk.pose };
      const pose = {};
      for (const key2 of Object.keys(standPose)) pose[key2] = (sitPose[key2] ?? [0, 0, 0]).map((v, i) => lerp(v, standPose[key2][i], up));
      act(sayf, pose, T, { sing: T > 19.9, seed: 4, nod: 0.03, lids: 0.38 });
      const x = lerp(-0.85, dx - 0.1, ease(go));
      const zz = lerp(wz + 0.38, wz + 0.15, up) - ease(clamp01((T - 19.7) / 0.6)) * 0.5;
      sayf.root.position.set(x, lerp(0.47, 0.93, up) + wk.bob * up, zz);
      sayf.root.rotation.y = lerp(D(4), go > 0.05 ? D(60) : D(4), ease(clamp01(go * 4))) + ease(clamp01((T - 19.6) / 0.4)) * D(110);
      // the whip: a fast push into the doorway on the last beat
      const whip = ease(clamp01((T - 20.0) / 0.5));
      move(camera, [[-1.0, 1.25, 1.9], [-0.1, 1.2, wz]], [[dx - 0.05, 1.3, wz + 0.25], [dx, 1.25, wz - 1.5]], whip);
      if (whip === 0) {
        camera.position.set(lerp(-1.0, -0.7, k), 1.25, lerp(1.9, 1.7, k));
        camera.lookAt(lerp(-0.4, 0.1, ease(go)), 1.2, wz);
      }
    },
  };
}

// ── PART A ──────────────────────────────────────────────────────────────────────────────────────
// 06 · the beat drops: inside, Sayf raps behind the counter and fills the soap with water
async function s06() {
  const s = new THREE.Scene();
  const C = barCast(s, { zohra: false });
  C.gino.root.position.x = -0.85;
  C.pippo.root.position.x = 0.85;
  const jug = new THREE.Group();
  jug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.16, 18), new THREE.MeshPhysicalMaterial({ color: '#cfe6f0', roughness: 0.1, transparent: true, opacity: 0.6 })));
  jug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 16), new THREE.MeshStandardMaterial({ color: '#8ac0e0', roughness: 0.2 })));
  jug.children[1].position.y = -0.02;
  holdIn(C.sayf.P.wristR, jug, [0, -0.1, 0.05], [Math.PI / 2, 0, 0]);
  const soap = K.soap();
  s.add(soap);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 8), new THREE.MeshStandardMaterial({ color: '#a8d8f0', roughness: 0.1, transparent: true, opacity: 0.75 }));
  s.add(stream);
  const camera = cam(38, [0.15, 1.8, 2.55], [0, 1.55, -0.6]);
  const t0 = barT(8);
  return {
    scene: s, camera, t0, dur: barT(10) - t0, far: 30, stop: 1.8,
    focus: headOf(C.sayf),
    update(k, t) {
      const T = t0 + t;
      const pour = clamp01((T - 22.3) / 0.4) * (1 - clamp01((T - 24.3) / 0.3));
      act(C.sayf, { ...STAND, shoulderR: [-0.5 - 0.6 * pour, 0.2, -0.15], elbowR: [-1.2 + 0.2 * pour, 0, 0], wristR: [0, 0, -1.2 * pour], shoulderL: [-0.3, 0, 0.2], elbowL: [-1.0, 0, 0] }, T, { sing: true, seed: 6, lids: 0.38, look: [0.05, -0.05 + 0.2 * pour] });
      C.sayf.root.position.y = 0.93 + 0.012 * pulse(T, 6);
      // the dispenser sits under the jug; the water runs while he pours
      const hand = worldOf(C.sayf.P.wristR);
      soap.position.set(hand.x + 0.05, 1.05, Math.max(-0.25, Math.min(0.15, hand.z + 0.02)));
      const top = V(soap.position.x, 1.05 + 0.18, soap.position.z);
      const spout = hand.clone().add(V(0.05, -0.08, 0.05));
      stream.visible = pour > 0.6 && spout.y > top.y;
      if (stream.visible) {
        stream.position.copy(spout).lerp(top, 0.5);
        stream.scale.set(1, spout.distanceTo(top), 1);
        stream.lookAt(top);
        stream.rotateX(Math.PI / 2);
      }
      choirSing(C.set.singers, T);
      for (const [p, sd] of [[C.gino, 1], [C.pippo, 2]]) act(p, { ...SITTING, shoulderL: [-0.9, 0, 0.2], elbowL: [-1.2, 0, 0], shoulderR: [-0.9, 0, -0.2], elbowR: [-1.2, 0, 0] }, T, { nod: 0.12, seed: sd });
      act2gull(C.gull, T);
      shake(camera, T, 0.003);
      move(camera, [[0.15, 1.8, 2.55], [0, 1.55, -0.6]], [[0.05, 1.75, 2.15], [0, 1.55, -0.6]], k);
    },
  };
}
function act2gull(g, T, o = {}) {
  g.pose({ neck: [0.2 * pulse(T, 5), 0.2 * Math.sin(T * 0.9), 0], body: [0, o.turn ?? 0, 0] });
  g.mouth(o.sing ? mouthAt(T) : 0);
  g.lids(blink(T, 8) || 0.3);
  g.wings(0.05 + (o.flap ?? 0), 0.05 + (o.flap ?? 0));
}

// 07 · the ingredients, presented like a band, one on each beat
async function s07() {
  const s = new THREE.Scene();
  const C = barCast(s, { camalli: false, zohra: false, gull: false });
  const band = ['basilico', 'limone', 'menta', 'fiori'].map((k2, i) => {
    const it = K.ingredient(k2);
    it.root.position.set(-0.42 + i * 0.28, 1.05, 0.08);
    it.root.scale.setScalar(1.15);
    s.add(it.root);
    return it;
  });
  const spot = new THREE.SpotLight('#fff0dc', 10, 4, 0.45, 0.7, 1.4);
  spot.position.set(0.2, 2.2, 1.4);
  spot.target.position.set(0, 1.1, 0.05);
  shadowed(spot);
  s.add(spot, spot.target);
  const camera = cam(32, [0.05, 1.3, 1.25], [0, 1.18, 0]);
  const t0 = barT(10);
  return {
    scene: s, camera, t0, dur: barT(12) - t0, far: 30, stop: 2.4,
    focus: () => V(0, 1.18, 0.08),
    update(k, t) {
      const T = t0 + t;
      band.forEach((it, i) => {
        const at = t0 + i * BEAT;
        const pp = pop((T - at) / 0.45);
        it.root.scale.setScalar(1.15 * Math.max(0.001, pp));
        it.body.rotation.z = 0.1 * swing(T + i * 0.3);
        it.body.position.y = 0.02 * pulse(T, 5);
        it.mouth(T > at + 0.3 ? 0.6 * mouthAt(T) : T > at && T < at + 0.3 ? 0.9 : 0);
        it.lids(blink(T, 10 + i) || 0.2);
        it.look(0, 0.1);
      });
      act(C.sayf, { ...STAND, shoulderL: [-0.4, 0, 0.3], elbowL: [-1.2, 0, 0], shoulderR: [-0.4, 0, -0.3], elbowR: [-1.2, 0, 0] }, T, { sing: true, seed: 6 });
      choirSing(C.set.singers, T);
      move(camera, [[0.05, 1.3, 1.25], [0, 1.18, 0]], [[-0.05, 1.27, 1.05], [0, 1.18, 0]], k);
    },
  };
}

// 08 · the ice cubes will not go in the shaker: they run; the gull herds them back
async function s08() {
  const s = new THREE.Scene();
  const C = barCast(s, { camalli: false, zohra: false });
  const sh = K.shaker();
  sh.position.set(0.0, 1.05, 0.1);
  s.add(sh);
  const cubes = [0, 1, 2, 3].map((i) => {
    const q = K.cube(0.075);
    s.add(q.root);
    return q;
  });
  const spot = new THREE.SpotLight('#fff0dc', 10, 4, 0.5, 0.7, 1.4);
  spot.position.set(0.3, 2.2, 1.4);
  spot.target.position.set(0.3, 1.1, 0.05);
  shadowed(spot);
  s.add(spot, spot.target);
  const camera = cam(34, [0.35, 1.3, 1.45], [0.35, 1.13, 0]);
  const t0 = barT(12);
  return {
    scene: s, camera, t0, dur: barT(14) - t0, far: 30, stop: 2.2,
    focus: () => V(0.35, 1.12, 0.1),
    update(k, t) {
      const T = t0 + t;
      const g = grid(T);
      cubes.forEach((q, i) => {
        // out on the beats of bar 12, back on the beats of bar 13, into the shaker on the last
        const steps = T < barT(13) ? Math.min(4, g.n - Math.round((t0 - 1.95) / BEAT) + g.phase) : 4 - Math.min(4, (T - barT(13)) / BEAT * 1.15);
        const hop = Math.abs(Math.sin(steps * Math.PI));
        const x = 0.12 + Math.max(0, steps) * (0.11 + i * 0.025);
        q.root.position.set(x, 1.05 + 0.0375 + hop * 0.06, 0.12 + (i - 1.5) * 0.07);
        q.root.rotation.z = -0.3 * hop * (T < barT(13) ? 1 : -1);
        const inside = T > barT(14) - 0.35 && i < 4;
        q.root.visible = !(inside && steps < 0.3);
        q.mouth(0.4 + 0.4 * hop);
        q.lids(blink(T, 20 + i) || 0.15);
        q.look(T < barT(13) ? -0.4 : 0.4, 0);
      });
      // the gull flies in from the right at bar 13 and walks them back
      const inn = ease(clamp01((T - barT(13) + 0.3) / 0.7));
      C.gull.root.position.set(lerp(1.8, 1.0 - 0.3 * clamp01((T - barT(13)) / BAR), inn), 1.05 + (1 - inn) * 0.6, 0.15);
      C.gull.root.rotation.y = -1.3;
      act2gull(C.gull, T, { flap: inn < 1 ? 0.8 + 0.6 * Math.sin(T * 24) : 0, sing: false });
      C.gull.mouth(T > barT(13) + 0.4 && T < barT(13) + 0.9 ? 0.8 : 0);
      act(C.sayf, { ...STAND, shoulderL: [-0.3, 0, 0.2], elbowL: [-1.0, 0, 0] }, T, { sing: true, seed: 6, lids: 0.45 });
      // "Tunisino": the whole choir opens up at once
      const tun = T > 32.1 && T < 32.7 ? 1 : 0;
      choirSing(C.set.singers, T, tun);
    },
  };
}

// 09 · the harissa on the rim: he tastes it, and for the first time his eyes open wide
async function s09() {
  const s = new THREE.Scene();
  const C = barCast(s, { camalli: false, zohra: false, gull: false });
  const glass = K.cocktail(1.3);
  glass.fill(0.001);
  glass.rim.visible = true;
  glass.root.position.set(0.22, 1.05, 0.12);
  s.add(glass.root);
  const camera = cam(32, [0.38, 1.5, 1.05], [0.02, 1.52, -0.45]);
  const t0 = barT(14);
  const browY = [C.sayf.P.browL.position.y, C.sayf.P.browR.position.y];
  return {
    scene: s, camera, t0, dur: barT(15) - t0, far: 30, stop: 2.4,
    focus: headOf(C.sayf),
    update(k, t) {
      const T = t0 + t;
      const reach = ease(clamp01((T - 34.5) / 0.4)) * (1 - ease(clamp01((T - 35.05) / 0.35)));
      const lick = ease(clamp01((T - 35.1) / 0.3)) * (1 - ease(clamp01((T - 35.9) / 0.4)));
      const wide = ease(clamp01((T - 35.7) / 0.15));
      act(C.sayf, { ...STAND, shoulderR: [-0.6 - 0.5 * reach - 1.2 * lick, 0.3 * reach, -0.1], elbowR: [-1.0 + 0.4 * reach - 0.9 * lick, 0, 0], neck: [0.1 * reach, 0, 0] }, T, { sing: lick < 0.5, seed: 9, lids: lerp(0.4, 0.0, wide), look: [0, -0.15 * reach], nod: 0.04 });
      if (lick > 0.5) C.sayf.mouth(0.25);
      C.sayf.P.browL.position.y = browY[0] + 0.02 * wide;
      C.sayf.P.browR.position.y = browY[1] + 0.02 * wide;
      C.sayf.root.position.y = 0.93 + 0.03 * wide * pulse(T, 3);
      choirSing(C.set.singers, T);
      move(camera, [[0.38, 1.5, 1.05], [0.02, 1.52, -0.45]], [[0.3, 1.55, 0.88], [0.02, 1.58, -0.45]], k);
    },
  };
}

// 10 · the shaker, to the beat; then the screen splits in four, as on television
async function s10() {
  const s = new THREE.Scene();
  const C = barCast(s, { camalli: false, zohra: false, gull: false });
  const sh = K.shaker();
  holdIn(C.sayf.P.wristR, sh, [0, -0.12, 0.05], [0, 0, 0]);
  const camera = cam(36, [0.15, 1.62, 1.75], [0, 1.58, -0.6]);
  const t0 = barT(15);
  return {
    scene: s, camera, t0, dur: barT(16) - t0, far: 30, stop: 2.0,
    focus: headOf(C.sayf),
    update(k, t) {
      const T = t0 + t;
      const sh8 = Math.sin((T / BEAT) * Math.PI * 2);
      const ahh = T > 38.45 && T < 39.1;
      act(C.sayf, { ...STAND, shoulderR: [-1.4 + 0.35 * sh8, 0, -0.25], elbowR: [-1.0 - 0.3 * sh8, 0, 0], shoulderL: [-1.4 - 0.35 * sh8, 0, 0.25], elbowL: [-1.0 + 0.3 * sh8, 0, 0], head: [ahh ? -0.25 : 0, 0, 0] }, T, { sing: true, seed: 9, lids: ahh ? 0.75 : 0.4, nod: 0.08 });
      if (ahh) C.sayf.mouth(0.9);
      choirSing(C.set.singers, T);
      shake(camera, T, 0.004);
    },
  };
}
// the four quarters of the split screen
async function s10a() {
  // the camalli bite their hands
  const s = new THREE.Scene();
  const C = barCast(s, { camalli: 'stand', zohra: false, gull: false });
  C.gino.root.position.set(-0.25, 0.93, 0.7);
  C.pippo.root.position.set(0.35, 0.93, 0.7);
  C.gino.root.rotation.y = 0.25;
  C.pippo.root.rotation.y = -0.25;
  const camera = cam(36, [0.05, 1.55, 2.4], [0.05, 1.5, 0.6]);
  const t0 = barT(16);
  return {
    scene: s, camera, t0, dur: BAR, far: 30, stop: 2.0, focus: () => V(0.05, 1.6, 0.7),
    update(k, t) {
      const T = t0 + t;
      for (const [p, sd] of [[C.gino, 1], [C.pippo, 2]]) {
        const chew = 0.5 + 0.5 * Math.sin(T * 22 + sd);
        act(p, { ...STAND, shoulderL: [-1.75, 0, -0.35], elbowL: [-1.35, 0, 0.3], shoulderR: [-1.75, 0, 0.35], elbowR: [-1.35, 0, -0.3] }, T, { seed: sd, lids: 0.2, nod: 0.03 });
        p.mouth(0.25 + 0.35 * chew);
        p.look(0, 0.2);
      }
      act(C.sayf, STAND, T, { sing: true, seed: 6 });
    },
  };
}
async function s10b() {
  // the gull shakes a sugar packet
  const s = new THREE.Scene();
  const C = barCast(s, { camalli: false, zohra: false });
  C.gull.root.position.set(0.1, 1.05, 0.15);
  C.gull.root.rotation.y = 0.15;
  const sachet = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.008), new THREE.MeshStandardMaterial({ color: '#f4f0e6', roughness: 0.8 }));
  s.add(sachet);
  const camera = cam(32, [0.25, 1.55, 1.75], [0.1, 1.5, 0.1]);
  const t0 = barT(16);
  return {
    scene: s, camera, t0, dur: BAR, far: 30, stop: 2.4, focus: () => worldOf(C.gull.P.head),
    update(k, t) {
      const T = t0 + t;
      const sh8 = Math.sin((T / BEAT) * Math.PI * 4);
      act2gull(C.gull, T, { flap: 0.6 + 0.25 * sh8 });
      C.gull.wings(0.9 + 0.25 * sh8, 0.15);
      C.gull.mouth(0.3);
      const w = worldOf(C.gull.P.wingL);
      sachet.position.copy(w).add(V(0.12, 0.1 + 0.03 * sh8, 0.08));
      sachet.rotation.z = 0.4 * sh8;
      act(C.sayf, STAND, T, { sing: true, seed: 6 });
    },
  };
}
async function s10c() {
  // Nonna at the darbuka
  const s = new THREE.Scene();
  const C = barCast(s, { camalli: false, gull: false });
  C.zohra.root.position.set(0.0, 0.93 * 0.86, 1.3);
  C.zohra.root.rotation.y = 0;
  const drum = K.darbuka();
  drum.position.set(0.08, 0.1, 0.17);
  drum.rotation.set(0.3, 0, 1.25);
  C.zohra.P.torso.add(drum);
  const camera = cam(34, [0.1, 1.35, 2.9], [0.0, 1.2, 1.25]);
  const t0 = barT(16);
  return {
    scene: s, camera, t0, dur: BAR, far: 30, stop: 2.2, focus: () => worldOf(C.zohra.P.head).add(V(0, 0.15, 0)),
    update(k, t) {
      const T = t0 + t;
      const g = grid(T);
      const hitL = g.n % 2 === 0 ? pulse(T, 9) : 0, hitR = g.n % 2 ? pulse(T, 9) : 0;
      act(C.zohra, { ...STAND, shoulderL: [-0.5, 0, 0.5], elbowL: [-1.3, 0, 0], shoulderR: [-0.7 + 0.35 * (1 - Math.max(hitL, hitR)), 0, 0.2], elbowR: [-1.2, 0, 0] }, T, { seed: 7, lids: 0.3, mouth: 0.3, nod: 0.1 });
      act(C.sayf, STAND, T, { sing: true, seed: 6 });
    },
  };
}
async function s10d() {
  // Sayf shaking, closer
  const s = new THREE.Scene();
  const C = barCast(s, { camalli: false, zohra: false, gull: false });
  const sh = K.shaker();
  holdIn(C.sayf.P.wristR, sh, [0, -0.12, 0.05], [0, 0, 0]);
  const camera = cam(32, [0.1, 1.7, 1.15], [0, 1.66, -0.6]);
  const t0 = barT(16);
  return {
    scene: s, camera, t0, dur: BAR, far: 30, stop: 2.4, focus: headOf(C.sayf),
    update(k, t) {
      const T = t0 + t;
      const sh8 = Math.sin((T / BEAT) * Math.PI * 2);
      act(C.sayf, { ...STAND, shoulderR: [-1.4 + 0.35 * sh8, 0, -0.25], elbowR: [-1.0 - 0.3 * sh8, 0, 0], shoulderL: [-1.4 - 0.35 * sh8, 0, 0.25], elbowL: [-1.0 + 0.3 * sh8, 0, 0] }, T, { sing: true, seed: 9, nod: 0.1 });
      choirSing(C.set.singers, T);
    },
  };
}

// 11 · the pour: the pink comes down slow and lights up; the gold Casio; the title comes down on strings
async function s11() {
  const s = new THREE.Scene();
  const C = barCast(s, { camalli: false, zohra: false, gull: false });
  const glass = K.cocktail(1.4);
  glass.root.position.set(0.05, 1.05, 0.18);
  s.add(glass.root);
  const sh = K.shaker();
  holdIn(C.sayf.P.wristR, sh, [0, -0.12, 0.05], [0, 0, 0]);
  const watch = K.casio();
  holdIn(C.sayf.P.wristR, watch, [0, 0.0, 0], [0, 0, 0]);
  const pinkLight = new THREE.PointLight('#ff5a9a', 0, 1.6, 1.5);
  pinkLight.position.set(0.05, 1.25, 0.3);
  s.add(pinkLight);
  const title = K.feltTitle('SEX ON LA SANTA', 0.1);
  title.root.position.set(0, 1.9, 0.85);
  s.add(title.root);
  const camera = cam(42, [0.05, 1.55, 2.05], [0.02, 1.55, 0]);
  const t0 = barT(17);
  return {
    scene: s, camera, t0, dur: barT(19) - t0, far: 30, stop: 1.5,
    focus: () => V(0.05, 1.3, 0.2),
    update(k, t) {
      const T = t0 + t;
      const tilt = ease(clamp01((T - 41.5) / 0.4)) * (1 - ease(clamp01((T - 43.5) / 0.4)));
      const fill = clamp01((T - 41.8) / 1.6);
      glass.fill(fill);
      glass.glow(0.4 + 1.6 * fill);
      pinkLight.intensity = 2.5 * fill;
      act(C.sayf, { ...STAND, shoulderR: [-1.2 - 0.1 * tilt, 0.25, -0.05], elbowR: [-0.8, 0, 0], wristR: [0, 0, 1.9 * tilt], shoulderL: [-0.2, 0, 0.2], elbowL: [-0.6, 0, 0] }, T, { sing: true, seed: 11, lids: 0.38, look: [0, -0.2 * tilt] });
      // the letters drop one per eighth note from the start of bar 18
      title.letters.forEach((L, i) => {
        const at = barT(18) + i * BEAT / 2 - BEAT * 3;
        const d = pop((T - at) / 0.6);
        L.position.y = lerp(1.6, 0, clamp01(d));
        L.position.y += (1 - clamp01(d)) * 0 + (d > 1 ? (1 - d) * 0.05 : 0);
        L.rotation.z = 0.12 * Math.sin(T * 3 + i) * Math.exp(-Math.max(0, T - at) * 0.8);
      });
      choirSing(C.set.singers, T);
      move(camera, [[0.05, 1.55, 2.05], [0.02, 1.55, 0]], [[0.05, 1.58, 1.85], [0.02, 1.6, 0]], k);
    },
  };
}

// 12 · Nonna's first sip: the zaghrouta, the trill of a feast, and her foulard flies off
async function s12() {
  const s = new THREE.Scene();
  const C = barCast(s, { camalli: false, gull: false });
  const z = C.zohra;
  z.root.position.set(0.25, 0.93 * 0.86, 0.62);
  z.root.rotation.y = 0.35;
  const glass = K.cocktail(1.0);
  holdIn(z.P.wristR, glass.root, [0, -0.09, 0.05], [0, 0, 0]);
  const camera = cam(34, [0.65, 1.42, 2.15], [0.25, 1.36, 0.6]);
  const t0 = barT(19);
  const scarf0 = z.P.scarf.position.clone();
  return {
    scene: s, camera, t0, dur: barT(20) - t0, far: 30, stop: 2.2,
    focus: () => worldOf(z.P.head).add(V(0, 0.18, 0)),
    update(k, t) {
      const T = t0 + t;
      const sip = ease(clamp01((T - 46.2) / 0.35)) * (1 - ease(clamp01((T - 47.1) / 0.3)));
      const trill = T > 47.3 ? 1 : 0;
      act(z, { ...STAND, shoulderR: [-0.8 - 1.0 * sip, 0, -0.1 - 0.2 * sip], elbowR: [-1.1 - 0.5 * sip, 0, 0], shoulderL: trill ? [-2.6, 0, 0.5] : [0.1, 0, 0.2], elbowL: trill ? [-0.3, 0, 0] : [-0.3, 0, 0], head: [trill ? -0.35 : 0.1 * sip, 0, 0] }, T, { seed: 7, lids: trill ? 0.6 : 0.3, nod: 0.05 });
      z.mouth(trill ? 0.45 + 0.4 * Math.abs(Math.sin(T * 40)) : sip > 0.6 ? 0.2 : 0);
      const fly = clamp01((T - 47.4) / 0.8);
      z.P.scarf.position.set(scarf0.x + 0.1 * fly, scarf0.y + 0.9 * ease(fly), scarf0.z - 0.3 * fly);
      z.P.scarf.rotation.set(-1.2 * fly, 0.8 * fly, 0.4 * fly);
      act(C.sayf, STAND, T, { sing: true, seed: 6, look: [0.4, 0] });
      choirSing(C.set.singers, T, trill);
      shake(camera, T, trill ? 0.006 : 0.002);
    },
  };
}

// ── PART B ──────────────────────────────────────────────────────────────────────────────────────
const PARTY = [['#ff3a78', '#ffb020'], ['#c040ff', '#ff5a9a'], ['#ff3a3a', '#ffd040'], ['#30b8ff', '#ff4a8a']];
function partyLights(set, T, on = 1) {
  const g = grid(T);
  const pal = PARTY[((g.bar % PARTY.length) + PARTY.length) % PARTY.length];
  set.party.forEach((l, i) => {
    l.color.set(pal[i % 2]);
    l.intensity = on * (5 + 4 * pulse(T, 4));
  });
  set.pendants.forEach(({ light }) => (light.intensity = 3.2 * (1 - 0.5 * on) + on * 1.5 * pulse(T, 6)));
}

// 13 · the bar goes up: wide from the door, everyone dancing, the light changing with each bar
async function s13() {
  const s = new THREE.Scene();
  const C = barCast(s, { camalli: 'stand' });
  C.gino.root.position.set(-0.9, 0.93, 1.35);
  C.pippo.root.position.set(0.95, 0.93, 1.55);
  C.zohra.root.position.set(0.1, 0.8, 2.05);
  C.gino.root.rotation.y = 0.5;
  C.pippo.root.rotation.y = -0.6;
  C.zohra.root.rotation.y = Math.PI;
  const camera = cam(52, [0.7, 1.75, 4.3], [0, 1.25, 0]);
  const t0 = barT(20);
  return {
    scene: s, camera, t0, dur: barT(22) - t0, far: 30, stop: 0.9,
    focus: () => V(0, 1.4, 0.5),
    update(k, t) {
      const T = t0 + t;
      partyLights(C.set, T);
      const ds = [[C.gino, 0, 1], [C.pippo, 1, 2], [C.zohra, 0, 3]];
      for (const [p, st, sd] of ds) {
        const d = dance(T + sd * 0.07, st);
        act(p, { ...STAND, ...d.pose }, T, { seed: sd, lids: 0.25, mouth: 0.35, nod: 0.1 });
        p.root.position.y = (p === C.zohra ? 0.8 : 0.93) + d.bob;
      }
      C.zohra.root.rotation.y = Math.PI + 0.6 * Math.sin(T * 1.5);
      const d = dance(T, 0, 0.5);
      act(C.sayf, { ...STAND, ...d.pose }, T, { sing: true, seed: 6, nod: 0.1 });
      act2gull(C.gull, T, { flap: 0.5 + 0.5 * Math.abs(Math.sin(T * 6)) });
      choirSing(C.set.singers, T, 0.6 * pulse(T, 3));
      shake(camera, T, 0.008);
    },
  };
}

// 14 · the camalli lift Sayf onto the counter; he keeps rapping, calm, as everyone goes mad
async function s14() {
  const s = new THREE.Scene();
  const C = barCast(s, { camalli: 'stand', zohra: true });
  C.gino.root.position.set(-0.5, 0.93, 0.62);
  C.pippo.root.position.set(0.5, 0.93, 0.62);
  C.zohra.root.position.set(1.3, 0.8, 1.2);
  C.gull.root.position.set(-1.0, 1.05, 0.1);
  const camera = cam(48, [0.3, 0.85, 2.7], [0, 1.85, 0]);
  const t0 = barT(22);
  return {
    scene: s, camera, t0, dur: barT(24) - t0, far: 30, stop: 1.0,
    focus: headOf(C.sayf),
    update(k, t) {
      const T = t0 + t;
      partyLights(C.set, T);
      const up = ease(clamp01((T - 53.1) / 1.0));
      C.sayf.root.position.set(0, lerp(0.93, 1.07 + 0.93, up) + (up < 1 ? Math.sin(up * Math.PI) * 0.12 : 0.02 * pulse(T, 5)), lerp(-0.62, 0.0, up));
      act(C.sayf, { ...STAND, shoulderL: [-0.6, 0, 0.6], elbowL: [-0.8, 0, 0], shoulderR: [-0.6, 0, -0.6], elbowR: [-0.8, 0, 0] }, T, { sing: true, seed: 6, lids: 0.42, nod: 0.06 });
      for (const [p, sd, sx] of [[C.gino, 1, 1], [C.pippo, 2, -1]]) {
        const lift = up < 1 ? 1 : 0;
        const d = dance(T + sd * 0.1, 1);
        act(p, lift ? { ...STAND, shoulderL: [-2.7, 0, 0.2], shoulderR: [-2.7, 0, -0.2], elbowL: [-0.3, 0, 0], elbowR: [-0.3, 0, 0] } : { ...STAND, ...d.pose }, T, { seed: sd, lids: 0.2, mouth: 0.5, nod: 0.12 });
      }
      C.gino.root.rotation.y = 0.15;
      C.pippo.root.rotation.y = -0.15;
      const dz = dance(T, 2);
      act(C.zohra, { ...STAND, ...dz.pose }, T, { seed: 3, mouth: 0.3 });
      act2gull(C.gull, T, { flap: 0.6 });
      choirSing(C.set.singers, T, 0.5 * pulse(T, 3));
      shake(camera, T, 0.006);
    },
  };
}

// 15 · the gull DJs on the espresso machine; L'amour toujours waves the room; a cap lands on Sayf; he points at us
async function s15() {
  const s = new THREE.Scene();
  const C = barCast(s, { camalli: 'stand' });
  C.gull.root.position.set(-1.3, 1.48, 0.0);
  C.gull.root.rotation.y = 0.6;
  C.gino.root.position.set(0.35, 0.93, 1.35);
  C.pippo.root.position.set(1.05, 0.93, 1.1);
  C.zohra.root.position.set(1.55, 0.8, 0.65);
  C.gino.root.rotation.y = C.pippo.root.rotation.y = Math.PI - 0.2;
  C.zohra.root.rotation.y = -2.2;
  // the cap
  const cap = new THREE.Group();
  const capM = new THREE.MeshStandardMaterial({ color: '#c8202a', roughness: 0.8 });
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), capM);
  crown.scale.set(0.95, 0.7, 0.92);
  cap.add(crown);
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.012, 20, 1, false, -Math.PI / 2, Math.PI), capM);
  visor.position.set(0, 0.0, 0.15);
  visor.scale.set(1.1, 1, 0.9);
  cap.add(visor);
  s.add(cap);
  const camera = cam(42, [-0.55, 1.75, 1.35], [-1.05, 1.68, 0]);
  const t0 = barT(24);
  return {
    scene: s, camera, t0, dur: barT(26) - t0, far: 30, stop: 1.6,
    focus: () => (camera.position.x > -0.2 ? worldOf(C.sayf.P.head).add(V(0, 0.2, 0)) : worldOf(C.gull.P.head)),
    update(k, t) {
      const T = t0 + t;
      partyLights(C.set, T);
      const sc16 = Math.sin((T / BEAT) * Math.PI * 4);
      act2gull(C.gull, T, { flap: 0 });
      C.gull.wings(0.6 + 0.35 * sc16, 0.6 - 0.35 * sc16);
      C.gull.mouth(0.2 + 0.3 * pulse(T, 4));
      C.set.decks.forEach((d, i) => (d.rotation.y = T * 3.3 * (i ? 1 : -1) + 0.4 * sc16));
      const lamour = T > 59.7 ? 1 : 0;
      for (const [p, sd] of [[C.gino, 1], [C.pippo, 2], [C.zohra, 3]]) {
        const d = dance(T + sd * 0.05, lamour ? 2 : 0);
        act(p, { ...STAND, ...d.pose }, T, { seed: sd, lids: 0.25, mouth: 0.35 });
        p.root.position.y = (p === C.zohra ? 0.8 : 0.93) + d.bob;
      }
      const point = ease(clamp01((T - 61.75) / 0.25));
      const d = dance(T, lamour ? 2 : 0, 0.4);
      act(C.sayf, point ? { ...STAND, shoulderR: [-1.55, -0.2, -0.1], elbowR: [-0.1, 0, 0], shoulderL: [-0.2, 0, 0.3] } : { ...STAND, ...d.pose }, T, { sing: true, seed: 6, lids: 0.4, look: [0.3, 0] });
      // the cap falls from above and settles on his head
      const fall = clamp01((T - 61.3) / 0.45);
      const h = worldOf(C.sayf.P.head);
      cap.position.set(h.x, h.y + 0.39 + (1 - ease(fall)) * 1.4, h.z + 0.01);
      cap.rotation.set(-0.12, 0, (1 - fall) * 0.8);
      cap.visible = T > 61.3;
      choirSing(C.set.singers, T, 0.5 * pulse(T, 3));
      // at the end, the camera turns to Sayf for the point
      move(camera, [[-0.55, 1.75, 1.35], [-1.05, 1.68, 0]], [[0.0, 1.78, 0.68], [0, 1.74, -0.6]], clamp01((T - 61.2) / 0.6));
      shake(camera, T, 0.005);
    },
  };
}

// ── THE BREAK ───────────────────────────────────────────────────────────────────────────────────
// 16 · the power goes; only the eyes and the cocktail glow; Sayf blinks once, on the beat
async function s16() {
  const s = new THREE.Scene();
  const C = barCast(s);
  const glass = K.cocktail(1.4);
  glass.root.position.set(0.25, 1.05, 0.15);
  s.add(glass.root);
  const lights = allLights(s);
  const em = emissives(s);
  const glowL = new THREE.PointLight('#ff4a8a', 0, 2.2, 1.5);
  glowL.position.set(0.25, 1.3, 0.3);
  s.add(glowL);
  const eyesM = [];
  s.traverse((o) => o.isMesh && o.material?.color?.getHexString?.() === 'f6f3ec' && eyesM.push(o.material));
  const camera = cam(40, [0.1, 1.62, 2.3], [0, 1.52, -0.4]);
  const t0 = barT(26);
  return {
    scene: s, camera, t0, dur: barT(27) - t0, far: 30, stop: 1.5,
    focus: headOf(C.sayf),
    update(k, t) {
      const T = t0 + t;
      const dark = T < 62.5 ? 1 - clamp01((T - 62.32) / 0.12) : T > 64.45 ? clamp01((T - 64.45) / 0.15) : 0;
      lights.forEach(({ light, base }) => (light.intensity = base * dark));
      em.forEach(({ m, base, col }) => (m.emissiveIntensity !== undefined ? (m.emissiveIntensity = base * dark) : m.color.copy(col).multiplyScalar(dark)));
      s.background = new THREE.Color('#120c08').multiplyScalar(dark);
      for (const m of eyesM) {
        m.emissive = new THREE.Color('#ffffff');
        m.emissiveIntensity = 0.55 * (1 - dark);
      }
      glass.glow(1.0 + 2.5 * (1 - dark));
      glowL.intensity = 3 * (1 - dark);
      act(C.sayf, STAND, T, { seed: 6, lids: T > 63.42 && T < 63.62 ? 1 : 0.3, nod: 0.0, look: [0, 0] });
      C.sayf.lids(T > 63.42 && T < 63.62 ? 1 : 0.3);
      for (const [p, sd] of [[C.gino, 1], [C.pippo, 2]]) act(p, SITTING, T, { seed: sd, lids: 0.1, nod: 0 });
      act2gull(C.gull, T);
      C.zohra.lids(0.1);
    },
  };
}

// ── FINALE ──────────────────────────────────────────────────────────────────────────────────────
function procession(s) {
  const gino = puppet(GINO), pippo = puppet(PIPPO), zohra = puppet(ZOHRA);
  const gull = K.seagull();
  const port = K.portantina();
  const big = K.cocktail(4.2);
  big.root.position.set(0, 0.06, 0);
  port.add(big.root);
  const pink = new THREE.PointLight('#ff4a8a', 6, 5, 1.5);
  pink.position.set(0, 0.6, 0);
  port.add(pink);
  s.add(gino.root, pippo.root, zohra.root, gull.root, port);
  return {
    gino, pippo, zohra, gull, port, big,
    /** everyone at z, walking toward +z (or away, dir -1), on the beat */
    at(T, x, z, dir = 1, walking = 1) {
      const wk = walk(T, walking);
      for (const [p, dx, sd] of [[gino, -0.62, 1], [pippo, 0.62, 2]]) {
        act(p, { ...STAND, ...wk.pose, shoulderL: dx < 0 ? [0.3, 0, 0.1] : [-2.9, 0, -0.35], elbowL: [-0.3, 0, 0], shoulderR: dx > 0 ? [-0.3, 0, -0.1] : [-2.9, 0, 0.35], elbowR: [-0.3, 0, 0] }, T, { seed: sd, lids: 0.3, mouth: 0.3, nod: 0.05 });
        p.root.position.set(x + dx, 0.93 + wk.bob, z);
        p.root.rotation.y = dir > 0 ? 0 : Math.PI;
      }
      port.position.set(x, 1.95 + wk.bob, z);
      port.rotation.set(0, Math.PI / 2, 0.03 * Math.sin(T * 3));
      const wz = walk(T + 0.2, walking * 0.8);
      act(zohra, { ...STAND, ...wz.pose, shoulderR: [-2.6, 0, -0.3], elbowR: [-0.4, 0, 0.4 * swing(T)] }, T, { seed: 3, lids: 0.3, mouth: 0.3 });
      zohra.root.position.set(x - 0.4, 0.8 + wz.bob, z - dir * 1.3);
      zohra.root.rotation.y = dir > 0 ? 0 : Math.PI;
      gull.root.position.set(x + 0.5, 0.0 + 0.04 * Math.abs(Math.sin(T * 6)), z - dir * 1.15);
      gull.root.rotation.y = dir > 0 ? 0 : Math.PI;
      act2gull(gull, T);
    },
  };
}

// 17 · the light comes back; out into the caruggio: the camalli carry the cocktail like a saint
async function s17() {
  const s = new THREE.Scene();
  await caruggio(s);
  const pr = procession(s);
  const fill = new THREE.SpotLight('#ffe2c8', 14, 12, 0.5, 0.9, 1.4);
  s.add(fill, fill.target);
  const camera = cam(42, [0.3, 0.75, 3.2], [0, 1.6, -4]);
  const t0 = barT(27);
  return {
    scene: s, camera, t0, dur: barT(29) - t0, far: 60, stop: 1.2,
    focus: () => worldOf(pr.port).add(V(0, 0.2, 0)),
    update(k, t) {
      const T = t0 + t;
      const z = lerp(-7.5, -1.6, k);
      pr.at(T, 0, z, 1);
      move(camera, [[0.35, 0.75, 3.4], [0, 1.7, -4]], [[0.25, 0.8, 2.6], [0, 1.9, -1]], k);
      fill.position.copy(camera.position).add(V(0.3, 1.0, 0));
      fill.target.position.set(0, 1.5, z);
    },
  };
}

// a neighbour at a window, with a pot and a spoon
function neighbour(s, win, C, seed) {
  const p = puppet(C);
  for (const k of ['hipL', 'hipR']) p.P[k].visible = false;
  if (p.P.skirt) p.P.skirt.visible = false;
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.08, 18), new THREE.MeshStandardMaterial({ color: '#b8bcc2', metalness: 0.9, roughness: 0.25, envMap: K.env() }));
  holdIn(p.P.wristL, pot, [0, -0.1, 0.05], [0, 0, 0]);
  const spoon = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6), new THREE.MeshStandardMaterial({ color: '#c8a050', metalness: 0.8, roughness: 0.3 }));
  holdIn(p.P.wristR, spoon, [0, -0.12, 0.05], [0.9, 0, 0]);
  // in the window, leaning out over the sill
  const out = new THREE.Vector3(-win.side, 0, 0);
  p.root.position.set(win.x + out.x * 0.12, win.y - 0.95, win.z);
  p.root.rotation.y = win.side > 0 ? -Math.PI / 2 : Math.PI / 2;
  s.add(p.root);
  const f = (T) => {
    const hit = pulse(T, 9);
    act(p, { ...STAND, torso: [0.2, 0, 0], shoulderL: [-1.3, 0, 0.3], elbowL: [-0.8, 0, 0], shoulderR: [-1.6 + 0.5 * hit, 0, -0.2], elbowR: [-0.9, 0, 0] }, T, { seed, lids: 0.25, mouth: 0.5 * hit + 0.1, nod: 0.12 });
  };
  f.root = p.root;
  return f;
}

// 18 · down the caruggio: the neighbours bang their pots on the beat, the washing jumps; five felt stars fall
async function s18() {
  const s = new THREE.Scene();
  const set = await caruggio(s);
  const pick = (side, zmin, zmax, fl) => set.windows.find((w) => w.side === side && w.z < zmax && w.z > zmin && Math.round((w.y - 0.4) / 3) === fl);
  const nbs = [];
  const Cs = [{ ...ZOHRA, scarf: '#3a5aa8', scarf2: '#f2f0ea', name: 'n1' }, { ...GINO, cap: '#2a6a3a', name: 'n2' }, { ...PIPPO, cap: '#d2a020', name: 'n3' }];
  [[-1, -6, -2, 1], [1, -8, -3, 1], [1, -14, -8, 2]].forEach(([side, a, b, fl], i) => {
    const w = pick(side, a, b, fl);
    if (w) {
      w.leaves.forEach((l, j) => (l.rotation.y = (j ? 1 : -1) * 2.6));
      nbs.push(neighbour(s, w, Cs[i], 30 + i));
    }
  });
  const pr = procession(s);
  const stars = [0, 1, 2, 3, 4].map((i) => {
    const st = K.star(0.16);
    s.add(st);
    return st;
  });
  const camera = cam(56, [0.25, 1.3, 2.4], [0, 5.5, -9]);
  const t0 = barT(29);
  return {
    scene: s, camera, t0, dur: barT(31) - t0, far: 60, stop: 0.8,
    focus: () => V(0, 4, -6),
    update(k, t) {
      const T = t0 + t;
      nbs.forEach((f) => f(T));
      set.lines.forEach((ln, i) => ln.items.forEach((it, j) => (it.rotation.x = 0.5 * pulse(T + (i + j) * 0.03, 5) * Math.sin(j + i))));
      pr.at(T, 0, lerp(-3.5, 0.2, k), 1);
      // the reviews: five stars, one per beat from "recensioni"
      stars.forEach((st, i) => {
        const at = 71.4 + i * BEAT;
        const d = clamp01(pop((T - at) / 0.55));
        st.position.set(-0.85 + i * 0.42, lerp(9, 3.2 + 0.25 * Math.sin(i * 2), d), -2.5);
        st.rotation.set(0, 0.3 * Math.sin(T * 2 + i), 0.15 * Math.sin(T * 3 + i));
        st.visible = T > at - 0.1;
      });
      move(camera, [[0.25, 1.3, 2.4], [0, 5.5, -9]], [[0.2, 1.25, 2.6], [0, 4.2, -6]], k);
    },
  };
}

// 19 · Sayf walks at the head of the procession, rapping to us; his poster on the wall; a neighbour slams her shutters
async function s19() {
  const s = new THREE.Scene();
  const set = await caruggio(s);
  const sayf = puppet(SAYF);
  s.add(sayf.root);
  const pr = procession(s);
  const slam = set.windows.filter((w) => w.side === 1 && w.y < 4).sort((a, b) => Math.abs(a.z + 3.4) - Math.abs(b.z + 3.4))[0];
  const nb = slam ? neighbour(s, slam, { ...ZOHRA, scarf: '#5a2a6a', name: 'n4' }, 40) : null;
  if (slam) slam.leaves.forEach((l, j) => (l.rotation.y = (j ? 1 : -1) * 2.6));
  const fill = new THREE.SpotLight('#ffe2c8', 12, 8, 0.45, 0.9, 1.4);
  s.add(fill, fill.target);
  const camera = cam(36, [0, 1.35, 0], [0, 1.3, -4]);
  const t0 = barT(31);
  return {
    scene: s, camera, t0, dur: barT(33) - t0, far: 60, stop: 2.0,
    focus: headOf(sayf),
    update(k, t) {
      const T = t0 + t;
      const z = lerp(-8.6, -3.6, k);
      const wk = walk(T);
      act(sayf, { ...STAND, ...wk.pose, shoulderR: [-1.0, 0, -0.3], elbowR: [-0.8, 0, 0.2] }, T, { sing: true, seed: 6, lids: 0.4 });
      sayf.root.position.set(0, 0.93 + wk.bob, z);
      pr.at(T, 0, z - 2.4, 1);
      if (nb) {
        const shut = ease(clamp01((T - 76.2) / 0.18));
        nb(T);
        slam.leaves.forEach((l, j) => (l.rotation.y = (j ? 1 : -1) * lerp(2.6, 0, shut)));
        nb.root.visible = shut < 0.4;
      }
      camera.position.set(0.15 * Math.sin(T * 0.7), 1.38, z + 2.3);
      camera.lookAt(0, 1.3, z - 0.5);
      camera.updateMatrixWorld(true);
      fill.position.set(0.4, 2.2, z + 2.0);
      fill.target.position.set(0, 1.6, z);
    },
  };
}

// 20 · the port: the ferry for Tunis lights up deck by deck; the Lanterna's beam sweeps over us on the beat
async function s20() {
  const s = new THREE.Scene();
  const set = porto(s);
  const pr = procession(s);
  const sayf = puppet(SAYF);
  s.add(sayf.root);
  const camera = cam(48, [-7, 3.2, 12], [-13, 8, -20]);
  const t0 = barT(33);
  const lan = V(-120, 0, -110);
  return {
    scene: s, camera, t0, dur: barT(35) - t0, far: 600, stop: 0.5,
    focus: () => V(0, 3, -6),
    update(k, t) {
      const T = t0 + t;
      set.decks.forEach((m, i) => (m.emissiveIntensity = T > barT(33) + i * BEAT ? 1.6 : 0.0));
      set.flood.intensity = T > barT(33) + 3 * BEAT ? 60 : 0;
      // the beam points at the camera on the downbeat of bar 34
      const d = camera.position.clone().sub(lan);
      const th0 = Math.atan2(-d.z, d.x);
      set.beam.rotation.y = th0 + 1.35 * (T - barT(34));
      pr.at(T, -1.5, lerp(-1, 2.5, k), 1);
      const wk = walk(T);
      act(sayf, { ...STAND, ...wk.pose }, T, { sing: true, seed: 6 });
      sayf.root.position.set(-1.5, 0.93 + wk.bob, lerp(0.8, 4.2, k));
      move(camera, [[-7, 3.2, 12], [-13, 8, -20]], [[-6, 2.6, 11], [-11, 7, -20]], k);
    },
  };
}

// 21 · Nonna waves from the ship's rail; the horn on the bass; the gull puts his shades on: the manager
async function s21() {
  const s = new THREE.Scene();
  const set = porto(s);
  set.decks.forEach((m) => (m.emissiveIntensity = 1.6));
  set.flood.intensity = 60;
  const sayf = puppet(SAYF);
  sayf.root.position.set(0, 0.6 + 0.93, -5.4);
  s.add(sayf.root);
  const gull = K.seagull();
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.8 }));
  crate.position.set(0.85, 0.25, -4.85);
  crate.castShadow = crate.receiveShadow = true;
  s.add(crate);
  gull.root.position.set(0.85, 0.5, -4.85);
  gull.root.rotation.y = -0.4;
  s.add(gull.root);
  const z = puppet(ZOHRA);
  z.root.position.set(-4.5, 11.6 + 0.8 - 0.2, -8.45);
  z.root.scale.setScalar(1.6);
  s.add(z.root);
  const zl = new THREE.SpotLight('#ffe8d0', 40, 20, 0.3, 0.6, 1.2);
  zl.position.set(-2, 14, -2);
  zl.target.position.set(-4.5, 12.5, -8.5);
  s.add(zl, zl.target);
  const puff = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), new THREE.MeshStandardMaterial({ color: '#f2f2f2', transparent: true, opacity: 0.0, roughness: 1 }));
  puff.position.set(-10, 18, -13);
  s.add(puff);
  const key = new THREE.SpotLight('#ffe0c0', 25, 10, 0.6, 0.8, 1.4);
  key.position.set(2.5, 4, -1);
  key.target.position.set(0.3, 1.5, -5.3);
  shadowed(key);
  s.add(key, key.target);
  const camera = cam(48, [2.4, 1.0, -0.9], [-1.4, 3.7, -7]);
  const t0 = barT(35);
  return {
    scene: s, camera, t0, dur: barT(37) - t0, far: 600, stop: 1.0,
    focus: headOf(sayf),
    update(k, t) {
      const T = t0 + t;
      const d = dance(T, 0, 0.7);
      act(sayf, { ...STAND, ...d.pose }, T, { sing: true, seed: 6, lids: 0.38, look: [0.2, 0.1] });
      sayf.root.position.y = 0.6 + 0.93 + d.bob;
      const mgr = T > 86.5;
      gull.P.shades.visible = mgr;
      act2gull(gull, T, { flap: 0.3 + 0.4 * Math.abs(Math.sin(T * 5)) });
      gull.root.position.y = 0.5 + 0.05 * pulse(T, 5);
      act(z, { ...STAND, shoulderR: [-2.7, 0, -0.4], elbowR: [-0.4, 0, 0.7 * swing(T)], torso: [0.1, 0, 0] }, T, { seed: 3, lids: 0.3, mouth: 0.4 });
      const h = clamp01((T - 83.25) / 1.6);
      puff.material.opacity = 0.75 * Math.sin(h * Math.PI);
      puff.scale.setScalar(0.5 + 2.5 * h);
      puff.position.y = 18 + 3 * h;
      set.beam.rotation.y = T * 1.35;
      move(camera, [[2.4, 1.0, -0.9], [-1.4, 3.7, -7]], [[2.1, 1.1, -1.5], [-1.2, 3.5, -7]], k);
    },
  };
}

// 22 · three bites of focaccia on "fame, fame, fame"; then the camera rises over the crowd dancing on the quay
async function s22() {
  const s = new THREE.Scene();
  const set = porto(s);
  set.decks.forEach((m) => (m.emissiveIntensity = 1.6));
  set.flood.intensity = 60;
  const sayf = puppet(SAYF);
  sayf.root.position.set(0, 0.93, 0.5);
  s.add(sayf.root);
  const fo = K.focaccia(0.26, 0.18);
  holdIn(sayf.P.wristR, fo.root, [0, -0.1, 0.09], [Math.PI / 2, 0, 0]);
  const pr = procession(s);
  const extras = [
    { ...GINO, cap: '#2a6a3a', trousers: '#555', name: 'x1' }, { ...ZOHRA, scarf: '#3a5aa8', scarf2: '#f2f0ea', name: 'x2' }, { ...PIPPO, cap: '#d2a020', name: 'x3' },
    { ...GINO, cap: '#6a2a8a', name: 'x4', belly: 1.0 }, { ...ZOHRA, scarf: '#2a8a5a', scarf2: '#f2c230', name: 'x5' },
  ].map((C2, i) => {
    const p = puppet(C2);
    const a = (i / 5) * Math.PI * 2;
    p.root.position.set(Math.cos(a) * 2.4, 0.93 * (C2.scale ?? 1), -1.5 + Math.sin(a) * 1.6);
    p.root.rotation.y = -a - Math.PI / 2;
    s.add(p.root);
    return p;
  });
  const camera = cam(40, [0.45, 1.4, 1.75], [0, 1.4, 0.4]);
  const t0 = barT(37);
  return {
    scene: s, camera, t0, dur: barT(39) - t0, far: 600, stop: 1.6,
    focus: () => (k22 < 0.3 ? worldOf(sayf.P.head).add(V(0, 0.2, 0)) : V(0, 1, -1.5)),
    update(k, t) {
      const T = t0 + t;
      k22 = k;
      // three bites, one on each "fame"
      const bites = [87.9, 88.45, 89.0].filter((b) => T > b + 0.12).length;
      fo.bites(bites);
      const near = [87.9, 88.45, 89.0].map((b) => Math.exp(-Math.abs(T - b - 0.05) * 9)).reduce((a, b) => Math.max(a, b), 0);
      act(sayf, { ...STAND, shoulderR: [-1.3 - 0.35 * near, 0, -0.15], elbowR: [-1.4 - 0.3 * near, 0, 0.2] }, T, { sing: true, seed: 6, lids: 0.35 });
      if (near > 0.4) sayf.mouth(0.75 * near);
      pr.at(T, 0, -1.6, 1, 0);
      pr.port.position.y = 1.95 + 0.05 * pulse(T, 5);
      extras.forEach((p, i) => {
        const d = dance(T + i * 0.05, i % 3);
        act(p, { ...STAND, ...d.pose }, T, { seed: 50 + i, lids: 0.25, mouth: 0.4 });
        p.root.position.y = 0.93 * (p.P.skirt ? 0.86 : 1) + d.bob;
      });
      // the crane: low and close for the bites, then up and over the quay
      const up = ease(clamp01((T - 89.4) / 2.9));
      camera.position.set(lerp(0.45, 0.5, up), lerp(1.4, 11, up), lerp(1.75, 9.5, up));
      camera.lookAt(lerp(0, 0, up), lerp(1.4, 0.8, up), lerp(0.4, -3, up));
      camera.updateMatrixWorld(true);
      set.beam.rotation.y = T * 1.35;
    },
  };
}
let k22 = 0;

// 23 · dawn: the bench again, the alley empty; Sayf alone finishes the cocktail, lids half, a wink
async function s23() {
  const s = new THREE.Scene();
  const { wz } = santissimoFront(s);
  allLights(s).forEach(({ light }) => (light.isHemisphereLight ? (light.color.set('#a8c4f0'), light.intensity = 1.6) : (light.intensity *= 0.25)));
  s.background = new THREE.Color('#7f9fd0');
  const dawn = new THREE.DirectionalLight('#cfe0ff', 1.6);
  dawn.position.set(-2, 6, 4);
  s.add(dawn);
  const sayf = puppet(SAYF);
  sayf.root.position.set(-0.85, 0.47, wz + 0.38);
  sayf.root.rotation.y = D(6);
  s.add(sayf.root);
  const glass = K.cocktail(1.0);
  holdIn(sayf.P.wristR, glass.root, [0, -0.09, 0.05], [0, 0, 0]);
  glass.fill(0.3);
  const camera = cam(34, [-1.3, 1.05, 0.75], [-0.75, 1.2, wz]);
  const t0 = barT(39);
  return {
    scene: s, camera, t0, dur: 94.42 - t0, far: 30, stop: 2.4,
    focus: headOf(sayf),
    update(k, t) {
      const T = t0 + t;
      const sip = ease(clamp01((T - 92.6) / 0.4)) * (1 - ease(clamp01((T - 93.4) / 0.35)));
      glass.fill(lerp(0.3, 0.02, clamp01((T - 92.7) / 0.7)));
      act(sayf, { ...SITTING, torso: [-0.2, 0.05, 0.05], shoulderL: [0.25, 0.3, 0.95], elbowL: [-0.9, 0.2, 0.1], shoulderR: [-0.7 - 0.9 * sip, 0, -0.1], elbowR: [-1.2 - 0.5 * sip, 0, 0], head: [0.1 * sip, -0.15, 0] }, T, { sing: sip < 0.5, seed: 6, lids: 0.45, nod: 0.03, look: [0.3, 0.05] });
      // the wink: his left lid shuts on the last beat
      if (T > 94.1 && T < 94.5) sayf.P.lids[1].rotation.x = -0.9 + 2.25;
      move(camera, [[-1.3, 1.05, 0.75], [-0.75, 1.2, wz]], [[-1.2, 1.1, 0.55], [-0.78, 1.22, wz]], k);
    },
  };
}

// 24 · the sign goes out on the last hit; black. (The title card is laid on in the cut.)
async function s24() {
  const s = new THREE.Scene();
  const { wz } = santissimoFront(s);
  const lights = allLights(s);
  const em = emissives(s);
  const camera = cam(40, [0.4, 1.45, 4.6], [0.25, 1.75, wz]);
  const t0 = 94.42;
  return {
    scene: s, camera, t0, dur: 96.9 - t0, far: 30, stop: 0.6,
    focus: () => V(0, 1.5, wz),
    update(k, t) {
      const T = t0 + t;
      const on = T < 94.86 ? 1 : 0.0;
      lights.forEach(({ light, base }) => (light.intensity = base * (light.isHemisphereLight ? Math.max(0.15, on) : on)));
      em.forEach(({ m, base, col }) => (m.emissiveIntensity !== undefined ? (m.emissiveIntensity = base * on) : m.color.copy(col).multiplyScalar(on)));
    },
  };
}

export const SHOTS = { s01, s02, s03, s04, s05, s06, s07, s08, s09, s10, s10a, s10b, s10c, s10d, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21, s22, s23, s24 };
/** The cut: which shot plays when. The split screen plays s10a–d together in quarters. */
export const CUT = [
  ['s01'], ['s02'], ['s03'], ['s04'], ['s05'], ['s06'], ['s07'], ['s08'], ['s09'], ['s10'], ['s10a', 's10b', 's10c', 's10d'],
  ['s11'], ['s12'], ['s13'], ['s14'], ['s15'], ['s16'], ['s17'], ['s18'], ['s19'], ['s20'], ['s21'], ['s22'], ['s23'], ['s24'],
];
