/**
 * Tweenable scene state. GSAP animates this plain object directly;
 * the render loop reads it every frame. It exists before WebGL does,
 * so timelines can run even while the stage is loading or has failed.
 */
export function createStageParams() {
  return {
    opacity: 1, // DOM opacity of the canvas; rendering is skipped near 0
    exposure: 0, // environment (reflection) intensity
    burn: 0, // red retinal burn, emissive
    spin: -1.4, // environment rotation: sweeps the softbox across the surface
    camZ: 7,
    camY: 0,
    offsetX: 0,
    scale: 1,
    agitation: 0, // extra surface turbulence
    trail: 0, // afterimage persistence 0..0.97
  };
}

// Resting states of the shared 3D stage for each chapter. GSAP tweens between them.
export const HERO_STAGE = { opacity: 1, exposure: 1, burn: 0, spin: 0.35, camZ: 4.6, camY: 0, offsetX: 0, scale: 1, agitation: 0, trail: 0.8 };
export const OBJECT_STAGE = { ...HERO_STAGE, exposure: 1.15, spin: 0.9, camZ: 4.1, trail: 0.85 };

export const STAGE_STATES = {
  top: HERO_STAGE,
  signal: { ...HERO_STAGE, opacity: 0.5, exposure: 0.55, spin: 1.8, camZ: 5.8, offsetX: 1.25, trail: 0.9 },
  object: OBJECT_STAGE,
  record: { ...OBJECT_STAGE, opacity: 0, exposure: 0 },
  credits: { ...OBJECT_STAGE, opacity: 0, exposure: 0 },
};
