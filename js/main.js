/* Yantraya Solutions — navigation, enquiry forms, QR code and conversion tracking */
(function () {
  var PHONE = '919725204739';
  var EMAIL = 'yantrayasolutions@zohomail.in';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Conversion events go to Google Analytics 4 when it is installed; otherwise they are ignored.
  function track(name, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) {}
  }

  // ---------- navigation ----------
  var toggle = document.querySelector('.nav-toggle'), nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  var drops = [].slice.call(document.querySelectorAll('.nav__drop'));
  function closeDrops(except) {
    drops.forEach(function (d) { if (d !== except) { d.classList.remove('is-open'); d.querySelector('button').setAttribute('aria-expanded', 'false'); } });
  }
  drops.forEach(function (d) {
    var btn = d.querySelector('button');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !d.classList.contains('is-open');
      closeDrops(d);
      d.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    if (window.matchMedia('(hover: hover) and (min-width: 961px)').matches) {
      d.addEventListener('mouseenter', function () { closeDrops(d); d.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); });
      d.addEventListener('mouseleave', function () { d.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); });
    }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.nav__drop')) closeDrops(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrops(); });

  // ---------- click-to-call, email and WhatsApp tracking ----------
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href');
    if (h.indexOf('tel:') === 0) track('phone_click', { link_url: h });
    else if (h.indexOf('mailto:') === 0) track('email_click', { link_url: h });
    else if (h.indexOf('wa.me') > -1) track('whatsapp_click', { link_url: h });
  });

  // ---------- the gear in the contact band turns as the page scrolls ----------
  var gear = document.querySelector('.cta__gear svg');
  if (gear && !reduce) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { gear.style.transform = 'rotate(' + (window.scrollY * 0.06).toFixed(1) + 'deg)'; ticking = false; });
    }, { passive: true });
  }

  // ---------- QR code that opens a WhatsApp chat ----------
  var qr = document.getElementById('qr');
  if (qr && window.qrcode) {
    var code = qrcode(0, 'M');
    code.addData('https://wa.me/' + PHONE);
    code.make();
    qr.innerHTML = code.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }

  // ---------- contact page tabs: student, corporate, SME ----------
  var tabs = [].slice.call(document.querySelectorAll('[role="tab"]'));
  function showTab(key, focus) {
    var found = false;
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === key;
      if (on) found = true;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
      if (on && focus) t.focus();
    });
    return found;
  }
  if (tabs.length) {
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { showTab(t.getAttribute('data-tab')); history.replaceState(null, '', '#' + t.getAttribute('data-tab')); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); showTab(tabs[(i + d + tabs.length) % tabs.length].getAttribute('data-tab'), true); }
      });
    });
    var start = (location.hash || '').replace('#', '');
    if (!showTab(start)) showTab(tabs[0].getAttribute('data-tab'));
    window.addEventListener('hashchange', function () { showTab((location.hash || '').replace('#', '')); });
  }

  // ---------- enquiry forms: open WhatsApp or the visitor's email app with the message filled in ----------
  var wanted = new URLSearchParams(location.search).get('service');
  [].slice.call(document.querySelectorAll('form[data-enquiry]')).forEach(function (form) {
    var kind = form.getAttribute('data-enquiry');
    if (wanted) {
      var opt = form.querySelector('option[value="' + wanted.replace(/[^a-z-]/g, '') + '"]');
      if (opt) opt.selected = true;
    }
    function field(n) { var el = form.elements[n]; return el ? el.value.trim() : ''; }
    function label(n) {
      var el = form.elements[n];
      if (!el) return '';
      if (el.tagName === 'SELECT') return el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '';
      return el.value.trim();
    }
    function check() {
      var first = null;
      [].slice.call(form.querySelectorAll('[required]')).forEach(function (el) {
        var bad = el.type === 'checkbox' ? !el.checked : !el.value.trim();
        var err = document.getElementById(el.id + '-err');
        if (err) err.textContent = bad ? (el.getAttribute('data-msg') || 'This field is required.') : '';
        el.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad && !first) first = el;
      });
      if (first) first.focus();
      return !first;
    }
    function text() {
      var lines = ['Hello Yantraya Solutions,', '', 'Enquiry type: ' + form.getAttribute('data-title')];
      [].slice.call(form.querySelectorAll('[data-line]')).forEach(function (el) {
        var v = label(el.name);
        if (v && !/^Select/.test(v)) lines.push(el.getAttribute('data-line') + ': ' + v);
      });
      if (field('message')) lines.push('', field('message'));
      return lines.join('\n');
    }
    function event() {
      var sel = form.querySelector('select[data-events]');
      var o = sel && sel.options[sel.selectedIndex];
      return (o && o.getAttribute('data-event')) || form.getAttribute('data-event');
    }
    function send(channel) {
      if (!check()) return;
      track(event(), { enquiry_type: kind, service: field('service'), channel: channel });
      track('contact_form_submit', { enquiry_type: kind, channel: channel });
      if (channel === 'whatsapp') window.open('https://wa.me/' + PHONE + '?text=' + encodeURIComponent(text()), '_blank', 'noopener');
      else location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(form.getAttribute('data-title') + ': ' + (label('service') || 'Enquiry')) + '&body=' + encodeURIComponent(text());
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); send('whatsapp'); });
    var mail = form.querySelector('[data-send="email"]');
    if (mail) mail.addEventListener('click', function () { send('email'); });
  });
})();
