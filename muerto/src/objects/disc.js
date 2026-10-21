import * as THREE from 'three';
import { canvas, texture } from '../textures/util.js';

// Real proportions of a 120 mm disc: 15 mm hole, ~33 mm clear clamping hub. Radius 1 = 60 mm.
export const DISC = { R: 1, HOLE: 0.125, HUB: 0.28, T: 0.02 };

/** Tangential groove directions for the anisotropic data side (circular tracks). */
function grooveMap(size = 512) {
  const [c, ctx] = canvas(size);
  const img = ctx.createImageData(size, size);
  const h = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = Math.atan2(h - y, x - h);
      const i = (y * size + x) * 4;
      img.data[i] = (-Math.sin(a) * 0.5 + 0.5) * 255;
      img.data[i + 1] = (Math.cos(a) * 0.5 + 0.5) * 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return texture(c, { srgb: false });
}

/** Faint data-area rings (where the burn starts and ends) for the readable side. */
function dataRings(size = 1024) {
  const [c, ctx] = canvas(size);
  ctx.fillStyle = '#c9ccd2';
  ctx.fillRect(0, 0, size, size);
  const h = size / 2;
  const band = (r0, r1, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(h, h, r1 * h, 0, Math.PI * 2);
    ctx.arc(h, h, r0 * h, 0, Math.PI * 2, true);
    ctx.fill();
  };
  band(0.3, 0.42, '#d9dce1');
  band(0.42, 0.93, '#b8bcc4');
  band(0.93, 1, '#cfd2d8');
  return texture(c);
}

export function createDisc({ labelTexture }) {
  const { R, HOLE, HUB, T } = DISC;
  const group = new THREE.Group();
  group.name = 'disc';

  // printed label (front, +Z)
  const label = new THREE.Mesh(
    new THREE.RingGeometry(HUB, R, 160, 1),
    new THREE.MeshPhysicalMaterial({
      map: labelTexture,
      roughness: 0.42,
      metalness: 0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.3,
      envMapIntensity: 0.6,
    }),
  );
  label.position.z = T / 2;
  label.castShadow = true;
  group.add(label);

  // data side (back, -Z): metallic, anisotropic tracks, thin-film rainbow
  const dataGeo = new THREE.RingGeometry(HUB * 0.92, R, 160, 4);
  dataGeo.computeTangents?.();
  const data = new THREE.Mesh(
    dataGeo,
    new THREE.MeshPhysicalMaterial({
      map: dataRings(),
      metalness: 1,
      roughness: 0.16,
      iridescence: 1,
      iridescenceIOR: 1.65,
      iridescenceThicknessRange: [180, 820],
      anisotropy: 0.85,
      anisotropyMap: grooveMap(),
      envMapIntensity: 1.6,
    }),
  );
  data.rotation.y = Math.PI;
  data.position.z = -T / 2;
  group.add(data);

  // clear polycarbonate hub with the stacking ring
  const clear = new THREE.MeshPhysicalMaterial({
    color: 0x1c1e22,
    metalness: 0.2,
    roughness: 0.12,
    transparent: true,
    opacity: 0.7,
    clearcoat: 1,
    envMapIntensity: 1.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const hubFront = new THREE.Mesh(new THREE.RingGeometry(HOLE, HUB, 96, 1), clear);
  hubFront.position.z = T / 2;
  const hubBack = hubFront.clone();
  hubBack.position.z = -T / 2;
  const stacking = new THREE.Mesh(
    new THREE.TorusGeometry(0.205, 0.006, 6, 96),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, roughness: 0.1 }),
  );
  stacking.position.z = T / 2;
  group.add(hubFront, hubBack, stacking);

  // edges
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xb9bec6, metalness: 0.9, roughness: 0.25 });
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, 160, 1, true), edgeMat);
  outer.rotation.x = Math.PI / 2;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(HOLE, HOLE, T, 48, 1, true), clear);
  inner.rotation.x = Math.PI / 2;
  group.add(outer, inner);

  return group;
}
