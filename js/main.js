/* Yantraya Solutions — navigation, card tilt, scroll gear, enquiry form */
(function () {
  var PHONE = '919725204739';
  var EMAIL = 'yantrayasolutions@gmail.com';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile navigation
  var toggle = document.querySelector('.nav-toggle'), nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Division panels tilt towards the pointer
  if (!reduce && window.matchMedia('(hover: hover) and (min-width: 1001px)').matches) {
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg');
      });
    });
  }

  // The gear in the contact band turns as the page scrolls
  var gear = document.querySelector('.cta__gear svg');
  if (gear && !reduce) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        gear.style.transform = 'rotate(' + (window.scrollY * 0.06).toFixed(1) + 'deg)';
        ticking = false;
      });
    }, { passive: true });
  }

  // QR code that opens a WhatsApp chat
  var qr = document.getElementById('qr');
  if (qr && window.qrcode) {
    var code = qrcode(0, 'M');
    code.addData('https://wa.me/' + PHONE);
    code.make();
    qr.innerHTML = code.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }

  // Enquiry form: opens WhatsApp or the visitor's email app with the message filled in
  var form = document.getElementById('enquiry');
  if (form) {
    var about = new URLSearchParams(location.search).get('about');
    if (about) {
      var opt = form.querySelector('option[data-key="' + about.replace(/[^a-z]/g, '') + '"]');
      if (opt) opt.selected = true;
    }
    function val(n) { return form.elements[n].value.trim(); }
    function check() {
      var ok = true;
      [['name', 'Enter your name.'], ['message', 'Tell us what you need.']].forEach(function (f) {
        var el = form.elements[f[0]], err = document.getElementById(f[0] + '-err');
        var bad = !el.value.trim();
        err.textContent = bad ? f[1] : '';
        el.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad && ok) { el.focus(); ok = false; }
      });
      return ok;
    }
    function text() {
      var lines = ['Hello Yantraya Solutions,', '', 'Name: ' + val('name')];
      if (val('phone')) lines.push('Phone: ' + val('phone'));
      if (val('org')) lines.push('Organisation: ' + val('org'));
      lines.push('Enquiry about: ' + val('topic'), '', val('message'));
      return lines.join('\n');
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!check()) return;
      window.open('https://wa.me/' + PHONE + '?text=' + encodeURIComponent(text()), '_blank', 'noopener');
    });
    document.getElementById('send-email').addEventListener('click', function () {
      if (!check()) return;
      location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Enquiry: ' + val('topic')) + '&body=' + encodeURIComponent(text());
    });
  }
})();
