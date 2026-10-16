import * as THREE from 'three';
import { Act } from '../acts/Act.js';
import { Puppet } from '../objects/puppet.js';
import { flat } from '../objects/city.js';
import { drawHead, HEADS, skinHex } from '../textures/heads.js';
import { texture, tryImage } from '../textures/util.js';
import { crumple } from '../textures/crumple.js';
import { newspaperPages } from '../textures/newspaper.js';
import { buildWorld } from './world.js';
import { Hud } from '../overlay/hud.js';
import { SONG } from '../data/album.js';

// ── small, pure helpers ──
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => {
  x = clamp01(x);
  return x * x * (3 - 2 * x);
};
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const lerp = (a, b, u) => a + (b - a) * u;
const span = (st, a, b) => clamp01((st - a) / (b - a));
const BEAT = 60 / SONG.bpm;
const beatPhase = (st) => (((st - SONG.firstBeat) / BEAT) % 1 + 1) % 1;
const beatIndex = (st) => Math.floor((st - SONG.firstBeat) / BEAT);
const Q = (st, fps = 12) => Math.floor(st * fps) / fps; // NPC stiffness: poses update at 12 fps

/** Position along a polyline path at u ∈ [0,1]; yaw faces the direction of travel. */
function along(path, u) {
  const lens = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    lens.push(l);
    total += l;
  }
  let d = clamp01(u) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? Math.min(1, d / lens[i]) : 0;
      const [x0, z0] = path[i];
      const [x1, z1] = path[i + 1];
      return { x: lerp(x0, x1, k), z: lerp(z0, z1, k), yaw: Math.atan2(x1 - x0, z1 - z0), dist: clamp01(u) * total };
    }
    d -= lens[i];
  }
  return { x: path[0][0], z: path[0][1], yaw: 0, dist: 0 };
}

/** Walk an actor along a path between song times a and b. */
function walkOn(p, path, st, a, b) {
  const w = along(path, span(st, a, b));
  const moving = st > a && st < b;
  p.root.position.set(w.x, 0, w.z);
  p.root.rotation.y = w.yaw;
  p.pose({ phase: (w.dist / 0.72) * Math.PI, walk: moving ? 1 : 0 });
  return w;
}

export class GameAct extends Act {
  constructor(s) {
    super('game', { start: s.game, end: s.back });
    this.s = s;
    this.camera.fov = 40;
  }

  st(t) {
    return t - this.s.songStart;
  }

  async build(film) {
    const scene = this.scene;
    scene.fog = new THREE.Fog(0xd8c8ac, 70, 460);
    // soft studio reflections give the skin its airbrushed sheen
    scene.environment = film.env;
    scene.environmentIntensity = 0.5;
    const discAct = film.acts.find((a) => a.name === 'disc');
    const labelTexture = discAct.disc.children[0].material.map;
    let clock = performance.now();
    const lap = (what) => {
      console.info(`[MUERTO]   ${what}: ${Math.round(performance.now() - clock)} ms`);
      clock = performance.now();
    };
    this.world = buildWorld({ portrait: discAct.portrait, labelTexture });
    lap('world');
    scene.add(this.world.group);
    // the moon-disc glows with its own print
    this.world.moon.traverse((o) => {
      if (o.isMesh && o.material.map === labelTexture) {
        o.material = o.material.clone();
        o.material.emissive = new THREE.Color(1, 1, 1);
        o.material.emissiveMap = labelTexture;
        o.material.emissiveIntensity = 0.9;
      }
    });

    // lights
    this.sun = new THREE.DirectionalLight(0xfff2de, 1.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 220 });
    this.sun.shadow.bias = -0.0006;
    this.hemi = new THREE.HemisphereLight(0xdfe6ee, 0x6a6458, 1.6);
    this.moonLight = new THREE.DirectionalLight(0x9db4ff, 0);
    this.moonLight.position.set(500, 60, 60);
    this.strangerLamp = new THREE.PointLight(0xffd8a0, 0, 16, 1.3);
    this.strangerLamp.position.set(397.5, 6.2, 44.4);
    this.carLight = new THREE.PointLight(0xffe8c0, 0, 4, 1.5); // cabin light for the windshield shot at night
    scene.add(this.sun, this.sun.target, this.hemi, this.moonLight, this.strangerLamp, this.carLight);

    // ── cast ──
    const head = async (key, file) => {
      const img = await tryImage(`assets/heads/${file}.png`);
      return {
        head: img ?? drawHead(HEADS[key]),
        back: (await tryImage(`assets/heads/${file}-back.png`)) ?? drawHead(HEADS[key], { back: true }),
        side: (await tryImage(`assets/heads/${file}-side.png`)) ?? (img ? null : drawHead({ ...HEADS[key], turn: 0.6 })),
      };
    };
    // bodies wear the same skin as their painted heads
    const mk = async (key, outfit, extra = {}) => new Puppet({ ...(await head(key, key)), outfit: { skin: skinHex(HEADS[key].tone), ...outfit }, name: key, ...extra });
    this.mercy = await mk('mercy', { shirt: 'patchwork', pants: '#17171a', baggy: 1.45, shoes: '#20150f', bulk: 1.06 }, { headHeight: 0.76 });
    this.barber = await mk('barber', { shirt: '#d2c8b2', pants: '#141416', baggy: 1.5, shoes: '#0d0d0e', bulk: 1.08 }, { headHeight: 0.74 });
    this.client = await mk('client', { shirt: '#5b4636', cape: true, capeColor: '#8e1f22', pants: '#2c2a33' }, { headHeight: 0.72 });
    this.barista = await mk('barista', { shirt: '#3d4a3a', apron: true, pants: '#22201e', bulk: 1.12 });
    this.patron = await mk('old', { coat: '#5a4532', pants: 'pinstripe', bulk: 1.1 });
    this.oldwoman = await mk('oldwoman', { coat: '#6a5470', pants: '#4a3c50', shoes: '#2a201a' });
    this.kid = await mk('kid', { shirt: '#d1a23e', pants: '#2c3d5c', shoes: '#e6e1d4' });
    this.kid.root.scale.setScalar(0.74);
    this.driver = await mk('driver', { shirt: '#e2ddd0', pants: '#1e2a40', bulk: 1.12 });
    this.stranger = await mk('stranger', { coat: '#121012', pants: '#121012', shoes: '#000' }, { headHeight: 0.86 });
    this.extras = [];
    for (let i = 0; i < 5; i++) {
      const tone = 0.15 + i * 0.12;
      const p = new Puppet({
        head: drawHead({ seed: 400 + i * 7, hair: ['crop', 'afro', 'cap', 'none', 'flattop'][i], tone, moustache: i === 3, lines: i === 3 ? 1 : 0 }),
        back: drawHead({ seed: 400 + i * 7, hair: ['crop', 'afro', 'cap', 'none', 'flattop'][i], tone }, { back: true }),
        side: drawHead({ seed: 400 + i * 7, hair: ['crop', 'afro', 'cap', 'none', 'flattop'][i], tone, moustache: i === 3, lines: i === 3 ? 1 : 0, turn: 0.6 }),
        outfit: { shirt: ['#6b3a2a', '#d6d1c4', '#2d4a5a', '#7a6a3a', '#4a2a3a'][i], pants: i % 2 ? 'pinstripe' : ['#202024', '#3a3226', '#2a3340'][i % 3], baggy: 1 + (i % 3) * 0.15, skin: skinHex(tone) },
        name: `extra${i}`,
      });
      this.extras.push(p);
    }
    lap('cast');
    this.cast = [this.mercy, this.barber, this.client, this.barista, this.patron, this.oldwoman, this.kid, this.driver, this.stranger, ...this.extras];
    for (const p of this.cast) scene.add(p.root);

    // ── props ──
    const scissors = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.025), new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.2 }));
    blade.position.y = -0.1;
    const blade2 = blade.clone();
    blade2.rotation.z = 0.35;
    scissors.add(blade, blade2);
    this.barber.R.arm.hand.add(scissors);
    this.scissors = { group: scissors, blade2 };

    const cig = new THREE.Group();
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 6), flat(0xf1eee6));
    paper.rotation.x = Math.PI / 2;
    paper.position.set(0, -0.06, 0.05);
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.35, 0.2), toneMapped: false }));
    ember.position.set(0, -0.06, 0.098);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.5), toneMapped: false }));
    flame.position.set(0, -0.02, 0.12);
    cig.add(paper, ember, flame);
    this.mercy.R.arm.hand.add(cig);
    this.cig = { group: cig, ember, flame };

    // smoke: world-space points, positions are a pure function of time
    const N = 48;
    const smokeGeo = new THREE.BufferGeometry();
    smokeGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    smokeGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    const sc = document.createElement('canvas');
    sc.width = sc.height = 64;
    const sx = sc.getContext('2d');
    const grd = sx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,0.9)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    sx.fillStyle = grd;
    sx.fillRect(0, 0, 64, 64);
    this.smoke = new THREE.Points(
      smokeGeo,
      new THREE.PointsMaterial({ size: 0.32, map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, sizeAttenuation: true }),
    );
    this.smoke.frustumCulled = false;
    scene.add(this.smoke);

    // the neighbourhood paper, left open on the waiting table: MERCY V. IS BACK
    const [pl, pr] = newspaperPages(discAct.portrait);
    const paperMat = (c) => crumple(new THREE.MeshStandardMaterial({ map: texture(c), roughness: 0.95, side: THREE.DoubleSide }), 1, 0.45);
    const news = new THREE.Group();
    const pgL = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56).translate(-0.21, 0, 0), paperMat(pl));
    const pgR = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56).translate(0.21, 0, 0), paperMat(pr));
    pgL.rotation.y = -0.06;
    pgR.rotation.y = 0.06;
    news.add(pgL, pgR);
    news.rotation.x = -Math.PI / 2;
    const holder = new THREE.Group();
    holder.add(news);
    const tb = this.world.shop.table.position;
    holder.position.set(tb.x - 0.02, tb.y + 0.06, tb.z);
    holder.rotation.y = Math.PI + 0.22; // tops of the pages away from the door, readable from it
    this.world.shop.group.add(holder);

    // kid's bike and the old woman's cart
    const bike = new THREE.Group();
    const wheelGeo = new THREE.TorusGeometry(0.3, 0.025, 5, 16);
    const dark = flat(0x1a1a1a);
    for (const x of [-0.5, 0.5]) {
      const w = new THREE.Mesh(wheelGeo, dark);
      w.position.set(0, 0.32, x);
      w.rotation.y = Math.PI / 2;
      bike.add(w);
    }
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.0), flat(0xb3202a));
    frame.position.set(0, 0.55, 0);
    bike.add(frame);
    scene.add(bike);
    this.bike = bike;
    const cart = new THREE.Group();
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.7), new THREE.MeshStandardMaterial({ color: 0xbfc3c7, metalness: 0.7, roughness: 0.4, wireframe: true }));
    basket.position.y = 0.7;
    const bags = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.5), flat(0xd8d2c4));
    bags.position.y = 0.75;
    cart.add(basket, bags);
    scene.add(cart);
    this.cart = cart;

    // HUD
    const L = this.createLayer(film, 'act-game');
    this.hud = new Hud(L, this.hudScript());
    this.cutsceneWindows = [
      [17.7, 30.24],
      [37.77, 50.31],
      [62.85, 66.6],
      [91.7, 101.7],
    ].map(([a, b]) => [a, b]);
  }

  hudScript() {
    const T = (x) => this.s.songStart + x;
    const w = (a, b, extra) => ({ from: T(a), to: T(b), ...extra });
    return {
      gameplay: [w(30.4, 37.65), w(50.45, 62.75), w(66.75, 87.8), w(88.0, 91.62), w(101.85, 108.55)],
      titles: [w(11.0, 16.6, { text: 'MUERTO', sub: 'MERCY V. presenta', kind: 'mission' }), w(105.9, 108.5, { text: 'MISSION PASSED!', sub: 'RISPETTO +', kind: 'passed' })],
      zones: [w(30.8, 34.6, { text: 'Camposanto' }), w(68.2, 72.2, { text: 'Bulevar de las Palmas' }), w(88.3, 91.5, { text: 'Fin de la Calle' })],
      objectives: [
        w(31.2, 35.2, { text: 'Vai al <b>bar</b> di zona.' }),
        w(50.7, 53.6, { text: 'Siediti alla <b>fermata</b>.' }),
        w(67.0, 70.8, { text: 'Goditi il <b>passaggio</b>.' }),
        w(88.5, 91.4, { text: 'Segui lo <b>sconosciuto</b>.' }),
        w(102.0, 105.5, { text: 'Entra nel <b>camposanto</b>.' }),
      ],
      radio: [w(71.0, 78.5, { text: 'RADIO CAMPOSANTO 66.6', sub: 'MERCY V. — MUERTO' })],
      subtitles: [
        w(18.5, 20.9, { who: 'BARBIERE', text: 'Sei il prossimo, Mercy. La corona come sempre?' }),
        w(21.1, 23.0, { who: 'MERCY V.', text: '♪ mm-mh… mm-mh ♪' }),
        w(25.6, 26.9, { who: 'MERCY V.', text: '♪ mm-mh ♪' }),
        w(27.4, 29.2, { who: 'BARBIERE', text: 'Ehi! E il taglio?' }),
        w(29.3, 30.2, { who: 'MERCY V.', text: 'Domani.' }),
        w(40.6, 42.3, { who: 'BARISTA', text: 'Il solito?' }),
        w(42.5, 43.9, { who: 'MERCY V.', text: 'Il solito.' }),
        w(47.3, 49.4, { who: 'VECCHIO', text: 'Sei pallido, figliolo. Sembri morto.' }),
        w(49.5, 50.3, { who: 'MERCY V.', text: '♪ mm-mh ♪' }),
        w(55.4, 57.3, { who: 'SIGNORA', text: 'Quelle ti ammazzano, sai?' }),
        w(57.4, 58.8, { who: 'MERCY V.', text: 'Troppo tardi, signora.' }),
        w(58.9, 60.4, { who: 'BAMBINO', text: 'Mercy! Ti ho visto sul cartellone!' }),
        w(63.3, 65.2, { who: 'AUTISTA', text: 'Sali, ti porto io.' }),
        w(65.3, 66.5, { who: 'MERCY V.', text: '♪ mm-mh ♪' }),
        w(92.0, 94.0, { who: 'SCONOSCIUTO', text: 'Lo sai che sei morto, vero?' }),
        w(94.1, 95.3, { who: 'MERCY V.', text: 'Lo so. ♪ mm-mh ♪' }),
        w(96.0, 98.4, { who: 'SCONOSCIUTO', text: 'Allora guarda in alto.' }),
      ],
    };
  }

  cues(s) {
    const T = (x) => s.songStart + x;
    const c = [{ t: s.game, name: 'crt', args: [{ on: true }] }];
    // scissors on every other beat in the barbershop
    for (let k = beatIndex(17.8); beat(k) < 26.9; k += 2) c.push({ t: T(beat(k) + 0.02), name: 'snip' });
    c.push({ t: T(29.55), name: 'bell' });
    c.push({ t: T(42.7), name: 'pour', args: [1.0] });
    c.push({ t: T(beat(beatIndex(46.2) + 1)), name: 'thump', args: [{ freq: 120, gain: 0.6, decay: 0.1 }] });
    c.push({ t: T(47.6), name: 'click', args: [{ freq: 4200, gain: 0.25 }] });
    c.push({ t: T(47.7), name: 'click', args: [{ freq: 3800, gain: 0.2 }] });
    c.push({ t: T(53.95), name: 'lighter' });
    c.push({ t: T(61.0), name: 'engine', args: [5.6, { gain: 0.06 }] });
    for (const x of [63.15, 63.78, 64.41, 65.04]) c.push({ t: T(x), name: 'hydraulic' });
    c.push({ t: T(66.4), name: 'door' });
    c.push({ t: T(66.6), name: 'engine', args: [20.4, { gain: 0.07 }] });
    c.push({ t: T(87.2), name: 'door' });
    for (let i = 0; i < 6; i++) c.push({ t: T(88.5 + i * BEAT * 2), name: 'thump', args: [{ freq: 48, gain: 0.35, decay: 0.3 }] });
    c.push({ t: T(95.4), name: 'whoosh', args: [3.2, { gain: 0.12 }] });
    c.push({ t: T(102.5), name: 'creak', args: [1.9] });
    c.push({ t: T(105.9), name: 'stab' });
    c.push({ t: T(108.6), name: 'crt', args: [{ on: false }] });
    return c;

    function beat(k) {
      return SONG.firstBeat + k * BEAT;
    }
  }

  // ── the world as a function of song time ──
  simulate(st) {
    const { mercy, barber, client, barista, patron, oldwoman, kid, driver, stranger, extras, world } = this;
    const bp = beatPhase(st);
    const nod = Math.sin(bp * Math.PI * 2) * 0.05;

    // barbershop regulars
    // the barber stands behind the chair in profile, the client faces the mirror
    barber.root.position.set(-1.02, 0, 52.42);
    barber.root.rotation.y = -Math.PI / 2 - 0.42;
    const snip = Math.max(0, Math.sin(beatPhase(Q(st, 24)) * Math.PI * 2));
    barber.pose({ armR: [-1.75 - snip * 0.12, 0.25, 0.25], elbowR: 0.85, armL: [-1.35, -0.25, -0.3], elbowL: 0.9, lean: 0.16 });
    this.scissors.blade2.rotation.z = 0.05 + snip * 0.45;
    client.root.position.set(-1.75, 0, 52.1);
    client.root.rotation.y = -Math.PI / 2 - 0.35;
    client.pose({ sit: 1, armL: [-0.55, 0.1, 0.2], armR: [-0.55, -0.1, -0.2], elbowL: 0.7, elbowR: 0.7, lean: 0.04, roll: -0.04 });

    // the bar
    barista.root.position.set(14.45, 0, 53.15);
    barista.root.rotation.y = Math.PI;
    const pouring = st > 42.4 && st < 44.0;
    const wipe = Math.sin(Q(st) * 4) * 0.3;
    barista.pose(pouring ? { armR: [-1.25, 0.6, 0.4], elbowR: 0.5, armL: [-0.4, 0, 0] } : { armR: [-0.9 + wipe * 0.3, 0.2 + wipe, 0.2], elbowR: 0.7, armL: [-0.6, 0, -0.1], elbowL: 0.5, lean: 0.1 });
    patron.root.position.set(16.6, 0, 51.65);
    patron.root.rotation.y = 0;
    const wave = st > 47.6 && st < 49.6 ? Math.sin(Q(st) * 9) * 0.2 : 0;
    patron.pose({ sit: 1, pelvisY: 0.86, armL: [-1.1, 0, 0], elbowL: 0.9, armR: wave ? [-2.4, 0, 0.3 + wave] : [-1.1, 0, 0], elbowR: wave ? 0.4 : 0.9, lean: 0.25 });

    // mercy
    this.cig.group.visible = st > 53.85 && st < 66.6;
    this.cig.flame.visible = st > 53.95 && st < 54.55;
    world.bar.glass.position.set(13.32, 1.205, 52.32);
    world.bar.glass.visible = st > 43.0;
    world.bar.bottle.visible = pouring;
    if (pouring) {
      world.bar.bottle.position.set(13.5, 1.45, 52.5);
      world.bar.bottle.rotation.set(0, 0, 1.9);
    }
    let inCar = false;
    if (st < 27.0) {
      const ch = world.shop.waits[0];
      mercy.root.position.set(ch.position.x, 0, ch.position.z);
      mercy.root.rotation.y = ch.rotation.y;
      mercy.pose({ sit: 1, armL: [-0.95, 0.1, 0.15], armR: [-0.95, -0.1, -0.15], elbowL: 0.5, elbowR: 0.5, lean: 0.14, roll: nod });
    } else if (st < 27.6) {
      const ch = world.shop.waits[0];
      const u = smooth(span(st, 27.0, 27.6));
      mercy.root.position.set(ch.position.x, 0, ch.position.z);
      mercy.root.rotation.y = ch.rotation.y;
      mercy.pose({ sit: 1 - u, lean: 0.14 + u * 0.1 * (1 - u) });
    } else if (st < 30.24) {
      walkOn(mercy, [[2.5, 50.2], [2.7, 48.7], [2.75, 47.85]], st, 27.6, 29.6);
    } else if (st < 37.77) {
      walkOn(mercy, [[2.75, 47.1], [3.6, 46.1], [10.6, 46.1], [11.2, 47.1]], st, 30.35, 37.5);
    } else if (st < 40.3) {
      walkOn(mercy, [[11.2, 48.3], [12.6, 50.4], [13.3, 51.55]], st, 37.85, 39.9);
    } else if (st < 47.4) {
      mercy.root.position.set(13.3, 0, 51.55);
      mercy.root.rotation.y = 0;
      const drink = span(st, 44.55, 45.1) * (1 - span(st, 45.9, 46.25));
      mercy.pose({ armR: [-0.45 - drink * 1.0, 0, 0.1 + drink * 0.35], elbowR: 0.6 + drink * 1.55, armL: [-0.5, 0, 0], elbowL: 0.8, lean: -drink * 0.18, roll: st < 44 ? nod : 0 });
      if (drink > 0.05 && st < 46.25) {
        mercy.R.arm.hand.getWorldPosition(world.bar.glass.position);
        world.bar.glass.position.y += 0.02;
      }
    } else if (st < 50.31) {
      walkOn(mercy, [[13.3, 51.55], [12.4, 50.0], [11.2, 48.2]], st, 47.6, 50.2);
    } else if (st < 53.4) {
      const w = walkOn(mercy, [[21.0, 46.1], [26.6, 46.1], [27.0, 45.9]], st, 50.31, 52.85);
      if (st > 52.85) {
        const u = smooth(span(st, 52.85, 53.4));
        mercy.root.rotation.y = lerp(w.yaw, Math.PI, u);
        mercy.root.position.z = lerp(45.9, 45.75, u);
        mercy.pose({ sit: u });
      }
    } else if (st < 65.5) {
      mercy.root.position.set(27.0, 0.15, 45.75);
      mercy.root.rotation.y = Math.PI;
      // drags at fixed moments, hand back to knee in between
      const drag = (a) => span(st, a, a + 0.35) * (1 - span(st, a + 1.1, a + 1.5));
      const lift = Math.max(st < 54.6 ? span(st, 53.6, 53.9) * (1 - span(st, 54.5, 54.8)) : 0, drag(55.0), drag(58.3), drag(61.2), drag(64.0));
      mercy.pose({ sit: 1, armR: [-0.7 - lift * 0.55, 0.0, 0.15 + lift * 0.55], elbowR: 0.5 + lift * 1.6, armL: [-0.95, 0.1, 0.15], elbowL: 0.5, lean: 0.12 - lift * 0.08, roll: lift ? 0 : nod });
      if (st > 64.9) {
        const u = smooth(span(st, 64.9, 65.5));
        mercy.pose({ sit: 1 - u });
      }
    } else if (st < 66.6) {
      walkOn(mercy, [[27.0, 45.75], [26.4, 44.4], [25.8, 43.6]], st, 65.5, 66.45);
    } else if (st < 87.0) {
      inCar = true;
    } else if (st < 87.92) {
      mercy.root.position.set(383.4, 0, 45.0);
      mercy.root.rotation.y = Math.PI / 2;
      mercy.pose({});
    } else if (st < 91.7) {
      walkOn(mercy, [[383.4, 45.0], [386, 46.0], [392, 46.0]], st, 87.95, 91.4);
    } else if (st < 101.7) {
      mercy.root.position.set(392, 0, 46.0);
      mercy.root.rotation.y = Math.PI / 2;
      const up = span(st, 96.4, 97.4);
      mercy.pose({ roll: st < 95 ? nod : 0, lean: -up * 0.12, armL: [-0.15, 0, 0], armR: [-0.15, 0, 0] });
    } else {
      walkOn(mercy, [[392, 46.0], [399, 41.0], [436, 40.2]], st, 101.75, 108.2);
    }

    // the ride
    const car = world.ride;
    let carX = -80;
    let carRoll = 0;
    let carBounce = 0;
    if (st > 60.8 && st < 66.6) {
      carX = st < 63.1 ? lerp(-14, 25, easeOut(span(st, 60.8, 63.1))) : 25;
      if (st > 63.1 && st < 65.7) {
        const k = (st - 63.15) / (BEAT * 1.0);
        const ph = k - Math.floor(k);
        carBounce = Math.exp(-ph * 5) * 0.32;
        carRoll = Math.sin(Math.floor(k) * 1.7) * 0.05 * Math.exp(-ph * 4);
      }
    } else if (st >= 66.6 && st < 87.2) {
      const u = span(st, 66.6, 86.8);
      // ease in 10%, cruise, ease out 15%
      const eased = u < 0.1 ? 0.5 * (u / 0.1) * (u / 0.1) * 0.1 : u > 0.85 ? 1 - 0.5 * ((1 - u) / 0.15) * ((1 - u) / 0.15) * 0.15 : 0.05 + (u - 0.1) * ((1 - 0.05 - 0.075) / 0.75);
      carX = lerp(25, 382, eased);
      carBounce = Math.sin(st * 9.3) * 0.012 + (beatPhase(st) < 0.12 ? 0.03 : 0);
    } else if (st >= 87.2) carX = 382;
    car.group.position.set(carX, 0, 42.2);
    car.group.rotation.y = 0;
    car.body.position.y = carBounce;
    car.body.rotation.z = carRoll;
    car.wheels.forEach((w) => (w.rotation.z = -carX / 0.36));
    driver.root.position.set(carX + 0.35, 0.12 + carBounce, 41.72);
    driver.root.rotation.y = Math.PI / 2;
    driver.pose({ sit: 1, pelvisY: 0.42, armL: [-1.2, 0, 0], armR: [-1.2, 0, 0], elbowL: 0.4, elbowR: 0.4, roll: Math.sin(beatPhase(st) * Math.PI * 2) * 0.04 });
    if (inCar) {
      mercy.root.position.set(carX + 0.35, 0.12 + carBounce, 42.68);
      mercy.root.rotation.y = Math.PI / 2;
      mercy.pose({ sit: 1, pelvisY: 0.42, armL: [-0.8, 0, 0.2], elbowL: 0.6, armR: [-0.6, 0, -0.5], elbowR: 0.9, roll: nod * 1.4 });
    }

    // street life
    const owU = span(st, 52.6, 62.4);
    walkOn(oldwoman, [[39, 47.0], [16, 47.0]], st, 52.6, 62.4);
    oldwoman.pose({ phase: owU * 40, walk: st > 52.6 && st < 62.4 ? 0.6 : 0, armL: [-0.9, 0, 0], armR: [-0.9, 0, 0], elbowL: 0.2, elbowR: 0.2, lean: 0.15 });
    this.cart.position.set(oldwoman.root.position.x - 0.85, 0, 47.0);
    const kidX = lerp(8, 48, span(st, 57.2, 61.2));
    kid.root.position.set(kidX, 0.2, 42.7);
    kid.root.rotation.y = Math.PI / 2;
    kid.pose({ sit: 0.7, pelvisY: 0.62, armL: [-1.1, 0, 0], armR: [-1.1, 0, 0], phase: st * 9, walk: 0.5 });
    this.bike.position.set(kidX, 0, 42.7);
    this.bike.rotation.y = Math.PI / 2;
    this.bike.visible = kid.root.visible = st > 56.5 && st < 62;

    // the stranger and the frozen street
    stranger.root.visible = st > 84;
    stranger.root.position.set(395.6, 0, 46.0);
    stranger.root.rotation.y = -Math.PI / 2;
    const point = span(st, 95.6, 96.3);
    stranger.pose({ armR: [-0.2 - point * 2.3, 0, -point * 0.3], elbowR: 0.1, roll: 0 });

    // extras: day walkers, then a frozen tableau at night
    extras.forEach((p, i) => {
      if (st < 86) {
        const dir = i % 2 ? -1 : 1;
        const zz = i % 2 ? 46.6 : 34.3;
        const x0 = -10 + i * 13;
        const x = x0 + dir * ((st * 1.15 + i * 9) % 60);
        p.root.position.set(x, 0.15, zz);
        p.root.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        p.pose({ phase: Q(st) * 1.15 / 0.72 * Math.PI, walk: 1 });
      } else {
        const spots = [[387.5, 46.7, 2.4], [389.5, 34.2, -1.3], [400.5, 34.5, -2], [403, 46.8, -1.7], [385, 34.6, 1.5]];
        const [x, z, yaw] = spots[i];
        p.root.position.set(x, 0.15, z);
        p.root.rotation.y = yaw;
        p.pose({ phase: 1.1 + i, walk: 1 }); // frozen mid-stride
      }
    });

    // the moon-disc, the gate
    const rise = easeOut(span(st, 95.4, 99.6));
    world.moon.position.set(500, lerp(-50, 36, rise), 40);
    world.moon.rotation.set(0, -Math.PI / 2, st * 0.35);
    world.moon.visible = st > 94;
    const open = smooth(span(st, 102.5, 104.6));
    world.cem.leaves.forEach(({ leaf, side }) => (leaf.rotation.y = side * open * 1.7));
    world.pole.tex.offset.y = (st * 0.4) % 1;

    return { carX, inCar };
  }

  lighting(st) {
    const n = st < 66.6 ? 0 : st < 80 ? span(st, 66.6, 80) : st < 87.9 ? 1 + span(st, 80, 87.9) : 2;
    const w = this.world;
    w.sky.mat.uniforms.uNight.value = n;
    const sunI = n < 1 ? lerp(1.5, 0.8, n) : lerp(0.8, 0, n - 1);
    this.sun.intensity = sunI;
    this.sun.color.setRGB(1, lerp(0.95, 0.62, Math.min(1, n)), lerp(0.87, 0.42, Math.min(1, n)));
    this.hemi.intensity = n < 1 ? lerp(1.6, 0.7, n) : lerp(0.7, 0.18, n - 1);
    this.scene.environmentIntensity = n < 1 ? lerp(0.5, 0.3, n) : lerp(0.3, 0.04, n - 1);
    this.moonLight.intensity = n > 1 ? (n - 1) * 0.9 : 0;
    const fog = this.scene.fog;
    const day = new THREE.Color(0xd8c8ac);
    const dusk = new THREE.Color(0xb27a5a);
    const night = new THREE.Color(0x1b2029);
    fog.color.copy(n < 1 ? day.lerp(dusk, n) : dusk.lerp(night, n - 1));
    fog.near = n > 1.5 ? 25 : 70;
    fog.far = n > 1.5 ? 210 : 460;
    const lampsOn = clamp01((n - 0.8) * 2);
    w.lamps.poolMat.opacity = lampsOn * 0.8;
    w.lamps.bulbMat.color.setRGB(0.3 + lampsOn * 1.9, 0.3 + lampsOn * 1.7, 0.3 + lampsOn * 1.3);
    w.ride.lightMat.color.setRGB(0.4 + lampsOn * 2.2, 0.4 + lampsOn * 2.0, 0.4 + lampsOn * 1.6);
    this.strangerLamp.intensity = st > 86 ? 18 : 0;
    this.strangerLamp.distance = 14;
    this.night = n;
  }

  // ── the camera: which shot, where ──
  shoot(st, sim) {
    const m = this.mercy.root.position;
    const cx = sim.carX;
    const c = (pos, target, fov = 40) => ({ pos, target, fov });
    const u = (a, b) => smooth(span(st, a, b));
    if (st < 17.7) {
      const k = easeOut(span(st, 10.18, 17.5));
      const h = lerp(46, 11, k);
      return c([lerp(-6, 1.5, k), h, 51.2 - h * 0.16], [0.4, 0, 51.2], 40);
    }
    if (st < 23.0) return c([lerp(1.0, 0.6, u(17.7, 23)), 1.66, lerp(45.2, 45.8, u(17.7, 23))], [lerp(0.05, -0.15, u(17.7, 23)), 1.2, 53], 44);
    if (st < 25.5) return c([-0.35, 1.72, 50.15], [-1.15, 1.72, 52.6], 32);
    if (st < 27.0) {
      const ch = this.world.shop.waits[0];
      const fy = ch.rotation.y;
      return c([ch.position.x + Math.sin(fy) * 2.3, 1.38, ch.position.z + Math.cos(fy) * 2.3], [ch.position.x, 1.3, ch.position.z], 32);
    }
    if (st < 30.24) return c([-0.6, 1.8, 53.3], [m.x, 1.25, m.z], 38);
    if (st < 33.6) return c([m.x - 4.6, 2.4, m.z - 1.7], [m.x + 2.6, 1.2, m.z + 0.3], 42);
    if (st < 37.77) return c([m.x + 1.6, 1.75, 38.4], [m.x + 0.4, 1.7, 46.8], 36);
    if (st < 40.3) return c([17.6, 1.95, 48.3], [13.6, 1.3, 52.3], 40);
    if (st < 44.0) return c([11.55, 1.72, 52.2], [14.2, 1.55, 52.75], 36);
    if (st < 47.0) return c([13.15, 1.78, 53.42], [13.3, 1.88, 51.55], 30);
    if (st < 50.31) return c([17.7, 2.15, 53.6], [12.8, 1.2, 49.9], 40);
    if (st < 53.4) return c([m.x - 3.9, 2.0, 43.3], [m.x + 1.6, 1.1, 46.0], 40);
    if (st < 57.3) return c([27.35, 1.05, lerp(41.5, 42.5, u(53.4, 57.3))], [27.0, 1.2, 45.7], 34);
    if (st < 60.5) return c([31, 1.5, 38.2], [lerp(this.kid.root.position.x, 27, 0.5), 1.0, 44.8], 44);
    if (st < 62.85) return c([28.7, 1.6, 47.25], [21.5, 1.0, 41.5], 38);
    if (st < 66.6) return c([24.6, 1.45, 45.2], [25.4, 1.3, 42.0], 40);
    if (st < 75.4) return c([cx - 9.6, 3.4, 41.0], [cx + 6, 1.1, 42.2], 45);
    if (st < 80.4) return c([cx - 1.2, 1.2, 37.0], [cx + 0.4, 1.0, 42.2], 40);
    if (st < 84.2) return c([cx + 1.95, 1.28, 42.2], [cx - 0.4, 1.3, 42.2], 44);
    if (st < 87.92) return c([392.5, 1.7, 45.9], [cx, 1.0, 42.4], 40);
    if (st < 91.7) return c([m.x - 4.4, 2.2, m.z - 1.9], [m.x + 3, 1.35, m.z + 0.2], 42);
    if (st < 95.4) return c([393.8, 1.5, lerp(41.8, 42.4, u(91.7, 95.4))], [393.8, 1.68, 46.0], 38);
    if (st < 98.6) {
      const k = u(95.4, 98.4);
      return c([lerp(397.2, 398.8, k), 1.35, 44.3], [lerp(420, 488, k), lerp(3, 25, k), 40], 42);
    }
    if (st < 101.7) return c([393.35, 1.62, 44.9], [392, 2.08, 46.0], 30);
    if (st < 105.8) return c([m.x - 7.4, 2.3, 40.9], [m.x + 12, 5, 40.1], 44);
    return c([lerp(413.5, 416, u(105.8, 109)), 2.2, 36.6], [432, 4.6, 40.4], 42);
  }

  inCutscene(st) {
    let v = 0;
    for (const [a, b] of this.cutsceneWindows) v = Math.max(v, clamp01(Math.min((st - a) / 0.35, (b - st) / 0.35)));
    return v;
  }

  update(t, film) {
    const st = this.st(t);
    const sim = this.simulate(st);
    this.lighting(st);
    const { world } = this;

    // which sets need to exist this frame
    const inShop = st < 30.24;
    const inBar = st >= 37.77 && st < 50.31;
    world.shop.group.visible = inShop;
    world.shop.mirror.visible = st >= 17.7 && st < 30.24;
    world.bar.group.visible = inBar;
    const topDown = st < 17.0;
    world.shop.roof.visible = world.barberFront.roof.visible = !topDown;
    world.barberFront.front.visible = !(st >= 17.7 && st < 30.24);

    const shot = this.shoot(st, sim);
    const cam = this.camera;
    // a little hand-held breathing in cutscenes; game cameras stay locked
    const cut = this.inCutscene(st);
    const hx = Math.sin(st * 1.3) * 0.012 * cut;
    const hy = Math.sin(st * 1.7 + 1) * 0.01 * cut;
    cam.position.set(shot.pos[0] + hx, shot.pos[1] + hy, shot.pos[2]);
    if (cam.fov !== shot.fov) {
      cam.fov = shot.fov;
      cam.updateProjectionMatrix();
    }
    cam.lookAt(shot.target[0], shot.target[1], shot.target[2]);
    world.sky.mesh.position.copy(cam.position);
    for (const p of this.cast) p.face(cam);

    // sun and shadow follow the action
    const focus = new THREE.Vector3(shot.target[0], 0, shot.target[2]);
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).add(new THREE.Vector3(-30, 55, -22));
    this.carLight.position.set(sim.carX - 0.2, 1.4, 42.2);
    this.carLight.intensity = 0;

    this.updateSmoke(st);

    // grade
    const g = film.grade;
    const on = span(t, this.start, this.start + 0.5);
    const off = st > 108.55 ? 1 - span(st, 108.6, 109.25) : 1;
    g.tv = Math.min(on, off);
    g.white = 1 - span(t, this.start, this.start + 0.45);
    g.fade = 0;
    // painted colour, muted and warm: a little mono under sepia, reds kept, olive shadows
    g.mono = 0.28;
    g.keepRed = 0.35;
    g.tint = [1.02, 0.96, 0.84];
    g.sat = 1.08;
    g.split = 1;
    g.contrast = 1.1 - this.night * 0.04;
    g.paper = 0.1;
    g.scratch = 1;
    film.paint.radius = 3;
    film.paint.step = 1.2;
    film.paint.amount = 1;
    g.bars = cut;
    g.grain = 0.075;
    g.vignette = 0.72;
    g.scan = st < 12 ? 0.14 - span(st, 10.2, 12) * 0.14 : 0;
    film.bloom.strength = (st < 50.31 ? 0.3 : 0.45) + this.night * 0.35 + (st > 95.4 && st < 101.7 ? 0.5 : 0);
    film.bloom.threshold = st < 50.31 ? 0.92 : 0.84;
    film.renderer.toneMappingExposure = 1 + this.night * 0.08;
    film.bloom.radius = 0.6;

    // HUD
    const clock = 17 * 60 + 20 + Math.max(0, st - 10.18) * 2.4;
    const paid = st > 47.6 ? 5 : 0;
    const reward = st > 106.2 ? Math.min(600, Math.floor((st - 106.2) * 900)) : 0;
    let stars = 0;
    if (st > 88.4 && st < 106.3) stars = Math.min(6, 1 + Math.floor((st - 88.4) / (BEAT * 2)));
    const pos = sim.inCar ? { x: sim.carX, z: 42.2 } : { x: this.mercy.root.position.x, z: this.mercy.root.position.z };
    const blips = st < 37.77 ? [{ x: 14, z: 48, color: '#d4161f' }] : st < 53.4 ? [{ x: 27, z: 46, color: '#d4161f' }] : st > 87 ? [{ x: 430, z: 40, color: '#d4161f' }] : [];
    this.hud.update(t, {
      clock: Math.floor(clock),
      money: 71 - paid + reward,
      stars,
      weapon: st > 53.85 && st < 66.6 ? 'cig' : 'fist',
      health: 1,
      player: { ...pos, yaw: 0 },
      blips,
    });
    this.layer.classList.toggle('is-cutscene', cut > 0.5);
  }

  updateSmoke(st) {
    const geo = this.smoke.geometry;
    const pos = geo.attributes.position.array;
    const col = geo.attributes.color.array;
    const N = pos.length / 3;
    const active = st > 54.3 && st < 66.0;
    this.smoke.visible = active;
    if (!active) return;
    const tip = new THREE.Vector3();
    this.cig.ember.getWorldPosition(tip);
    const life = 3.2;
    for (let i = 0; i < N; i++) {
      const born = 54.3 + (i / N) * life;
      const age = (((st - born) % life) + life) % life;
      const a = age / life;
      const sway = Math.sin(i * 1.7 + st * 0.8) * 0.18 * a;
      pos[i * 3] = tip.x + sway + Math.sin(i) * 0.05 * a;
      pos[i * 3 + 1] = tip.y + age * 0.32;
      pos[i * 3 + 2] = tip.z + Math.cos(i * 2.3) * 0.12 * a;
      const v = 0.32 * (1 - a) * Math.min(1, age * 4);
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }
}
