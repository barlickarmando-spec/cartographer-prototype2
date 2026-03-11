#!/usr/bin/env node
/**
 * Generate county SVG paths from pre-projected Albers USA TopoJSON.
 * Maps each county to its FIPS code, state abbreviation, and optionally a city name.
 *
 * Output: lib/us-county-paths.json
 * Format: Array of { fips, stateAbbrev, cityName?, d }
 */

const fs = require('fs');
const path = require('path');
const topojson = require('topojson-client');

// Load pre-projected Albers USA county data (already in 960x600 viewport)
const topo = require('us-atlas/counties-albers-10m.json');

// Load city coordinates for point-in-county matching
const cityCoordsSrc = fs.readFileSync(
  path.join(__dirname, '..', 'lib', 'us-city-coordinates.ts'), 'utf8'
);

// Parse city coordinates from TS source
function parseCityCoordinates(src) {
  const coords = {};
  // Match: 'CityName': [lng, lat],
  const re = /'([^']+)':\s*\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    const parts = m[2].split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      coords[name] = parts; // [lng, lat]
    }
  }
  return coords;
}

// Parse city-to-state mapping
function parseCityToState(src) {
  const mapping = {};
  // Find the CITY_TO_STATE_ABBREV block
  const blockMatch = src.match(/CITY_TO_STATE_ABBREV[^{]*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
  if (!blockMatch) return mapping;
  const block = blockMatch[0];
  const re = /'([^']+)':\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    mapping[m[1]] = m[2];
  }
  return mapping;
}

const CITY_COORDINATES = parseCityCoordinates(cityCoordsSrc);
const CITY_TO_STATE = parseCityToState(cityCoordsSrc);

console.log(`Parsed ${Object.keys(CITY_COORDINATES).length} city coordinates`);
console.log(`Parsed ${Object.keys(CITY_TO_STATE).length} city-to-state mappings`);

// FIPS state code (first 2 digits) to state abbreviation
const FIPS_TO_STATE = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY'
};

// Convert GeoJSON coordinates (pre-projected Albers) to SVG path string
function coordsToPath(geometry) {
  if (!geometry || !geometry.coordinates) return '';

  const rings = geometry.type === 'MultiPolygon'
    ? geometry.coordinates.flat()
    : geometry.coordinates;

  return rings.map(ring => {
    if (!ring || ring.length === 0) return '';
    return ring.map((pt, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      return `${cmd}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`;
    }).join('') + 'Z';
  }).join('');
}

// Use d3-geo to project city lat/lng to Albers USA coordinates
// Since the TopoJSON is pre-projected, we need to use the same projection
const d3geo = require('d3-geo');
const projection = d3geo.geoAlbersUsa().scale(1300).translate([487.5, 305]);

// Project city coordinates to SVG space
function projectCity(lng, lat) {
  const result = projection([lng, lat]);
  return result; // may be null if outside projection bounds
}

// Point-in-polygon test (ray casting)
function pointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInGeometry(point, geometry) {
  if (!geometry || !geometry.coordinates) return false;
  const rings = geometry.type === 'MultiPolygon'
    ? geometry.coordinates.flat()
    : geometry.coordinates;

  for (const ring of rings) {
    if (pointInPolygon(point, ring)) return true;
  }
  return false;
}

// Extract counties as GeoJSON features
const counties = topojson.feature(topo, topo.objects.counties);

// Project all cities and find which county they fall in
const cityToCounty = {}; // cityName -> FIPS
const countyToCity = {}; // FIPS -> cityName

for (const [cityName, [lng, lat]] of Object.entries(CITY_COORDINATES)) {
  const projected = projectCity(lng, lat);
  if (!projected) {
    console.log(`  Warning: ${cityName} outside projection bounds`);
    continue;
  }

  let found = false;
  let closestFips = null;
  let closestDist = Infinity;

  for (const feature of counties.features) {
    // Quick state filter
    const countyState = FIPS_TO_STATE[feature.id.substring(0, 2)];
    const cityState = CITY_TO_STATE[cityName];
    if (countyState && cityState && countyState !== cityState) continue;

    if (pointInGeometry(projected, feature.geometry)) {
      cityToCounty[cityName] = feature.id;
      countyToCity[feature.id] = cityName;
      found = true;
      break;
    }

    // Track closest county as fallback (compute centroid distance)
    if (feature.geometry && feature.geometry.coordinates) {
      const ring = feature.geometry.type === 'MultiPolygon'
        ? feature.geometry.coordinates[0][0]
        : feature.geometry.coordinates[0];
      if (ring && ring.length > 0) {
        let cx = 0, cy = 0;
        for (const pt of ring) { cx += pt[0]; cy += pt[1]; }
        cx /= ring.length; cy /= ring.length;
        const dist = Math.hypot(projected[0] - cx, projected[1] - cy);
        if (dist < closestDist) {
          closestDist = dist;
          closestFips = feature.id;
        }
      }
    }
  }

  if (!found && closestFips && closestDist < 30) {
    console.log(`  ${cityName}: using nearest county ${closestFips} (dist=${closestDist.toFixed(1)}px)`);
    cityToCounty[cityName] = closestFips;
    countyToCity[closestFips] = cityName;
  } else if (!found) {
    console.log(`  Warning: ${cityName} not matched to any county (closest dist=${closestDist.toFixed(1)}px)`);
  }
}

console.log(`\nMatched ${Object.keys(cityToCounty).length}/${Object.keys(CITY_COORDINATES).length} cities to counties`);

// Generate output
const output = [];
for (const feature of counties.features) {
  const fips = feature.id;
  const stateAbbrev = FIPS_TO_STATE[fips.substring(0, 2)] || '??';
  const d = coordsToPath(feature.geometry);
  if (!d) continue;

  const entry = { fips, stateAbbrev, d };
  if (countyToCity[fips]) {
    entry.cityName = countyToCity[fips];
  }
  output.push(entry);
}

console.log(`Generated ${output.length} county paths`);
console.log(`Counties with cities: ${output.filter(e => e.cityName).length}`);

// Write output
const outPath = path.join(__dirname, '..', 'lib', 'us-county-paths.json');
fs.writeFileSync(outPath, JSON.stringify(output));
console.log(`Written to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB)`);

// Also write the city-to-county mapping for reference
const mappingPath = path.join(__dirname, '..', 'lib', 'city-to-county-fips.json');
fs.writeFileSync(mappingPath, JSON.stringify(cityToCounty, null, 2));
console.log(`City-to-county mapping written to ${mappingPath}`);
