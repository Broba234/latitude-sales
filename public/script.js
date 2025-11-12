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
  
  // Only update parallax for visible elements (performance optimization)
  parallaxEls.forEach((el) => {
    const rect = el.getBoundingClientRect();
    // Skip if element is far off-screen (saves computation)
    if (rect.bottom < -200 || rect.top > window.innerHeight + 200) {
      return;
    }
    const speed = Number(el.dataset.speed || 0.25);
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

// Progressive hero background loading
function loadHeroBackground() {
  const heroImg = new Image();
  heroImg.onload = function() {
    document.body.classList.add('hero-loaded');
  };
  heroImg.src = '/images/hero2.png';
}
// Load hero background after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadHeroBackground);
} else {
  loadHeroBackground();
}

// Use passive listeners for better scroll performance
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('load', updateParallax, { passive: true });
window.addEventListener('resize', updateParallax, { passive: true });

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

// Intersection Observer for optimized lazy loading
let imageObserver = null;
function initImageObserver() {
  if ('IntersectionObserver' in window) {
    imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const dataSrc = img.dataset.src;
          if (dataSrc) {
            // Load the actual image
            img.src = dataSrc;
            img.removeAttribute('data-src');
            // Remove blur effect once loaded
            img.addEventListener('load', function() {
              img.classList.add('loaded');
              img.parentElement?.classList.remove('loading');
            }, { once: true });
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px', // Start loading 50px before image enters viewport
      threshold: 0.01
    });
  }
}

// Render collections grid (static JSON)
async function loadCollections() {
  const grid = document.getElementById('brandsGrid');
  const empty = document.getElementById('brandsEmpty');
  if (!grid) return;

  // Initialize image observer if not already done
  if (!imageObserver) {
    initImageObserver();
  }

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
    a.className = 'card-tile loading'; // Add loading class for blur effect

    const img = document.createElement('img');
    img.alt = c.name || 'Collection image';
    // Set dimensions to prevent layout shift (2:3 aspect ratio for card-tile)
    img.width = 400;
    img.height = 600;
    img.style.aspectRatio = '2 / 3';
    
    // Use data-src for lazy loading with intersection observer
    const imageUrl = c.image_url || placeholderImage();
    if (imageObserver && imageUrl !== placeholderImage()) {
      // Set a tiny blur placeholder first
      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600"%3E%3Crect width="100%25" height="100%25" fill="%23f0efe9"/%3E%3C/svg%3E';
      img.dataset.src = imageUrl;
      img.loading = 'lazy';
      img.fetchPriority = 'low'; // Low priority for below-the-fold images
      imageObserver.observe(img);
    } else {
      // Fallback: use native lazy loading
      img.loading = 'lazy';
      img.fetchPriority = 'low';
      img.src = imageUrl;
    }
    
    img.decoding = 'async'; // Decode images asynchronously
    // Add error handling for broken images
    img.onerror = function() {
      this.src = placeholderImage();
      this.classList.add('loaded');
      this.parentElement?.classList.remove('loading');
    };
    // Remove loading class when image loads
    img.addEventListener('load', function() {
      this.classList.add('loaded');
      this.parentElement?.classList.remove('loading');
    }, { once: true });
    
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
