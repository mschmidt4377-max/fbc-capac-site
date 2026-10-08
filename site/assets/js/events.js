/* Events: reads assets/data/events.json and fills
   - the Events list page   (<main data-events-list>)
   - the Home page carousel (<ul id="home-events">)
   - event detail pages     (<main data-event="slug">, or events/view/?e=slug)
   - the top banner on every page (next upcoming event, visitors can hide it)
   See assets/data/README.md for how to edit events. */
(function () {
  var script = document.currentScript || (function () {
    var s = document.querySelectorAll('script[src*="events.js"]');
    return s[s.length - 1];
  })();
  var BASE = new URL('../../', script.src).href; // site root
  var NNBSP = ' ';
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function parse(s, endOfDay) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(s || ''));
    if (!m) return null;
    var h = m[4] === undefined ? (endOfDay ? 23 : 0) : +m[4];
    var mi = m[5] === undefined ? (endOfDay ? 59 : 0) : +m[5];
    return new Date(+m[1], +m[2] - 1, +m[3], h, mi);
  }
  function prep(e) {
    e._start = parse(e.start, false);
    e._end = parse(e.end || e.start, true) || e._start;
    if (e._end < e._start) e._end = e._start;
    return e;
  }
  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function fmtDate(d) { return DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
  function fmtTime(d) {
    var h = d.getHours(), m = d.getMinutes();
    return (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + NNBSP + (h < 12 ? 'AM' : 'PM');
  }
  function monthDay(d) { return MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  function href(e) {
    return e.page ? BASE + 'events/' + e.slug + '/' : BASE + 'events/view/?e=' + encodeURIComponent(e.slug);
  }
  function img(p) { return /^(https?:)?\/\//.test(p) ? p : BASE + p.replace(/^\//, ''); }
  function fixBody(html) {
    // image paths inside the HTML are written relative to the site root
    return String(html || '').replace(/(src=")(?!https?:|\/\/|data:)([^"]+)"/g, function (_, a, p) { return a + img(p) + '"'; });
  }
  function isMulti(e) { return !sameDay(e._start, e._end); }

  /* "Wednesday, October 28, 2026" + "7:00 PM – 8:00 PM"  (or the multi-day form) */
  function metaLines(e) {
    if (isMulti(e)) {
      if (e.allDay) return [fmtDate(e._start) + ' –', fmtDate(e._end)];
      return [fmtDate(e._start) + ', ' + fmtTime(e._start) + ' –', fmtDate(e._end) + ', ' + fmtTime(e._end)];
    }
    if (e.allDay) return [fmtDate(e._start)];
    return [fmtDate(e._start), fmtTime(e._start) + ' – ' + fmtTime(e._end)];
  }

  function load() {
    return fetch(BASE + 'assets/data/events.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (list) {
        return list.map(prep).filter(function (e) { return e._start; })
          .sort(function (a, b) { return a._start - b._start; });
      });
  }
  function upcoming(all) {
    var now = new Date();
    return all.filter(function (e) { return e._end >= now; });
  }

  /* ---------- Home carousel ---------- */
  function renderHome(all, ul) {
    var up = upcoming(all).slice(0, 5);
    if (!up.length) return;
    ul.innerHTML = up.map(function (e) {
      var h = href(e), s = e._start;
      return '<li class="event-card">' +
        '<a class="event-thumb" href="' + h + '"><img src="' + img(e.image) + '" alt=""><span class="event-date"><span class="m">' +
        MONTHS[s.getMonth()].slice(0, 3) + '</span><span class="d">' + s.getDate() + '</span></span></a>' +
        '<a class="event-title" href="' + h + '">' + esc(e.title) + '</a>' +
        '<time class="event-meta">' + monthDay(s) + ', ' + s.getFullYear() + '</time></li>';
    }).join('');
    ul.scrollLeft = 0;
    ul.dispatchEvent(new Event('scroll'));
  }

  /* ---------- List page ---------- */
  function renderList(all, box) {
    var up = upcoming(all);
    if (!up.length) { box.innerHTML = '<p class="ev-none">No upcoming events.</p>'; return; }
    box.innerHTML = up.map(function (e) {
      var h = href(e), s = e._start;
      var meta = isMulti(e) ? metaLines(e).join(' ') : (e.allDay ? '' : fmtTime(e._start) + ' – ' + fmtTime(e._end));
      return '<article class="eventlist-event">' +
        '<a class="eventlist-column-thumbnail" href="' + h + '"><img src="' + img(e.image) + '" alt="' + esc(e.title) + '"></a>' +
        '<div class="eventlist-column-date"><div class="eventlist-datetag"><div class="eventlist-datetag-inner">' +
        '<div class="eventlist-datetag-startdate eventlist-datetag-startdate--month">' + MONTHS[s.getMonth()].slice(0, 3) + '</div>' +
        '<div class="eventlist-datetag-startdate eventlist-datetag-startdate--day">' + s.getDate() + '</div></div></div></div>' +
        '<div class="eventlist-column-info">' +
        '<h1 class="eventlist-title"><a class="eventlist-title-link" href="' + h + '">' + esc(e.title) + '</a></h1>' +
        (meta ? '<ul class="eventlist-meta"><li class="eventlist-meta-item">' + meta + '</li></ul>' : '') +
        (e.excerpt ? '<div class="eventlist-excerpt">' + fixBody(e.excerpt) + '</div>'
          : '<div class="eventlist-description">' + fixBody(e.body) + '</div>') +
        '<a class="eventlist-button" href="' + h + '">View Event →</a>' +
        '</div></article>';
    }).join('');
  }

  /* ---------- Detail page ---------- */
  function galleryHTML(g) {
    if (!g || !g.length) return '';
    return '<div class="ev-gallery"><div class="ev-stage">' +
      g.map(function (p, i) { return '<div class="ev-slide' + (i ? '' : ' on') + '"><img src="' + img(p) + '" alt=""></div>'; }).join('') +
      '</div><div class="ev-thumbs"><div class="ev-thumbs-in">' +
      g.map(function (p, i) { return '<button type="button" class="ev-thumb' + (i ? '' : ' on') + '" aria-label="Slide ' + (i + 1) + '"><img src="' + img(p) + '" alt=""></button>'; }).join('') +
      '</div></div></div>';
  }
  function initGallery(root) {
    var g = root.querySelector('.ev-gallery');
    if (!g) return;
    var slides = g.querySelectorAll('.ev-slide'), thumbs = g.querySelectorAll('.ev-thumb'), cur = 0, timer;
    function go(i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('on', k === cur); });
      thumbs.forEach(function (t, k) { t.classList.toggle('on', k === cur); });
      var strip = g.querySelector('.ev-thumbs');
      var t = thumbs[cur];
      if (strip.scrollWidth > strip.clientWidth) strip.scrollLeft = t.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2;
    }
    function play() { clearInterval(timer); if (slides.length > 1) timer = setInterval(function () { go(cur + 1); }, 5000); }
    thumbs.forEach(function (t, k) { t.addEventListener('click', function () { go(k); play(); }); });
    play();
  }
  function formHTML(e) {
    var label = esc(e.registrationButton || 'Register');
    return '<form class="form ev-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST" novalidate>' +
      '<input type="hidden" name="_subject" value="Registration: ' + esc(e.title) + '">' +
      '<input type="hidden" name="event" value="' + esc(e.title) + '">' +
      '<input type="text" name="_gotcha" tabindex="-1" autocomplete="off" style="display:none">' +
      '<fieldset class="field"><legend class="form-label">Name</legend><div class="field-row">' +
      '<div><label class="form-label sub" for="ev-fn">First Name <span class="req">(required)</span></label><input id="ev-fn" name="first_name" type="text" autocomplete="given-name" required></div>' +
      '<div><label class="form-label sub" for="ev-ln">Last Name <span class="req">(required)</span></label><input id="ev-ln" name="last_name" type="text" autocomplete="family-name" required></div>' +
      '</div></fieldset>' +
      '<div class="field"><label class="form-label" for="ev-em">Email <span class="req">(required)</span></label><input id="ev-em" name="email" type="email" autocomplete="email" required>' +
      '<label class="checkbox"><input type="checkbox" name="newsletter" value="Sign up for news and updates"><span>Sign up for news and updates</span></label></div>' +
      '<div class="field"><label class="form-label" for="ev-sj">Subject <span class="req">(required)</span></label><input id="ev-sj" name="subject" type="text" required></div>' +
      '<div class="field"><label class="form-label" for="ev-ms">Message <span class="req">(required)</span></label><textarea id="ev-ms" name="message" required></textarea></div>' +
      '<button class="btn-submit" type="submit">' + label + '</button></form>';
  }
  function initForm(root) {
    var f = root.querySelector('form.ev-form');
    if (!f) return;
    f.addEventListener('submit', function (ev) {
      var ok = true;
      f.querySelectorAll('[required]').forEach(function (i) { if (!i.value.trim()) { ok = false; i.classList.add('bad'); } else i.classList.remove('bad'); });
      if (!ok) { ev.preventDefault(); return; }
      if (!window.fetch || /YOUR_FORM_ID/.test(f.action)) return; // plain submit
      ev.preventDefault();
      fetch(f.action, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } })
        .then(function (r) {
          f.innerHTML = r.ok ? '<p class="form-thanks">Thank you! Your registration has been sent.</p>' : '<p class="form-thanks">Sorry, something went wrong. Please try again or call 810-395-2195.</p>';
        })
        .catch(function () { f.innerHTML = '<p class="form-thanks">Sorry, something went wrong. Please try again or call 810-395-2195.</p>'; });
    });
  }
  function pager(e, cls, label, dir) {
    var arrow = '<span class="ev-pg-icon"><svg viewBox="0 0 20 40" aria-hidden="true"><path d="' + (dir === 'prev' ? 'M16 2 3 20l13 18' : 'M4 2l13 18L4 38') + '"/></svg></span>';
    if (!e) return '<span class="ev-pg ' + cls + '"></span>';
    var txt = '<span class="ev-pg-text"><span class="ev-pg-date">' + monthDay(e._start) + '</span><h2 class="ev-pg-title">' + esc(e.title) + '</h2></span>';
    return '<a class="ev-pg ' + cls + '" href="' + href(e) + '">' + (dir === 'prev' ? arrow + txt : txt + arrow) + '</a>';
  }
  function locHTML(e) {
    if (!e.location && !e.address) return '';
    var map = e.address ? ' <a href="https://maps.google.com/?q=' + encodeURIComponent(e.address) + '" target="_blank" rel="noopener">(map)</a>' : '';
    return '<p class="eventitem-meta eventitem-address">' + (e.location ? esc(e.location) + '<br>' : '') + (e.address ? esc(e.address) + '<br>' : '') + map.trim() + '</p>';
  }
  function renderDetail(all, main) {
    var slug = main.getAttribute('data-event') || new URLSearchParams(location.search).get('e') || '';
    var idx = -1;
    all.forEach(function (e, i) { if (e.slug === slug) idx = i; });
    var box = main.querySelector('#event-detail') || main;
    if (idx < 0) {
      box.innerHTML = '<a class="eventitem-backlink" href="' + BASE + 'events/">← Back to All Events</a><div class="eventitem"><div class="eventitem-column-meta"><h1 class="eventitem-title">Event not found</h1></div></div>';
      return;
    }
    var e = all[idx];
    document.title = e.title + ' — First Baptist Church of Capac';
    var lines = metaLines(e);
    box.innerHTML =
      '<a class="eventitem-backlink" href="' + BASE + 'events/">← Back to All Events</a>' +
      '<article class="eventitem"><div class="eventitem-column-meta"><h1 class="eventitem-title">' + esc(e.title) + '</h1>' +
      '<p class="eventitem-meta">' + lines.map(esc).join('<br>') + '</p>' + locHTML(e) + '</div>' +
      '<div class="eventitem-column-content"><div class="ev-body">' + fixBody(e.body) + '</div>' +
      galleryHTML(e.gallery) + (e.registration ? '<div class="ev-reg">' + formHTML(e) + '</div>' : '') +
      '</div></article>' +
      '<nav class="item-pagination" aria-label="More events">' +
      pager(all[idx - 1], 'ev-pg-prev', 'Previous', 'prev') + pager(all[idx + 1], 'ev-pg-next', 'Next', 'next') + '</nav>';
    initGallery(box);
    initForm(box);
  }

  /* ---------- Top banner: the next upcoming event, on every page ---------- */
  var DISMISS_KEY = 'fbc-banner-dismissed';
  // Any change to the event (new event, new date or time, new title) makes a new key,
  // so the banner shows again for visitors who closed it before.
  function bannerKey(e) { return e.slug + '|' + e.start + '|' + e.title; }
  function shortTime(d) {
    var h = d.getHours(), m = d.getMinutes();
    return (h % 12 || 12) + (m ? ':' + (m < 10 ? '0' : '') + m : '') + NNBSP + (h < 12 ? 'AM' : 'PM');
  }
  /* "today at 7 PM", "this Saturday at 2 PM", "Wednesday, October 28 at 7 PM" */
  function when(e, now) {
    var s = e._start;
    if (s <= now) return isMulti(e) ? 'happening now through ' + DAYS[e._end.getDay()] : 'happening now';
    var days = Math.round((new Date(s.getFullYear(), s.getMonth(), s.getDate()) -
      new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
    var day = days === 0 ? 'today' : days === 1 ? 'tomorrow'
      : days < 7 && s.getDay() > now.getDay() ? 'this ' + DAYS[s.getDay()]
      : DAYS[s.getDay()] + ', ' + monthDay(s);
    return e.allDay ? day : day + ' at ' + shortTime(s);
  }
  function renderBanner(all) {
    var e = upcoming(all)[0];
    if (!e) return;
    var key = bannerKey(e);
    try { if (localStorage.getItem(DISMISS_KEY) === key) return; } catch (err) {}
    var bar = document.createElement('div');
    bar.className = 'site-banner';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Next event');
    bar.innerHTML = '<a class="site-banner-link" href="' + href(e) + '"><strong>' + esc(e.title) + '</strong> ' +
      esc(when(e, new Date())) + ' <span class="site-banner-more">Details →</span></a>' +
      '<button class="site-banner-close" type="button" aria-label="Hide this message">×</button>';
    bar.querySelector('.site-banner-close').addEventListener('click', function () {
      bar.remove();
      try { localStorage.setItem(DISMISS_KEY, key); } catch (err) {}
    });
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function start() {
    var home = document.getElementById('home-events');
    var list = document.getElementById('event-list');
    var det = document.querySelector('main[data-event]');
    load().then(function (all) {
      renderBanner(all);
      if (home) renderHome(all, home);
      if (list) renderList(all, list);
      if (det) renderDetail(all, det);
      document.documentElement.classList.add('events-ready');
    }).catch(function (err) { if (window.console) console.error('events.js', err); });
  }
  start();
})();
