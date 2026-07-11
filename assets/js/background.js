/**
 * WebGL background — a full-viewport fragment-shader field rendered behind
 * the whole page (fixed canvas, z-index 0). Reacts to pointer position and
 * scroll progress. Falls back to a plain CSS gradient if WebGL/Three.js
 * fails to initialize for any reason (old browser, blocked context, etc.)
 * so the page is never broken, only less shiny.
 */
(function () {
  var canvas = document.getElementById('glCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  var supportsWebGL = (function () {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  })();

  if (!supportsWebGL) {
    document.body.style.background = 'radial-gradient(ellipse at 30% 20%, #14151a 0%, #050506 60%)';
    return;
  }

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer, scene, camera, mesh, clock;
  var mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  var scrollProgress = 0;

  var vertexShader = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  // Flowing domain-warped noise field, kept subtle (dark, low-contrast) so
  // it reads as texture/atmosphere behind the type rather than a distraction.
  var fragmentShader = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform float uTime;',
    'uniform vec2 uMouse;',
    'uniform float uScroll;',
    'uniform vec2 uResolution;',
    '',
    'vec2 hash(vec2 p) {',
    '  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));',
    '  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);',
    '}',
    '',
    'float noise(vec2 p) {',
    '  const float K1 = 0.366025404;',
    '  const float K2 = 0.211324865;',
    '  vec2 i = floor(p + (p.x + p.y) * K1);',
    '  vec2 a = p - i + (i.x + i.y) * K2;',
    '  vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec2 b = a - o + K2;',
    '  vec2 c = a - 1.0 + 2.0 * K2;',
    '  vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);',
    '  vec3 n = h * h * h * h * vec3(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));',
    '  return dot(n, vec3(70.0));',
    '}',
    '',
    'float fbm(vec2 p) {',
    '  float v = 0.0;',
    '  float a = 0.5;',
    '  for (int i = 0; i < 5; i++) {',
    '    v += a * noise(p);',
    '    p *= 2.02;',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',
    '',
    'void main() {',
    '  vec2 uv = vUv;',
    '  float aspect = uResolution.x / uResolution.y;',
    '  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 2.2;',
    '',
    '  vec2 mouseInfluence = (uMouse - 0.5) * vec2(aspect, 1.0) * 0.8;',
    '  p += mouseInfluence * 0.35;',
    '',
    '  float t = uTime * 0.045;',
    '  vec2 warp = vec2(fbm(p * 0.8 + t), fbm(p * 0.8 - t + 4.2));',
    '  float n = fbm(p * 1.4 + warp * 1.4 + t * 0.6);',
    '',
    '  float scrollShift = uScroll * 1.6;',
    '  float bands = fbm(p * 0.6 + vec2(0.0, scrollShift) + warp * 0.6);',
    '',
    '  float field = n * 0.6 + bands * 0.4;',
    '  field = smoothstep(-0.3, 0.7, field);',
    '',
    '  vec3 base = vec3(0.02, 0.02, 0.024);',
    '  vec3 mid  = vec3(0.055, 0.055, 0.065);',
    '  vec3 accent = vec3(0.85, 1.0, 0.25);',
    '',
    '  vec3 color = mix(base, mid, field);',
    '  float accentMask = smoothstep(0.82, 1.0, field) * 0.18;',
    '  color = mix(color, accent, accentMask);',
    '',
    '  float vig = distance(uv, vec2(0.5));',
    '  color *= smoothstep(0.9, 0.25, vig);',
    '',
    '  gl_FragColor = vec4(color, 1.0);',
    '}'
  ].join('\n');

  function init() {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'low-power'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

    var geometry = new THREE.PlaneBufferGeometry(2, 2);
    var material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uScroll: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      }
    });
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    animate();
  }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    mesh.material.uniforms.uResolution.value.set(w, h);
  }

  function onPointerMove(e) {
    mouse.tx = e.clientX / window.innerWidth;
    mouse.ty = 1.0 - e.clientY / window.innerHeight;
  }

  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    scrollProgress = max > 0 ? window.scrollY / max : 0;
  }

  function animate() {
    requestAnimationFrame(animate);
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;

    var u = mesh.material.uniforms;
    u.uTime.value = reducedMotion ? 0 : clock.getElapsedTime();
    u.uMouse.value.set(mouse.x, mouse.y);
    u.uScroll.value += (scrollProgress - u.uScroll.value) * 0.06;

    renderer.render(scene, camera);
  }

  try {
    init();
  } catch (err) {
    // Never let a shader/WebGL failure take the rest of the page down with it.
    console.warn('WebGL background failed to initialize:', err);
    document.body.style.background = 'radial-gradient(ellipse at 30% 20%, #14151a 0%, #050506 60%)';
    if (canvas) canvas.style.display = 'none';
  }
})();
