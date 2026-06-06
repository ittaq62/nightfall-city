import * as THREE from 'three';

export function distance2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function checkBoxCollision(position, radius, obstacles) {
  for (const box of obstacles) {
    const closest = new THREE.Vector3(
      clamp(position.x, box.min.x, box.max.x),
      position.y,
      clamp(position.z, box.min.z, box.max.z)
    );
    const dx = position.x - closest.x;
    const dz = position.z - closest.z;
    if (dx * dx + dz * dz < radius * radius) {
      return closest;
    }
  }
  return null;
}

export function createTextSprite(text, options = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontSize = options.fontSize || 28;
  const fontFamily = options.fontFamily || 'Segoe UI, Arial, sans-serif';

  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);

  canvas.width = Math.ceil(metrics.width) + 20;
  canvas.height = fontSize + 16;

  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = options.color || '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);

  const scale = options.scale || 0.01;
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);

  return sprite;
}
