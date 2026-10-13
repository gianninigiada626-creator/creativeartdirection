import * as THREE from 'three';
import { canvas, texture } from '../textures/util.js';

// Collage mannequin, after the painted references: a flat black paper torso, smooth rubbery
// airbrushed arms and big mitten hands, wide trousers, and an oversized cut-out head that always
// faces the camera — front, three-quarter (mirrored per side) or back, chosen by viewing angle.

const SEG = 16;

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
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, ...opts });
}

/** Smooth rubbery skin, like airbrushed clay. */
function skinMat(color) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.48, metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.6, sheen: 0.15, sheenRoughness: 0.7, sheenColor: new THREE.Color(0.45, 0.47, 0.5), envMapIntensity: 0.6 });
}

function capsule(r, len, material) {
  const g = new THREE.CapsuleGeometry(r, len, 6, SEG);
  g.translate(0, -len / 2 - r * 0.2, 0);
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  return m;
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
  constructor({ head, back, side = null, outfit = {}, headHeight = 0.62, name = 'npc' }) {
    PIN ??= pinstripe();
    const o = { shirt: '#1a1a1c', pants: '#26262a', shoes: '#0a0a0b', skin: '#2a2c30', baggy: 1, ...outfit };
    this.name = name;
    const skin = skinMat(o.skin);
    if (o.shirt === 'patchwork') PATCH ??= patchwork();
    const shirt = o.shirt === 'patchwork' ? mat('#ffffff', { map: PATCH, roughness: 0.75 }) : mat(o.shirt);
    const pants = o.pants === 'pinstripe' ? mat('#ffffff', { map: PIN }) : mat(o.pants);
    const shoes = new THREE.MeshPhysicalMaterial({ color: o.shoes, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15 });

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

    // kept below the chin: the head is a flat cut-out and the neck must never poke through it
    const neck = capsule(0.06, 0.04, skin);
    neck.position.y = 0.6;
    torso.add(neck);

    // the head: a camera-facing cut-out
    const front = texture(head);
    const backTex = texture(back);
    const sideTex = side ? texture(side) : null;
    let sideFlip = null;
    if (side) {
      sideFlip = texture(side);
      sideFlip.repeat.x = -1;
      sideFlip.offset.x = 1;
    }
    const aspect = (head.width ?? 512) / (head.height ?? 640);
    const headMat = new THREE.MeshStandardMaterial({ map: front, transparent: true, alphaTest: 0.4, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide });
    const headMesh = new THREE.Mesh(new THREE.PlaneGeometry(headHeight * aspect, headHeight), headMat);
    headMesh.castShadow = true;
    const headPivot = new THREE.Group();
    headPivot.position.y = 0.64;
    headMesh.position.y = headHeight * 0.33;
    this.headBase = headMesh.position.clone();
    headPivot.add(headMesh);
    torso.add(headPivot);

    const arm = (sd) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(sd * 0.25, 0.47, 0);
      // short sleeve, then bare airbrushed arm (long sleeves for coats)
      const sleeveMat = o.coat ? mat(o.coat) : shirt;
      shoulder.add(limb(0.078, 0.07, o.coat ? 0.3 : 0.14, sleeveMat));
      if (!o.coat) {
        const bare = capsule(0.052, 0.16, skin);
        bare.position.y = -0.1;
        shoulder.add(bare);
      }
      const elbow = new THREE.Group();
      elbow.position.y = -0.3;
      shoulder.add(elbow);
      elbow.add(o.coat ? limb(0.062, 0.052, 0.25, sleeveMat) : capsule(0.047, 0.2, skin));
      // big mitten hand with a thumb
      const hand = new THREE.Group();
      hand.position.y = -0.31;
      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.06, SEG, 12), skin);
      palm.scale.set(1.0, 1.45, 0.72);
      palm.castShadow = true;
      const thumb = capsule(0.022, 0.05, skin);
      thumb.position.set(-sd * 0.045, 0.03, 0.03);
      thumb.rotation.z = sd * 0.6;
      hand.add(palm, thumb);
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
      const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.16, 6, SEG), shoes);
      foot.rotation.x = Math.PI / 2;
      foot.scale.set(1.15, 1, 0.75);
      foot.position.set(0, -0.45, 0.07);
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

    Object.assign(this, { root, pelvis, torso, headPivot, headMesh, front, backTex, sideTex, sideFlip });
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

  /** Keep the head facing the camera; choose front, three-quarter (mirrored per side) or back. */
  face(camera) {
    const head = this.headMesh;
    head.parent.updateWorldMatrix(true, false);
    head.parent.getWorldQuaternion(this._q).invert();
    head.quaternion.copy(this._q).multiply(camera.quaternion);
    this._roll.setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.roll ?? 0);
    head.quaternion.multiply(this._roll);
    // pull the cut-out a little toward the camera so the neck and collar never poke through it
    head.position.copy(this.headBase);
    head.parent.localToWorld(this._v.copy(this.headBase));
    const pull = camera.position.clone().sub(this._v).normalize().multiplyScalar(0.16).add(this._v);
    head.position.copy(head.parent.worldToLocal(pull));
    this.root.getWorldDirection(this._f);
    head.getWorldPosition(this._v);
    const toCam = camera.position.clone().sub(this._v).setY(0).normalize();
    const f = this._f.setY(0).normalize();
    const dot = f.dot(toCam);
    let want = this.front;
    if (dot < -0.35) want = this.backTex;
    else if (dot < 0.8 && this.sideTex) {
      // which way does the body face on screen?
      const onScreen = f.clone().applyQuaternion(camera.quaternion.clone().invert());
      want = onScreen.x < 0 ? this.sideTex : this.sideFlip;
    }
    if (head.material.map !== want) {
      head.material.map = want;
      head.material.needsUpdate = true;
    }
  }
}
