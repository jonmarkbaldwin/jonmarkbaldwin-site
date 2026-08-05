// Injects shared HTML partials (nav, footer) into any page that has
// an element with a matching data-include attribute.
// Usage: <div data-include="/partials/nav.html"></div>

async function loadIncludes() {
  const targets = document.querySelectorAll('[data-include]');

  await Promise.all(
    Array.from(targets).map(async (el) => {
      const path = el.getAttribute('data-include');
      try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`${path} responded ${res.status}`);
        el.innerHTML = await res.text();
      } catch (err) {
        console.error('Include failed:', path, err);
      }
    })
  );

  // Mark the current page's nav link, once nav has loaded.
  const navLinks = document.querySelectorAll('.site-nav a');
  navLinks.forEach((link) => {
    const linkPath = new URL(link.href).pathname;
    if (linkPath === window.location.pathname) {
      link.setAttribute('aria-current', 'page');
    }
  });

  // Fill in the footer's copyright year, if present.
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  document.dispatchEvent(new Event('includes:loaded'));
}

loadIncludes();
