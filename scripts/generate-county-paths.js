#!/usr/bin/env node
/**
 * Generate:
 * 1. State boundary SVG paths from us-atlas (aligned with counties)
 * 2. City-county SVG paths only (counties that contain tracked cities)
 *
 * Output:
 * - lib/us-atlas-state-paths.json: Array of { fips, name, d }
 * - lib/us-county-paths.json: Array of { fips, stateAbbrev, cityName, d } (city counties only)
 */

const fs = require('fs');
const path = require('path');
const topojson = require('topojson-client');
const d3geo = require('d3-geo');

// Load pre-projected Albers USA county data (already in 960x600 viewport)
const topo = require('us-atlas/counties-albers-10m.json');

// Load city coordinates for point-in-county matching
const cityCoordsSrc = fs.readFileSync(
  path.join(__dirname, '..', 'lib', 'us-city-coordinates.ts'), 'utf8'
);

// Parse city coordinates from TS source
function parseCityCoordinates(src) {
  const coords = {};
  const re = /'([^']+)':\s*\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    const parts = m[2].split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      coords[name] = parts;
    }
  }
  return coords;
}

function parseCityToState(src) {
  const mapping = {};
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

// FIPS state code to abbreviation and name
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

const FIPS_TO_STATE_NAME = {
  '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas', '06': 'California',
  '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware', '11': 'District of Columbia', '12': 'Florida',
  '13': 'Georgia', '15': 'Hawaii', '16': 'Idaho', '17': 'Illinois', '18': 'Indiana',
  '19': 'Iowa', '20': 'Kansas', '21': 'Kentucky', '22': 'Louisiana', '23': 'Maine',
  '24': 'Maryland', '25': 'Massachusetts', '26': 'Michigan', '27': 'Minnesota', '28': 'Mississippi',
  '29': 'Missouri', '30': 'Montana', '31': 'Nebraska', '32': 'Nevada', '33': 'New Hampshire',
  '34': 'New Jersey', '35': 'New Mexico', '36': 'New York', '37': 'North Carolina', '38': 'North Dakota',
  '39': 'Ohio', '40': 'Oklahoma', '41': 'Oregon', '42': 'Pennsylvania', '44': 'Rhode Island',
  '45': 'South Carolina', '46': 'South Dakota', '47': 'Tennessee', '48': 'Texas', '49': 'Utah',
  '50': 'Vermont', '51': 'Virginia', '53': 'Washington', '54': 'West Virginia', '55': 'Wisconsin',
  '56': 'Wyoming'
};

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

// Project city lat/lng to Albers USA coordinates
const projection = d3geo.geoAlbersUsa().scale(1300).translate([487.5, 305]);

function projectCity(lng, lat) {
  return projection([lng, lat]);
}

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

// ===== 1. Generate state paths from us-atlas =====
const states = topojson.feature(topo, topo.objects.states);
const stateOutput = [];
for (const feature of states.features) {
  const fips = feature.id;
  const name = FIPS_TO_STATE_NAME[fips];
  if (!name) continue;
  const d = coordsToPath(feature.geometry);
  if (!d) continue;
  stateOutput.push({ fips, name, d });
}
console.log(`Generated ${stateOutput.length} state paths from us-atlas`);

const stateOutPath = path.join(__dirname, '..', 'lib', 'us-atlas-state-paths.json');
fs.writeFileSync(stateOutPath, JSON.stringify(stateOutput));
console.log(`State paths: ${stateOutPath} (${(fs.statSync(stateOutPath).size / 1024).toFixed(0)} KB)`);

// ===== 2. Map cities to counties and output city-county paths only =====
const counties = topojson.feature(topo, topo.objects.counties);
const countyToCity = {};

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
    const countyState = FIPS_TO_STATE[feature.id.substring(0, 2)];
    const cityState = CITY_TO_STATE[cityName];
    if (countyState && cityState && countyState !== cityState) continue;

    if (pointInGeometry(projected, feature.geometry)) {
      countyToCity[feature.id] = cityName;
      found = true;
      break;
    }

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
    console.log(`  ${cityName}: nearest county ${closestFips} (dist=${closestDist.toFixed(1)}px)`);
    countyToCity[closestFips] = cityName;
  } else if (!found) {
    console.log(`  Warning: ${cityName} not matched (closest dist=${closestDist.toFixed(1)}px)`);
  }
}

console.log(`\nMatched ${Object.keys(countyToCity).length}/${Object.keys(CITY_COORDINATES).length} cities`);

// Output ALL counties — cityName is set for city counties, empty for others
const countyOutput = [];
for (const feature of counties.features) {
  const fips = feature.id;
  const cityName = countyToCity[fips] || '';
  const stateAbbrev = FIPS_TO_STATE[fips.substring(0, 2)] || '??';
  const d = coordsToPath(feature.geometry);
  if (!d) continue;

  countyOutput.push({ fips, stateAbbrev, cityName, d });
}

const cityCount = countyOutput.filter(c => c.cityName).length;
console.log(`Generated ${countyOutput.length} county paths (${cityCount} with cities)`);

const countyOutPath = path.join(__dirname, '..', 'lib', 'us-county-paths.json');
fs.writeFileSync(countyOutPath, JSON.stringify(countyOutput));
console.log(`County paths: ${countyOutPath} (${(fs.statSync(countyOutPath).size / 1024).toFixed(0)} KB)`);
