import * as THREE from 'three';

/**
 * Base for the four acts. An act owns a scene, a camera and (optionally) a DOM overlay layer.
 *   build(film)               load and construct assets
 *   choreograph(tl, s, film)  add tweens to the master timeline at absolute times
 *   cues(s)                   sound cues [{ t, name, args }]
 *   update(t, film)           procedural, time-pure motion
 */
export class Act {
  constructor(name, { start, end }) {
    this.name = name;
    this.start = start;
    this.end = end;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.05, 400);
    this.layer = null;
  }

  createLayer(film, className) {
    this.layer = document.createElement('div');
    this.layer.className = `layer ${className}`;
    this.layer.hidden = true;
    film.overlay.appendChild(this.layer);
    return this.layer;
  }

  setActive(active) {
    if (this.layer) this.layer.hidden = !active;
  }

  async build() {}
  choreograph() {}
  cues() {
    return [];
  }
  update() {}
}
