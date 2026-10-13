import * as THREE from 'three';
import { canvas, rng, texture } from '../textures/util.js';
import { building, facadeTexture, flat, lowrider, palms, powerLine, sedan, signTexture, skyDome, skyline, streetLamps } from '../objects/city.js';
import { buildBar, buildBarbershop } from './interiors.js';
import { createDisc } from '../objects/disc.js';
import { ALBUM, ARTIST } from '../data/album.js';

/**
 * One long West Coast street along +x, from the barbershop (x≈0) to the cemetery gate (x≈430).
 * Road z 36…44, north sidewalk z 44…47.5 (shops face −z), south sidewalk z 32.5…36.
 */
export const STREET = { z: 40, north: 47.5, south: 32.5, x0: -70, x1: 432 };

function asphalt() {
  const [c, ctx] = canvas(1024, 512);
  const r = rng(31);
  ctx.fillStyle = '#4a4744';
  ctx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 3000; i++) {
    const v = 60 + r() * 30;
    ctx.fillStyle = `rgba(${v},${v},${v + 2},0.5)`;
    ctx.fillRect(r() * 1024, r() * 512, 2, 2);
  }
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = 'rgba(20,20,20,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let x = r() * 1024;
    let y = r() * 512;
    ctx.moveTo(x, y);
    for (let k = 0; k < 8; k++) ctx.lineTo((x += (r() - 0.5) * 60), (y += (r() - 0.5) * 60));
    ctx.stroke();
  }
  // centre line: double yellow, which the grade turns into two pale lines
  ctx.fillStyle = '#d8b54a';
  ctx.fillRect(0, 246, 1024, 6);
  ctx.fillRect(0, 260, 1024, 6);
  return texture(c, { repeat: [60, 1] });
}

function concrete() {
  const [c, ctx] = canvas(512, 256);
  const r = rng(32);
  ctx.fillStyle = '#b0a592';
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 1500; i++) {
    const v = 140 + r() * 40;
    ctx.fillStyle = `rgba(${v},${v - 8},${v - 20},0.4)`;
    ctx.fillRect(r() * 512, r() * 256, 2, 2);
  }
  ctx.strokeStyle = 'rgba(40,40,38,0.5)';
  ctx.lineWidth = 3;
  for (let x = 0; x <= 512; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  return texture(c, { repeat: [125, 1] });
}

/** A shopfront for a hollow interior: facade plane with a sign band and a doorway. */
function shopFacade(x0, x1, h, name, sub, seed, tone = 196) {
  const w = x1 - x0;
  const g = new THREE.Group();
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: facadeTexture({ w, h, seed, tone, shop: true, floors: 1 }), roughness: 0.9 }));
  front.position.set((x0 + x1) / 2, h / 2, STREET.north - 0.01);
  front.rotation.y = Math.PI;
  front.receiveShadow = true;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 0.9), new THREE.MeshStandardMaterial({ map: signTexture(name, { sub, bg: '#141416' }), roughness: 0.6 }));
  sign.position.set((x0 + x1) / 2, 3.7, STREET.north - 0.06);
  sign.rotation.y = Math.PI;
  // side walls and roof so the shop reads as a solid block from the street
  const rgb = Array.isArray(tone) ? tone : [tone, tone - 6, tone - 16];
  const side = flat(new THREE.Color(`rgb(${rgb[0] - 22},${rgb[1] - 24},${rgb[2] - 26})`));
  const depth = 7.2;
  // the shell sits just outside the interior's own walls, never in front of them
  for (const x of [x0 - 0.15, x1 + 0.15]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, depth), side);
    s.position.set(x, h / 2, STREET.north + depth / 2);
    s.castShadow = true;
    g.add(s);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), side);
  back.position.set((x0 + x1) / 2, h / 2, STREET.north + depth + 0.15);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.3, depth + 0.3), flat(0x4a3e36));
  roof.position.set((x0 + x1) / 2, h, STREET.north + (depth + 0.3) / 2);
  roof.castShadow = true;
  g.add(front, sign, back, roof);
  return { group: g, front, roof };
}

function barberPole() {
  const [c, ctx] = canvas(128, 512);
  ctx.fillStyle = '#efece4';
  ctx.fillRect(0, 0, 128, 512);
  ctx.fillStyle = '#b3202a';
  for (let y = -128; y < 640; y += 96) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y + 64);
    ctx.lineTo(128, y + 96);
    ctx.lineTo(0, y + 32);
    ctx.fill();
  }
  const tex = texture(c);
  tex.wrapT = THREE.RepeatWrapping;
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), new THREE.MeshStandardMaterial({ color: 0xd0d4d8, metalness: 1, roughness: 0.2 }));
  cap.position.y = 0.5;
  g.add(tube, cap);
  return { group: g, tex };
}

/** Roadside billboard with the album ad. */
function billboard(portraitCanvas) {
  const [c, ctx] = canvas(1536, 640);
  ctx.fillStyle = '#0d0d0e';
  ctx.fillRect(0, 0, 1536, 640);
  if (portraitCanvas) ctx.drawImage(portraitCanvas, 0, 0, portraitCanvas.width, portraitCanvas.height, 0, -120, 880, 880);
  ctx.fillStyle = '#f2efe6';
  ctx.font = '96px "Rammetto One"';
  ctx.fillText(ARTIST, 930, 230);
  ctx.fillStyle = '#c4161c';
  ctx.font = '170px "Rammetto One"';
  ctx.fillText(ALBUM, 920, 420);
  ctx.fillStyle = '#f2efe6';
  ctx.font = '600 48px "Oswald"';
  ctx.fillText('IL NUOVO ALBUM · ORA NEI NEGOZI', 930, 520);
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.PlaneGeometry(14, 5.8), new THREE.MeshStandardMaterial({ map: texture(c), roughness: 0.6 }));
  board.position.y = 9;
  const back = new THREE.Mesh(new THREE.BoxGeometry(14.4, 6.2, 0.3), flat(0x2a2a2c));
  back.position.set(0, 9, -0.2);
  g.add(board, back);
  for (const x of [-4, 4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 7, 8), flat(0x3a3a3c));
    post.position.set(x, 3.5, -0.4);
    g.add(post);
  }
  return g;
}

function cemetery() {
  const g = new THREE.Group();
  const X = 430;
  const wallMat = flat(0xb8b2a4);
  for (const [z0, z1] of [[18, 37.4], [42.6, 62]]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.2, z1 - z0), wallMat);
    w.position.set(X, 1.6, (z0 + z1) / 2);
    w.castShadow = w.receiveShadow = true;
    g.add(w);
  }
  for (const z of [37.1, 42.9]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.1, 5, 1.1), wallMat);
    p.position.set(X, 2.5, z);
    p.castShadow = true;
    g.add(p);
    const urn = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), wallMat);
    urn.position.set(X, 5.4, z);
    g.add(urn);
  }
  // wrought-iron arch with the name
  const iron = flat(0x161616, { metalness: 0.6, roughness: 0.4 });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.07, 6, 32, Math.PI), iron);
  arch.rotation.y = Math.PI / 2;
  arch.position.set(X, 5, 40);
  g.add(arch);
  const [lc, lctx] = canvas(1024, 160);
  lctx.fillStyle = '#161616';
  lctx.font = '120px "Mea Culpa"';
  lctx.textAlign = 'center';
  lctx.textBaseline = 'middle';
  lctx.fillText('Camposanto', 512, 84);
  const letters = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.72), new THREE.MeshStandardMaterial({ map: texture(lc), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
  letters.position.set(X - 0.05, 6.2, 40);
  letters.rotation.y = -Math.PI / 2;
  g.add(letters);
  // the two gate leaves (pivot at the pillars)
  const leaves = [];
  for (const side of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.position.set(X, 0, 40 + side * 2.5);
    for (let i = 0; i < 9; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.6, 5), iron);
      bar.position.set(0, 1.8, -side * (0.2 + i * 0.26));
      leaf.add(bar);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 4), iron);
      spike.position.set(0, 3.7, -side * (0.2 + i * 0.26));
      leaf.add(spike);
    }
    for (const y of [0.4, 1.8, 3.3]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 2.4), iron);
      rail.position.set(0, y, -side * 1.25);
      leaf.add(rail);
    }
    g.add(leaf);
    leaves.push({ leaf, side });
  }
  // cypresses and crosses beyond the wall
  const cyp = flat(0x1d2a1c);
  const r = rng(40);
  for (let i = 0; i < 16; i++) {
    const h = 7 + r() * 6;
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.9, h, 7), cyp);
    c.position.set(X + 4 + r() * 30, h / 2, 20 + r() * 40);
    c.castShadow = true;
    g.add(c);
  }
  const stone = flat(0xcfcac0);
  for (let i = 0; i < 26; i++) {
    const cr = new THREE.Group();
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), stone);
    v.position.y = 0.6;
    const hbar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.6), stone);
    hbar.position.y = 0.85;
    cr.add(v, hbar);
    cr.position.set(X + 3 + r() * 24, 0, 26 + r() * 28);
    if (Math.abs(cr.position.z - 40) < 2) cr.position.z += 4;
    g.add(cr);
  }
  return { group: g, leaves };
}

export function buildWorld({ portrait, labelTexture }) {
  const scene = new THREE.Group();
  const r = rng(99);

  // ground: road, sidewalks with curbs, dirt beyond
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(1400, 600), flat(0x857158));
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.set(180, -0.02, 40);
  dirt.receiveShadow = true;
  scene.add(dirt);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(STREET.x1 - STREET.x0, 8), new THREE.MeshStandardMaterial({ map: asphalt(), roughness: 0.9 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set((STREET.x0 + STREET.x1) / 2, 0, STREET.z);
  road.receiveShadow = true;
  scene.add(road);
  const walkMat = new THREE.MeshStandardMaterial({ map: concrete(), roughness: 0.95 });
  for (const [z0, z1] of [[44, 47.5], [32.5, 36]]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(STREET.x1 - STREET.x0, 0.15, z1 - z0), walkMat);
    s.position.set((STREET.x0 + STREET.x1) / 2, 0.075, (z0 + z1) / 2);
    s.receiveShadow = true;
    scene.add(s);
  }

  // special shopfronts (hollow, with interiors)
  const barberFront = shopFacade(-4.6, 4.6, 6.5, 'BARBERSHOP', 'CORTES · NAVAJA · 1987', 3, [172, 196, 170]);
  const barFront = shopFacade(9.4, 18.6, 6.5, 'EL ÚLTIMO TRAGO', 'LIQUOR · BAR · CERVEZA', 5, [196, 120, 90]);
  scene.add(barberFront.group, barFront.group);
  const pole = barberPole();
  pole.group.position.set(-4.0, 2.4, STREET.north - 0.25);
  scene.add(pole.group);
  // a red neon BAR over the door
  const neonBar = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), new THREE.MeshBasicMaterial({ map: signTexture('BAR', { fg: '#ff2a33', bg: '#000', border: '', font: 'italic 700 180px "Oswald"' }), color: new THREE.Color(2.4, 2.4, 2.4), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending }));
  neonBar.position.set(11.2, 3.0, STREET.north - 0.12);
  neonBar.rotation.y = Math.PI;
  scene.add(neonBar);

  let clock = performance.now();
  const shop = buildBarbershop(portrait);
  const bar = buildBar();
  console.info(`[MUERTO]   interiors: ${Math.round(performance.now() - clock)} ms`);
  clock = performance.now();
  scene.add(shop.group, bar.group);

  // generic buildings on both sides
  const named = ['TACOS EL MUERTITO', 'LAVANDERÍA', 'MUEBLES', 'DISCOS · VIDEO', 'CHECK CASHING', 'PELUQUERÍA', 'ABARROTES', 'TATTOO', 'LIQUOR', 'MOTEL PARADISO', 'DONUTS', 'IGLESIA'];
  let k = 0;
  const addRow = (side) => {
    let x = side > 0 ? 19 : -66;
    if (side > 0) {
      // north side, west of the barbershop
      for (let xx = -66; ; ) {
        let w = 8 + Math.floor(r() * 3) * 2;
        if (xx + w > -5.2) w = Math.floor(-5.2 - xx);
        if (w < 4) break;
        const h = 6 + Math.floor(r() * 3) * 3.5;
        const b = building({ w, h, d: 10, seed: 200 + k++ });
        b.rotation.y = Math.PI;
        b.position.set(xx + w / 2, h / 2, STREET.north + 5);
        scene.add(b);
        xx += w + 0.6;
      }
    }
    while (x < 420) {
      const w = 8 + Math.floor(r() * 3) * 2;
      const h = 6 + Math.floor(r() * 3) * 3.5;
      if (side < 0 && x > 120 && x < 150) {
        x = 150; // the billboard lot
        continue;
      }
      if (side < 0 && x > 55 && x < 90) {
        x = 90; // motel lot
        continue;
      }
      const b = building({ w, h, d: 10, seed: 300 + k++ });
      if (side > 0) {
        b.rotation.y = Math.PI;
        b.position.set(x + w / 2, h / 2, STREET.north + 5);
      } else {
        b.position.set(x + w / 2, h / 2, STREET.south - 5);
      }
      scene.add(b);
      if (r() < 0.55) {
        const name = named[k % named.length];
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, 0.8), new THREE.MeshStandardMaterial({ map: signTexture(name, { bg: ['#141416', '#e9e4d6', '#2a2b30'][k % 3], fg: k % 3 === 1 ? '#141416' : '#f2efe6', border: k % 3 === 1 ? '#141416' : '#f2efe6' }) }));
        sign.position.set(x + w / 2, 3.75, side > 0 ? STREET.north - 0.05 : STREET.south + 0.05);
        if (side > 0) sign.rotation.y = Math.PI;
        scene.add(sign);
      }
      x += w + 0.6 + (r() < 0.2 ? 4 : 0);
    }
  };
  addRow(1);
  addRow(-1);
  console.info(`[MUERTO]   buildings: ${Math.round(performance.now() - clock)} ms`);

  // the funeral home facing the barbershop
  const fun = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.9), new THREE.MeshStandardMaterial({ map: signTexture('FUNERARIA SANTA MUERTE', { bg: '#0f0f10', font: '600 96px "Oswald"' }) }));
  fun.position.set(-1, 3.75, STREET.south + 0.06);
  scene.add(fun);

  // motel: low block + tall sign
  const motel = building({ w: 30, h: 4.2, d: 9, seed: 7, tone: [226, 196, 160], shop: true, floors: 0 });
  motel.position.set(73, 2.1, STREET.south - 9);
  scene.add(motel);
  const msign = new THREE.Group();
  const mpost = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 9, 8), flat(0x2a2a2c));
  mpost.position.y = 4.5;
  const [vc, vctx] = canvas(256, 1024);
  vctx.fillStyle = '#1a1416';
  vctx.fillRect(0, 0, 256, 1024);
  vctx.strokeStyle = '#ffb347';
  vctx.lineWidth = 8;
  vctx.strokeRect(14, 14, 228, 996);
  vctx.fillStyle = '#ffb347';
  vctx.font = '700 170px "Oswald"';
  vctx.textAlign = 'center';
  vctx.textBaseline = 'middle';
  'MOTEL'.split('').forEach((ch, i) => vctx.fillText(ch, 128, 130 + i * 190));
  const mboard = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 6.4), new THREE.MeshBasicMaterial({ map: texture(vc), color: new THREE.Color(1.3, 1.3, 1.3), toneMapped: false }));
  mboard.position.set(0, 9.5, 0.2);
  msign.add(mpost, mboard);
  msign.position.set(60, 0, STREET.south - 1);
  scene.add(msign);

  const bb = billboard(portrait);
  bb.position.set(135, 0, STREET.south - 4);
  scene.add(bb);

  // palms, poles, lamps
  const palmList = [];
  for (let x = -60; x < 420; x += 13 + r() * 6) {
    if (Math.abs(x - 0) < 6 || Math.abs(x - 14) < 5 || Math.abs(x - 27) < 4) continue;
    palmList.push([x, 46.8, 0, 0, r() * 6]);
  }
  for (let x = -55; x < 420; x += 15 + r() * 8) palmList.push([x, 33.3, 0, 0, r() * 6]);
  scene.add(palms(palmList));
  const poleXs = [];
  for (let x = -60; x <= 425; x += 22) poleXs.push(x);
  scene.add(powerLine(poleXs, 34.0));
  const lampList = [];
  for (let x = -40; x <= 425; x += 26) {
    lampList.push([x + 6, 46.9, -1]);
    lampList.push([x + 19, 33.1, 1]);
  }
  const lamps = streetLamps(lampList);
  scene.add(lamps.group);

  // bus-stop bench
  const bench = new THREE.Group();
  const benchMat = flat(0x2d4a3c);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.5), benchMat);
  seat.position.y = 0.48;
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.06), new THREE.MeshStandardMaterial({ map: signTexture('MUERTO · YA DISPONIBLE', { bg: '#e9e4d6', fg: '#141416', border: '#141416', font: '700 110px "Oswald"' }) }));
  backrest.position.set(0, 0.85, -0.25);
  bench.add(seat, backrest);
  for (const x of [-0.95, 0.95]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.45), benchMat);
    leg.position.set(x, 0.24, 0);
    bench.add(leg);
  }
  bench.position.set(27, 0.15, 45.7);
  bench.rotation.y = Math.PI;
  scene.add(bench);

  // parked cars
  const parked = [];
  for (const [x, z, col] of [[-22, 37.2, 0x5f6164], [44, 37.2, 0x8d8f92], [96, 42.8, 0x3c3e41], [170, 37.2, 0x77797c], [255, 42.8, 0x4a4c4f], [330, 37.2, 0x9a9c9f]]) {
    const c = sedan(col);
    c.group.position.set(x, 0, z);
    c.group.rotation.y = z < 40 ? 0 : Math.PI;
    scene.add(c.group);
    parked.push(c);
  }

  // the lowrider that gives the ride
  const ride = lowrider();
  scene.add(ride.group);

  const sky = skyDome();
  scene.add(sky.mesh);
  scene.add(skyline(-200, 700, 330, 2));

  const cem = cemetery();
  scene.add(cem.group);

  // the giant disc that rises like a moon over the cemetery
  const moon = createDisc({ labelTexture });
  moon.scale.setScalar(24);
  moon.position.set(520, -40, 40);
  moon.rotation.y = -Math.PI / 2;
  scene.add(moon);

  return { group: scene, shop, bar, barberFront, barFront, pole, lamps, ride, sky, cem, moon, parked, neonBar };
}
