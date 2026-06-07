// Outfit catalog. Each outfit defines body colors + a list of accessory meshes
// the CharacterModel will build. "job" outfits are granted by a job, not bought.
export const OUTFITS = {
  realistic: { name: 'Tenue realiste (defaut)', price: 0, realistic: true },
  casual: { name: 'Tenue civile', price: 0, outfit: 0x3a3a4c, pants: 0x24242e, accessories: [] },
  hoodie: { name: 'Hoodie de rue', price: 60, outfit: 0x20202a, pants: 0x1a1a22, hair: 0x101010, accessories: ['beanie'] },
  survet: { name: 'Survetement', price: 90, outfit: 0x2a3a7a, pants: 0x2a3a7a, accessories: ['glasses'] },
  costume: { name: 'Costume chic', price: 220, outfit: 0x16161e, pants: 0x12121a, accessories: ['tie'] },
  ouvrier: { name: 'Ouvrier chantier', price: 80, outfit: 0xe0a51e, pants: 0x33332a, accessories: ['helmet', 'vest'] },
  medecin: { name: 'Blouse medecin', price: 150, outfit: 0xeef0f2, pants: 0xdfe2e6, accessories: ['stetho'] },
  police: { name: 'Uniforme Police', price: 0, job: 'Policier', outfit: 0x1b2a55, pants: 0x141f38, accessories: ['cap', 'badge', 'vest_police'] },
};

// The outfits sold in the clothes shop (job outfits excluded)
export const SHOP_OUTFITS = ['casual', 'hoodie', 'survet', 'costume', 'ouvrier', 'medecin'];

export function outfitColor(id) {
  const o = OUTFITS[id];
  return o ? '#' + (o.outfit ?? 0x888888).toString(16).padStart(6, '0') : '#888';
}
