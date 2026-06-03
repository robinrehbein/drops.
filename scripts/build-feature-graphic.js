// Generates the Play Store feature graphic SVG (1024x500) with the brand fonts
// (Fraunces 800 + Inter 600) embedded as base64 and the real app icon inlined,
// so it rasterizes identically regardless of the host's installed fonts.
// Output SVG is rasterized to PNG by build-feature-graphic.sh via sharp-cli.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const b64 = (p) => fs.readFileSync(path.join(root, p)).toString('base64');

const fraunces = b64('node_modules/@expo-google-fonts/fraunces/800ExtraBold/Fraunces_800ExtraBold.ttf');
const inter = b64('node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf');
const icon = b64('assets/drop-icon.png');

// Brand tokens (src/ui/theme/tokens.ts)
const cream = '#f1ece0';
const inkDeep = '#2a3a2e';
const inkSoft = '#5a6a60';
const forest = '#3a5a3e';
const amber = '#a36a3a';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <style>
      @font-face { font-family: 'Fraunces'; font-weight: 800; src: url(data:font/ttf;base64,${fraunces}) format('truetype'); }
      @font-face { font-family: 'Inter'; font-weight: 600; src: url(data:font/ttf;base64,${inter}) format('truetype'); }
    </style>
  </defs>

  <rect width="1024" height="500" fill="${cream}"/>
  <!-- soft forest disc bleeding off the left -->
  <circle cx="245" cy="250" r="250" fill="${forest}" opacity="0.10"/>
  <circle cx="245" cy="250" r="180" fill="${forest}" opacity="0.10"/>

  <!-- real app icon, rounded -->
  <clipPath id="r"><rect x="95" y="120" width="260" height="260" rx="58"/></clipPath>
  <image href="data:image/png;base64,${icon}" x="95" y="120" width="260" height="260" clip-path="url(#r)" preserveAspectRatio="xMidYMid slice"/>

  <!-- wordmark + tagline -->
  <text x="430" y="270" font-family="Fraunces" font-weight="800" font-size="150" fill="${inkDeep}">Drop</text>
  <rect x="436" y="300" width="120" height="8" rx="4" fill="${amber}"/>
  <text x="436" y="356" font-family="Inter" font-weight="600" font-size="30" fill="${inkSoft}">Track every shot, every bean.</text>
</svg>`;

const out = path.join(root, 'store-assets', '_feature-graphic.svg');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, svg);
console.log('wrote', out, `(${(svg.length / 1024).toFixed(0)} KB)`);
