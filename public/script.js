// Frontend for index.html
// - Parallax backgrounds
// - Fetch and render collections from Supabase

// Static mode: no backend. Brands are loaded from /brands.json

// Lightweight parallax for sections (backgrounds only)
const parallaxEls = Array.from(document.querySelectorAll('.parallax'));
// Background fade overlay element
const bgFader = document.querySelector('.bg-fader');
const statementEl = document.querySelector('.statement');
const heroSection = document.querySelector('.hero');

function getScrollY() {
  return (
    (typeof window.scrollY === 'number' ? window.scrollY : null) ??
    (typeof window.pageYOffset === 'number' ? window.pageYOffset : null) ??
    (document.documentElement && document.documentElement.scrollTop) ??
    (document.body && document.body.scrollTop) ??
    0
  );
}

let ticking = false;
function updateParallax() {
  ticking = false;
  const scrollY = getScrollY();
  // Parallax the hero background (body) to scroll less than content
  const heroSpeed = 0.35; // lower = slower movement
  document.body.style.backgroundPosition = `center ${-(scrollY * heroSpeed)}px`;
  // Fade in white overlay as we leave the hero
  if (bgFader) {
    const hero = document.querySelector('.hero');
    const heroHeight = hero ? hero.offsetHeight : 1;
    // Fade faster: complete most of the fade by ~40% of hero height
    const progress = Math.min(1, Math.max(0, scrollY / (heroHeight * 0.4)));
    bgFader.style.opacity = String(0.92 * progress);
  }
  // Fade out hero statement based on scroll progress through the hero
  if (statementEl && heroSection) {
    const rect = heroSection.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 1;
    // Progress of hero scrolling past the top (0 -> 1 over ~80% of viewport)
    const t = Math.min(1, Math.max(0, (-rect.top) / (vh * 0.8)));
    const opacity = 1 - t;
    statementEl.style.opacity = String(opacity);
    statementEl.style.transform = `translateY(${t * 14}px)`;
  }
  parallaxEls.forEach((el) => {
    const speed = Number(el.dataset.speed || 0.25);
    const rect = el.getBoundingClientRect();
    const offsetTop = window.scrollY + rect.top;
    const y = Math.round((scrollY - offsetTop) * speed);
    el.style.backgroundPosition = `center ${-y}px`;
  });
}

function onScroll() {
  if (!ticking) {
    window.requestAnimationFrame(updateParallax);
    ticking = true;
  }
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('load', updateParallax);
window.addEventListener('resize', updateParallax);

// Transparent header over hero; solid after hero
const headerEl = document.querySelector('.topbar');
const heroEl = document.querySelector('.hero');
function updateHeaderSolid() {
  if (!headerEl || !heroEl) return;
  const threshold = heroEl.offsetHeight - 80; // near end of hero
  if ((window.scrollY || window.pageYOffset) > threshold) {
    headerEl.classList.add('solid');
  } else {
    headerEl.classList.remove('solid');
  }
}
window.addEventListener('scroll', updateHeaderSolid, { passive: true });
window.addEventListener('load', updateHeaderSolid);
window.addEventListener('resize', updateHeaderSolid);

// Smooth scroll for in-page anchors
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = document.querySelector(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// No sticky hero logo; brand is permanently in the header

// Render collections grid (static JSON)
async function loadCollections() {
  const grid = document.getElementById('brandsGrid');
  const empty = document.getElementById('brandsEmpty');
  if (!grid) return;

  grid.innerHTML = '';
  let data = [];
  try {
    const resp = await fetch('/brands.json', { cache: 'no-store' });
    if (resp.ok) data = await resp.json();
  } catch (e) {
    console.warn('brands.json missing or invalid');
  }

  if (!Array.isArray(data) || data.length === 0) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  for (const c of data) {
    const a = document.createElement('a');
    a.href = c.link_url || '#';
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'card-tile';

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = c.name || 'Collection image';
    img.src = c.image_url || placeholderImage();
    a.appendChild(img);

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    const label = document.createElement('div');
    label.className = 'brand-name';
    label.textContent = c.name || '';
    overlay.appendChild(label);
    a.appendChild(overlay);

    grid.appendChild(a);
  }

  // Fill placeholders up to 6 tiles
  const maxSlots = 6;
  const placeholders = Math.max(0, maxSlots - data.length);
  for (let i = 0; i < placeholders; i++) {
    const ph = document.createElement('div');
    ph.className = 'card-tile placeholder';
    grid.appendChild(ph);
  }

}

function placeholderImage() {
  // Simple SVG data URI as fallback
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>\n` +
      `<rect width='100%' height='100%' fill='#222'/>\n` +
      `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#888' font-family='Inter, Arial' font-size='20'>Image</text>\n` +
    `</svg>`
  );
  return `data:image/svg+xml,${svg}`;
}

loadCollections();
