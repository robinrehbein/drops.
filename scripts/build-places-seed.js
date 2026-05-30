/* Validates a raw research export and writes the bundled seed JSON.
   Usage: node scripts/build-places-seed.js <input.json>
   Input may be either { places: [...] } or a bare array. */
const fs = require('fs');
const path = require('path');

const inputArg = process.argv[2] || '/tmp/germany-specialty-coffee.json';
const raw = JSON.parse(fs.readFileSync(inputArg, 'utf8'));
const list = Array.isArray(raw) ? raw : raw.places || [];

const KINDS = new Set(['roaster', 'coffee_shop', 'cafe']);
const seed = [];
for (const p of list) {
  const osmId = p.osmId || p.externalId;
  if (!osmId || !p.name) continue;
  const kind = KINDS.has(p.kind) ? p.kind : 'cafe';
  const lat = typeof p.lat === 'number' ? p.lat : undefined;
  const lng = typeof p.lng === 'number' ? p.lng : typeof p.lon === 'number' ? p.lon : undefined;
  seed.push({
    osmId: String(osmId),
    name: p.name,
    kind,
    ...(p.city ? { city: p.city } : {}),
    ...(p.country ? { country: p.country } : {}),
    ...(p.address ? { address: p.address } : {}),
    ...(lat !== undefined ? { lat } : {}),
    ...(lng !== undefined ? { lng } : {}),
    ...(p.website ? { website: p.website } : {}),
    ...(p.openingHours ? { openingHours: p.openingHours } : {}),
    ...(Array.isArray(p.tags) ? { tags: p.tags } : {}),
    ...(p.curated ? { curated: true } : {}),
    ...(p.editorialNote ? { editorialNote: p.editorialNote } : {}),
  });
}

const out = {
  attribution: '© OpenStreetMap contributors (ODbL)',
  generatedFor: 'brewlog Explore seed',
  total: seed.length,
  curatedCount: seed.filter((s) => s.curated).length,
  places: seed,
};
const dest = path.join(__dirname, '..', 'src', 'features', 'places', 'seed', 'places.seed.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(`Wrote ${seed.length} places (${out.curatedCount} curated) -> ${dest}`);
