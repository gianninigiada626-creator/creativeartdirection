// Final grade pass, applied in display space after tone mapping.
// The game look: desaturated green-sepia where only the reds survive, printed on crumpled paper,
// with cinema bars for cutscenes, film grain, vignette, scanlines and a CRT power transition.

export function createGradeParams() {
  return {
    mono: 0, // 0 colour → 1 monochrome
    keepRed: 0, // how much saturated red survives the monochrome
    tint: [1, 1, 1], // multiplies the mono image
    contrast: 1,
    paper: 0, // crumpled-paper relief strength
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
    uniform float uPaper;
    uniform float uBars;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uScan;
    uniform float uTv;
    uniform float uWhite;
    uniform float uFade;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
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

      // crumpled paper relief, fixed to the frame like the image was printed on it
      float p = texture2D(tPaper, vUv).r;
      c *= mix(1.0, 0.45 + p * 1.1, uPaper);

      float n = hash(floor(vUv * uRes) + uFrame * 17.0) - 0.5;
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
