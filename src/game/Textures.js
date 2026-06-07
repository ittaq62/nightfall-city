import * as THREE from 'three';

// Procedural canvas textures - no external image files required.
function noiseCanvas(size, base, sp) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < sp.count; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const s = sp.min + Math.random() * (sp.max - sp.min);
    ctx.fillStyle = `rgba(${sp.r},${sp.g},${sp.b},${Math.random() * sp.alpha})`;
    ctx.fillRect(x, y, s, s);
  }
  return { cv, ctx };
}

function toTexture(cv, repeatX, repeatY) {
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

export function makeAsphalt(repeatX = 1, repeatY = 1) {
  // Only fine grain - no straight "cracks", which tile into ugly diagonal patterns.
  const { cv } = noiseCanvas(256, '#3b3c46', { count: 2600, min: 1, max: 2, r: 150, g: 150, b: 170, alpha: 0.16 });
  return toTexture(cv, repeatX, repeatY);
}

export function makeConcrete(repeatX = 1, repeatY = 1) {
  const { cv, ctx } = noiseCanvas(256, '#50515b', { count: 1600, min: 1, max: 2, r: 210, g: 210, b: 225, alpha: 0.12 });
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }
  return toTexture(cv, repeatX, repeatY);
}

export function makeGround(repeatX = 1, repeatY = 1) {
  const { cv } = noiseCanvas(256, '#2c2c36', { count: 1500, min: 1, max: 3, r: 90, g: 90, b: 120, alpha: 0.16 });
  return toTexture(cv, repeatX, repeatY);
}

// Building facade: a color map (wall + windows) and an emissive map (only lit windows glow).
export function makeFacade(w, h, wallHex = '#1d1d26') {
  const cols = Math.max(2, Math.round(w / 2.5));
  const rows = Math.max(2, Math.round(h / 3));
  const cell = 28;
  const cw = cols * cell;
  const ch = rows * cell;

  const map = document.createElement('canvas');
  map.width = cw; map.height = ch;
  const m = map.getContext('2d');
  m.fillStyle = wallHex;
  m.fillRect(0, 0, cw, ch);
  // faint wall noise
  for (let i = 0; i < cw * ch / 40; i++) {
    m.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
    m.fillRect(Math.random() * cw, Math.random() * ch, 2, 2);
  }

  const em = document.createElement('canvas');
  em.width = cw; em.height = ch;
  const e = em.getContext('2d');
  e.fillStyle = '#000';
  e.fillRect(0, 0, cw, ch);

  const litColors = ['#ffd98a', '#ffcf6e', '#fff0c0', '#cfe3ff'];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = c * cell + 5;
      const py = r * cell + 5;
      const ww = cell - 10;
      const hh = cell - 10;
      const lit = Math.random() > 0.5;
      m.fillStyle = lit ? '#caa86a' : '#0e0e15';
      m.fillRect(px, py, ww, hh);
      if (lit) {
        e.fillStyle = litColors[Math.floor(Math.random() * litColors.length)];
        e.fillRect(px, py, ww, hh);
      }
    }
  }

  return { map: new THREE.CanvasTexture(map), emissiveMap: new THREE.CanvasTexture(em) };
}
