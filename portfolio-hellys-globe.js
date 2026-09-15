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

  // esfera pontilhada — distribuição de Fibonacci pra ficar uniforme, sem aglomerar nos polos
  var COUNT = 1300;
  var radius = 1.5;
  var positions = new Float32Array(COUNT * 3);
  var goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < COUNT; i++) {
    var t = i / (COUNT - 1);
    var yA = 1 - t * 2;
    var r = Math.sqrt(Math.max(0, 1 - yA * yA));
    var theta = goldenAngle * i;
    positions[i * 3] = Math.cos(theta) * r * radius;
    positions[i * 3 + 1] = yA * radius;
    positions[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  var dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  var dotMat = new THREE.PointsMaterial({
    color: 0x8f9bb3, size: 0.024, sizeAttenuation: true, transparent: true, opacity: 0.8
  });
  group.add(new THREE.Points(dotGeo, dotMat));

  // ponto de destaque — São Paulo
  var lat = -23.55 * Math.PI / 180, lon = -46.63 * Math.PI / 180;
  var markerPos = new THREE.Vector3(
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.sin(lon)
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
    if (!reduceMotion) group.rotation.y += 0.0022;
    group.rotation.x += ((0.15 + mouseY * 0.35) - group.rotation.x) * 0.04;
    renderer.render(scene, camera);
  }
  animate();
})();
