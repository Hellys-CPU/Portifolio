// Globo pontilhado 3D — presença remota (inspirado no weevolveit.com), rodando em Three.js puro, sem build.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

(function () {
  var wrap = document.getElementById('globe-canvas-wrap');
  var canvas = document.getElementById('globe-canvas');
  if (!wrap || !canvas) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) {
    return; // sem WebGL: a seção fica só com o badge "online · são paulo", sem quebrar nada
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 4.4);

  var group = new THREE.Group();
  scene.add(group);

  var radius = 1.5;

  // ---- máscara de continentes — silhueta simplificada dos continentes num canvas equiretangular ----
  // (sem depender de nenhum asset externo: um punhado de polígonos aproximados já basta pro efeito de "bolinhas só na terra")
  function buildLandMask() {
    var W = 360, H = 180;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    function toXY(lon, lat) { return [(lon + 180) / 360 * W, (90 - lat) / 180 * H]; }
    function poly(points) {
      ctx.beginPath();
      points.forEach(function (p, i) {
        var xy = toXY(p[0], p[1]);
        if (i === 0) ctx.moveTo(xy[0], xy[1]); else ctx.lineTo(xy[0], xy[1]);
      });
      ctx.closePath();
      ctx.fill();
    }
    // américa do sul
    poly([[-81, 9], [-77, 4], [-70, -18], [-71, -30], [-73, -42], [-68, -54], [-65, -55], [-58, -52], [-48, -25], [-35, -8], [-50, 5], [-60, 10], [-70, 11]]);
    // américa do norte
    poly([[-165, 68], [-140, 60], [-125, 49], [-117, 32], [-105, 20], [-97, 16], [-90, 14], [-80, 9], [-75, 20], [-66, 45], [-70, 50], [-80, 62], [-95, 68], [-130, 70]]);
    // áfrica
    poly([[-17, 15], [-17, 5], [9, 4], [12, -5], [13, -18], [18, -34], [32, -28], [40, -15], [51, 12], [43, 15], [35, 31], [10, 37], [-6, 35]]);
    // europa
    poly([[-9, 43], [-9, 52], [5, 60], [25, 60], [40, 65], [40, 45], [28, 41], [15, 38], [-5, 36]]);
    // ásia
    poly([[40, 45], [55, 40], [70, 38], [78, 30], [80, 8], [92, 22], [100, 10], [105, -6], [120, 5], [135, 35], [145, 45], [140, 55], [160, 65], [100, 72], [60, 68], [45, 55]]);
    // austrália
    poly([[113, -22], [122, -18], [130, -12], [142, -11], [153, -27], [150, -37], [140, -38], [129, -32], [115, -34]]);
    return ctx.getImageData(0, 0, W, H);
  }
  var mask = buildLandMask();
  var maskW = mask.width, maskH = mask.height;
  function isLand(lonDeg, latDeg) {
    var u = Math.floor((lonDeg + 180) / 360 * maskW);
    var v = Math.floor((90 - latDeg) / 180 * maskH);
    u = Math.max(0, Math.min(maskW - 1, u));
    v = Math.max(0, Math.min(maskH - 1, v));
    return mask.data[(v * maskW + u) * 4] > 128;
  }

  // esfera pontilhada — distribuição de Fibonacci (uniforme), filtrada pra só sobrar terra firme
  var CANDIDATES = 6500;
  var pts = [];
  var goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < CANDIDATES; i++) {
    var t = i / (CANDIDATES - 1);
    var yA = 1 - t * 2;
    var rC = Math.sqrt(Math.max(0, 1 - yA * yA));
    var theta = goldenAngle * i;
    var x = Math.cos(theta) * rC;
    var y = yA;
    var z = Math.sin(theta) * rC;
    var latDeg = Math.asin(Math.max(-1, Math.min(1, y))) * 180 / Math.PI;
    var lonDeg = Math.atan2(z, x) * 180 / Math.PI;
    if (isLand(lonDeg, latDeg)) {
      pts.push(x * radius, y * radius, z * radius);
    }
  }
  var positions = new Float32Array(pts);
  var dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  var dotMat = new THREE.PointsMaterial({
    color: 0x9fb0c9, size: 0.026, sizeAttenuation: true, transparent: true, opacity: 0.85
  });
  group.add(new THREE.Points(dotGeo, dotMat));

  // um leve véu de fundo (esfera quase invisível) pra dar volume ao planeta mesmo nas partes sem ponto
  var veil = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.985, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x0c1018, transparent: true, opacity: 0.55 })
  );
  group.add(veil);

  // ponto de destaque — São Paulo, mesma fórmula lat/lon usada pra filtrar os pontos acima (fica exatamente sobre a "terra")
  var spLat = -23.55, spLon = -46.63;
  var spLatRad = spLat * Math.PI / 180, spLonRad = spLon * Math.PI / 180;
  var markerPos = new THREE.Vector3(
    radius * Math.cos(spLatRad) * Math.cos(spLonRad),
    radius * Math.sin(spLatRad),
    radius * Math.cos(spLatRad) * Math.sin(spLonRad)
  );
  var marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xff8a3d })
  );
  marker.position.copy(markerPos);
  group.add(marker);

  // halo suave em volta do marcador (glow simples, sem pós-processamento)
  var haloMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(), color: 0xff8a3d, transparent: true, opacity: 0.55, depthWrite: false
  });
  var halo = new THREE.Sprite(haloMat);
  halo.scale.set(0.5, 0.5, 1);
  halo.position.copy(markerPos);
  group.add(halo);

  function makeGlowTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  group.rotation.x = 0.15;

  function computeSize() {
    var s = wrap.clientWidth;
    if (!s) return;
    renderer.setSize(s, s, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera); // repinta na hora — não espera o próximo tick do loop
  }
  computeSize();
  window.addEventListener('resize', computeSize);
  // wrap pode medir 0 na primeira leitura (CSS ainda resolvendo layout) — ResizeObserver corrige assim que o tamanho real aparecer
  if ('ResizeObserver' in window) {
    new ResizeObserver(computeSize).observe(wrap);
  }

  var mouseX = 0, mouseY = 0;
  window.addEventListener('pointermove', function (e) {
    mouseX = e.clientX / window.innerWidth - 0.5;
    mouseY = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  // ---- arrasta pra girar — clica e puxa o globo, com uma inércia leve ao soltar ----
  var isDragging = false, lastX = 0, lastY = 0, dragVelY = 0;
  var manualHold = false, resumeTimer = null;
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';
  function dragStart(e) {
    isDragging = true;
    manualHold = true;
    clearTimeout(resumeTimer);
    lastX = e.clientX; lastY = e.clientY;
    dragVelY = 0;
    canvas.style.cursor = 'grabbing';
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function dragMove(e) {
    if (!isDragging) return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    group.rotation.y += dx * 0.008;
    group.rotation.x = Math.max(-1.1, Math.min(1.1, group.rotation.x + dy * 0.008));
    dragVelY = dx * 0.008;
  }
  function dragEnd() {
    if (!isDragging) return;
    isDragging = false;
    canvas.style.cursor = 'grab';
    resumeTimer = setTimeout(function () { manualHold = false; }, 2200);
  }
  canvas.addEventListener('pointerdown', dragStart);
  canvas.addEventListener('pointermove', dragMove);
  canvas.addEventListener('pointerup', dragEnd);
  canvas.addEventListener('pointercancel', dragEnd);
  canvas.addEventListener('pointerleave', function () { if (!isDragging) return; });

  var visible = true;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0.05 });
    io.observe(wrap);
  }

  renderer.render(scene, camera); // primeiro frame já pintado, sem depender do loop rAF

  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    if (isDragging) {
      // rotação já aplicada em dragMove
    } else if (Math.abs(dragVelY) > 0.0002) {
      group.rotation.y += dragVelY;
      dragVelY *= 0.95;
    } else if (!manualHold && !reduceMotion) {
      group.rotation.y += 0.0022;
    }
    if (!isDragging && !manualHold) {
      group.rotation.x += ((0.15 + mouseY * 0.35) - group.rotation.x) * 0.04;
    }
    renderer.render(scene, camera);
  }
  animate();
})();
