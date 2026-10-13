// Final grade pass, applied in display space after tone mapping.
// The game look: muted, warm painted colour (olive shadows, cream highlights) with the reds kept,
// worn like an old print: cinema bars for cutscenes, grain, scratches and dust, vignette,
// scanlines and a CRT power transition.

export function createGradeParams() {
  return {
    mono: 0, // 0 colour → 1 monochrome
    keepRed: 0, // how much saturated red survives the monochrome
    tint: [1, 1, 1], // multiplies the mono image
    contrast: 1,
    sat: 1, // saturation after the mono mix
    split: 0, // split-tone: olive shadows, cream highlights
    scratch: 0, // film scratches and dust
    paper: 0, // canvas relief strength
    bars: 0, // 0 none → 1 full 2.39:1 letterbox
    grain: 0.06,
    vignette: 0.45,
    scan: 0,
    tv: 1, // 1 full picture → 0 collapsed to a line
    white: 0,
    fade: 1,
  };
}

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tPaper: { value: null },
    uFrame: { value: 0 },
    uRes: { value: [1920, 1080] },
    uMono: { value: 0 },
    uKeepRed: { value: 0 },
    uTint: { value: [1, 1, 1] },
    uContrast: { value: 1 },
    uSat: { value: 1 },
    uSplit: { value: 0 },
    uScratch: { value: 0 },
    uPaper: { value: 0 },
    uBars: { value: 0 },
    uGrain: { value: 0.06 },
    uVignette: { value: 0.45 },
    uScan: { value: 0 },
    uTv: { value: 1 },
    uWhite: { value: 0 },
    uFade: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tPaper;
    uniform float uFrame;
    uniform vec2 uRes;
    uniform float uMono;
    uniform float uKeepRed;
    uniform vec3 uTint;
    uniform float uContrast;
    uniform float uSat;
    uniform float uSplit;
    uniform float uScratch;
    uniform float uPaper;
    uniform float uBars;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uScan;
    uniform float uTv;
    uniform float uWhite;
    uniform float uFade;
    varying vec2 vUv;

    // hash12 (Dave Hoskins): stable on integer pixel coordinates, no column patterns
    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 uv = vUv;

      // letterbox: 2.39:1 inside 16:9 leaves 12.8% top and bottom
      float bar = 0.128 * clamp(uBars, 0.0, 1.0);
      if (uv.y < bar || uv.y > 1.0 - bar) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      // CRT power
      float tv = clamp(uTv, 0.0, 1.0);
      float h = max(tv * tv, 0.0025);
      float w = clamp(tv * 40.0, 0.004, 1.0);
      vec2 cuv = vec2((uv.x - 0.5) / w + 0.5, (uv.y - 0.5) / h + 0.5);
      if (cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }
      vec3 src = texture2D(tDiffuse, cuv).rgb;
      vec3 c = src;
      c += vec3(1.0) * (1.0 - smoothstep(0.0, 0.35, tv)) * 1.4;

      float l = dot(c, vec3(0.299, 0.587, 0.114));
      vec3 mono = vec3(l) * uTint;
      float red = smoothstep(0.08, 0.32, src.r - max(src.g, src.b)) * uKeepRed;
      vec3 graded = mix(c, mono, uMono);
      graded = mix(graded, mix(c, vec3(l), 0.25) * vec3(1.05, 0.92, 0.9), red);
      c = (graded - 0.5) * uContrast + 0.5;

      float lum = dot(c, vec3(0.299, 0.587, 0.114));
      c = max(mix(vec3(lum), c, uSat), 0.0);
      vec3 split = mix(vec3(0.84, 0.95, 0.88), vec3(1.07, 1.0, 0.86), smoothstep(0.04, 0.72, lum));
      c *= mix(vec3(1.0), split, uSplit);

      // an old print: hairline scratches that jump every other frame, and dust
      if (uScratch > 0.0) {
        float f = floor(uFrame / 2.0);
        for (int i = 0; i < 2; i++) {
          float fi = float(i);
          float on = step(0.7, hash(vec2(fi * 3.1, f * 1.3)));
          float xs = hash(vec2(f * 0.71, fi * 7.1)) + sin(vUv.y * 7.0 + f) * 0.0015;
          float line = 1.0 - smoothstep(0.0, 1.2 / uRes.x, abs(vUv.x - xs));
          // a scratch runs only part of the frame
          float y0 = hash(vec2(f, fi + 4.0));
          float run = smoothstep(y0 - 0.05, y0, vUv.y) * (1.0 - smoothstep(y0 + 0.3, y0 + 0.4, vUv.y));
          vec3 ink = hash(vec2(fi, f)) < 0.5 ? vec3(0.93, 0.9, 0.82) : vec3(0.06, 0.05, 0.04);
          c = mix(c, ink, line * run * on * 0.3 * uScratch);
        }
        vec2 grid = vec2(48.0, 27.0);
        vec2 cell = floor(vUv * grid);
        if (hash(cell + f * 3.7) > 0.994) {
          vec2 ctr = (cell + vec2(hash(cell + 1.3 + f), hash(cell + 2.1 + f))) / grid;
          float rad = 1.2 + hash(cell + f) * 3.0;
          float speck = 1.0 - smoothstep(rad * 0.5, rad, length((vUv - ctr) * uRes));
          c = mix(c, vec3(0.05, 0.04, 0.03), speck * 0.75 * uScratch);
        }
      }

      // crumpled paper relief, fixed to the frame like the image was printed on it
      float p = texture2D(tPaper, vUv).r;
      c *= mix(1.0, 0.45 + p * 1.1, uPaper);

      float n = hash(floor(vUv * uRes) + vec2(mod(uFrame, 97.0) * 131.0, mod(uFrame, 89.0) * 71.0)) - 0.5;
      c += n * uGrain;

      c *= 1.0 - uScan * (0.5 + 0.5 * sin(vUv.y * uRes.y * 1.5708));

      vec2 d = vUv - 0.5;
      d.x *= uRes.x / uRes.y;
      c *= 1.0 - uVignette * smoothstep(0.35, 1.05, length(d));

      c = mix(c, vec3(1.0), clamp(uWhite, 0.0, 1.0));
      c *= 1.0 - clamp(uFade, 0.0, 1.0);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

/**
 * Kuwahara filter: each pixel takes the mean colour of the calmest of four neighbourhoods.
 * Edges stay crisp, everything else flattens into strokes of paint.
 */
export const PaintShader = {
  // the radius is compiled into the loop: software GL pays for every iteration, skipped or not
  defines: { KR: 3 },
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: [1920, 1080] },
    uStep: { value: 1.25 },
    uAmount: { value: 1 },
  },
  vertexShader: GradeShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform float uStep;
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
      vec2 px = uStep / uRes;
      vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
      vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
      float n0 = 0.0, n1 = 0.0, n2 = 0.0, n3 = 0.0;
      for (int j = -KR; j <= KR; j++) {
        for (int i = -KR; i <= KR; i++) {
          vec3 c = texture2D(tDiffuse, vUv + vec2(float(i), float(j)) * px).rgb;
          vec3 cc = c * c;
          if (i <= 0 && j <= 0) { m0 += c; s0 += cc; n0 += 1.0; }
          if (i >= 0 && j <= 0) { m1 += c; s1 += cc; n1 += 1.0; }
          if (i <= 0 && j >= 0) { m2 += c; s2 += cc; n2 += 1.0; }
          if (i >= 0 && j >= 0) { m3 += c; s3 += cc; n3 += 1.0; }
        }
      }
      m0 /= n0; m1 /= n1; m2 /= n2; m3 /= n3;
      vec3 v0 = s0 / n0 - m0 * m0, v1 = s1 / n1 - m1 * m1, v2 = s2 / n2 - m2 * m2, v3 = s3 / n3 - m3 * m3;
      float q0 = v0.r + v0.g + v0.b, q1 = v1.r + v1.g + v1.b, q2 = v2.r + v2.g + v2.b, q3 = v3.r + v3.g + v3.b;
      vec3 best = m0; float bq = q0;
      if (q1 < bq) { bq = q1; best = m1; }
      if (q2 < bq) { bq = q2; best = m2; }
      if (q3 < bq) { bq = q3; best = m3; }
      vec3 src = texture2D(tDiffuse, vUv).rgb;
      gl_FragColor = vec4(mix(src, best, uAmount), 1.0);
    }`,
};
