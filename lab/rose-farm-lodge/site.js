// Rose Farm Lodge demo — builds each page from the JSON files in /content/.
// Those files are edited through Pages CMS (see /.pages.yml), so the
// owners can change wording, links and photos without touching this code.
//
// Each HTML page is a thin shell: <body data-page="home|lodge|area|book">.

(function () {
  const BASE = '/lab/rose-farm-lodge/';
  const page = document.body.dataset.page;

  // ---------- Small helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Only allow sensible link types, so a typo can't break the page.
  function safeUrl(u) {
    u = String(u ?? '').trim();
    if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(u)) return u;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(u)) return 'https://' + u; // "example.com"
    return '';
  }
  function safeImg(u) {
    u = String(u ?? '').trim();
    return /^(\/|https:\/\/)/i.test(u) ? u : '';
  }

  // Blank lines in a text box become separate paragraphs.
  // "Label: rest of line" at the start of a paragraph is shown in bold.
  function paras(text) {
    return String(text ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
      .map((p) => {
        let h = esc(p).replace(/\n/g, '<br>');
        h = h.replace(/^([^:<]{2,30}):\s/, '<strong>$1:</strong> ');
        return `<p>${h}</p>`;
      }).join('');
  }

  // A photo, or a soft placeholder box until a real photo is added.
  const TINTS = ['#8a9f7d,#cdbb92', '#b48b68,#e3c9a3', '#9aa7a3,#dcd5c4',
                 '#a49cb0,#e2d8cf', '#8fa9b4,#d9e1dc', '#6f8c66,#bfcf98'];
  function photo(src, caption, i, extraStyle = '') {
    const url = safeImg(src);
    if (url) {
      return `<figure class="photo has-img" style="${extraStyle}">
        <img src="${esc(url)}" alt="${esc(caption)}" loading="lazy">
        ${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}</figure>`;
    }
    const t = TINTS[i % TINTS.length];
    return `<div class="photo" style="--ph: linear-gradient(135deg,${t});${extraStyle}">
      <span>Photo: ${esc(caption || 'add a photo')}</span></div>`;
  }

  function tel(n) { return 'tel:' + String(n ?? '').replace(/[^\d+]/g, ''); }

  async function load(name) {
    const res = await fetch(`${BASE}content/${name}.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${name}.json: ${res.status}`);
    return res.json();
  }

  // ---------- Header and footer (from site.json) ----------
  function renderChrome(site) {
    const words = esc(site.name || '').split(' ');
    const last = words.pop();
    const logo = `${words.join(' ')} <span>${last}</span>`;

    document.getElementById('banner').innerHTML = esc(site.banner || '');
    document.getElementById('banner').hidden = !site.banner;

    document.getElementById('header').innerHTML = `
      <div class="wrap">
        <a class="c-logo" href="${BASE}">${logo}</a>
        <nav class="c-nav" aria-label="Main">
          ${(site.nav || []).map((n) => {
            const href = safeUrl(n.link);
            const here = href && new URL(href, location.href).pathname === location.pathname;
            return `<a href="${esc(href)}"${here ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`;
          }).join('')}
        </nav>
      </div>`;

    document.getElementById('footer').innerHTML = `
      <div class="wrap grid">
        <div>
          <h3>${esc(site.name)}</h3>
          <p>${esc(site.address).replace(/\n/g, '<br>')}</p>
        </div>
        <div>
          <h3>Get in touch</h3>
          <p>${site.phone ? `Phone: <a href="${tel(site.phone)}">${esc(site.phone)}</a><br>` : ''}
             ${site.email ? `Email: <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>` : ''}</p>
        </div>
        ${(site.footer_links || []).length ? `<div>
          <h3>${esc(site.footer_links_heading || 'Links')}</h3>
          <p>${site.footer_links.map((l) =>
            `<a href="${esc(safeUrl(l.url))}" rel="nofollow">${esc(l.label)}</a>`).join('<br>')}</p>
        </div>` : ''}
      </div>`;
  }

  // ---------- Page templates ----------
  function renderHome(d) {
    const heroImg = safeImg(d.hero_image);
    return `
      <section class="hero" style="--hero-img: ${heroImg ? `url('${esc(heroImg)}')` : 'linear-gradient(135deg,#6f8c66 0%,#a9b98a 45%,#d8c393 100%)'}">
        <div class="wrap">
          <h1>${esc(d.hero_title)}</h1>
          <p>${esc(d.hero_text)}</p>
          ${(d.buttons || []).map((b) =>
            `<a class="btn${b.style === 'Outline' ? ' btn-ghost' : ''}" href="${esc(safeUrl(b.link))}">${esc(b.label)}</a>`).join('')}
        </div>
      </section>
      <section class="block"><div class="wrap">
        <ul class="facts">${(d.facts || []).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        <div class="grid">${(d.highlights || []).map((h) =>
          `<div class="card"><h3>${esc(h.title)}</h3>${paras(h.text)}</div>`).join('')}</div>
      </div></section>
      ${(d.reviews || []).length ? `<section class="block"><div class="wrap">
        <h2>${esc(d.reviews_heading)}</h2>
        <div class="grid">${d.reviews.map((r) => `<div class="card">
          <blockquote>"${esc(r.quote)}"</blockquote>
          <p class="review-by">${esc(r.by)}</p></div>`).join('')}</div>
      </div></section>` : ''}`;
  }

  function renderLodge(d) {
    const btn = d.button && d.button.label
      ? `<a class="btn" href="${esc(safeUrl(d.button.link))}">${esc(d.button.label)}</a>` : '';
    return `
      <section class="page-head"><div class="wrap">
        <h1>${esc(d.title)}</h1>
        <p>${esc(d.intro)}</p>
        <ul class="facts">${(d.facts || []).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      </div></section>
      <section class="block"><div class="wrap gallery">
        ${(d.photos || []).map((p, i) => photo(p.image, p.caption, i)).join('')}
      </div></section>
      <section class="block"><div class="wrap two-col">
        <div>${(d.sections || []).map((s) => `<h2>${esc(s.heading)}</h2>${paras(s.text)}`).join('')}</div>
        <div class="card">
          <h3>${esc(d.info_heading)}</h3>
          <ul class="ticks">${(d.info_list || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
          ${btn}
        </div>
      </div></section>`;
  }

  function renderArea(d) {
    // Only Google Maps "embed" links are allowed in the map box.
    const map = String(d.map_embed || '').trim();
    const mapOk = /^https:\/\/www\.google\.com\/maps\/embed\?/.test(map);
    return `
      <section class="page-head"><div class="wrap">
        <h1>${esc(d.title)}</h1><p>${esc(d.intro)}</p>
      </div></section>
      <section class="block"><div class="wrap grid">
        ${(d.places || []).map((p, i) => `<div class="card">
          ${photo(p.image, p.title, i + 5, 'margin-bottom:1rem')}
          <h3>${esc(p.title)}</h3>${paras(p.text)}
          ${safeUrl(p.link) ? `<p><a href="${esc(safeUrl(p.link))}" rel="nofollow">Find out more</a></p>` : ''}
        </div>`).join('')}
      </div></section>
      <section class="block"><div class="wrap two-col">
        <div><h2>${esc(d.getting_here_heading)}</h2>${paras(d.getting_here_text)}</div>
        ${mapOk
          ? `<iframe class="map" src="${esc(map)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map"></iframe>`
          : `<div class="photo" style="--ph: linear-gradient(135deg,#c7cfc1,#ece6d8); color:#4b5248"><span>A Google Map would go here</span></div>`}
      </div></section>`;
  }

  function renderBook(d, site) {
    const guestOpts = Array.from({ length: Math.max(1, d.max_guests || 4) }, (_, i) =>
      `<option${i === 1 ? ' selected' : ''}>${i + 1}</option>`).join('');
    return `
      <section class="page-head"><div class="wrap">
        <h1>${esc(d.title)}</h1><p>${esc(d.intro)}</p>
      </div></section>
      <section class="block"><div class="wrap">
        <h2>Prices</h2>
        <table class="prices">
          <thead><tr><th>Season</th><th>When</th><th>Per night</th></tr></thead>
          <tbody>${(d.seasons || []).map((s) =>
            `<tr><td>${esc(s.name)}</td><td>${esc(s.when)}</td><td>£${esc(s.price)}</td></tr>`).join('')}</tbody>
        </table>
        <p class="small" style="margin-top:.8rem">${esc(d.prices_note)}</p>
      </div></section>
      <section class="block"><div class="wrap">
        <h2>Availability</h2>
        <div class="cal-controls">
          <button type="button" id="cal-prev" aria-label="Previous months">‹</button>
          <span class="small">Tap your arrival date, then your departure date</span>
          <button type="button" id="cal-next" aria-label="Next months">›</button>
        </div>
        <div id="calendar" class="cal-months"></div>
        <div class="legend">
          <span><i style="background:var(--sage-light)"></i>Available</span>
          <span><i style="background:var(--booked)"></i>Booked</span>
          <span><i style="background:var(--sage)"></i>Your dates</span>
        </div>
        <div id="selection" class="selection" aria-live="polite"></div>
        <p class="small" style="margin-top:.8rem">${esc(d.calendar_note)}</p>
      </div></section>
      <section class="block" id="enquire"><div class="wrap two-col">
        <div>
          <h2>${esc(d.form_heading)}</h2>
          <form id="enquiry-form" class="enquiry" novalidate>
            <div class="row2">
              <div><label for="name">Your name</label><input id="name" name="name" autocomplete="name" required></div>
              <div><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required></div>
            </div>
            <div><label for="phone">Phone (optional)</label><input id="phone" name="phone" type="tel" autocomplete="tel"></div>
            <div class="row2">
              <div><label for="arrive">Arrival</label><input id="arrive" name="arrive" type="date" required></div>
              <div><label for="depart">Departure</label><input id="depart" name="depart" type="date" required></div>
            </div>
            <div class="row2">
              <div><label for="guests">Guests</label><select id="guests" name="guests">${guestOpts}</select></div>
              <div><label for="dog">Bringing a dog?</label><select id="dog" name="dog">
                <option value="no">No</option><option value="yes">Yes (£${esc(d.dog_fee)})</option></select></div>
            </div>
            <div><label for="message">Anything else? (optional)</label>
              <textarea id="message" name="message" placeholder="Arrival time, special occasions, questions…"></textarea></div>
            <p id="estimate" class="small" aria-live="polite"></p>
            <p id="form-error" class="error" role="alert" hidden></p>
            <div><button class="btn" type="submit">Send booking request</button></div>
            <p class="hint">Sending a request doesn't commit you to anything. Your booking is confirmed once the deposit is paid.</p>
          </form>
          <div id="thanks" class="thanks" hidden tabindex="-1"></div>
        </div>
        <div class="card">
          <h3>${esc(d.steps_heading)}</h3>
          <ol class="ticks">${(d.steps || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
          <p>${esc(d.contact_note)}${site.phone ? ` <strong><a href="${tel(site.phone)}">${esc(site.phone)}</a></strong>` : ''}</p>
        </div>
      </div></section>`;
  }

  // ---------- Booking calendar + form (Prices & Booking page) ----------
  function bookingLogic(d) {
    const MIN_NIGHTS = Math.max(1, Number(d.min_nights) || 1);
    const MAX_GUESTS = Math.max(1, Number(d.max_guests) || 4);
    const DOG_FEE = Number(d.dog_fee) || 0;
    const MONTHS_AHEAD = 12;
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
      'August', 'September', 'October', 'November', 'December'];

    // Price per night for each month, from the seasons the owners set.
    const seasons = d.seasons || [];
    const fallback = Math.min(...seasons.map((s) => Number(s.price) || Infinity), Infinity);
    const monthRate = MONTH_NAMES.map((m) => {
      const s = seasons.find((x) => (x.months || []).includes(m));
      return s ? Number(s.price) : (isFinite(fallback) ? fallback : 0);
    });
    const nightlyRate = (dt) => monthRate[dt.getMonth()];

    const DAY = 864e5;
    const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
    const addDays = (dt, n) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n);
    const key = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const parse = (s) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return null;
      const [y, m, dd] = s.split('-').map(Number);
      return new Date(y, m - 1, dd);
    };
    const nightsBetween = (a, b) => Math.round((b - a) / DAY);
    const fmtLong = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const fmtMonth = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
    const money = (n) => '£' + n.toLocaleString('en-GB');

    // Made-up bookings for the demo: [days from today, nights].
    const SAMPLE = [[2, 4], [10, 7], [24, 3], [38, 7], [52, 4], [66, 7],
                    [80, 3], [94, 7], [115, 7], [140, 4], [170, 7], [200, 3]];
    const booked = new Set();
    const t0 = today();
    SAMPLE.forEach(([s, n]) => { for (let i = 0; i < n; i++) booked.add(key(addDays(t0, s + i))); });
    const isBooked = (dt) => booked.has(key(dt));
    const rangeFree = (a, b) => { for (let x = a; x < b; x = addDays(x, 1)) if (isBooked(x)) return false; return true; };
    const quote = (a, b, dog) => { let t = 0; for (let x = a; x < b; x = addDays(x, 1)) t += nightlyRate(x); return t + (dog ? DOG_FEE : 0); };

    let arrive = null, depart = null, offset = 0;
    const calEl = document.getElementById('calendar');
    const selEl = document.getElementById('selection');
    const prevBtn = document.getElementById('cal-prev');
    const nextBtn = document.getElementById('cal-next');
    const form = document.getElementById('enquiry-form');
    const thanks = document.getElementById('thanks');

    function renderMonth(year, month) {
      const box = document.createElement('div');
      box.className = 'cal-month';
      const first = new Date(year, month, 1);
      box.innerHTML = `<h3>${fmtMonth.format(first)}</h3>`;
      const grid = document.createElement('div');
      grid.className = 'cal-grid';
      ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((l) => {
        const h = document.createElement('div'); h.className = 'cal-dow'; h.textContent = l; grid.appendChild(h);
      });
      for (let i = 0; i < (first.getDay() + 6) % 7; i++) {
        const e = document.createElement('div'); e.className = 'cal-empty'; grid.appendChild(e);
      }
      const t = today();
      const days = new Date(year, month + 1, 0).getDate();
      for (let n = 1; n <= days; n++) {
        const dt = new Date(year, month, n);
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'cal-day'; b.textContent = n; b.dataset.date = key(dt);
        const past = dt < t;
        let disabled = past;
        let label = fmtLong.format(dt);
        if (!past) {
          // When picking a departure, a booked day is fine (changeover) if the nights before it are free.
          disabled = (arrive && !depart && dt > arrive) ? !rangeFree(arrive, dt) : isBooked(dt);
        }
        if (past) b.classList.add('past');
        if (isBooked(dt) && !past) label += ', booked';
        if (arrive && key(dt) === key(arrive)) { b.classList.add('selected'); label += ', arrival'; }
        if (depart && key(dt) === key(depart)) { b.classList.add('selected'); label += ', departure'; }
        if (arrive && depart && dt > arrive && dt < depart) b.classList.add('in-range');
        b.disabled = disabled;
        b.setAttribute('aria-label', label);
        b.addEventListener('click', () => pick(dt));
        grid.appendChild(b);
      }
      box.appendChild(grid);
      return box;
    }

    function renderCalendar() {
      calEl.innerHTML = '';
      const t = today();
      for (let i = 0; i < 2; i++) {
        const m = new Date(t.getFullYear(), t.getMonth() + offset + i, 1);
        calEl.appendChild(renderMonth(m.getFullYear(), m.getMonth()));
      }
      prevBtn.disabled = offset <= 0;
      nextBtn.disabled = offset >= MONTHS_AHEAD - 2;
      renderSelection();
    }

    function pick(dt) {
      if (!arrive || depart || dt <= arrive) { arrive = dt; depart = null; } else { depart = dt; }
      renderCalendar();
      form.arrive.value = arrive ? key(arrive) : '';
      form.depart.value = depart ? key(depart) : '';
      updateEstimate();
    }

    function renderSelection() {
      selEl.classList.remove('warn');
      if (!arrive) { selEl.innerHTML = 'Tap your <strong>arrival</strong> date to start.'; return; }
      if (!depart) { selEl.innerHTML = `Arriving <strong>${fmtLong.format(arrive)}</strong>. Now tap your <strong>departure</strong> date.`; return; }
      const nights = nightsBetween(arrive, depart);
      if (nights < MIN_NIGHTS) {
        selEl.classList.add('warn');
        selEl.innerHTML = `That's ${nights} night${nights === 1 ? '' : 's'}. The minimum stay is ${MIN_NIGHTS} nights, so please pick a later departure date.`;
        return;
      }
      selEl.innerHTML = `<strong>${fmtLong.format(arrive)}</strong> to <strong>${fmtLong.format(depart)}</strong>
        · ${nights} nights · estimated <strong>${money(quote(arrive, depart, false))}</strong>
        <div style="margin-top:.8rem"><a class="btn" href="#enquire">Request these dates</a></div>`;
    }

    function updateEstimate() {
      const out = document.getElementById('estimate');
      const a = parse(form.arrive.value), b = parse(form.depart.value);
      out.textContent = (a && b && b > a && nightsBetween(a, b) >= MIN_NIGHTS && rangeFree(a, b))
        ? `Estimated price: ${money(quote(a, b, form.dog.value === 'yes'))} for ${nightsBetween(a, b)} nights.` : '';
    }

    prevBtn.addEventListener('click', () => { offset--; renderCalendar(); });
    nextBtn.addEventListener('click', () => { offset++; renderCalendar(); });
    renderCalendar();

    form.arrive.min = form.depart.min = key(today());
    ['arrive', 'depart', 'dog'].forEach((n) => form[n].addEventListener('change', updateEstimate));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = document.getElementById('form-error');
      const a = parse(form.arrive.value), b = parse(form.depart.value);
      const guests = Number(form.guests.value);
      let problem = '';
      if (!form.name.value.trim()) problem = 'Please add your name.';
      else if (!form.email.value || !form.email.checkValidity()) problem = 'Please add a valid email address.';
      else if (!a || !b) problem = 'Please choose arrival and departure dates.';
      else if (a < today()) problem = 'Your arrival date is in the past.';
      else if (b <= a) problem = 'Departure needs to be after arrival.';
      else if (nightsBetween(a, b) < MIN_NIGHTS) problem = `The minimum stay is ${MIN_NIGHTS} nights.`;
      else if (!rangeFree(a, b)) problem = 'Some of those nights are already booked. Please check the calendar above.';
      else if (!(guests >= 1 && guests <= MAX_GUESTS)) problem = `The lodge sleeps up to ${MAX_GUESTS}.`;
      if (problem) { err.textContent = problem; err.hidden = false; return; }
      err.hidden = true;
      const dog = form.dog.value === 'yes';
      thanks.innerHTML = `
        <h3>Thanks, ${esc(form.name.value.trim().split(' ')[0])}. Your request is in</h3>
        <p>We'll check the dates and reply to <strong>${esc(form.email.value)}</strong> within a day,
        with our booking terms and a secure link to pay the deposit.</p>
        <p><strong>${fmtLong.format(a)}</strong> to <strong>${fmtLong.format(b)}</strong>
        · ${nightsBetween(a, b)} nights · ${guests} guest${guests === 1 ? '' : 's'}${dog ? ' + dog' : ''}
        · estimated <strong>${money(quote(a, b, dog))}</strong></p>
        <div class="demo-note"><strong>Demo:</strong> nothing was sent. On the real site this form
        would email the owners (a free form service such as Formspree does this). They'd reply,
        send a payment link, then block the dates in Airbnb.</div>`;
      form.hidden = true;
      thanks.hidden = false;
      thanks.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ---------- Go ----------
  const PAGES = {
    home: { file: 'home', render: renderHome, title: (d) => d.page_title },
    lodge: { file: 'lodge', render: renderLodge },
    area: { file: 'area', render: renderArea },
    book: { file: 'booking', render: renderBook, after: bookingLogic }
  };

  (async function init() {
    const main = document.getElementById('main');
    const cfg = PAGES[page];
    try {
      const [site, data] = await Promise.all([load('site'), load(cfg.file)]);
      renderChrome(site);
      main.innerHTML = cfg.render(data, site);
      document.title = (cfg.title && cfg.title(data)) || `${data.title} | ${site.name}`;
      if (cfg.after) cfg.after(data);
      // If arriving at /book/#enquire, scroll once the content exists.
      if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
    } catch (err) {
      console.error(err);
      main.innerHTML = `<section class="page-head"><div class="wrap"><h1>Sorry, this page didn't load</h1>
        <p>Please try refreshing. If it keeps happening, call us.</p></div></section>`;
    }
  })();
})();
