import type { StyleSpecification } from '@maplibre/maplibre-react-native';

/**
 * Keyless MapLibre basemap. Uses CARTO's "Positron" tiles — a clean, light,
 * low-clutter style (similar to Google Maps' plain layer) that lets the place
 * markers stand out. Tiles are OSM-derived, so OSM/ODbL attribution still
 * applies, plus CARTO. `@2x` tiles render crisp on high-DPI screens.
 *
 * No API key, no billing. CARTO basemaps are free for low/medium volume with
 * attribution (https://carto.com/basemaps/). For heavy/commercial traffic,
 * swap `tiles` for a MapTiler/Stadia style URL + key — same source shape.
 */
export const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
};
