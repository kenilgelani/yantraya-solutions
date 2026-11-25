/* Yantraya Solutions — the service campus, as an isometric 3D world.
   Yantraya sells services, so the world shows them: a landscaped campus with one building per
   service (Academy, Project Lab, SME audit, Workforce training), an entrance gate and a meeting
   plaza. On the home page a shuttle cart drives the tour as you scroll; inner pages park at their
   own building. Textures are drawn in code; rendering is Three.js. */
(function () {
  var canvas = document.querySelector('canvas[data-scene]');
  if (!canvas) return;
  var root = document.documentElement;
  function fail() { root.classList.remove('has-webgl'); root.classList.add('no-webgl'); }
  if (!window.THREE) { fail(); return; }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { fail(); return; }
  root.classList.add('has-webgl');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.innerWidth < 860;
  var stage = canvas.parentElement;
  var journey = document.querySelector('[data-journey]');
  var parked = canvas.hasAttribute('data-station') ? parseFloat(canvas.getAttribute('data-station')) : null;

  var STOPS = 6;
  var NAVY = 0x16245c, NAVYL = 0x3d55b8, ORANGE = 0xf26b1d, STEEL = 0xc3cbdd, STEELD = 0x6c7896,
      WHITE = 0xf7f8fb, SKIN = 0xd9a47c, HAIR = 0x2a1d16, GLASS = 0xa9cdf0, DARK = 0x20263d, BG = 0xeef1f7;
  function C(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
  var seed = 11;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(C(BG), 150, 235);
  var camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 1, 500);

  scene.add(new THREE.HemisphereLight(C(0xdcebff), C(0x9db868), 0.62));
  var sun = new THREE.DirectionalLight(C(0xfff0d6), 1.22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 2048 : 4096, small ? 2048 : 4096);
  sun.shadow.camera.left = -26; sun.shadow.camera.right = 26; sun.shadow.camera.top = 26; sun.shadow.camera.bottom = -26;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);

  // ---------- textures, drawn in code ----------
  function makeTex(size, draw) {
    var c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
  }
  function shade(hex, f) {
    var r = Math.min(255, ((hex >> 16) & 255) * f) | 0, g = Math.min(255, ((hex >> 8) & 255) * f) | 0, b = Math.min(255, (hex & 255) * f) | 0;
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  var TEX = {
    grass: makeTex(256, function (x, s) {
      x.fillStyle = '#7db24a'; x.fillRect(0, 0, s, s);
      for (var i = 0; i < 5200; i++) { x.fillStyle = shade(0x7db24a, 0.78 + rnd() * 0.5); x.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 2.5, 1 + rnd() * 2.5); }
      for (var j = 0; j < 260; j++) { x.fillStyle = 'rgba(214,220,120,' + (0.25 + rnd() * 0.3) + ')'; x.fillRect(rnd() * s, rnd() * s, 2, 2); }
    }),
    stone: makeTex(256, function (x, s) {
      x.fillStyle = '#8f96a3'; x.fillRect(0, 0, s, s);
      var rows = 8, h = s / rows;
      for (var r = 0; r < rows; r++) for (var c = -1; c < 4; c++) {
        var w = s / 4, ox = (r % 2) * w / 2;
        x.fillStyle = shade(0xd9dde4, 0.84 + rnd() * 0.2); x.fillRect(c * w + ox + 2, r * h + 2, w - 4, h - 4);
        x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(c * w + ox + 2, r * h + 2, w - 4, 2);
        x.fillStyle = 'rgba(40,50,80,.12)'; x.fillRect(c * w + ox + 2, r * h + h - 5, w - 4, 3);
      }
      for (var i = 0; i < 900; i++) { x.fillStyle = 'rgba(60,70,90,' + rnd() * 0.08 + ')'; x.fillRect(rnd() * s, rnd() * s, 2, 2); }
    }),
    planks: makeTex(256, function (x, s) {
      var n = 6, w = s / n;
      for (var i = 0; i < n; i++) {
        x.fillStyle = shade(0xc9985f, 0.86 + rnd() * 0.26); x.fillRect(i * w, 0, w, s);
        x.fillStyle = 'rgba(70,40,15,.35)'; x.fillRect(i * w, 0, 2, s);
        for (var g = 0; g < 26; g++) { x.fillStyle = 'rgba(90,55,25,' + (0.05 + rnd() * 0.1) + ')'; x.fillRect(i * w + rnd() * w, rnd() * s, 1, 20 + rnd() * 70); }
        var cut = rnd() * s; x.fillStyle = 'rgba(70,40,15,.35)'; x.fillRect(i * w, cut, w, 2);
      }
    }),
    pave: makeTex(256, function (x, s) {
      x.fillStyle = '#9aa0ab'; x.fillRect(0, 0, s, s);
      var n = 4, w = s / n;
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) { x.fillStyle = shade(0xd3d7de, 0.86 + rnd() * 0.2); x.fillRect(c * w + 2, r * w + 2, w - 4, w - 4); }
      for (var i = 0; i < 1200; i++) { x.fillStyle = 'rgba(50,60,80,' + rnd() * 0.07 + ')'; x.fillRect(rnd() * s, rnd() * s, 2, 2); }
    }),
    tile: makeTex(256, function (x, s) {
      x.fillStyle = '#c3c9d6'; x.fillRect(0, 0, s, s);
      var n = 4, w = s / n;
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) { x.fillStyle = (r + c) % 2 ? '#eef1f6' : '#dde3ee'; x.fillRect(c * w + 1.5, r * w + 1.5, w - 3, w - 3); }
    }),
    concrete: makeTex(256, function (x, s) {
      x.fillStyle = '#cfd4dd'; x.fillRect(0, 0, s, s);
      for (var i = 0; i < 4200; i++) { x.fillStyle = shade(0xcfd4dd, 0.88 + rnd() * 0.22); x.fillRect(rnd() * s, rnd() * s, 2 + rnd() * 3, 2 + rnd() * 3); }
      x.fillStyle = 'rgba(40,50,80,.22)'; x.fillRect(0, 0, s, 2); x.fillRect(0, 0, 2, s);
    }),
    roof: makeTex(256, function (x, s) {
      x.fillStyle = '#16245c'; x.fillRect(0, 0, s, s);
      var rows = 8, h = s / rows;
      for (var r = 0; r < rows; r++) for (var c = -1; c < 8; c++) {
        var w = s / 8, ox = (r % 2) * w / 2;
        x.fillStyle = shade(0x24378a, 0.8 + rnd() * 0.4); x.fillRect(c * w + ox + 1, r * h + 1, w - 2, h - 3);
        x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(c * w + ox + 1, r * h + h - 4, w - 2, 3);
      }
    })
  };
  var tmats = {};
  function tmat(name, rx, ry, o) {
    var k = name + '|' + rx.toFixed(2) + '|' + ry.toFixed(2);
    if (!tmats[k]) {
      var t = TEX[name].clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
      tmats[k] = new THREE.MeshStandardMaterial(Object.assign({ map: t, roughness: 0.9, metalness: 0 }, o || {}));
    }
    return tmats[k];
  }

  // ---------- helpers ----------
  var mats = {};
  function mat(c, o) {
    var k = c + (o ? JSON.stringify(o) : '');
    if (!mats[k]) {
      var m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8, metalness: 0.03, flatShading: true }, o || {}));
      m.color.convertSRGBToLinear(); m.emissive.convertSRGBToLinear();
      mats[k] = m;
    }
    return mats[k];
  }
  var SOFT = { flatShading: false };
  function put(m, p, x, y, z) { m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; }
  function box(p, w, h, d, c, x, y, z, o) { return put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)), p, x, y, z); }
  function tbox(p, w, h, d, tex, rx, ry, x, y, z) { return put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), tmat(tex, rx, ry)), p, x, y, z); }
  function cyl(p, rt, rb, h, c, x, y, z, seg, o) { return put(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 16), mat(c, o)), p, x, y, z); }
  function ball(p, r, c, x, y, z, o) { return put(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(c, o)), p, x, y, z); }
  function grp(p, x, y, z) { var g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); p.add(g); return g; }
  function person(p, c, x, z, s, who, anim) {
    var g = grp(p, x, 0, z); g.scale.setScalar((s || 1) * 1.08);
    cyl(g, 0.085, 0.08, 0.66, DARK, -0.1, 0.33, 0, 8, SOFT); cyl(g, 0.085, 0.08, 0.66, DARK, 0.1, 0.33, 0, 8, SOFT);
    cyl(g, 0.21, 0.17, 0.62, c, 0, 0.96, 0, 12, SOFT); ball(g, 0.21, c, 0, 1.26, 0, SOFT).scale.set(1, 0.45, 1);
    cyl(g, 0.06, 0.055, 0.56, c, -0.27, 0.98, 0, 8, SOFT).rotation.z = -0.13; cyl(g, 0.06, 0.055, 0.56, c, 0.27, 0.98, 0, 8, SOFT).rotation.z = 0.13;
    ball(g, 0.065, SKIN, -0.31, 0.68, 0, SOFT); ball(g, 0.065, SKIN, 0.31, 0.68, 0, SOFT);
    cyl(g, 0.07, 0.07, 0.1, SKIN, 0, 1.36, 0, 8, SOFT);
    ball(g, 0.185, SKIN, 0, 1.55, 0, SOFT);
    ball(g, 0.195, HAIR, 0, 1.6, -0.03, SOFT).scale.set(1, 0.78, 1);
    swapIn(g, 'people/' + (who || CHARS[(charN++) % CHARS.length]) + '.glb', anim === 'Sitting' ? 1.35 : 1.95, anim);
    return g;
  }
  function legs(p, w, d, h, c) {
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) { box(p, 0.12, h, 0.12, c, s[0] * w / 2, h / 2, s[1] * d / 2); });
  }
  function hole(shape, x, y, r) { var q = new THREE.Path(); q.absarc(x, y, r, 0, Math.PI * 2, true); shape.holes.push(q); }
  function gearGeo(teeth, rootR, outer, bore, depth, light, flat) {
    var s = new THREE.Shape(), a = Math.PI * 2 / teeth;
    for (var i = 0; i < teeth; i++) {
      var c = i * a, pts = [[c - 0.25 * a, rootR], [c - 0.15 * a, outer], [c + 0.15 * a, outer], [c + 0.25 * a, rootR]];
      for (var k = 0; k < 4; k++) {
        var x = Math.cos(pts[k][0]) * pts[k][1], y = Math.sin(pts[k][0]) * pts[k][1];
        if (i === 0 && k === 0) s.moveTo(x, y); else s.lineTo(x, y);
      }
    }
    s.closePath(); hole(s, 0, 0, bore);
    if (light) for (var j = 0; j < light.n; j++) { var t = j / light.n * Math.PI * 2 + light.phase; hole(s, Math.cos(t) * light.at, Math.sin(t) * light.at, light.r); }
    var g = new THREE.ExtrudeGeometry(s, { depth: depth, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 20 });
    if (!flat) g.translate(0, 0, -depth / 2);
    return g;
  }
  function gear(p, geo, c, x, y, z, lying, o) {
    var m = put(new THREE.Mesh(geo, mat(c, Object.assign({ metalness: 0.35, roughness: 0.45 }, o || {}))), p, x, y, z);
    if (lying) m.rotation.x = -Math.PI / 2;
    return m;
  }
  var inkLine = new THREE.LineBasicMaterial({ color: C(NAVY), transparent: true, opacity: 0.6 });
  function ring(p, r, x, y, z) {
    var pts = [];
    for (var i = 0; i <= 64; i++) { var t = i / 64 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, 0)); }
    var l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), inkLine); l.position.set(x || 0, y || 0, z || 0); p.add(l); return l;
  }
  function seg(p, x1, y1, x2, y2, z) {
    var l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1, y1, z || 0), new THREE.Vector3(x2, y2, z || 0)]), inkLine); p.add(l); return l;
  }
  function tex(c) { var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
  var labels = [];
  var DISPLAY = '600 46px "Saira Semi Condensed", "Arial Narrow", Arial, sans-serif';
  function label(p, text, x, y, z, stop, href) {
    var c = document.createElement('canvas'), ctx = c.getContext('2d');
    ctx.font = DISPLAY; var w = Math.ceil(ctx.measureText(text).width) + 96; c.width = w; c.height = 88;
    ctx.fillStyle = '#16245c'; ctx.fillRect(0, 0, w, 88);
    ctx.fillStyle = '#f26b1d'; ctx.fillRect(0, 0, 14, 88);
    ctx.font = DISPLAY; ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(text, 44, 46);
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), transparent: true, fog: false }));
    s.userData.stop = stop; s.userData.href = href; labels.push(s);
    s.scale.set(w / 88 * 1.05, 1.05, 1); s.position.set(x, y, z); p.add(s);
    box(p, 0.07, 1.0, 0.07, NAVY, x, y - 1.0, z);
    return s;
  }

  // ---------- ready-made 3D models (Kenney, CC0) ----------
  // Each one is dropped into a holder; whatever code-built stand-in is passed as `hide` disappears once it loads.
  var gl = THREE.GLTFLoader ? new THREE.GLTFLoader() : null, cache = {}, mixers = [], lit = {};
  function fetchModel(path) {
    if (!cache[path]) cache[path] = new Promise(function (res) { gl.load('models/' + path, res, undefined, function () { res(null); }); });
    return cache[path];
  }
  function model(path, parent, x, y, z, o) {
    o = o || {};
    var holder = grp(parent, x, y, z); if (o.ry) holder.rotation.y = o.ry;
    if (!gl) return holder;
    fetchModel(path).then(function (g) {
      if (!g) return;
      var rigged = g.animations && g.animations.length && THREE.SkeletonUtils;
      var obj = rigged ? THREE.SkeletonUtils.clone(g.scene) : g.scene.clone(true);
      obj.traverse(function (m) {
        if (!m.isMesh) return;
        m.castShadow = true; m.receiveShadow = true; if (m.isSkinnedMesh) m.frustumCulled = false;
        var src = m.material;
        if (src && src.isMeshBasicMaterial) {      // these packs ship unlit; give them real light and shadow
          if (!lit[src.uuid]) lit[src.uuid] = new THREE.MeshStandardMaterial({ color: TINT[src.name] ? C(TINT[src.name]) : src.color, map: src.map, roughness: 0.85, metalness: 0, flatShading: true, vertexColors: src.vertexColors });
          m.material = lit[src.uuid];
          if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals();
        } else if (src && src.isMeshStandardMaterial) {
          src.metalness = 0; src.roughness = Math.max(src.roughness, 0.7);
          if (TINT[src.name] && !src.userData.tinted) { src.color.copy(C(TINT[src.name])); src.userData.tinted = true; }
        }
      });
      var mxr = null;
      if (rigged) {      // pose first, so the figure is measured as it will actually stand or sit
        var want = new RegExp('(^|[|_])' + (o.anim || 'Idle') + '$', 'i'), clip = null;
        for (var ai = 0; ai < g.animations.length; ai++) if (want.test(g.animations[ai].name)) { clip = g.animations[ai]; break; }
        if (clip) { mxr = new THREE.AnimationMixer(obj); mxr.clipAction(clip).play(); mxr.update(0.01 + rnd() * 2); }
      }
      function measure() {
        var b = new THREE.Box3(), v = new THREE.Vector3(), bones = 0;
        obj.updateMatrixWorld(true);
        obj.traverse(function (n) { if (n.isBone) { b.expandByPoint(n.getWorldPosition(v)); bones++; } });
        if (bones < 4) b.setFromObject(obj);
        return { box: b, rigged: bones >= 4 };
      }
      var m0 = measure(), sz = m0.box.getSize(new THREE.Vector3());
      var k = o.h ? o.h / (sz.y * (m0.rigged ? (o.sit ? 1.5 : 1.1) : 1)) : o.w ? o.w / Math.max(sz.x, sz.z) : 1;
      obj.scale.multiplyScalar(k);
      var m1 = measure(), c = m1.box.getCenter(new THREE.Vector3());
      obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= m1.box.min.y;
      holder.add(obj);
      if (o.hide) o.hide.forEach(function (h) { h.visible = false; });
      if (mxr) mixers.push(mxr);
      kick();
    });
    return holder;
  }
  function swapIn(g, path, h, anim) { var olds = g.children.slice(); if (gl) model(path, g, 0, 0, 0, { h: h, hide: olds, anim: anim, sit: anim === 'Sitting' }); }
  // the nature pack is teal by design; use the campus greens and browns instead
  var TINT = { leafsGreen: 0x62ad3c, leafsDark: 0x3c8a3a, plant: 0x4fa646, woodBark: 0x8a5a36, woodBarkDark: 0x6f4a2d };
  var CHARS = ['man-suit', 'woman-casual', 'worker', 'woman-a', 'man', 'business-man'], charN = 0;
  var TREES = ['tree_default', 'tree_oak', 'tree_detailed', 'tree_fat', 'tree_tall', 'tree_simple'], PINES = ['tree_pineRoundA', 'tree_pineRoundC', 'tree_pineTallA', 'tree_pineDefaultA'];

  // ---------- the land ----------
  var world = new THREE.Group(); scene.add(world);
  var PL = [[0, 25.5], [-10.5, 12], [10.5, 2], [-10.5, -10], [10.5, -20], [-7, -40]], POND = [5.5, -47];
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(340, 340), tmat('grass', 70, 70));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);

  // the road the shuttle follows
  var curve = new THREE.CatmullRomCurve3([[0.6, 60], [0.2, 40], [0, 25.5], [0.9, 13], [-0.9, 3], [0.9, -9], [-0.9, -19], [-2.6, -28], [-5.2, -33.6]].map(function (q) { return new THREE.Vector3(q[0], 0, q[1]); }));
  function ribbon(width, y, texName, rep) {
    var N = 220, pos = [], uv = [], idx = [], len = curve.getLength();
    for (var i = 0; i <= N; i++) {
      var u = i / N, pt = curve.getPointAt(u), tg = curve.getTangentAt(u), nx = -tg.z, nz = tg.x;
      pos.push(pt.x + nx * width / 2, y, pt.z + nz * width / 2, pt.x - nx * width / 2, y, pt.z - nz * width / 2);
      uv.push(0, u * len / rep, width / rep, u * len / rep);
      if (i < N) { var a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    var m = new THREE.Mesh(geo, texName ? tmat(texName, 1, 1) : mat(0x8d94a1)); m.receiveShadow = true; world.add(m); return m;
  }
  ribbon(3.6, 0.02, null, 1); ribbon(3.0, 0.035, 'pave', 3.0);

  // plants and rocks
  function jitter(geo, amt) {
    var p = geo.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      var h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; h = h - Math.floor(h);
      var f = 1 + (h - 0.5) * amt; p.setXYZ(i, x * f, y * f, z * f);
    }
    geo.computeVertexNormals(); return geo;
  }
  var blobGeo = jitter(new THREE.IcosahedronGeometry(1, 1), 0.34), rockGeo = jitter(new THREE.DodecahedronGeometry(1, 0), 0.4);
  var coneGeo = new THREE.ConeGeometry(1, 1, 7), trunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 1, 7);
  var GREENS = [0x5aa33a, 0x6fb844, 0x4c9133, 0x7fc24e], leaf = GREENS.map(function (g) { return mat(g); }), bark = mat(0x7a5234);
  function tree(x, z, s) {
    var g = grp(world, x, 0, z); g.scale.setScalar(s);
    var t = put(new THREE.Mesh(trunkGeo, bark), g, 0, 1.0, 0); t.scale.y = 2.0;
    var n = 3 + (rnd() * 2 | 0);
    for (var i = 0; i < n; i++) {
      var r = 0.95 + rnd() * 0.55, b = put(new THREE.Mesh(blobGeo, leaf[(rnd() * 4) | 0]), g, (rnd() - 0.5) * 1.5, 2.5 + rnd() * 1.1, (rnd() - 0.5) * 1.5);
      b.scale.set(r, r * 0.86, r); b.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    }
    g.rotation.y = rnd() * 6; swapIn(g, 'nature/' + TREES[(rnd() * TREES.length) | 0] + '.glb', 5.4);
  }
  function pine(x, z, s) {
    var g = grp(world, x, 0, z); g.scale.setScalar(s);
    put(new THREE.Mesh(trunkGeo, bark), g, 0, 0.5, 0);
    [[1.25, 1.7, 1.5], [1.0, 1.5, 2.5], [0.72, 1.3, 3.4]].forEach(function (c) { var m = put(new THREE.Mesh(coneGeo, mat(0x2f7a48)), g, 0, c[2], 0); m.scale.set(c[0], c[1], c[0]); });
    g.rotation.y = rnd() * 6; swapIn(g, 'nature/' + PINES[(rnd() * PINES.length) | 0] + '.glb', 5.6);
  }
  function clear(x, z, margin) {   // true when a spot is free of road, buildings and the views into them
    if (Math.abs(x) < 3.2 + margin && z > -22 && z < 62) return false;
    if (x > -9 - margin && x < 3 + margin && z > -36 && z <= -22) return false;
    for (var i = 1; i <= 4; i++) {
      var dx = x - PL[i][0], dz = z - PL[i][1];
      if (margin > 1 ? (dx > -9 && dx < 16 && dz > -8 && dz < 16) : (dx > -7.4 && dx < 7.4 && dz > -6.4 && dz < 5)) return false;
    }
    if (margin > 1 && x > -11 && x < 18 && z > 17 && z < 48) return false;
    var px = x - PL[5][0], pz = z - PL[5][1]; if (px * px + pz * pz < 60) return false;
    if (margin > 1 && px > -9 && px < 17 && pz > -9 && pz < 17) return false;
    var qx = x - POND[0], qz = z - POND[1]; if (qx * qx + qz * qz < 46) return false;
    return true;
  }
  for (var ti = 0; ti < 190; ti++) {
    var txx = (rnd() - 0.5) * 110, tzz = -70 + rnd() * 130;
    if (!clear(txx, tzz, 2)) continue;
    if (rnd() < 0.24) pine(txx, tzz, 0.9 + rnd() * 0.6); else tree(txx, tzz, 0.85 + rnd() * 0.55);
  }
  for (var bi = 0; bi < 150; bi++) {
    var bx = (rnd() - 0.5) * 100, bz = -66 + rnd() * 124;
    if (!clear(bx, bz, 0.4)) continue;
    if (rnd() < 0.55) { var bs = 0.4 + rnd() * 0.5, bu = put(new THREE.Mesh(blobGeo, leaf[(rnd() * 4) | 0]), world, bx, bs * 0.55, bz); bu.scale.set(bs, bs * 0.75, bs); }
    else { var rs = 0.25 + rnd() * 0.45, ro = put(new THREE.Mesh(rockGeo, mat(0xa9afba)), world, bx, rs * 0.4, bz); ro.scale.set(rs, rs * 0.62, rs); ro.rotation.y = rnd() * 6; }
  }
  [0xffffff, 0xffd84d, 0xff8fb0].forEach(function (col) {
    var n = 170, im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 5), mat(col, SOFT), n), d = new THREE.Object3D(), k = 0;
    while (k < n) { var fx = (rnd() - 0.5) * 96, fz = -62 + rnd() * 118; if (!clear(fx, fz, 0.2)) continue; d.position.set(fx, 0.1, fz); d.updateMatrix(); im.setMatrixAt(k++, d.matrix); }
    world.add(im);
  });
  // pond beside the plaza
  var pond = new THREE.Mesh(new THREE.CircleGeometry(4.6, 40), new THREE.MeshStandardMaterial({ color: C(0x74c1ea), roughness: 0.15, metalness: 0.1 }));
  pond.rotation.x = -Math.PI / 2; pond.position.set(POND[0], 0.04, POND[1]); pond.scale.set(1.25, 0.9, 1); pond.receiveShadow = true; world.add(pond);
  for (var pr = 0; pr < 16; pr++) { var pa = pr / 16 * Math.PI * 2 + rnd() * 0.2, prs = 0.3 + rnd() * 0.35, rk = put(new THREE.Mesh(rockGeo, mat(0xb4bac4)), world, POND[0] + Math.cos(pa) * 5.9, 0.15, POND[1] + Math.sin(pa) * 4.3); rk.scale.set(prs, prs * 0.6, prs); }

  // ---------- buildings ----------
  var st = [];
  for (var si = 0; si < STOPS; si++) st.push(grp(world, PL[si][0], 0, PL[si][1]));
  function building(g, floorTex) {
    var W = 13, D = 9.8, cz = -0.6, H = 4.3, F = 0.3;
    tbox(g, W + 0.5, 0.24, D + 0.5, 'concrete', 4, 3, 0, 0.12, cz);
    tbox(g, W, 0.08, D, floorTex, W / 3.2, D / 3.2, 0, F - 0.04, cz);
    tbox(g, W, H, 0.45, 'stone', W / 3.4, H / 3.4, 0, F + H / 2, cz - D / 2 + 0.22);
    tbox(g, 0.45, H, D, 'stone', D / 3.4, H / 3.4, -W / 2 + 0.22, F + H / 2, cz);
    box(g, W + 0.2, 0.22, 0.7, WHITE, 0, F + H + 0.11, cz - D / 2 + 0.22); box(g, 0.7, 0.22, D + 0.2, WHITE, -W / 2 + 0.22, F + H + 0.11, cz);
    box(g, W, 0.42, 0.52, NAVY, 0, F + 0.21, cz - D / 2 + 0.24); box(g, 0.52, 0.42, D, NAVY, -W / 2 + 0.24, F + 0.21, cz);
    tbox(g, 0.8, H + 0.5, 0.8, 'stone', 0.4, 1.4, -W / 2 + 0.3, F + (H + 0.5) / 2, cz - D / 2 + 0.3);
    [-3.6, 0.2, 4.0].forEach(function (x) {
      box(g, 2.3, 1.5, 0.1, WHITE, x, F + 2.55, cz - D / 2 + 0.47);
      box(g, 2.0, 1.2, 0.1, GLASS, x, F + 2.55, cz - D / 2 + 0.5, { roughness: 0.15, metalness: 0.2, flatShading: false });
      box(g, 0.08, 1.2, 0.12, WHITE, x, F + 2.55, cz - D / 2 + 0.52);
    });
    [-2.6, 1.6].forEach(function (z) {
      box(g, 0.1, 1.5, 2.3, WHITE, -W / 2 + 0.47, F + 2.55, cz + z);
      box(g, 0.1, 1.2, 2.0, GLASS, -W / 2 + 0.5, F + 2.55, cz + z, { roughness: 0.15, metalness: 0.2, flatShading: false });
    });
    var roof = tbox(g, W + 0.8, 0.2, 3.0, 'roof', 5, 1.5, 0, F + H + 0.75, cz - D / 2 + 1.2); roof.rotation.x = 0.3;
    box(g, W + 0.8, 0.14, 0.2, ORANGE, 0, F + H + 0.34, cz - D / 2 + 2.62);
    return grp(g, 0, F, 0);
  }

  // ---------- stop 0: the entrance ----------
  var signMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  (function (g) {
    [-3.6, 3.6].forEach(function (x) { tbox(g, 1.1, 5.4, 1.1, 'stone', 0.5, 1.7, x, 2.7, 0); box(g, 1.4, 0.24, 1.4, WHITE, x, 5.52, 0); });
    box(g, 9.4, 1.9, 0.5, NAVY, 0, 4.9, 0.82); box(g, 9.44, 0.16, 0.56, ORANGE, 0, 3.9, 0.82);
    var sign = new THREE.Mesh(new THREE.PlaneGeometry(7.9, 1.3), signMat); sign.position.set(0, 4.92, 1.08); g.add(sign);
    [-1, 1].forEach(function (sd) {
      tbox(g, 8, 1.2, 0.6, 'stone', 2.4, 0.4, sd * 8.1, 0.6, 0); box(g, 8.1, 0.16, 0.8, WHITE, sd * 8.1, 1.28, 0);
      for (var i = 0; i < 6; i++) { var hb = put(new THREE.Mesh(blobGeo, leaf[i % 4]), g, sd * (5.0 + i * 1.3), 1.0, -1.0); hb.scale.set(0.85, 0.8, 0.75); hb.rotation.y = i; }
      cyl(g, 0.07, 0.09, 3.2, DARK, sd * 4.9, 1.6, 2.2, 8); ball(g, 0.24, 0xfff2c4, sd * 4.9, 3.3, 2.2, { emissive: 0xffd77a, emissiveIntensity: 0.8, flatShading: false });
      tbox(g, 3.4, 0.4, 1.3, 'planks', 1.2, 0.4, sd * 7.6, 0.2, 2.4);
      [0xffffff, 0xffd84d, 0xff8fb0, 0xffffff, 0xff8fb0].forEach(function (c, i) { ball(g, 0.16, c, sd * (6.3 + i * 0.65), 0.52, 2.4 + (i % 2) * 0.3 - 0.15, SOFT); });
      for (var b = 0; b < 4; b++) { var fb = put(new THREE.Mesh(blobGeo, leaf[(b + 1) % 4]), g, sd * (6.4 + b * 0.8), 0.42, 2.4); fb.scale.setScalar(0.3); }
    });
    person(g, ORANGE, -2.0, 3.4); person(g, NAVY, -2.9, 3.9, 0.96); person(g, NAVYL, 6.2, 4.6, 0.96);
  })(st[0]);

  // ---------- stop 1: Academy — CAD desk, projected model, drafting board ----------
  var holo = (function (g) {
    tbox(g, 4.4, 0.14, 2.0, 'planks', 1.6, 0.8, 0.4, 1.45, 0); legs(grp(g, 0.4, 0, 0), 4.1, 1.7, 1.4, STEELD);
    box(g, 0.6, 0.06, 0.4, NAVY, 1.1, 1.55, -0.45); box(g, 0.1, 0.5, 0.1, NAVY, 1.1, 1.8, -0.5);
    box(g, 2.1, 1.25, 0.1, NAVY, 1.1, 2.65, -0.5);
    box(g, 1.9, 1.05, 0.02, 0xdbe6ff, 1.1, 2.65, -0.44, { emissive: 0x8fa8e8, emissiveIntensity: 0.5 }).castShadow = false;
    gear(g, gearGeo(10, 0.27, 0.38, 0.1, 0.03), ORANGE, 1.1, 2.65, -0.41);
    box(g, 1.0, 0.05, 0.36, STEELD, 1.1, 1.55, 0.4); box(g, 0.2, 0.05, 0.3, STEELD, 1.9, 1.55, 0.4);
    cyl(g, 0.5, 0.62, 0.14, NAVY, -0.9, 1.59, 0, 20);
    var beam = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.35, 1.5, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: C(ORANGE), transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.set(-0.9, 2.4, 0); g.add(beam);
    var h = grp(g, -0.9, 3.45, 0);
    h.add(new THREE.LineSegments(new THREE.EdgesGeometry(gearGeo(14, 0.82, 1.08, 0.26, 0.5), 20), new THREE.LineBasicMaterial({ color: C(ORANGE) })));
    var b = grp(g, -4.0, 0, -1.4); b.rotation.y = 0.5;
    box(b, 0.12, 2.1, 0.12, STEELD, -0.9, 1.05, 0.2); box(b, 0.12, 2.1, 0.12, STEELD, 0.9, 1.05, 0.2);
    var sheet = grp(b, 0, 2.5, 0); sheet.rotation.x = -0.32;
    box(sheet, 2.6, 1.8, 0.08, WHITE); ring(sheet, 0.55, -0.4, 0, 0.06); ring(sheet, 0.25, -0.4, 0, 0.06);
    seg(sheet, -1.1, 0, 0.3, 0, 0.06); seg(sheet, -0.4, -0.7, -0.4, 0.7, 0.06); seg(sheet, 0.55, 0.5, 1.1, 0.5, 0.06); seg(sheet, 0.55, 0.2, 1.1, 0.2, 0.06); seg(sheet, 0.55, -0.1, 0.95, -0.1, 0.06);
    tbox(g, 1.7, 2.7, 0.55, 'planks', 0.6, 1, 3.9, 1.35, -4.0);
    [0.55, 1.25, 1.95].forEach(function (y, i) {
      box(g, 1.5, 0.06, 0.5, WHITE, 3.9, y, -3.95);
      [ORANGE, STEEL, NAVYL, WHITE, ORANGE].forEach(function (c, j) { box(g, 0.16, 0.42, 0.34, c, 3.35 + ((j + i) % 5) * 0.24, y + 0.24, -3.72); });
    });
    person(g, NAVY, 1.1, 1.5); person(g, ORANGE, -0.5, 1.7, 0.94); person(g, NAVYL, -2.9, 0.4, 1.02);
    model('furniture/chairDesk.glb', g, 2.6, 0, 1.0, { h: 1.25, ry: Math.PI }); model('furniture/pottedPlant.glb', g, 5.2, 0, 2.6, { h: 1.6 });
    model('furniture/lampRoundFloor.glb', g, -5.3, 0, 2.8, { h: 2.3 }); model('furniture/bookcaseClosedWide.glb', g, 0.6, 0, -4.15, { h: 1.5 });
    model('furniture/desk.glb', g, 4.4, 0, 0.2, { h: 1.05, ry: -Math.PI / 2 }); model('furniture/laptop.glb', g, 4.4, 1.05, 0.2, { w: 0.6, ry: -Math.PI / 2 });
    return h;
  })(building(st[1], 'planks'));

  // ---------- stop 2: Project Lab — 3D printer, robot arm, parts bench ----------
  var lab = (function (g) {
    var px = -1.3, bed = 0.5, H = 1.0;
    box(g, 3.3, 0.35, 3.3, NAVY, px, 0.175, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) { box(g, 0.14, 3.2, 0.14, STEEL, px + s[0] * 1.5, 1.95, s[1] * 1.5, { metalness: 0.5, roughness: 0.35 }); });
    box(g, 3.14, 0.14, 0.14, STEEL, px, 3.55, -1.5); box(g, 3.14, 0.14, 0.14, STEEL, px, 3.55, 1.5);
    box(g, 0.14, 0.14, 3.14, STEEL, px - 1.5, 3.55, 0); box(g, 0.14, 0.14, 3.14, STEEL, px + 1.5, 3.55, 0);
    box(g, 2.5, 0.1, 2.5, WHITE, px, 0.45, 0);
    var part = gear(g, gearGeo(14, 0.78, 1.04, 0.24, H, null, true), ORANGE, px, bed, 0, true);
    var gantry = grp(g, px, 1, 0); box(gantry, 2.9, 0.12, 0.14, STEELD);
    var head = grp(gantry); box(head, 0.34, 0.36, 0.34, NAVY, 0, 0, 0); cyl(head, 0.09, 0.02, 0.22, ORANGE, 0, -0.28, 0, 8);
    var spool = cyl(g, 0.5, 0.5, 0.22, ORANGE, px + 1.72, 2.9, 0, 18); spool.rotation.z = Math.PI / 2;

    var arm = grp(g, 2.7, 0, 0.5);
    cyl(arm, 0.6, 0.75, 0.4, NAVY, 0, 0.2, 0, 20, SOFT);
    var turret = grp(arm, 0, 0.4, 0); cyl(turret, 0.42, 0.42, 0.5, STEELD, 0, 0.25, 0, 18, SOFT);
    var sh = grp(turret, 0, 0.6, 0); ball(sh, 0.3, STEELD, 0, 0, 0, SOFT); box(sh, 0.32, 2.0, 0.32, ORANGE, 0, 1.0, 0);
    var el = grp(sh, 0, 2.0, 0); ball(el, 0.26, STEELD, 0, 0, 0, SOFT); box(el, 0.26, 1.6, 0.26, WHITE, 0, 0.8, 0);
    var wr = grp(el, 0, 1.6, 0); box(wr, 0.5, 0.12, 0.2, STEELD, 0, 0.06, 0);
    box(wr, 0.08, 0.36, 0.2, STEELD, -0.21, 0.28, 0); box(wr, 0.08, 0.36, 0.2, STEELD, 0.21, 0.28, 0);

    tbox(g, 2.8, 0.12, 1.2, 'planks', 1, 0.5, 2.6, 1.2, -3.6); legs(grp(g, 2.6, 0, -3.6), 2.6, 1.0, 1.15, STEELD);
    gear(g, gearGeo(12, 0.3, 0.42, 0.1, 0.14, null, true), STEEL, 2.0, 1.26, -3.6, true);
    cyl(g, 0.16, 0.16, 0.14, STEELD, 2.8, 1.33, -3.4, 6); cyl(g, 0.16, 0.16, 0.14, STEELD, 3.2, 1.33, -3.7, 6);
    box(g, 0.34, 0.34, 0.34, ORANGE, 3.6, 1.43, -3.5);
    person(g, NAVY, 0.9, 2.2); person(g, NAVYL, -3.6, 1.4, 0.95);
    model('factory/machine.glb', g, -4.9, 0, -3.3, { h: 2.7 }); model('factory/box-large.glb', g, 5.0, 0, 2.6, { w: 1.2 }); model('factory/box-small.glb', g, 4.2, 0, 3.4, { w: 0.8 });
    return function (q, t) {
      part.scale.z = Math.max(0.02, q);
      gantry.position.y = bed + H * q + 0.42;
      head.position.x = q < 0.995 ? Math.sin(t * 3.1) * 0.95 : 0;
      gantry.position.z = q < 0.995 ? Math.sin(t * 1.3) * 0.8 : 0;
      spool.rotation.x = t * 1.5;
      turret.rotation.y = -0.9 + Math.sin(t * 0.5) * 0.5;
      sh.rotation.z = -0.5 + Math.sin(t * 0.8) * 0.22;
      el.rotation.z = -1.1 + Math.sin(t * 0.8 + 1) * 0.3;
    };
  })(building(st[2], 'concrete'));

  // ---------- stop 3: SME audit — surface plate, measuring bridge, checklist, records ----------
  var audit = (function (g) {
    var top = 1.5;
    legs(grp(g, 0.3, 0, 0), 3.2, 2.0, 1.05, STEELD);
    box(g, 3.7, 0.45, 2.5, 0x2b3350, 0.3, 1.275, 0, { roughness: 0.3, metalness: 0.2, flatShading: false });
    gear(g, gearGeo(16, 0.82, 1.06, 0.26, 0.3, { n: 4, at: 0.55, r: 0.14, phase: 0 }, true), STEEL, 0.3, top, 0, true, { metalness: 0.7, roughness: 0.3 });
    var bridge = grp(g, 0.3, top, 0);
    box(bridge, 0.24, 2.3, 0.3, WHITE, -1.65, 1.15, 0); box(bridge, 0.24, 2.3, 0.3, WHITE, 1.65, 1.15, 0);
    box(bridge, 3.54, 0.32, 0.34, WHITE, 0, 2.3, 0);
    var car = grp(bridge, 0, 2.3, 0.05); box(car, 0.5, 0.56, 0.5, NAVY);
    var quill = grp(car); box(quill, 0.1, 1.5, 0.1, STEEL, 0, -0.75, 0); ball(quill, 0.09, ORANGE, 0, -1.55, 0);

    var b = grp(g, -4.1, 0, -1.9); b.rotation.y = 0.45;
    box(b, 0.12, 1.0, 0.12, STEELD, -0.9, 0.5, 0); box(b, 0.12, 1.0, 0.12, STEELD, 0.9, 0.5, 0);
    box(b, 2.4, 3.3, 0.1, WHITE, 0, 2.55, 0); box(b, 2.4, 0.42, 0.14, NAVY, 0, 4.0, 0);
    var ticks = [];
    for (var i = 0; i < 5; i++) {
      var y = 3.45 - i * 0.52;
      box(b, 1.35, 0.09, 0.03, STEELD, 0.3, y, 0.07).castShadow = false;
      var tk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05), new THREE.MeshStandardMaterial({ color: C(STEEL), flatShading: true }));
      tk.position.set(-0.8, y, 0.08); b.add(tk); ticks.push(tk);
    }
    box(g, 1.4, 2.5, 1.0, STEEL, 4.0, 1.25, -3.8, { metalness: 0.4, roughness: 0.4 });
    for (var d = 0; d < 4; d++) { box(g, 1.2, 0.5, 0.05, WHITE, 4.0, 0.36 + d * 0.6, -3.28); box(g, 0.4, 0.07, 0.07, ORANGE, 4.0, 0.42 + d * 0.6, -3.23); }
    person(g, ORANGE, -2.3, 1.3); person(g, NAVY, 2.6, 2.0, 0.95);
    model('furniture/desk.glb', g, 4.6, 0, 1.0, { h: 1.05, ry: -Math.PI / 2 }); model('furniture/laptop.glb', g, 4.6, 1.05, 1.0, { w: 0.6, ry: -Math.PI / 2 });
    model('furniture/chairDesk.glb', g, 3.6, 0, 1.0, { h: 1.25, ry: Math.PI / 2 }); model('furniture/pottedPlant.glb', g, -5.3, 0, 3.0, { h: 1.6 });
    var on = C(ORANGE), off = C(STEEL);
    return function (q, t) {
      bridge.position.z = Math.sin(t * 0.5) * 0.7;
      car.position.x = Math.sin(t * 0.85) * 0.95;
      quill.position.y = 0.42 - Math.abs(Math.sin(t * 1.7)) * 0.4;
      for (var i = 0; i < 5; i++) {
        var done = q > (i + 0.6) / 5.6;
        ticks[i].material.color.copy(done ? on : off);
        ticks[i].scale.setScalar(done ? 1.25 : 1);
      }
    };
  })(building(st[3], 'tile'));

  // ---------- stop 4: Workforce — CNC machine and a training group ----------
  var crew = (function (g) {
    var m = grp(g, 1.9, 0, -2.6);
    box(m, 4.6, 0.5, 2.7, NAVY, 0, 0.25, 0); box(m, 4.6, 2.7, 2.7, WHITE, 0, 1.85, 0, SOFT); box(m, 4.64, 0.2, 2.74, ORANGE, 0, 0.62, 0);
    box(m, 2.3, 1.35, 0.06, 0x22305f, -0.6, 2.05, 1.36, { roughness: 0.12, metalness: 0.5, flatShading: false });
    box(m, 0.08, 0.95, 0.08, STEELD, 0.72, 2.05, 1.42);
    box(m, 0.95, 1.3, 0.24, NAVY, 1.72, 2.1, 1.5); box(m, 0.66, 0.44, 0.03, 0xdbe6ff, 1.72, 2.38, 1.64, { emissive: 0x8fa8e8, emissiveIntensity: 0.5 });
    cyl(m, 0.07, 0.07, 0.05, ORANGE, 1.5, 1.85, 1.64, 8).rotation.x = Math.PI / 2;
    cyl(m, 0.07, 0.07, 0.05, WHITE, 1.72, 1.85, 1.64, 8).rotation.x = Math.PI / 2;
    cyl(m, 0.07, 0.07, 0.05, STEEL, 1.94, 1.85, 1.64, 8).rotation.x = Math.PI / 2;
    var beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 10), new THREE.MeshStandardMaterial({ color: C(ORANGE), emissive: C(ORANGE), emissiveIntensity: 0.2 }));
    beacon.position.set(-1.8, 3.45, 0); m.add(beacon);

    var b = grp(g, -3.6, 0, -1.6); b.rotation.y = 0.5;
    box(b, 0.12, 1.5, 0.12, STEELD, -1.0, 0.75, 0); box(b, 0.12, 1.5, 0.12, STEELD, 1.0, 0.75, 0);
    box(b, 2.8, 1.8, 0.08, WHITE, 0, 2.35, 0); box(b, 2.9, 0.1, 0.12, NAVY, 0, 3.28, 0); box(b, 2.9, 0.1, 0.12, NAVY, 0, 1.42, 0);
    ring(b, 0.45, -0.7, 2.4, 0.06); ring(b, 0.18, -0.7, 2.4, 0.06);
    seg(b, 0.2, 2.8, 1.1, 2.8, 0.06); seg(b, 0.2, 2.5, 1.1, 2.5, 0.06); seg(b, 0.2, 2.2, 0.8, 2.2, 0.06); seg(b, 0.2, 1.9, 1.0, 1.9, 0.06);
    var trainer = person(g, ORANGE, -2.0, -0.4, 1.04);
    var team = [[-4.3, 1.7, NAVY], [-3.2, 2.3, NAVYL], [-2.0, 2.5, NAVY], [-0.9, 2.2, STEELD], [0.1, 1.6, NAVYL]].map(function (p) { return person(g, p[2], p[0], p[1], 0.96); });
    model('factory/robot-arm-a.glb', g, 5.0, 0, 1.6, { h: 3.0 }); model('factory/box-large.glb', g, 5.0, 0, 3.4, { w: 1.2 }); model('factory/box-small.glb', g, -5.4, 0, 3.2, { w: 0.8 });
    return function (t) {
      beacon.material.emissiveIntensity = 0.25 + Math.max(0, Math.sin(t * 4)) * 1.4;
      trainer.rotation.y = Math.sin(t * 0.9) * 0.35;
      for (var i = 0; i < team.length; i++) team[i].rotation.y = Math.PI + Math.sin(t * 0.7 + i) * 0.15;
    };
  })(building(st[4], 'concrete'));

  // ---------- stop 5: the plaza — people meeting round a table ----------
  var meet = (function (g) {
    var disc = put(new THREE.Mesh(new THREE.CylinderGeometry(7, 7.2, 0.16, 56), tmat('pave', 5, 5)), g, 0, 0.08, 0);
    disc.castShadow = false;
    tbox(g, 9.4, 2.4, 0.6, 'stone', 2.8, 0.75, 0, 1.2, -5.2); box(g, 9.6, 0.2, 0.8, WHITE, 0, 2.5, -5.2);
    var sign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.38), signMat); sign.position.set(0, 1.35, -4.88); g.add(sign);
    var top = put(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.14, 36), tmat('planks', 1.4, 1.4)), g, 0, 1.25, 0.4);
    cyl(g, 0.22, 0.55, 1.1, STEELD, 0, 0.7, 0.4, 14, SOFT);
    box(g, 0.7, 0.03, 0.5, WHITE, -0.5, 1.34, 0.3); box(g, 0.6, 0.03, 0.45, WHITE, 0.6, 1.34, 0.7); box(g, 0.34, 0.02, 0.24, NAVY, 0.1, 1.34, -0.2);
    var emblem = gear(g, gearGeo(14, 0.34, 0.46, 0.1, 0.1), ORANGE, 0, 1.95, 0.4);
    var seats = [[-2.4, 0.5, ORANGE, 1.57], [2.4, 0.3, NAVY, -1.57], [-1.2, 2.7, NAVYL, 2.7], [1.3, 2.7, STEELD, -2.7], [0, -1.9, NAVY, 0]];
    var people = seats.map(function (q) { var p = person(g, q[2], q[0], q[1], 0.98); p.rotation.y = q[3]; return p; });
    [-1, 1].forEach(function (sd) {
      tbox(g, 2.6, 0.12, 0.7, 'planks', 1, 0.3, sd * 5.2, 0.62, 2.6).rotation.y = sd * 0.5;
      box(g, 0.12, 0.5, 0.6, DARK, sd * 4.4, 0.33, 3.0); box(g, 0.12, 0.5, 0.6, DARK, sd * 6.0, 0.33, 2.2);
    });
    model('furniture/pottedPlant.glb', g, -5.4, 0, -4.2, { h: 1.7 }); model('furniture/pottedPlant.glb', g, 5.4, 0, -4.2, { h: 1.7 });
    return function (t) {
      emblem.rotation.y = t * 0.9;
      for (var i = 0; i < people.length; i++) people[i].rotation.y = seats[i][3] + Math.sin(t * 0.8 + i * 2) * 0.12;
    };
  })(st[5]);

  // ---------- the shuttle that carries the tour ----------
  var cart = grp(world, 0, 0, 0);
  (function (g) {
    box(g, 2.9, 0.34, 1.5, NAVY, 0, 0.55, 0, SOFT); box(g, 2.94, 0.12, 1.54, ORANGE, 0, 0.42, 0);
    box(g, 0.5, 0.5, 1.5, NAVY, 1.2, 0.9, 0, SOFT); box(g, 0.06, 0.2, 0.3, 0xfff2c4, 1.47, 0.9, 0.5, { emissive: 0xffd77a, emissiveIntensity: 0.9 }); box(g, 0.06, 0.2, 0.3, 0xfff2c4, 1.47, 0.9, -0.5, { emissive: 0xffd77a, emissiveIntensity: 0.9 });
    box(g, 0.2, 0.66, 1.4, ORANGE, -0.15, 1.05, 0); tbox(g, 0.8, 0.12, 1.4, 'planks', 0.3, 0.5, 0.3, 0.78, 0);
    box(g, 0.2, 0.66, 1.4, ORANGE, -1.25, 1.05, 0); tbox(g, 0.8, 0.12, 1.4, 'planks', 0.3, 0.5, -0.8, 0.78, 0);
    [[-1.3, -0.68], [1.3, -0.68], [-1.3, 0.68], [1.3, 0.68]].forEach(function (q) { cyl(g, 0.045, 0.045, 1.5, STEEL, q[0], 1.45, q[1], 8); });
    box(g, 3.1, 0.12, 1.7, WHITE, 0, 2.24, 0, SOFT); box(g, 3.14, 0.06, 1.74, ORANGE, 0, 2.16, 0);
    var wheels = [[-0.95, 0.78], [0.95, 0.78], [-0.95, -0.78], [0.95, -0.78]].map(function (q) {
      var w = cyl(g, 0.34, 0.34, 0.24, DARK, q[0], 0.34, q[1], 16, SOFT); w.rotation.x = Math.PI / 2;
      cyl(g, 0.14, 0.14, 0.26, STEEL, q[0], 0.34, q[1], 10).rotation.x = Math.PI / 2; return w;
    });
    var d1 = person(g, NAVYL, 0.55, 0.3, 0.8, 'man', 'Sitting'); d1.position.y = 0.5; d1.rotation.y = Math.PI / 2;
    var d2 = person(g, ORANGE, -0.55, -0.3, 0.8, 'woman-casual', 'Sitting'); d2.position.y = 0.5; d2.rotation.y = Math.PI / 2;
    g.userData.wheels = wheels;
  })(cart);
  var STOP_Z = [32, 14.5, 4.5, -7.5, -17.5, -30.5], STOP_U = STOP_Z.map(function (z) {
    var best = 0, bd = 1e9;
    for (var i = 0; i <= 400; i++) { var d = Math.abs(curve.getPointAt(i / 400).z - z); if (d < bd) { bd = d; best = i / 400; } }
    return best;
  });

  // labels and signs use the page's display font, so draw them once it has loaded
  function drawText() {
    label(st[1], 'Engineering Academy', 0.6, 6.2, -3.4, 1, 'engineering-academy-project-lab/');
    label(st[2], 'Project Lab', 0.2, 6.2, -3.4, 2, 'engineering-academy/projects-prototyping/');
    label(st[3], 'SME Audit & Compliance', 0.3, 6.2, -3.4, 3, 'sme-audit-compliance/');
    label(st[4], 'Workforce Solutions', 0.4, 6.2, -3.4, 4, 'workforce-solutions/');
    var c = document.createElement('canvas'); c.width = 1472; c.height = 240;
    var x = c.getContext('2d'); x.fillStyle = '#16245c'; x.fillRect(0, 0, c.width, c.height);
    x.textBaseline = 'middle';
    x.font = '700 150px "Saira Semi Condensed", "Arial Narrow", Arial, sans-serif';
    var a = 'YANTRAYA ', b = 'SOLUTIONS', wa = x.measureText(a).width, wb = x.measureText(b).width, x0 = (c.width - wa - wb) / 2;
    x.fillStyle = '#ffffff'; x.fillText(a, x0, 126); x.fillStyle = '#f26b1d'; x.fillText(b, x0 + wa, 126);
    signMat.map = tex(c); signMat.needsUpdate = true;
  }
  if (document.fonts && document.fonts.load) {
    var drawn = false, once = function () { if (!drawn) { drawn = true; drawText(); } };
    document.fonts.load('600 46px "Saira Semi Condensed"').then(once, once); setTimeout(once, 2500);
  } else drawText();

  // ---------- scroll journey ----------
  var panels = journey ? [].slice.call(journey.querySelectorAll('[data-stop]')) : [];
  var navBtns = journey ? [].slice.call(journey.querySelectorAll('[data-go]')) : [];
  var bar = journey ? journey.querySelector('.jnav__bar') : null;
  var Pt = parked === null ? 0 : parked, P = Pt, active = -1;

  function readScroll() {
    if (!journey) return;
    var r = journey.getBoundingClientRect(), range = r.height - stage.clientHeight;
    Pt = range > 0 ? Math.max(0, Math.min(1, -r.top / range)) * (STOPS - 1) : 0;
    var a = Math.round(Pt);
    if (a !== active) {
      active = a;
      panels.forEach(function (p, i) { p.classList.toggle('is-on', i === a); });
      navBtns.forEach(function (b, i) { b.classList.toggle('is-on', i === a); if (i === a) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    }
    if (bar) bar.style.width = (Pt / (STOPS - 1) * 100).toFixed(2) + '%';
  }
  navBtns.forEach(function (b, i) {
    b.addEventListener('click', function () {
      var r = journey.getBoundingClientRect(), range = r.height - stage.clientHeight;
      window.scrollTo({ top: window.scrollY + r.top + range * i / (STOPS - 1) + 1, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  // ---------- camera: a fixed isometric view that slides from stop to stop ----------
  var DIR = new THREE.Vector3(1, 0.86, 1).normalize(), RIGHT = new THREE.Vector3(1, 0, -1).normalize();
  var HALF = [10.5, 9.6, 9.6, 9.6, 9.6, 10.2];
  var TGT = PL.map(function (q, i) { return new THREE.Vector3(i === 0 || i === 5 ? q[0] : q[0] * 0.55, 2.2, q[1] + (i === 0 ? 2.5 : i === 5 ? 1.5 : 1.8)); });
  var mx = 0, my = 0, tx = 0, ty = 0, aspect = 1, camT = new THREE.Vector3(), tmp = new THREE.Vector3();
  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  function size() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); aspect = w / h;
  }

  var t0 = performance.now(), visible = true, raf = 0, fNow = 0, lastU = -1, prev = 0;
  function frame(now) {
    raf = 0;
    var t = reduce ? 3 : (now - t0) / 1000;
    var dt = Math.min(0.25, prev ? (now - prev) / 1000 : 0.016); prev = now;   // same speed at any frame rate
    P += (Pt - P) * (reduce ? 1 : 1 - Math.exp(-dt * 5.5));
    var ease = 1 - Math.exp(-dt * 3.2); tx += (mx - tx) * ease; ty += (my - ty) * ease;

    var wide = aspect >= 1, solo = parked !== null, half, u;
    if (solo) { camT.copy(TGT[parked]); half = 8.6; fNow = parked; u = STOP_U[parked]; }
    else {
      var i0 = Math.min(STOPS - 2, Math.floor(P)), e = smooth((P - i0 - 0.2) / 0.6);
      camT.lerpVectors(TGT[i0], TGT[i0 + 1], e); half = HALF[i0] + (HALF[i0 + 1] - HALF[i0]) * e;
      fNow = i0 + e; u = STOP_U[i0] + (STOP_U[i0 + 1] - STOP_U[i0]) * e;
    }
    if (!wide) half = Math.max(half, 9.5 / aspect * 0.78);
    var halfW = half * aspect;
    if (!solo) {
      if (wide) camT.addScaledVector(RIGHT, -halfW * 0.4 * Math.min(1, (aspect - 0.9) / 0.9));
      else camT.y -= half * 0.52;
    }
    camT.addScaledVector(RIGHT, tx * 0.7); camT.y += -ty * 0.35;
    camera.left = -halfW; camera.right = halfW; camera.top = half; camera.bottom = -half; camera.updateProjectionMatrix();
    camera.position.copy(camT).addScaledVector(DIR, 150); camera.lookAt(camT);
    sun.position.set(camT.x - 22, 44, camT.z + 30); sun.target.position.set(camT.x, 0, camT.z);

    // the shuttle
    var cp = curve.getPointAt(u), ct = curve.getTangentAt(u);
    cart.position.set(cp.x, 0.04, cp.z); cart.rotation.y = Math.atan2(-ct.z, ct.x);
    if (lastU >= 0) { var spin = (u - lastU) * curve.getLength() / 0.34; for (var w = 0; w < 4; w++) cart.userData.wheels[w].rotation.y -= spin; }
    lastU = u;

    for (var li = 0; li < labels.length; li++) {
      var L = labels[li];
      L.material.opacity = solo ? 1 : Math.max(0, Math.min(1, 1.5 - Math.abs(fNow - L.userData.stop) * 1.6));
    }
    function q(i) { return solo ? Math.min(1, ((t * 0.13) % 1.35)) : smooth((P - (i - 0.5)) / 0.75); }
    holo.rotation.y = t * 0.7; holo.rotation.x = 0.35; holo.position.y = 3.45 + Math.sin(t * 1.2) * 0.08;
    lab(q(2), t); audit(q(3), t); crew(t); meet(t);
    if (!reduce) for (var mi = 0; mi < mixers.length; mi++) mixers[mi].update(dt);

    renderer.render(scene, camera);
    if (visible && (!reduce || Math.abs(Pt - P) > 0.001)) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  // building labels are links
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hit(e) {
    var r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
    ray.setFromCamera(ndc, camera);
    var h = ray.intersectObjects(labels.filter(function (l) { return l.material.opacity > 0.5; }));
    return h.length ? h[0].object : null;
  }
  canvas.addEventListener('click', function (e) { var l = hit(e); if (l && l.userData.href) window.location.href = l.userData.href; });
  canvas.addEventListener('pointermove', function (e) { canvas.style.cursor = hit(e) ? 'pointer' : ''; });

  window.addEventListener('scroll', function () { readScroll(); kick(); }, { passive: true });
  window.addEventListener('pointermove', function (e) {
    if (reduce) return;
    mx = e.clientX / window.innerWidth * 2 - 1; my = e.clientY / window.innerHeight * 2 - 1;
  }, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(function () { size(); readScroll(); kick(); }).observe(stage);
  else window.addEventListener('resize', function () { size(); readScroll(); kick(); });
  if (window.IntersectionObserver) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(stage);
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); fail(); });

  size(); readScroll(); P = Pt; kick();
})();
