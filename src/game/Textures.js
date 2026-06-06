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
  const { cv, ctx } = noiseCanvas(256, '#16161d', { count: 2400, min: 1, max: 3, r: 130, g: 130, b: 150, alpha: 0.16 });
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 256, Math.random() * 256);
    ctx.lineTo(Math.random() * 256, Math.random() * 256);
    ctx.stroke();
  }
  return toTexture(cv, repeatX, repeatY);
}

export function makeConcrete(repeatX = 1, repeatY = 1) {
  const { cv, ctx } = noiseCanvas(256, '#2a2a33', { count: 1600, min: 1, max: 2, r: 200, g: 200, b: 215, alpha: 0.1 });
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }
  return toTexture(cv, repeatX, repeatY);
}

export function makeGround(repeatX = 1, repeatY = 1) {
  const { cv } = noiseCanvas(256, '#0a0a10', { count: 1500, min: 1, max: 3, r: 70, g: 70, b: 100, alpha: 0.14 });
  return toTexture(cv, repeatX, repeatY);
}
