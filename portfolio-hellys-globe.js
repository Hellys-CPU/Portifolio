// Globo pontilhado 3D — presença remota (inspirado no weevolveit.com), rodando em Three.js puro, sem build.
// versão .min (670 KB, ~166 KB gzip) baixada só depois do load da página — não disputa banda com fontes/GSAP/imagens
var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

(function () {
  var wrap = document.getElementById('globe-canvas-wrap');
  var canvas = document.getElementById('globe-canvas');
  if (!wrap || !canvas) return;

  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    import(THREE_URL).then(init).catch(function () {
      // sem rede/CDN: a seção fica só com o badge "online · são paulo", sem quebrar nada
    });
  }
  function whenNear() {
    if ('IntersectionObserver' in window) {
      var io0 = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { io0.disconnect(); boot(); }
      }, { rootMargin: '900px 0px' });
      io0.observe(wrap);
    } else {
      boot();
    }
  }
  function afterLoad() {
    if ('requestIdleCallback' in window) requestIdleCallback(whenNear, { timeout: 2500 });
    else setTimeout(whenNear, 300);
  }
  if (document.readyState === 'complete') afterLoad();
  else window.addEventListener('load', afterLoad);

  function init(THREE) {
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

  // ---- máscara de continentes — bitmap real derivado de coordenadas geográficas públicas
  // (Natural Earth / world.geojson), não é mais polígono desenhado à mão — export em preto/branco 720x360 ----
  var MASK_B64 = "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";

  var maskImg = new Image();
  maskImg.onload = function () {
    var mc = document.createElement('canvas');
    mc.width = maskImg.width; mc.height = maskImg.height;
    var mctx = mc.getContext('2d');
    mctx.drawImage(maskImg, 0, 0);
    var mask = mctx.getImageData(0, 0, mc.width, mc.height);
    var maskW = mask.width, maskH = mask.height;
    function isLand(lonDeg, latDeg) {
      var u = Math.floor((lonDeg + 180) / 360 * maskW);
      var v = Math.floor((90 - latDeg) / 180 * maskH);
      u = Math.max(0, Math.min(maskW - 1, u));
      v = Math.max(0, Math.min(maskH - 1, v));
      return mask.data[(v * maskW + u) * 4] > 128;
    }

    startGlobe(isLand);
  };
  maskImg.onerror = function () {
    // se a imagem falhar por algum motivo, cai pra um "sempre true" — globo fica solido, mas nao quebra a pagina
    startGlobe(function () { return true; });
  };
  maskImg.src = "data:image/png;base64," + MASK_B64;

  function startGlobe(isLand) {

  // esfera pontilhada — distribuição de Fibonacci (uniforme), filtrada pra só sobrar terra firme
  var CANDIDATES = 9000;
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
    // -z: visto de fora, o leste tem que ficar à DIREITA (com atan2(z, x) o mapa saía espelhado)
    var lonDeg = Math.atan2(-z, x) * 180 / Math.PI;
    if (isLand(lonDeg, latDeg)) {
      pts.push(x * radius, y * radius, z * radius);
    }
  }
  var targetPositions = new Float32Array(pts);

  // ---- enxame: as bolinhas nascem espalhadas longe do planeta e "assembleam" o globo quando a seção aparece ----
  var startPositions = new Float32Array(targetPositions.length);
  for (var sp = 0; sp < targetPositions.length; sp += 3) {
    var tx = targetPositions[sp], ty = targetPositions[sp + 1], tz = targetPositions[sp + 2];
    var len = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
    var nx = tx / len, ny = ty / len, nz = tz / len;
    var scatterDist = radius * (2.4 + Math.random() * 4.2);
    startPositions[sp]     = nx * scatterDist + (Math.random() - 0.5) * 2.2;
    startPositions[sp + 1] = ny * scatterDist + (Math.random() - 0.5) * 2.2;
    startPositions[sp + 2] = nz * scatterDist + (Math.random() - 0.5) * 2.2;
  }
  var livePositions = new Float32Array(reduceMotion ? targetPositions : startPositions);
  var dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(livePositions, 3));
  var dotMat = new THREE.PointsMaterial({
    color: 0x9fb0c9, size: 0.026, sizeAttenuation: true, transparent: true, opacity: reduceMotion ? 0.85 : 0
  });
  group.add(new THREE.Points(dotGeo, dotMat));

  // um leve véu de fundo (esfera quase invisível) pra dar volume ao planeta mesmo nas partes sem ponto
  var veil = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.985, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x0c1018, transparent: true, opacity: reduceMotion ? 0.55 : 0 })
  );
  group.add(veil);

  // ponto de destaque — centro do ESTADO de São Paulo (a capital fica a poucos km da costa e, com pontos tão espaçados,
  // o marcador parecia flutuar sobre o mar). Mesma fórmula lat/lon usada pra filtrar os pontos acima.
  var spLat = -22.4, spLon = -48.6;
  var spLatRad = spLat * Math.PI / 180, spLonRad = spLon * Math.PI / 180;
  var markerPos = new THREE.Vector3(
    radius * Math.cos(spLatRad) * Math.cos(spLonRad),
    radius * Math.sin(spLatRad),
    -radius * Math.cos(spLatRad) * Math.sin(spLonRad)
  );
  var markerMat = new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: reduceMotion ? 1 : 0 });
  var marker = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), markerMat);
  marker.position.copy(markerPos);
  group.add(marker);

  // halo suave em volta do marcador (glow simples, sem pós-processamento)
  var haloMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(), color: 0xff8a3d, transparent: true, opacity: reduceMotion ? 0.55 : 0, depthWrite: false
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
  group.rotation.y = -(Math.PI / 2 + spLonRad); // já abre com o Brasil de frente pra câmera

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
  var assembleState = reduceMotion ? 'done' : 'pending';
  var assembleStart = null;
  var ASSEMBLE_DUR = 2000;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && assembleState === 'pending') assembleState = 'running';
    }, { threshold: 0.2 });
    io.observe(wrap);
  } else if (assembleState === 'pending') {
    assembleState = 'running';
  }

  renderer.render(scene, camera); // primeiro frame já pintado, sem depender do loop rAF

  function stepAssemble() {
    if (assembleStart === null) assembleStart = performance.now();
    var p = Math.min(1, (performance.now() - assembleStart) / ASSEMBLE_DUR);
    var ease = 1 - Math.pow(1 - p, 3);
    var arr = dotGeo.attributes.position.array;
    for (var m = 0; m < arr.length; m++) {
      arr[m] = startPositions[m] + (targetPositions[m] - startPositions[m]) * ease;
    }
    dotGeo.attributes.position.needsUpdate = true;
    dotMat.opacity = 0.85 * Math.min(1, p * 1.6);
    var lateEase = Math.max(0, (p - 0.45) / 0.55);
    markerMat.opacity = lateEase;
    haloMat.opacity = 0.55 * lateEase;
    veil.material.opacity = 0.55 * ease;
    if (p >= 1) assembleState = 'done';
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    if (assembleState === 'running') stepAssemble();
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
  }
  }
})();
