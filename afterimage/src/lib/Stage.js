import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import noise from './noise.glsl.js';

const SAFELIGHT = '#d3121a';

export function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

export class Stage {
  constructor(container, params, { reducedMotion = false, onContextLost } = {}) {
    this.container = container;
    this.params = params;
    this.reducedMotion = reducedMotion;
    this.onContextLost = onContextLost;
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0, energy: 0 };
    this.time = 0;
    this.fit = 1;
    this.running = false;
    this.disposed = false;
  }

  async init() {
    const coarse = matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 760px)').matches;

    const renderer = new THREE.WebGLRenderer({
      antialias: !coarse,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 1.75));
    // Pure black: the composer's float targets take the clear colour as linear, so any grey lifts the void.
    renderer.setClearColor(0x000000, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    this.container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.handleContextLost = (event) => {
      event.preventDefault();
      this.stop();
      this.onContextLost?.();
    };
    renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);

    const scene = new THREE.Scene();
    this.scene = scene;
    this.envTexture = this.buildEnvironment(renderer);
    scene.environment = this.envTexture;

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

    this.mesh = this.buildObject(coarse ? 44 : 80);
    scene.add(this.mesh);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, this.camera));
    this.afterimage = new AfterimagePass(0);
    composer.addPass(this.afterimage);
    composer.addPass(new OutputPass());
    this.composer = composer;
    if (import.meta.env.DEV) window.__stage = this;

    this.resize();
    this.handleResize = () => this.resize();
    this.handlePointer = (e) => this.setPointer(e.clientX, e.clientY);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pointermove', this.handlePointer, { passive: true });

    await renderer.compileAsync(scene, this.camera);
    if (this.disposed) return;
    this.start();
  }

  /** Procedural photo studio: black room, one tall softbox, a top strip, a silver kicker and a red safelight. */
  buildEnvironment(renderer) {
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x000000);
    const panel = (w, h, color, intensity, position) => {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
      mesh.position.set(...position);
      mesh.lookAt(0, 0, 0);
      env.add(mesh);
    };
    panel(0.7, 16, '#ffffff', 7, [-5, 0, 3]); // key softbox, camera left
    panel(12, 0.3, '#ffffff', 2.5, [0, 5.5, -1]); // overhead strip
    panel(0.2, 12, '#c9ccd1', 5, [5, 0, -3.5]); // kicker, behind right
    panel(3.2, 1.1, SAFELIGHT, 7, [3.6, -3.2, 2]); // darkroom safelight

    const pmrem = new THREE.PMREMGenerator(renderer);
    const target = pmrem.fromScene(env, 0.03);
    pmrem.dispose();
    env.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
    this.envTarget = target;
    return target.texture;
  }

  /** Liquid metal: a dense icosphere displaced by layered simplex noise, normals rebuilt in the vertex shader. */
  buildObject(detail) {
    const geometry = new THREE.IcosahedronGeometry(1, detail);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x9da1a8,
      metalness: 1,
      roughness: 0.13,
      clearcoat: 0.7,
      clearcoatRoughness: 0.06,
      emissive: new THREE.Color(SAFELIGHT),
      emissiveIntensity: 0,
    });
    const uniforms = {
      uTime: { value: 0 },
      uAmp: { value: 0.13 },
      uFreq: { value: 0.95 },
    };
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          /* glsl */ `#include <common>
          uniform float uTime;
          uniform float uAmp;
          uniform float uFreq;
          ${noise}
          float field(vec3 p) {
            float n = snoise(p * uFreq + vec3(0.0, uTime * 0.16, uTime * 0.1));
            n += 0.22 * snoise(p * uFreq * 1.9 - vec3(uTime * 0.12));
            return n;
          }
          vec3 displaceSphere(vec3 p) {
            vec3 dir = normalize(p);
            return dir * (1.0 + field(dir) * uAmp);
          }
          vec3 orthogonalTo(vec3 v) {
            return normalize(abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0) : vec3(0.0, -v.z, v.y));
          }`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          /* glsl */ `vec3 displacedPosition = displaceSphere(position);
          vec3 tangentDir = orthogonalTo(normal);
          vec3 bitangentDir = normalize(cross(normal, tangentDir));
          float eps = 0.004;
          vec3 neighbourA = displaceSphere(position + tangentDir * eps);
          vec3 neighbourB = displaceSphere(position + bitangentDir * eps);
          vec3 objectNormal = normalize(cross(neighbourA - displacedPosition, neighbourB - displacedPosition));`,
        )
        .replace('#include <begin_vertex>', 'vec3 transformed = displacedPosition;');
    };
    material.customProgramCacheKey = () => 'afterimage-liquid-metal';
    this.uniforms = uniforms;
    this.material = material;
    return new THREE.Mesh(geometry, material);
  }

  setPointer(clientX, clientY) {
    const nx = (clientX / window.innerWidth) * 2 - 1;
    const ny = (clientY / window.innerHeight) * 2 - 1;
    const p = this.pointer;
    p.energy = Math.min(1, p.energy + Math.hypot(nx - p.tx, ny - p.ty) * 1.5);
    p.tx = nx;
    p.ty = ny;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = aspect;
    // Pull the camera back on portrait screens so the object keeps its presence without clipping the sides.
    this.fit = aspect < 1 ? Math.pow(1 / aspect, 1.1) : 1;
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    let last = performance.now();
    const loop = (now = performance.now()) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.update(Math.min((now - last) / 1000, 0.05));
      last = now;
    };
    loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  update(dt) {
    const s = this.params;
    this.container.style.opacity = s.opacity;
    if (s.opacity < 0.01 || document.hidden) return;

    const slow = this.reducedMotion ? 0.3 : 1;
    this.time += dt * slow;
    const p = this.pointer;
    const k = 1 - Math.exp(-dt * 2.5);
    p.x += (p.tx - p.x) * k;
    p.y += (p.ty - p.y) * k;
    p.energy *= Math.exp(-dt * 1.8);

    this.uniforms.uTime.value = this.time;
    this.uniforms.uAmp.value = 0.13 + s.agitation + (this.reducedMotion ? 0 : p.energy * 0.07);

    const m = this.mesh;
    m.rotation.y = this.time * 0.11 + p.x * 0.55;
    m.rotation.x = p.y * 0.3 + Math.sin(this.time * 0.21) * 0.08;
    m.position.x = s.offsetX;
    m.scale.setScalar(s.scale);

    this.camera.position.set(p.x * 0.12, s.camY - p.y * 0.08, s.camZ * this.fit);
    this.camera.lookAt(0, s.camY * 0.4, 0);

    this.scene.environmentRotation.y = s.spin + p.x * 0.2;
    this.scene.environmentIntensity = s.exposure;
    this.material.emissiveIntensity = s.burn * 0.9;
    this.afterimage.damp = this.reducedMotion ? 0 : s.trail;

    this.composer.render(dt);
  }

  dispose() {
    this.disposed = true;
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointer);
    if (!this.renderer) return;
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.mesh?.geometry.dispose();
    this.material?.dispose();
    this.envTarget?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
