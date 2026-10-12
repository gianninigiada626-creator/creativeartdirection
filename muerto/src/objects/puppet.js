import * as THREE from 'three';
import { canvas, texture } from '../textures/util.js';

// NPC mannequin: a faceted low-poly body (PS2-era) carrying an oversized cut-out head
// that always faces the camera. Front texture when the camera sees the face, back texture otherwise.

const SEG = 6;

function pinstripe() {
  const [c, ctx] = canvas(256, 64);
  ctx.fillStyle = '#1d1d20';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = 'rgba(200,200,200,0.55)';
  for (let x = 0; x < 256; x += 16) ctx.fillRect(x, 0, 2, 64);
  return texture(c, { repeat: [3, 1] });
}

let PIN = null;
let PATCH = null;

/** Patchwork track jacket: red, bone and black panels with dark seams. */
function patchwork() {
  const [c, ctx] = canvas(512, 512);
  const cols = ['#b3202a', '#d8d2c4', '#141416', '#d8d2c4', '#b3202a', '#2a2b31'];
  let k = 0;
  for (let y = 0; y < 512; y += 128) {
    for (let x = 0; x < 512; x += 128) {
      const j = (x / 128 + y / 64) | 0;
      ctx.fillStyle = cols[(k + j) % cols.length];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 128, y);
      ctx.lineTo(x, y + 128);
      ctx.fill();
      ctx.fillStyle = cols[(k + j + 2) % cols.length];
      ctx.beginPath();
      ctx.moveTo(x + 128, y);
      ctx.lineTo(x + 128, y + 128);
      ctx.lineTo(x, y + 128);
      ctx.fill();
      k++;
    }
  }
  ctx.strokeStyle = '#0a0a0b';
  ctx.lineWidth = 5;
  for (let i = 0; i <= 512; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.moveTo(i, 0);
    ctx.lineTo(0, i);
    ctx.moveTo(512, i);
    ctx.lineTo(i, 512);
    ctx.stroke();
  }
  return texture(c, { repeat: [1.5, 1] });
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.6, metalness: 0.05, ...opts });
}

function limb(r0, r1, len, material) {
  const g = new THREE.CylinderGeometry(r0, r1, len, SEG, 1);
  g.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  return m;
}

export class Puppet {
  /**
   * @param {object} o
   * @param {HTMLCanvasElement|HTMLImageElement} o.head   front of the head
   * @param {HTMLCanvasElement|HTMLImageElement} o.back   back of the head
   * @param {object} o.outfit  { shirt, pants: 'pinstripe'|hex, shoes, skin, apron, cape, coat }
   */
  constructor({ head, back, outfit = {}, headHeight = 0.62, name = 'npc' }) {
    PIN ??= pinstripe();
    const o = { shirt: '#1a1a1c', pants: '#26262a', shoes: '#0a0a0b', skin: '#2a2c30', baggy: 1, ...outfit };
    this.name = name;
    const skin = mat(o.skin, { roughness: 0.32, metalness: 0.15 });
    if (o.shirt === 'patchwork') PATCH ??= patchwork();
    const shirt = o.shirt === 'patchwork' ? mat('#ffffff', { map: PATCH, roughness: 0.75 }) : mat(o.shirt);
    const pants = o.pants === 'pinstripe' ? mat('#ffffff', { map: PIN }) : mat(o.pants);
    const shoes = mat(o.shoes, { roughness: 0.25, metalness: 0.3 });

    const root = new THREE.Group();
    root.name = name;
    const pelvis = new THREE.Group();
    pelvis.position.y = 0.95;
    root.add(pelvis);

    const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.2, SEG), pants);
    hips.castShadow = true;
    pelvis.add(hips);

    const torso = new THREE.Group();
    torso.position.y = 0.08;
    pelvis.add(torso);
    const chestGeo = new THREE.CylinderGeometry(0.235 * (o.bulk ?? 1), 0.165 * (o.bulk ?? 1), 0.52, SEG);
    chestGeo.translate(0, 0.26, 0);
    const chest = new THREE.Mesh(chestGeo, o.coat ? mat(o.coat) : shirt);
    chest.scale.z = 0.72;
    chest.castShadow = true;
    torso.add(chest);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.14, SEG), skin);
    neck.position.y = 0.58;
    torso.add(neck);

    // the head: a camera-facing cut-out
    const front = texture(head);
    const backTex = texture(back);
    const aspect = (head.width ?? 512) / (head.height ?? 640);
    const headMat = new THREE.MeshStandardMaterial({ map: front, transparent: true, alphaTest: 0.4, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide });
    const headMesh = new THREE.Mesh(new THREE.PlaneGeometry(headHeight * aspect, headHeight), headMat);
    headMesh.castShadow = true;
    const headPivot = new THREE.Group();
    headPivot.position.y = 0.64;
    headMesh.position.y = headHeight * 0.33;
    headPivot.add(headMesh);
    torso.add(headPivot);

    const arm = (side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.25, 0.47, 0);
      const upper = limb(0.06, 0.052, 0.3, o.coat ? mat(o.coat) : shirt);
      shoulder.add(upper);
      const elbow = new THREE.Group();
      elbow.position.y = -0.3;
      shoulder.add(elbow);
      elbow.add(limb(0.05, 0.042, 0.27, o.coat ? mat(o.coat) : shirt));
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.045), skin);
      hand.position.y = -0.32;
      hand.castShadow = true;
      elbow.add(hand);
      torso.add(shoulder);
      return { shoulder, elbow, hand };
    };
    const leg = (side) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.095, -0.05, 0);
      hip.add(limb(0.085 * o.baggy, 0.07 * o.baggy, 0.45, pants));
      const knee = new THREE.Group();
      knee.position.y = -0.45;
      hip.add(knee);
      knee.add(limb(0.068 * o.baggy, 0.06 * o.baggy, 0.43, pants));
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.26), shoes);
      foot.position.set(0, -0.46, 0.06);
      foot.castShadow = true;
      knee.add(foot);
      pelvis.add(hip);
      return { hip, knee };
    };
    this.L = { arm: arm(1), leg: leg(1) };
    this.R = { arm: arm(-1), leg: leg(-1) };

    if (o.apron) {
      const apron = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.75, 0.02), mat('#d9d9d4'));
      apron.position.set(0, 0.12, 0.13);
      torso.add(apron);
    }
    if (o.cape) {
      const capeGeo = new THREE.ConeGeometry(0.62, 0.95, 10, 1, true);
      this.cape = new THREE.Mesh(capeGeo, mat('#8f8b84', { side: THREE.DoubleSide }));
      this.cape.position.y = 0.2;
      this.cape.castShadow = true;
      torso.add(this.cape);
    }

    Object.assign(this, { root, pelvis, torso, headPivot, headMesh, front, backTex });
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._f = new THREE.Vector3();
    this._roll = new THREE.Quaternion();
  }

  /**
   * Pose from plain numbers, so poses can be tweened or computed from time.
   * phase: walk cycle angle; walk: 0..1 stride amount; sit: 0..1;
   * armL/armR: [x, y, z] shoulder rotation; elbowL/elbowR: bend; lean: torso pitch; roll: head tilt.
   */
  pose({ phase = 0, walk = 0, sit = 0, armL = [0, 0, 0], armR = [0, 0, 0], elbowL = 0, elbowR = 0, lean = 0, roll = 0, twist = 0, pelvisY = null } = {}) {
    const s = Math.sin(phase);
    const c = Math.cos(phase);
    const { L, R } = this;
    L.leg.hip.rotation.x = -s * 0.5 * walk - sit * 1.5;
    R.leg.hip.rotation.x = s * 0.5 * walk - sit * 1.5;
    L.leg.knee.rotation.x = Math.max(0, c) * 0.75 * walk + sit * 1.5;
    R.leg.knee.rotation.x = Math.max(0, -c) * 0.75 * walk + sit * 1.5;
    this.pelvis.position.y = (pelvisY ?? 0.95 - sit * 0.4) + Math.abs(c) * 0.035 * walk;
    L.arm.shoulder.rotation.set(armL[0] + s * 0.38 * walk, armL[1], armL[2] - 0.07);
    R.arm.shoulder.rotation.set(armR[0] - s * 0.38 * walk, armR[1], armR[2] + 0.07);
    L.arm.elbow.rotation.x = -elbowL - 0.12 * walk;
    R.arm.elbow.rotation.x = -elbowR - 0.12 * walk;
    this.torso.rotation.set(lean, s * 0.07 * walk + twist, 0);
    this.roll = roll + s * 0.04 * walk;
  }

  /** Keep the head facing the camera; choose front or back. */
  face(camera) {
    const head = this.headMesh;
    head.parent.updateWorldMatrix(true, false);
    head.parent.getWorldQuaternion(this._q).invert();
    head.quaternion.copy(this._q).multiply(camera.quaternion);
    this._roll.setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.roll ?? 0);
    head.quaternion.multiply(this._roll);
    // facing test: the body's forward vs. the direction to the camera
    this.root.getWorldDirection(this._f);
    head.getWorldPosition(this._v);
    const toCam = camera.position.clone().sub(this._v).setY(0).normalize();
    const back = this._f.setY(0).normalize().dot(toCam) < -0.3;
    const want = back ? this.backTex : this.front;
    if (head.material.map !== want) {
      head.material.map = want;
      head.material.needsUpdate = true;
    }
  }
}
