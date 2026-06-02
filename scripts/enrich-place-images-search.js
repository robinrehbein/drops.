/* Searches image results for seed places and writes confident, place-specific image URLs.
   Usage: node scripts/enrich-place-images-search.js [--limit N] [--dry-run]

   This intentionally prefers precision over coverage: if search results do not
   clearly match the place name/domain/city, the place is left without imageUrl. */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
const dryRun = args.includes('--dry-run');

const seedPath = path.join(__dirname, '..', 'src', 'features', 'places', 'seed', 'places.seed.json');
const reportPath = path.join(__dirname, '..', 'docs', 'places-image-search-report.json');

const FALLBACK_IMAGES = new Set([
  'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=900&q=80',
]);

const STOPWORDS = new Set([
  'cafe',
  'café',
  'kaffee',
  'kaffe',
  'kaffeerosterei',
  'kaffeerösterei',
  'roesterei',
  'rösterei',
  'coffee',
  'shop',
  'bar',
  'und',
  'the',
  'de',
  'bio',
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss');
}

function tokens(text) {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function host(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function sameRegistrableDomain(a, b) {
  if (!a || !b) return false;
  const left = a.split('.').slice(-2).join('.');
  const right = b.split('.').slice(-2).join('.');
  return left === right;
}

function isImageUrl(url) {
  return /^https?:\/\//i.test(url) && /\.(avif|gif|jpe?g|png|webp|svg)([?#].*)?$/i.test(url);
}

async function imageSearch(query) {
  const pageUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
  const page = await fetch(pageUrl, {
    headers: { 'user-agent': 'Mozilla/5.0 seed-image-research' },
  }).then((r) => r.text());
  const vqd = page.match(/vqd=\"?([^&"']+)/)?.[1] || page.match(/vqd=([^&]+)/)?.[1];
  if (!vqd) return [];
  const apiUrl = `https://duckduckgo.com/i.js?l=de-de&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`;
  const data = await fetch(apiUrl, {
    headers: {
      referer: 'https://duckduckgo.com/',
      'user-agent': 'Mozilla/5.0 seed-image-research',
    },
  }).then((r) => r.json());
  return Array.isArray(data.results) ? data.results : [];
}

function scoreCandidate(place, result) {
  const nameTokens = tokens(place.name);
  const cityTokens = tokens(place.city);
  const haystack = normalize(`${result.title ?? ''} ${result.url ?? ''} ${result.image ?? ''}`);
  const matchingNameTokens = nameTokens.filter((t) => haystack.includes(t));
  const matchingCityTokens = cityTokens.filter((t) => haystack.includes(t));
  const sourceHost = host(result.url);
  const imageHost = host(result.image);
  const websiteHost = host(place.website);
  const domainMatch =
    sameRegistrableDomain(sourceHost, websiteHost) || sameRegistrableDomain(imageHost, websiteHost);

  let score = 0;
  if (domainMatch) score += 8;
  score += Math.min(4, matchingNameTokens.length * 2);
  if (matchingCityTokens.length > 0) score += 2;
  if (/\b(cafe|café|kaffee|coffee|roest|röst|espresso|barista)\b/.test(haystack)) score += 1;
  if (!isImageUrl(result.image)) score -= 10;

  return { score, domainMatch, matchingNameTokens, matchingCityTokens };
}

async function main() {
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const candidates = seed.places.filter((p) => !p.imageUrl || FALLBACK_IMAGES.has(p.imageUrl));
  const report = [];
  let searched = 0;
  let updated = 0;

  for (const place of candidates.slice(0, limit)) {
    const query = `"${place.name}" ${place.city ?? ''} Kaffee Café Foto`.trim();
    searched++;
    try {
      const results = await imageSearch(query);
      const ranked = results
        .map((result) => ({ result, ...scoreCandidate(place, result) }))
        .filter((r) => r.score >= 6)
        .sort((a, b) => b.score - a.score);
      const best = ranked[0];
      if (best) {
        place.imageUrl = best.result.image;
        updated++;
        report.push({
          osmId: place.osmId,
          name: place.name,
          city: place.city,
          imageUrl: best.result.image,
          sourceUrl: best.result.url,
          title: best.result.title,
          score: best.score,
        });
      } else if (FALLBACK_IMAGES.has(place.imageUrl)) {
        delete place.imageUrl;
      }
    } catch (error) {
      report.push({
        osmId: place.osmId,
        name: place.name,
        city: place.city,
        error: String(error && error.message ? error.message : error),
      });
    }
    await sleep(350);
  }

  if (!dryRun) {
    fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n');
    fs.writeFileSync(reportPath, JSON.stringify({ searched, updated, report }, null, 2) + '\n');
  }

  console.log(JSON.stringify({ searched, updated, reportPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
