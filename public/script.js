// Frontend for index.html
// - Parallax backgrounds
// - Fetch and render collections from Supabase

// Static mode: no backend. Brands are loaded from /brands.json

// Perf: disable parallax/scroll-driven background work to keep scrolling smooth
const parallaxEls = [];
const bgFader = null;
const statementEl = null;
const heroSection = null;

function getScrollY() {
  return (
    (typeof window.scrollY === 'number' ? window.scrollY : null) ??
    (typeof window.pageYOffset === 'number' ? window.pageYOffset : null) ??
    (document.documentElement && document.documentElement.scrollTop) ??
    (document.body && document.body.scrollTop) ??
    0
  );
}

// No-op functions retained for backward compatibility
let ticking = false;
function updateParallax() { ticking = false; }
function onScroll() { /* disabled */ }

// Removed scroll-driven parallax listeners to avoid jank

// Header stays static; no scroll listener needed

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

// Mobile menu toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const nav = document.querySelector('.nav');
if (mobileMenuToggle && nav) {
  mobileMenuToggle.addEventListener('click', function() {
    const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
    mobileMenuToggle.setAttribute('aria-expanded', String(!isExpanded));
    nav.classList.toggle('mobile-open');
    // Prevent body scroll when menu is open
    if (!isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });
  
  // Close menu when clicking on a nav link
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', function() {
      mobileMenuToggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('mobile-open');
      document.body.style.overflow = '';
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', function(e) {
    if (nav.classList.contains('mobile-open') && 
        !nav.contains(e.target) && 
        !mobileMenuToggle.contains(e.target)) {
      mobileMenuToggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('mobile-open');
      document.body.style.overflow = '';
    }
  });
}

// No sticky hero logo; brand is permanently in the header

// Preload all brand images up-front so they never flicker
async function preloadBrandImages() {
  try {
    const resp = await fetch('/brands.json', { cache: 'force-cache' });
    if (!resp.ok) return;
    const brands = await resp.json();
    if (!Array.isArray(brands)) return;
    for (const c of brands) {
      if (!c || !c.image_url) continue;
      const l = document.createElement('link');
      l.rel = 'preload';
      l.as = 'image';
      l.href = c.image_url;
      document.head.appendChild(l);
    }
  } catch (e) {
    // ignore
  }
}

preloadBrandImages();

// Render collections grid (static JSON)
async function loadCollections() {
  const grid = document.getElementById('brandsGrid');
  const empty = document.getElementById('brandsEmpty');
  if (!grid) return;

  grid.innerHTML = '';
  let data = [];
  try {
    // Use default cache strategy (browser cache) instead of no-store
    const resp = await fetch('/brands.json');
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
    img.alt = c.name || 'Collection image';
    // Set dimensions to prevent layout shift (2:3 aspect ratio for card-tile)
    img.width = 400;
    img.height = 600;
    img.style.aspectRatio = '2 / 3';
    
    const imageUrl = c.image_url || placeholderImage();
    
    // Load images eagerly to prevent unload/reload flicker
    img.loading = 'eager';
    img.decoding = 'async';
    try { img.fetchPriority = 'high'; } catch {}
    img.src = imageUrl;
    
    // Mark as loaded immediately if already cached, otherwise wait for load
    const markImageLoaded = function() {
      if (!img.classList.contains('loaded')) {
        img.classList.add('loaded');
        a.classList.remove('loading');
      }
    };
    
    // Check if image is already loaded (from cache) - check multiple times for reliability
    const checkAndMarkLoaded = function() {
      if (img.complete && img.naturalWidth > 0) {
        markImageLoaded();
        return true;
      }
      return false;
    };
    
    // Immediate check
    if (!checkAndMarkLoaded()) {
      // Check again after a tiny delay (handles cached images that load instantly)
      setTimeout(() => {
        if (!checkAndMarkLoaded()) {
          // Wait for load event
          img.addEventListener('load', markImageLoaded, { once: true });
          // Also handle error case
          img.addEventListener('error', function() {
            this.src = placeholderImage();
            markImageLoaded();
          }, { once: true });
        }
      }, 0);
    }
    
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
