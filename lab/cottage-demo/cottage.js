// Orchard Cottage demo — availability calendar, price estimate and
// enquiry form. Everything here runs in the browser; nothing is sent
// anywhere. The booked dates below are made up for the demo. On a
// real site they'd come from the Airbnb calendar.

(function () {
  // ---------- Settings the owners would change ----------
  const MIN_NIGHTS = 3;
  const MAX_GUESTS = 4;
  const DOG_FEE = 20;          // per stay
  const MONTHS_AHEAD = 12;     // how far ahead guests can look

  // Nightly price by season.
  function nightlyRate(d) {
    const m = d.getMonth();    // 0 = Jan
    const day = d.getDate();
    const christmas = (m === 11 && day >= 20) || (m === 0 && day <= 2);
    if (christmas || m === 6 || m === 7) return 150;          // High
    if ((m >= 3 && m <= 5) || m === 8 || m === 9) return 120; // Mid
    return 95;                                                // Low
  }

  // ---------- Date helpers (local dates, no time zones) ----------
  const DAY = 24 * 60 * 60 * 1000;
  function today() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }
  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }
  function key(d) {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
  function parse(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return null;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function nightsBetween(a, b) {
    return Math.round((b - a) / DAY);
  }
  const fmtLong = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
  const fmtMonth = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
  const money = (n) => '£' + n.toLocaleString('en-GB');

  // ---------- Made-up bookings, relative to today ----------
  // [start offset, nights]
  const SAMPLE = [[2, 4], [10, 7], [24, 3], [38, 7], [52, 4], [66, 7],
                  [80, 3], [94, 7], [115, 7], [140, 4], [170, 7], [200, 3]];
  const booked = new Set();
  const t0 = today();
  SAMPLE.forEach(([start, nights]) => {
    for (let i = 0; i < nights; i++) booked.add(key(addDays(t0, start + i)));
  });
  function isBooked(d) { return booked.has(key(d)); }

  // Every night from arrival up to (not including) departure is free?
  function rangeFree(a, b) {
    for (let d = a; d < b; d = addDays(d, 1)) if (isBooked(d)) return false;
    return true;
  }

  function quote(a, b, dog) {
    let total = 0;
    for (let d = a; d < b; d = addDays(d, 1)) total += nightlyRate(d);
    if (dog) total += DOG_FEE;
    return total;
  }

  // ---------- Shared state ----------
  let arrive = null;
  let depart = null;

  // ---------- Calendar ----------
  const calEl = document.getElementById('calendar');
  const selEl = document.getElementById('selection');
  const prevBtn = document.getElementById('cal-prev');
  const nextBtn = document.getElementById('cal-next');
  let offset = 0; // months from current month

  function renderMonth(year, month) {
    const box = document.createElement('div');
    box.className = 'cal-month';
    const first = new Date(year, month, 1);
    box.innerHTML = `<h3>${fmtMonth.format(first)}</h3>`;

    const grid = document.createElement('div');
    grid.className = 'cal-grid';
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((l) => {
      const h = document.createElement('div');
      h.className = 'cal-dow';
      h.textContent = l;
      grid.appendChild(h);
    });

    const lead = (first.getDay() + 6) % 7; // Monday-first
    for (let i = 0; i < lead; i++) {
      const e = document.createElement('div');
      e.className = 'cal-empty';
      grid.appendChild(e);
    }

    const days = new Date(year, month + 1, 0).getDate();
    const t = today();
    for (let n = 1; n <= days; n++) {
      const d = new Date(year, month, n);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cal-day';
      b.textContent = n;
      b.dataset.date = key(d);

      const past = d < t;
      let disabled = past;
      let label = fmtLong.format(d);

      if (!past) {
        if (arrive && !depart && d > arrive) {
          // Choosing a departure day: allowed if every night before it is free.
          // (A booked day can still be a departure — that's changeover.)
          disabled = !rangeFree(arrive, d);
        } else {
          disabled = isBooked(d);
        }
      }
      if (past) b.classList.add('past');
      if (isBooked(d) && !past) label += ' — booked';
      if (arrive && key(d) === key(arrive)) { b.classList.add('selected'); label += ' — arrival'; }
      if (depart && key(d) === key(depart)) { b.classList.add('selected'); label += ' — departure'; }
      if (arrive && depart && d > arrive && d < depart) b.classList.add('in-range');

      b.disabled = disabled;
      b.setAttribute('aria-label', label);
      b.addEventListener('click', () => pick(d));
      grid.appendChild(b);
    }
    box.appendChild(grid);
    return box;
  }

  function renderCalendar() {
    if (!calEl) return;
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

  function pick(d) {
    if (!arrive || depart || d <= arrive) {
      arrive = d;
      depart = null;
    } else {
      depart = d;
    }
    renderCalendar();
    syncFormDates();
  }

  function renderSelection() {
    if (!selEl) return;
    selEl.classList.remove('warn');
    if (!arrive) {
      selEl.innerHTML = 'Tap your <strong>arrival</strong> date to start.';
      return;
    }
    if (!depart) {
      selEl.innerHTML = `Arriving <strong>${fmtLong.format(arrive)}</strong>. Now tap your <strong>departure</strong> date.`;
      return;
    }
    const nights = nightsBetween(arrive, depart);
    if (nights < MIN_NIGHTS) {
      selEl.classList.add('warn');
      selEl.innerHTML = `That's ${nights} night${nights === 1 ? '' : 's'}. The minimum stay is ${MIN_NIGHTS} nights — please pick a later departure date.`;
      return;
    }
    selEl.innerHTML = `
      <strong>${fmtLong.format(arrive)}</strong> to <strong>${fmtLong.format(depart)}</strong>
      · ${nights} nights · estimated <strong>${money(quote(arrive, depart, false))}</strong>
      <div style="margin-top:.8rem"><a class="btn" href="#enquire">Request these dates</a></div>`;
  }

  if (calEl) {
    prevBtn.addEventListener('click', () => { offset--; renderCalendar(); });
    nextBtn.addEventListener('click', () => { offset++; renderCalendar(); });
    renderCalendar();
  }

  // ---------- Enquiry form ----------
  const form = document.getElementById('enquiry-form');
  const thanks = document.getElementById('thanks');

  function syncFormDates() {
    if (!form) return;
    form.arrive.value = arrive ? key(arrive) : '';
    form.depart.value = depart ? key(depart) : '';
    updateEstimate();
  }

  function updateEstimate() {
    const out = document.getElementById('estimate');
    if (!out) return;
    const a = parse(form.arrive.value);
    const b = parse(form.depart.value);
    if (a && b && b > a && nightsBetween(a, b) >= MIN_NIGHTS && rangeFree(a, b)) {
      out.textContent = `Estimated price: ${money(quote(a, b, form.dog.value === 'yes'))} for ${nightsBetween(a, b)} nights.`;
    } else {
      out.textContent = '';
    }
  }

  if (form) {
    const t = key(today());
    form.arrive.min = t;
    form.depart.min = t;
    ['arrive', 'depart', 'dog'].forEach((n) => form[n].addEventListener('change', updateEstimate));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = document.getElementById('form-error');
      const a = parse(form.arrive.value);
      const b = parse(form.depart.value);
      const guests = Number(form.guests.value);
      let problem = '';

      if (!form.name.value.trim()) problem = 'Please add your name.';
      else if (!form.email.checkValidity() || !form.email.value) problem = 'Please add a valid email address.';
      else if (!a || !b) problem = 'Please choose arrival and departure dates.';
      else if (a < today()) problem = 'Your arrival date is in the past.';
      else if (b <= a) problem = 'Departure needs to be after arrival.';
      else if (nightsBetween(a, b) < MIN_NIGHTS) problem = `The minimum stay is ${MIN_NIGHTS} nights.`;
      else if (!rangeFree(a, b)) problem = 'Some of those nights are already booked — please check the calendar above.';
      else if (!(guests >= 1 && guests <= MAX_GUESTS)) problem = `The cottage sleeps up to ${MAX_GUESTS}.`;

      if (problem) {
        err.textContent = problem;
        err.hidden = false;
        return;
      }
      err.hidden = true;

      const dog = form.dog.value === 'yes';
      thanks.innerHTML = `
        <h3>Thanks, ${escapeHtml(form.name.value.trim().split(' ')[0])} — your request is in</h3>
        <p>We'll check the dates and reply to <strong>${escapeHtml(form.email.value)}</strong> within a day,
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

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Mark current page in nav.
  document.querySelectorAll('.c-nav a').forEach((a) => {
    if (new URL(a.href).pathname === window.location.pathname) a.setAttribute('aria-current', 'page');
  });
})();
