// Admin UI: login + CRUD for collections using Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_STORAGE_BUCKET } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authView = document.getElementById('authView');
const appView = document.getElementById('appView');
const loginForm = document.getElementById('loginForm');
const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const authError = document.getElementById('authError');
const logoutBtn = document.getElementById('logoutBtn');

const form = document.getElementById('collectionForm');
const idEl = document.getElementById('collectionId');
const nameEl = document.getElementById('brandName');
const linkEl = document.getElementById('linkUrl');
const fileEl = document.getElementById('imageFile');
const imageAdjust = document.getElementById('imageAdjust');
const previewImg = document.getElementById('adjustPreview');
const zoomRange = document.getElementById('zoomRange');
const posXRange = document.getElementById('posXRange');
const posYRange = document.getElementById('posYRange');
const activeEl = document.getElementById('active');
const sortEl = document.getElementById('sortOrder');
const resetBtn = document.getElementById('resetForm');
const formError = document.getElementById('formError');
const list = document.getElementById('collectionsAdminList');

function setViews(authed) {
  authView.hidden = !!authed;
  appView.hidden = !authed;
}

async function refreshSession() {
  const { data } = await supabase.auth.getSession();
  setViews(!!data.session);
  if (data.session) {
    await loadCollectionsAdmin();
  }
}

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.hidden = true;
  const email = emailEl.value.trim();
  const password = passwordEl.value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    authError.textContent = error.message;
    authError.hidden = false;
  } else {
    setViews(true);
    await loadCollectionsAdmin();
  }
});

logoutBtn?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  setViews(false);
});

resetBtn?.addEventListener('click', () => {
  clearForm();
});

function clearForm() {
  idEl.value = '';
  nameEl.value = '';
  linkEl.value = '';
  fileEl.value = '';
  activeEl.checked = true;
  sortEl.value = '';
  formError.hidden = true;
  if (imageAdjust) imageAdjust.hidden = true;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;

  const id = idEl.value || null;
  const name = nameEl.value.trim();
  const link_url = linkEl.value.trim();
  const active = !!activeEl.checked;
  const sort_order = sortEl.value === '' ? null : Number(sortEl.value);
  let file = fileEl.files?.[0] || null;

  // Require image for new brands
  if (!id && !file) {
    formError.textContent = 'Image is required for new brands.';
    formError.hidden = false;
    return;
  }

  try {
    let image_url = null;

    // Pre-crop to 2:3 portrait if adjustments are available
    if (file && imageAdjust && !imageAdjust.hidden && previewImg?.dataset.ready === '1') {
      try {
        file = await cropToPortrait(file, {
          zoom: parseFloat(zoomRange?.value || '1'),
          posX: parseFloat(posXRange?.value || '0'),
          posY: parseFloat(posYRange?.value || '0')
        });
      } catch (e) {
        console.warn('Image pre-crop failed; uploading original image.', e);
      }
    }

    if (!id) {
      // Create row first to get an id
      const { data, error } = await supabase
        .from('collections')
        .insert([{ name, link_url, active, sort_order }])
        .select('id')
        .single();
      if (error) throw error;
      const newId = data.id;

      if (file) {
        try {
          image_url = await uploadImage(file, newId);
        } catch (uploadErr) {
          // Roll back inserted row if upload fails
          await supabase.from('collections').delete().eq('id', newId);
          throw uploadErr;
        }
        const { error: upErr } = await supabase
          .from('collections')
          .update({ image_url })
          .eq('id', newId);
        if (upErr) {
          // Attempt to roll back row if update fails
          await supabase.from('collections').delete().eq('id', newId);
          throw upErr;
        }
      }
    } else {
      if (file) {
        image_url = await uploadImage(file, id);
      }
      const payload = { name, link_url, active, sort_order };
      if (image_url) payload.image_url = image_url;
      const { error } = await supabase
        .from('collections')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
    }

    clearForm();
    await loadCollectionsAdmin();
  } catch (err) {
    formError.textContent = err.message || String(err);
    formError.hidden = false;
  }
});

async function uploadImage(file, id) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${id}/${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });
  if (error) throw error;
  const { data: publicURL } = supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(data.path);
  return publicURL.publicUrl;
}

async function loadCollectionsAdmin() {
  list.innerHTML = '';
  const { data, error } = await supabase
    .from('collections')
    .select('id,name,link_url,image_url,active,sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) {
    list.innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }
  if (!data || data.length === 0) {
    list.innerHTML = '<div class="empty-state">No brands yet.</div>';
    return;
  }
  for (const c of data) {
    const row = document.createElement('div');
    row.className = 'admin-item';
    const thumb = document.createElement('img');
    thumb.src = c.image_url || 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    thumb.alt = c.name || 'image';
    row.appendChild(thumb);

    const meta = document.createElement('div');
    meta.innerHTML = `
      <div style="font-weight:600">${escapeHtml(c.name)}</div>
      <div style="color:#a9b0bb; font-size:13px;">${escapeHtml(c.link_url || '')}</div>
      <div style="color:${c.active ? '#9ee37d' : '#ff9b9b'}; font-size:12px;">${c.active ? 'Active' : 'Inactive'} · Sort ${c.sort_order ?? ''}</div>
    `;
    row.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'admin-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'btn';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => fillForm(c));
    const delBtn = document.createElement('button');
    delBtn.className = 'btn secondary';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => deleteCollection(c.id));
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    row.appendChild(actions);

    list.appendChild(row);
  }
}

function fillForm(c) {
  idEl.value = c.id;
  nameEl.value = c.name || '';
  linkEl.value = c.link_url || '';
  activeEl.checked = !!c.active;
  sortEl.value = c.sort_order ?? '';
  fileEl.value = '';
  if (c.image_url) {
    setupPreviewWithUrl(c.image_url);
  } else if (imageAdjust) {
    imageAdjust.hidden = true;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteCollection(id) {
  if (!confirm('Delete this brand and its images?')) return;
  try {
    await deleteCollectionAssets(id);
  } catch (e) {
    console.warn('Failed to cleanup storage (continuing to delete row):', e);
  }
  const { error } = await supabase.from('collections').delete().eq('id', id);
  if (error) alert(error.message);
  await loadCollectionsAdmin();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function deleteCollectionAssets(id) {
  const prefix = `${id}`; // folder named after the collection id
  const chunk = 100;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .list(prefix, { limit: chunk, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;
    const paths = data.map((f) => `${prefix}/${f.name}`);
    const { error: remErr } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .remove(paths);
    if (remErr) throw remErr;
    if (data.length < chunk) break;
    offset += chunk;
  }
}

// --- Image adjust / crop logic ---
let objectUrl = null;
fileEl?.addEventListener('change', () => {
  const f = fileEl.files?.[0];
  if (!f) {
    if (imageAdjust) imageAdjust.hidden = true;
    if (previewImg) {
      previewImg.removeAttribute('src');
      previewImg.dataset.ready = '0';
    }
    return;
  }
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(f);
  if (previewImg) previewImg.src = objectUrl;
  if (previewImg) previewImg.onload = () => {
    if (zoomRange) zoomRange.value = zoomRange.min || '0.9';
    if (posXRange) posXRange.value = '0';
    if (posYRange) posYRange.value = '0';
    // compute base scale so the image covers the viewport at zoom=1
    const vp = imageAdjust?.querySelector('.crop-viewport');
    if (vp) {
      const rect = vp.getBoundingClientRect();
      const base = Math.max(rect.width / previewImg.naturalWidth, rect.height / previewImg.naturalHeight);
      previewImg.dataset.baseScale = String(base);
    }
    applyPreviewTransform();
    previewImg.dataset.ready = '1';
    if (imageAdjust) imageAdjust.hidden = false;
  };
});

function applyPreviewTransform() {
  if (!previewImg) return;
  const userZoom = parseFloat(zoomRange?.value || '1');
  const px = parseFloat(posXRange?.value || '0');
  const py = parseFloat(posYRange?.value || '0');
  const base = parseFloat(previewImg.dataset.baseScale || '1');
  const effScale = base * userZoom;
  // translate in px scaled by leftover beyond viewport
  const vp = imageAdjust?.querySelector('.crop-viewport');
  const rect = vp ? vp.getBoundingClientRect() : { width: 0, height: 0 };
  const dw = previewImg.naturalWidth * effScale;
  const dh = previewImg.naturalHeight * effScale;
  const leftoverX = Math.max(0, dw - rect.width);
  const leftoverY = Math.max(0, dh - rect.height);
  const tx = (px / 100) * (leftoverX / 2);
  const ty = (py / 100) * (leftoverY / 2);
  previewImg.style.transform = `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(${effScale})`;
}

;['input','change'].forEach((ev) => {
  zoomRange?.addEventListener(ev, applyPreviewTransform);
  posXRange?.addEventListener(ev, applyPreviewTransform);
  posYRange?.addEventListener(ev, applyPreviewTransform);
});

// Mouse interactions: drag to pan, wheel to zoom
const vpEl = document.querySelector('.crop-viewport');
let dragging = false;
let startX = 0, startY = 0;
let startPX = 0, startPY = 0;

vpEl?.addEventListener('mousedown', (e) => {
  dragging = true;
  startX = e.clientX;
  startY = e.clientY;
  startPX = parseFloat(posXRange?.value || '0');
  startPY = parseFloat(posYRange?.value || '0');
});
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  // Map pixel drag to percent range roughly
  const sens = 0.2; // adjust sensitivity
  const nx = Math.max(-100, Math.min(100, startPX + dx * sens));
  const ny = Math.max(-100, Math.min(100, startPY + dy * sens));
  if (posXRange) posXRange.value = String(nx);
  if (posYRange) posYRange.value = String(ny);
  applyPreviewTransform();
});
window.addEventListener('mouseup', () => { dragging = false; });

vpEl?.addEventListener('wheel', (e) => {
  e.preventDefault();
  const current = parseFloat(zoomRange?.value || '1');
  const delta = -Math.sign(e.deltaY) * 0.05; // up=zoom in, down=zoom out
  const minZ = parseFloat(zoomRange?.min || '0.5');
  const maxZ = parseFloat(zoomRange?.max || '2.5');
  const next = Math.max(minZ, Math.min(maxZ, current + delta));
  if (zoomRange) zoomRange.value = String(next);
  applyPreviewTransform();
}, { passive: false });

async function cropToPortrait(file, opts) {
  const { zoom = 1, posX = 0, posY = 0 } = opts || {};
  const img = await fileToImage(file);
  const canvas = document.createElement('canvas');
  const cw = 1000, ch = 1500; // 2:3 portrait
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d');
  const scaleBase = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
  const scale = scaleBase * Math.max(1, zoom);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const leftoverX = Math.max(0, dw - cw);
  const leftoverY = Math.max(0, dh - ch);
  const dx = (cw - dw) / 2 + (posX / 100) * (leftoverX / 2);
  const dy = (ch - dh) / 2 + (posY / 100) * (leftoverY / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cw, ch);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, dx, dy, dw, dh);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
  if (!blob) throw new Error('Failed to produce image');
  return new File([blob], (file.name.replace(/\.[^.]+$/, '') || 'brand') + '-portrait.jpg', { type: 'image/jpeg' });
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Show existing image in the crop preview when editing
function setupPreviewWithUrl(url) {
  if (!previewImg || !imageAdjust) return;
  previewImg.dataset.ready = '0';
  previewImg.removeAttribute('style');
  previewImg.src = url;
  previewImg.onload = () => {
    const vp = imageAdjust.querySelector('.crop-viewport');
    if (vp) {
      const rect = vp.getBoundingClientRect();
      const base = Math.max(rect.width / previewImg.naturalWidth, rect.height / previewImg.naturalHeight);
      previewImg.dataset.baseScale = String(base);
    }
    if (zoomRange) zoomRange.value = zoomRange.min || '0.9';
    if (posXRange) posXRange.value = '0';
    if (posYRange) posYRange.value = '0';
    applyPreviewTransform();
    previewImg.dataset.ready = '1';
    imageAdjust.hidden = false;
  };
}

refreshSession();
