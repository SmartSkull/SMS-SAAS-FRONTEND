/**
 * Minimal MapLibre GL style using OpenStreetMap raster tiles.
 * No sprites, no terrain, no external image dependencies.
 * Avoids the "Expected value to be of type number, found null" tile-worker
 * error that appears with vector styles (bright/liberty) in MapLibre v5.
 */
export const OSM_RASTER_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster' as const,
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};
