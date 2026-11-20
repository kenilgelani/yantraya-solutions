/* Yantraya Solutions — the service campus in 3D.
   Yantraya sells services, so the scene shows services: four zones (Academy, Project Lab,
   SME audit, Workforce training) around a central meeting point. The home page opens on an
   overview with clickable zone labels; scrolling flies to each zone. Inner pages park at
   their own zone. Built with Three.js. */
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
  var stage = canvas.parentElement;
  var journey = document.querySelector('[data-journey]');
  var parked = canvas.hasAttribute('data-station') ? parseFloat(canvas.getAttribute('data-station')) : null;

  var GAP = 16, STOPS = 6;
  var NAVY = 0x16245c, NAVYL = 0x3d55b8, ORANGE = 0xf26b1d, STEEL = 0xc3cbdd, STEELD = 0x6c7896,
      WHITE = 0xf7f8fb, SKIN = 0xe6b48c, GLASS = 0xbfd0f0, DARK = 0x20263d, CRATE = 0xd8b98a,
      BG = 0xeef1f7, NIGHT = 0x0d1a55;
  function C(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }

  var scene = new THREE.Scene();
  var bgDay = new THREE.Color(BG), bgNight = new THREE.Color(NIGHT);
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(C(BG), 34, 80);
  var camera = new THREE.PerspectiveCamera(32, 1, 0.5, 600);

  var hemi = new THREE.HemisphereLight(0xffffff, C(0xb4bfd8), 0.6);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);

  // Reflections: a small studio of light panels, baked into an environment map
  (function () {
    var env = new THREE.Scene();
    var room = new THREE.Mesh(new THREE.BoxGeometry(40, 24, 40), new THREE.MeshBasicMaterial({ color: 0x0a1026, side: THREE.BackSide }));
    env.add(room);
    function panel(w, h, x, y, z, r, g, b, rx, ry) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); env.add(m);
    }
    panel(16, 10, 0, 11, 0, 3.2, 3.2, 3.4, Math.PI / 2, 0);      // overhead softbox
    panel(8, 12, -18, 2, 4, 0.5, 0.9, 3.0, 0, Math.PI / 2);      // cool side
    panel(8, 12, 18, 1, -3, 4.0, 1.5, 0.3, 0, -Math.PI / 2);     // warm side
    panel(14, 3, 0, 4, 18, 2.0, 2.0, 2.2, 0, Math.PI);           // front strip
    panel(3, 14, -8, 0, -18, 1.6, 1.7, 2.0, 0, 0);               // back strips
    panel(3, 14, 9, 0, -18, 2.2, 1.2, 0.5, 0, 0);
    var pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.03).texture;
    pm.dispose();
  })();

  // ---------- helpers ----------
  var mats = {};
  function mat(c, o) {
    var k = c + (o ? JSON.stringify(o) : '');
    if (!mats[k]) {
      var m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8, metalness: 0.04, flatShading: true, envMapIntensity: 0.35 }, o || {}));
      m.color.convertSRGBToLinear(); m.emissive.convertSRGBToLinear();
      mats[k] = m;
    }
    return mats[k];
  }
  function metal(c, rough, o) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: C(c), metalness: 1, roughness: rough, envMapIntensity: 1.25 }, o || {}));
  }
  function put(m, p, x, y, z) { m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; }
  function box(p, w, h, d, c, x, y, z, o) { return put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)), p, x, y, z); }
  function cyl(p, rt, rb, h, c, x, y, z, seg, o) { return put(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 16), mat(c, o)), p, x, y, z); }
  function ball(p, r, c, x, y, z) { return put(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(c)), p, x, y, z); }
  function grp(p, x, y, z) { var g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); p.add(g); return g; }
  function person(p, c, x, z, s) {
    var g = grp(p, x, 0, z); g.scale.setScalar(s || 1);
    cyl(g, 0.2, 0.34, 1.15, c, 0, 0.575, 0, 10); ball(g, 0.25, SKIN, 0, 1.42, 0);
    return g;
  }
  function legs(p, w, d, h, c) {
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) { box(p, 0.12, h, 0.12, c, s[0] * w / 2, h / 2, s[1] * d / 2); });
  }
  function hole(shape, x, y, r) { var q = new THREE.Path(); q.absarc(x, y, r, 0, Math.PI * 2, true); shape.holes.push(q); }
  function gearShape(teeth, rootR, outer, bore, top) {
    var s = new THREE.Shape(), a = Math.PI * 2 / teeth; top = top || 0.15;
    for (var i = 0; i < teeth; i++) {
      var c = i * a, pts = [[c - 0.25 * a, rootR], [c - top * a, outer], [c + top * a, outer], [c + 0.25 * a, rootR]];
      for (var k = 0; k < 4; k++) {
        var x = Math.cos(pts[k][0]) * pts[k][1], y = Math.sin(pts[k][0]) * pts[k][1];
        if (i === 0 && k === 0) s.moveTo(x, y); else s.lineTo(x, y);
      }
    }
    s.closePath(); hole(s, 0, 0, bore);
    return s;
  }
  function gearGeo(teeth, rootR, outer, bore, depth, light, flat) {
    var s = gearShape(teeth, rootR, outer, bore);
    if (light) for (var j = 0; j < light.n; j++) { var t = j / light.n * Math.PI * 2 + light.phase; hole(s, Math.cos(t) * light.at, Math.sin(t) * light.at, light.r); }
    var g = new THREE.ExtrudeGeometry(s, { depth: depth, bevelEnabled: false, curveSegments: 20 });
    if (!flat) g.translate(0, 0, -depth / 2);
    return g;
  }
  function gear(p, geo, c, x, y, z, lying, o) {
    var m = put(new THREE.Mesh(geo, mat(c, Object.assign({ metalness: 0.5, roughness: 0.45, envMapIntensity: 0.8 }, o || {}))), p, x, y, z);
    if (lying) m.rotation.x = -Math.PI / 2;
    return m;
  }
  var inkLine = new THREE.LineBasicMaterial({ color: C(NAVY), transparent: true, opacity: 0.55 });
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
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), transparent: true }));
    s.userData.stop = stop; s.userData.href = href; s.userData.w = w / 88 * 0.95; labels.push(s);
    s.scale.set(w / 88 * 0.95, 0.95, 1); s.position.set(x, y, z); p.add(s);
    box(p, 0.06, 0.9, 0.06, NAVY, x, y - 0.9, z);
    return s;
  }

  // ---------- the campus: four service zones around a central meeting point ----------
  var world = new THREE.Group(); scene.add(world);
  var PLACE = [[0, 0], [-11.5, -12.5], [11.5, -12.5], [-11.5, 12.5], [11.5, 12.5], [0, 0]];
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat(0xcfd8ea));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);
  var grid = new THREE.GridHelper(200, 100, C(NAVY), C(NAVY));
  grid.material.transparent = true; grid.material.opacity = 0.07; grid.position.y = 0.01; world.add(grid);
  // paths joining the zones to the centre
  box(world, 0.5, 0.03, 26, ORANGE, -11.5, 0.02, 0).castShadow = false; box(world, 0.5, 0.03, 26, ORANGE, 11.5, 0.02, 0).castShadow = false;
  box(world, 23, 0.03, 0.5, ORANGE, 0, 0.02, 6.2).castShadow = false;

  var st = [];
  for (var si = 0; si < STOPS; si++) {
    var sg = grp(world, PLACE[si][0], 0, PLACE[si][1]);
    if (si > 0) {
      var pad = box(sg, 11.5, 0.04, 8.6, WHITE, 0, 0.02, -0.6); pad.castShadow = false;
      [[-5.5, -4.7], [5.5, -4.7], [-5.5, 3.5], [5.5, 3.5]].forEach(function (c) { box(sg, 0.5, 0.05, 0.5, ORANGE, c[0], 0.03, c[1]).castShadow = false; });
    }
    if (si > 0 && si < 5) {   // a back wall with windows gives each zone its own room
      box(sg, 11.5, 3.3, 0.3, WHITE, 0, 1.65, -4.85); box(sg, 11.54, 0.5, 0.36, NAVY, 0, 0.25, -4.85);
      box(sg, 0.4, 3.6, 0.5, NAVY, -5.6, 1.8, -4.85); box(sg, 0.4, 3.6, 0.5, NAVY, 5.6, 1.8, -4.85);
      [-3.4, 0, 3.4].forEach(function (x) { box(sg, 2.2, 1.3, 0.08, GLASS, x, 2.1, -4.68, { roughness: 0.25 }); });
    }
    st.push(sg);
  }

  // ---------- stop 1: Academy — CAD desk, projected model, drafting board ----------
  var holo = (function (g) {
    box(g, 4.4, 0.14, 2.0, WHITE, 0.4, 1.45, 0); legs(grp(g, 0.4, 0, 0), 4.1, 1.7, 1.4, STEELD);
    box(g, 0.6, 0.06, 0.4, NAVY, 1.1, 1.55, -0.45); box(g, 0.1, 0.5, 0.1, NAVY, 1.1, 1.8, -0.5);
    box(g, 2.1, 1.25, 0.1, NAVY, 1.1, 2.65, -0.5);
    box(g, 1.9, 1.05, 0.02, 0xdbe6ff, 1.1, 2.65, -0.44, { emissive: 0x8fa8e8, emissiveIntensity: 0.5 }).castShadow = false;
    gear(g, gearGeo(10, 0.27, 0.38, 0.1, 0.03), ORANGE, 1.1, 2.65, -0.41);
    box(g, 1.0, 0.05, 0.36, STEELD, 1.1, 1.55, 0.4); box(g, 0.2, 0.05, 0.3, STEELD, 1.9, 1.55, 0.4);
    cyl(g, 0.5, 0.62, 0.14, NAVY, -0.9, 1.59, 0, 20);
    var beam = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.35, 1.5, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: C(ORANGE), transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.set(-0.9, 2.4, 0); g.add(beam);
    var h = grp(g, -0.9, 3.45, 0);
    h.add(new THREE.LineSegments(new THREE.EdgesGeometry(gearGeo(14, 0.82, 1.08, 0.26, 0.5), 20), new THREE.LineBasicMaterial({ color: C(ORANGE) })));
    var b = grp(g, -4.0, 0, -1.4); b.rotation.y = 0.5;
    box(b, 0.12, 2.1, 0.12, STEELD, -0.9, 1.05, 0.2); box(b, 0.12, 2.1, 0.12, STEELD, 0.9, 1.05, 0.2);
    var sheet = grp(b, 0, 2.5, 0); sheet.rotation.x = -0.32;
    box(sheet, 2.6, 1.8, 0.08, WHITE); ring(sheet, 0.55, -0.4, 0, 0.06); ring(sheet, 0.25, -0.4, 0, 0.06);
    seg(sheet, -1.1, 0, 0.3, 0, 0.06); seg(sheet, -0.4, -0.7, -0.4, 0.7, 0.06); seg(sheet, 0.55, 0.5, 1.1, 0.5, 0.06); seg(sheet, 0.55, 0.2, 1.1, 0.2, 0.06); seg(sheet, 0.55, -0.1, 0.95, -0.1, 0.06);
    box(g, 1.7, 2.7, 0.55, NAVY, 3.9, 1.35, -3.0);
    [0.55, 1.25, 1.95].forEach(function (y, i) {
      box(g, 1.5, 0.06, 0.5, WHITE, 3.9, y, -2.95);
      [ORANGE, STEEL, NAVYL, WHITE, ORANGE].forEach(function (c, j) { box(g, 0.16, 0.42, 0.34, c, 3.35 + ((j + i) % 5) * 0.24, y + 0.24, -2.72); });
    });
    person(g, NAVY, 1.1, 1.5); person(g, ORANGE, -0.5, 1.7, 0.94); person(g, NAVYL, -2.9, 0.4, 1.05);
    return h;
  })(st[1]);

  // ---------- stop 2: Project Lab — 3D printer, robot arm, parts bench ----------
  var lab = (function (g) {
    var px = -1.3, bed = 0.5, H = 1.0;
    box(g, 3.3, 0.35, 3.3, NAVY, px, 0.175, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) { box(g, 0.14, 3.2, 0.14, STEEL, px + s[0] * 1.5, 1.95, s[1] * 1.5); });
    box(g, 3.14, 0.14, 0.14, STEEL, px, 3.55, -1.5); box(g, 3.14, 0.14, 0.14, STEEL, px, 3.55, 1.5);
    box(g, 0.14, 0.14, 3.14, STEEL, px - 1.5, 3.55, 0); box(g, 0.14, 0.14, 3.14, STEEL, px + 1.5, 3.55, 0);
    box(g, 2.5, 0.1, 2.5, WHITE, px, 0.45, 0);
    var part = gear(g, gearGeo(14, 0.78, 1.04, 0.24, H, null, true), ORANGE, px, bed, 0, true);
    var gantry = grp(g, px, 1, 0); box(gantry, 2.9, 0.12, 0.14, STEELD);
    var head = grp(gantry); box(head, 0.34, 0.36, 0.34, NAVY, 0, 0, 0); cyl(head, 0.09, 0.02, 0.22, ORANGE, 0, -0.28, 0, 8);
    var spool = cyl(g, 0.5, 0.5, 0.22, ORANGE, px + 1.72, 2.9, 0, 18); spool.rotation.z = Math.PI / 2;

    var arm = grp(g, 2.7, 0, 0.5);
    cyl(arm, 0.6, 0.75, 0.4, NAVY, 0, 0.2, 0, 16);
    var turret = grp(arm, 0, 0.4, 0); cyl(turret, 0.42, 0.42, 0.5, STEELD, 0, 0.25, 0, 14);
    var sh = grp(turret, 0, 0.6, 0); ball(sh, 0.3, STEELD, 0, 0, 0); box(sh, 0.32, 2.0, 0.32, ORANGE, 0, 1.0, 0);
    var el = grp(sh, 0, 2.0, 0); ball(el, 0.26, STEELD, 0, 0, 0); box(el, 0.26, 1.6, 0.26, WHITE, 0, 0.8, 0);
    var wr = grp(el, 0, 1.6, 0); box(wr, 0.5, 0.12, 0.2, STEELD, 0, 0.06, 0);
    box(wr, 0.08, 0.36, 0.2, STEELD, -0.21, 0.28, 0); box(wr, 0.08, 0.36, 0.2, STEELD, 0.21, 0.28, 0);

    box(g, 2.8, 0.12, 1.2, WHITE, 2.6, 1.2, -3.0); legs(grp(g, 2.6, 0, -3.0), 2.6, 1.0, 1.15, STEELD);
    gear(g, gearGeo(12, 0.3, 0.42, 0.1, 0.14, null, true), STEEL, 2.0, 1.26, -3.0, true);
    cyl(g, 0.16, 0.16, 0.14, STEELD, 2.8, 1.33, -2.8, 6); cyl(g, 0.16, 0.16, 0.14, STEELD, 3.2, 1.33, -3.1, 6);
    box(g, 0.34, 0.34, 0.34, ORANGE, 3.6, 1.43, -2.9);
    person(g, NAVY, 0.9, 2.2); person(g, NAVYL, -3.6, 1.4, 0.95);
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
  })(st[2]);

  // ---------- stop 3: SME audit — surface plate, measuring bridge, checklist, records ----------
  var audit = (function (g) {
    var top = 1.5;
    legs(grp(g, 0.3, 0, 0), 3.2, 2.0, 1.05, STEELD);
    box(g, 3.7, 0.45, 2.5, 0x2b3350, 0.3, 1.275, 0, { roughness: 0.4 });
    gear(g, gearGeo(16, 0.82, 1.06, 0.26, 0.3, { n: 4, at: 0.55, r: 0.14, phase: 0 }, true), STEEL, 0.3, top, 0, true);
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
      var tk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05), new THREE.MeshStandardMaterial({ color: C(STEEL), flatShading: true, envMapIntensity: 0.3 }));
      tk.position.set(-0.8, y, 0.08); b.add(tk); ticks.push(tk);
    }
    box(g, 1.4, 2.5, 1.0, STEEL, 4.0, 1.25, -3.0);
    for (var d = 0; d < 4; d++) { box(g, 1.2, 0.5, 0.05, WHITE, 4.0, 0.36 + d * 0.6, -2.48); box(g, 0.4, 0.07, 0.07, ORANGE, 4.0, 0.42 + d * 0.6, -2.43); }
    person(g, ORANGE, -2.3, 1.3); person(g, NAVY, 2.6, 2.0, 0.95);
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
  })(st[3]);

  // ---------- stop 4: Workforce — CNC machine and a training group ----------
  var crew = (function (g) {
    var m = grp(g, 1.9, 0, -1.9);
    box(m, 4.6, 0.5, 2.7, NAVY, 0, 0.25, 0); box(m, 4.6, 2.7, 2.7, WHITE, 0, 1.85, 0); box(m, 4.64, 0.2, 2.74, ORANGE, 0, 0.62, 0);
    box(m, 2.3, 1.35, 0.06, 0x22305f, -0.6, 2.05, 1.36, { roughness: 0.15, metalness: 0.6, envMapIntensity: 1 });
    box(m, 0.08, 0.95, 0.08, STEELD, 0.72, 2.05, 1.42);
    box(m, 0.95, 1.3, 0.24, NAVY, 1.72, 2.1, 1.5); box(m, 0.66, 0.44, 0.03, 0xdbe6ff, 1.72, 2.38, 1.64, { emissive: 0x8fa8e8, emissiveIntensity: 0.5 });
    cyl(m, 0.07, 0.07, 0.05, ORANGE, 1.5, 1.85, 1.64, 8).rotation.x = Math.PI / 2;
    cyl(m, 0.07, 0.07, 0.05, WHITE, 1.72, 1.85, 1.64, 8).rotation.x = Math.PI / 2;
    cyl(m, 0.07, 0.07, 0.05, STEEL, 1.94, 1.85, 1.64, 8).rotation.x = Math.PI / 2;
    var beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 10), new THREE.MeshStandardMaterial({ color: C(ORANGE), emissive: C(ORANGE), emissiveIntensity: 0.2 }));
    beacon.position.set(-1.8, 3.45, 0); m.add(beacon);

    var b = grp(g, -3.6, 0, -1.4); b.rotation.y = 0.5;
    box(b, 0.12, 1.5, 0.12, STEELD, -1.0, 0.75, 0); box(b, 0.12, 1.5, 0.12, STEELD, 1.0, 0.75, 0);
    box(b, 2.8, 1.8, 0.08, WHITE, 0, 2.35, 0); box(b, 2.9, 0.1, 0.12, NAVY, 0, 3.28, 0); box(b, 2.9, 0.1, 0.12, NAVY, 0, 1.42, 0);
    ring(b, 0.45, -0.7, 2.4, 0.06); ring(b, 0.18, -0.7, 2.4, 0.06);
    seg(b, 0.2, 2.8, 1.1, 2.8, 0.06); seg(b, 0.2, 2.5, 1.1, 2.5, 0.06); seg(b, 0.2, 2.2, 0.8, 2.2, 0.06); seg(b, 0.2, 1.9, 1.0, 1.9, 0.06);
    var trainer = person(g, ORANGE, -2.0, -0.2, 1.06);
    var team = [[-4.3, 1.9, NAVY], [-3.2, 2.5, NAVYL], [-2.0, 2.7, NAVY], [-0.9, 2.4, STEELD], [0.1, 1.8, NAVYL]].map(function (p) { return person(g, p[2], p[0], p[1], 0.96); });
    return function (q, t) {
      beacon.material.emissiveIntensity = 0.25 + Math.max(0, Math.sin(t * 4)) * 1.4;
      trainer.rotation.z = Math.sin(t * 1.4) * 0.05;
      for (var i = 0; i < team.length; i++) team[i].position.y = Math.max(0, Math.sin(t * 2.2 + i * 1.3)) * 0.07 * q;
    };
  })(st[4]);

  // ---------- stop 5: the centre — Yantraya sign and a meeting table ----------
  var signMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  var meet = (function (g) {
    box(g, 0.8, 5.4, 0.8, NAVY, -4.6, 2.7, -3.2); box(g, 0.8, 5.4, 0.8, NAVY, 4.6, 2.7, -3.2);
    box(g, 10, 1.9, 0.6, NAVY, 0, 5.6, -3.2); box(g, 10.04, 0.14, 0.64, ORANGE, 0, 4.6, -3.2);
    var sign = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 1.5), signMat); sign.position.set(0, 5.62, -2.88); g.add(sign);
    cyl(g, 1.7, 1.7, 0.14, WHITE, 0, 1.25, 0.2, 28); cyl(g, 0.22, 0.5, 1.2, STEELD, 0, 0.6, 0.2, 12);
    box(g, 0.7, 0.03, 0.5, NAVYL, -0.5, 1.34, 0.1); box(g, 0.6, 0.03, 0.45, ORANGE, 0.6, 1.34, 0.5);
    var emblem = gear(g, gearGeo(14, 0.34, 0.46, 0.1, 0.1), ORANGE, 0, 1.9, 0.2);
    var people = [[-2.3, 0.3, ORANGE], [2.3, 0.0, NAVY], [-1.1, 2.3, NAVYL], [1.3, 2.3, STEELD], [0, -1.9, NAVY]].map(function (q) { return person(g, q[2], q[0], q[1], 0.98); });
    box(g, 2.2, 1.5, 0.1, WHITE, -3.2, 2.0, -2.9); box(g, 2.3, 0.12, 0.14, NAVY, -3.2, 2.8, -2.9);
    [2.4, 2.1, 1.8, 1.5].forEach(function (y, i) { box(g, 1.5 - (i % 2) * 0.4, 0.07, 0.03, STEELD, -3.3, y, -2.83).castShadow = false; });
    return function (t) {
      emblem.rotation.y = t * 0.9;
      for (var i = 0; i < people.length; i++) people[i].rotation.z = Math.sin(t * 1.1 + i * 2) * 0.035;
    };
  })(st[5]);

  // labels and sign use the page's display font, so draw them once it has loaded
  function drawText() {
    label(st[1], 'Engineering Academy', 0.6, 5.3, -2.2, 1, 'academy.html');
    label(st[2], 'Project Lab', 0.2, 5.4, -2.2, 2, 'academy.html');
    label(st[3], 'SME Audit & Compliance', 0.3, 5.6, -2.4, 3, 'audit.html');
    label(st[4], 'Workforce Solutions', 0.4, 5.6, -2.8, 4, 'workforce.html');
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

  // ---------- camera ----------
  var TY = [0, 1.9, 1.7, 1.9, 1.8, 2.4], DIST = [0, 1.16, 1.16, 1.16, 1.2, 1.32];
  var mx = 0, my = 0, tx = 0, ty = 0, aspect = 1, shadowSize = 0;
  var pA = new THREE.Vector3(), tA = new THREE.Vector3(), pB = new THREE.Vector3(), tB = new THREE.Vector3(), camP = new THREE.Vector3(), camT = new THREE.Vector3();
  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  function pose(i, outP, outT) {
    var wide = aspect >= 1, solo = parked !== null, side = wide ? Math.min(1, (aspect - 0.9) / 0.9) : 0;
    if (i === 0) {            // overview of the whole campus
      var D = wide ? 80 : 52 / (0.574 * Math.max(0.4, aspect));
      outT.set(-side * D * 0.27, wide ? -7 : -D * 0.17, 0);
      outP.set(outT.x + 0.52 * D, 0.58 * D, 0.63 * D);
      return;
    }
    var c = st[i].position, k = DIST[i] * (solo ? 0.86 : 1) * (wide ? 1 : 1.5 / Math.max(0.5, aspect) * 0.62);
    var shift = solo ? 0 : side * 5.4;
    outT.set(c.x - shift, TY[i] - (wide || solo ? 0 : 3.4 * k * 0.72), c.z);
    outP.set(c.x - shift + 8.6 * k, 7.4 * k, c.z + 16 * k);
  }

  function size() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix();
  }

  var t0 = performance.now(), visible = true, raf = 0, fNow = 0;
  function frame(now) {
    raf = 0;
    var t = reduce ? 3 : (now - t0) / 1000;
    P += (Pt - P) * (reduce ? 1 : 0.085);
    tx += (mx - tx) * 0.05; ty += (my - ty) * 0.05;

    if (parked !== null) { pose(parked, camP, camT); fNow = parked; }
    else {
      var i0 = Math.min(STOPS - 2, Math.floor(P)), e = smooth((P - i0 - 0.22) / 0.56);
      pose(i0, pA, tA); pose(i0 + 1, pB, tB);
      camP.lerpVectors(pA, pB, e); camT.lerpVectors(tA, tB, e); fNow = i0 + e;
    }
    var dist = camP.distanceTo(camT), par = dist / 20;
    camera.position.set(camP.x + tx * 1.5 * par, camP.y - ty * 0.8 * par, camP.z);
    camera.lookAt(camT);
    scene.fog.near = dist * 1.3 + 16; scene.fog.far = dist * 3 + 50;

    var want = Math.max(16, Math.min(36, dist * 0.62));
    if (Math.abs(want - shadowSize) > 0.5) {
      shadowSize = want;
      sun.shadow.camera.left = -want; sun.shadow.camera.right = want; sun.shadow.camera.top = want; sun.shadow.camera.bottom = -want;
      sun.shadow.camera.far = 90; sun.shadow.camera.updateProjectionMatrix();
    }
    var cx = dist > 40 ? 0 : camT.x, cz = dist > 40 ? 0 : camT.z;
    sun.position.set(cx - 10, 26, cz + 14); sun.target.position.set(cx, 0, cz);

    var overview = 1 - smooth(fNow / 0.7);
    for (var li = 0; li < labels.length; li++) {
      var L = labels[li], near = 1 - Math.min(1, Math.abs(fNow - L.userData.stop) * 1.4);
      L.material.opacity = Math.max(overview, near, parked !== null ? 1 : 0);
      var sc = Math.max(1, camera.position.distanceTo(L.getWorldPosition(pA)) / 44);
      L.scale.set(L.userData.w * sc, 0.95 * sc, 1);
    }

    function q(i) { return parked !== null || fNow < 0.5 ? Math.min(1, ((t * 0.13) % 1.35)) : smooth((P - (i - 0.5)) / 0.75); }
    holo.rotation.y = t * 0.7; holo.rotation.x = 0.35; holo.position.y = 3.45 + Math.sin(t * 1.2) * 0.08;
    lab(q(2), t); audit(q(3), t); crew(1, t); meet(t);

    renderer.render(scene, camera);
    if (visible && (!reduce || Math.abs(Pt - P) > 0.001)) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  // zone labels are links
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
