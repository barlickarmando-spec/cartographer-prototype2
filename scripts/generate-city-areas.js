#!/usr/bin/env node
/**
 * Generates SVG city area shapes for the US heat map.
 * Uses an Albers USA projection fitted to existing city data points,
 * then creates circular polygon paths for each new city.
 */

const fs = require('fs');
const path = require('path');

// Known mappings: [lng, lat] -> [svgX, svgY] from existing data
const KNOWN_POINTS = [
  { lng: -106.6504, lat: 35.0844, x: 309.1, y: 366.3 }, // Albuquerque
  { lng: -117.9145, lat: 33.8366, x: 114.6, y: 359.4 }, // Anaheim
  { lng: -84.388, lat: 33.749, x: 690, y: 392.4 },      // Atlanta
  { lng: -97.7431, lat: 30.2672, x: 458.2, y: 477.6 },  // Austin
  { lng: -76.6122, lat: 39.2904, x: 798.9, y: 255.9 },  // Baltimore
  { lng: -87.6298, lat: 41.8781, x: 619.1, y: 227.2 },  // Chicago
  { lng: -84.512, lat: 39.1031, x: 674.2, y: 280.3 },   // Cincinnati
  { lng: -104.9903, lat: 39.7392, x: 346.5, y: 271.3 }, // Denver
  { lng: -83.0458, lat: 42.3314, x: 688.3, y: 209.8 },  // Detroit
  { lng: -80.1373, lat: 26.1224, x: 789.2, y: 539.4 },  // Fort Lauderdale
  { lng: -119.7871, lat: 36.7378, x: 98.4, y: 292.3 },  // Fresno
  { lng: -95.3698, lat: 29.7604, x: 501.2, y: 488.5 },  // Houston
  { lng: -86.1581, lat: 39.7684, x: 646.4, y: 269.3 },  // Indianapolis
  { lng: -81.6557, lat: 30.3322, x: 747.6, y: 457.1 },  // Jacksonville
  { lng: -115.1398, lat: 36.1699, x: 171.3, y: 321.4 }, // Las Vegas
  { lng: -118.2437, lat: 34.0522, x: 110.1, y: 353.6 }, // Los Angeles
  { lng: -80.1918, lat: 25.7617, x: 789.5, y: 547 },    // Miami-Dade
  { lng: -93.265, lat: 44.9778, x: 530.2, y: 167.1 },   // Minneapolis
  { lng: -86.7816, lat: 36.1627, x: 643.9, y: 346.2 },  // Nashville
  { lng: -90.0715, lat: 29.9511, x: 597.1, y: 481.2 },  // New Orleans
  { lng: -74.006, lat: 40.7128, x: 832.8, y: 217.6 },   // NYC
  { lng: -81.3789, lat: 28.5383, x: 758.3, y: 493.4 },  // Orlando
  { lng: -75.1652, lat: 39.9526, x: 818.5, y: 237.4 },  // Philadelphia
  { lng: -112.074, lat: 33.4484, x: 212.1, y: 387.5 },  // Phoenix
  { lng: -122.6765, lat: 45.5152, x: 103.3, y: 101.8 }, // Portland
  { lng: -78.6382, lat: 35.7796, x: 780.4, y: 335.2 },  // Raleigh
  { lng: -119.8138, lat: 39.5296, x: 112.6, y: 235 },   // Reno
  { lng: -111.891, lat: 40.7608, x: 240.9, y: 235.6 },  // SLC
  { lng: -98.4936, lat: 29.4241, x: 444.2, y: 495 },    // San Antonio
  { lng: -117.1611, lat: 32.7157, x: 122.1, y: 385.4 }, // San Diego
  { lng: -122.4194, lat: 37.7749, x: 62.2, y: 259.8 },  // San Francisco
  { lng: -121.8863, lat: 37.3382, x: 68.1, y: 271.1 },  // San Jose
  { lng: -122.3321, lat: 47.6062, x: 120.1, y: 61.2 },  // Seattle
  { lng: -90.1994, lat: 38.627, x: 583.6, y: 298.7 },   // St. Louis
  { lng: -82.4572, lat: 27.9506, x: 740.3, y: 508.5 },  // Tampa
  { lng: -110.9747, lat: 32.2226, x: 226.8, y: 416.1 }, // Tucson
  { lng: -75.978, lat: 36.8529, x: 819.6, y: 304.2 },   // Virginia Beach
  { lng: -97.3301, lat: 37.6872, x: 467.9, y: 321.3 },  // Wichita
  { lng: -116.2023, lat: 43.615, x: 187, y: 164 },      // Boise
  { lng: -71.0589, lat: 42.3601, x: 868.8, y: 172.7 },  // Boston
  { lng: -78.8784, lat: 42.8864, x: 749.5, y: 188.2 },  // Buffalo
  { lng: -82.9988, lat: 39.9612, x: 695.9, y: 259.2 },  // Columbus
  { lng: -93.6091, lat: 41.5868, x: 526.9, y: 238.6 },  // Des Moines
  { lng: -72.6823, lat: 41.7658, x: 847.7, y: 191.1 },  // Hartford
  { lng: -86.5861, lat: 34.7304, x: 650.2, y: 376 },    // Huntsville
  { lng: -94.5786, lat: 39.0997, x: 512.6, y: 291.4 },  // Kansas City
  { lng: -85.7585, lat: 38.2527, x: 656.2, y: 300.5 },  // Louisville
  { lng: -89.4012, lat: 43.0731, x: 590, y: 204.2 },    // Madison
  { lng: -87.9065, lat: 43.0389, x: 612.8, y: 203.2 },  // Milwaukee
  { lng: -96.7026, lat: 40.8136, x: 478.7, y: 255.3 },  // Lincoln
  { lng: -95.9345, lat: 41.2565, x: 490.7, y: 246 },    // Omaha
  { lng: -79.9959, lat: 40.4406, x: 741.4, y: 242 },    // Pittsburgh
  { lng: -71.4128, lat: 41.824, x: 866.4, y: 185 },     // Providence
  { lng: -79.9311, lat: 32.7765, x: 769.7, y: 401.5 },  // Charleston
  { lng: -80.8431, lat: 35.2271, x: 745.7, y: 353 },    // Charlotte
  { lng: -81.6944, lat: 41.4993, x: 711.5, y: 224.1 },  // Cleveland
  { lng: -92.2896, lat: 34.7465, x: 553, y: 382.4 },    // Little Rock
];

// Use a 2D polynomial regression to map (lng, lat) -> (x, y)
// We'll use a quadratic fit: x = a0 + a1*lng + a2*lat + a3*lng*lat + a4*lng^2 + a5*lat^2

function fitPolynomial(points, getTarget) {
  const n = points.length;
  const numTerms = 6; // constant, lng, lat, lng*lat, lng^2, lat^2

  // Build matrix A and vector b for least squares
  const A = [];
  const b = [];

  for (const p of points) {
    const row = [1, p.lng, p.lat, p.lng * p.lat, p.lng * p.lng, p.lat * p.lat];
    A.push(row);
    b.push(getTarget(p));
  }

  // Solve A^T * A * x = A^T * b using normal equations
  const ATA = Array.from({ length: numTerms }, () => new Array(numTerms).fill(0));
  const ATb = new Array(numTerms).fill(0);

  for (let i = 0; i < numTerms; i++) {
    for (let j = 0; j < numTerms; j++) {
      for (let k = 0; k < n; k++) {
        ATA[i][j] += A[k][i] * A[k][j];
      }
    }
    for (let k = 0; k < n; k++) {
      ATb[i] += A[k][i] * b[k];
    }
  }

  // Gaussian elimination
  const aug = ATA.map((row, i) => [...row, ATb[i]]);
  for (let col = 0; col < numTerms; col++) {
    // Find pivot
    let maxVal = Math.abs(aug[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < numTerms; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    for (let row = col + 1; row < numTerms; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= numTerms; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution
  const coeffs = new Array(numTerms).fill(0);
  for (let i = numTerms - 1; i >= 0; i--) {
    coeffs[i] = aug[i][numTerms];
    for (let j = i + 1; j < numTerms; j++) {
      coeffs[i] -= aug[i][j] * coeffs[j];
    }
    coeffs[i] /= aug[i][i];
  }

  return coeffs;
}

function applyPoly(coeffs, lng, lat) {
  return coeffs[0] + coeffs[1] * lng + coeffs[2] * lat +
    coeffs[3] * lng * lat + coeffs[4] * lng * lng + coeffs[5] * lat * lat;
}

// Fit X and Y separately
const xCoeffs = fitPolynomial(KNOWN_POINTS, p => p.x);
const yCoeffs = fitPolynomial(KNOWN_POINTS, p => p.y);

// Verify fit quality
let maxErrX = 0, maxErrY = 0;
for (const p of KNOWN_POINTS) {
  const px = applyPoly(xCoeffs, p.lng, p.lat);
  const py = applyPoly(yCoeffs, p.lng, p.lat);
  maxErrX = Math.max(maxErrX, Math.abs(px - p.x));
  maxErrY = Math.max(maxErrY, Math.abs(py - p.y));
}
console.log(`Projection fit quality: max error X=${maxErrX.toFixed(1)}, Y=${maxErrY.toFixed(1)}`);

function projectCity(lng, lat) {
  return [
    Math.round(applyPoly(xCoeffs, lng, lat) * 10) / 10,
    Math.round(applyPoly(yCoeffs, lng, lat) * 10) / 10,
  ];
}

// Generate a circular SVG path around a center point
function generateCityPath(cx, cy, radius) {
  const numPoints = 24; // vertices for the circle
  const points = [];

  for (let i = 0; i < numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints;
    // Add slight randomness for organic look
    const r = radius + (Math.sin(i * 3.7) * 0.3 + Math.cos(i * 2.3) * 0.2);
    const x = Math.round((cx + r * Math.cos(angle)) * 10) / 10;
    const y = Math.round((cy + r * Math.sin(angle)) * 10) / 10;
    points.push([x, y]);
  }

  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    d += `L${points[i][0]},${points[i][1]}`;
  }
  d += 'Z';
  return d;
}

// New cities to add with their [longitude, latitude]
const NEW_CITIES = {
  'Moblie': [-88.0399, 30.6954],
  'Tuscaloosa': [-87.5692, 33.2098],
  'Flagstaff': [-111.6513, 35.1983],
  'Bakersfield': [-119.0187, 35.3733],
  'Modesto': [-120.9969, 37.6391],
  'Monterrey': [-121.8947, 36.6002],
  'Sacramento': [-121.4944, 38.5816],
  'San Bernardino - Riverside': [-117.2898, 34.1083],
  'Santa Barbara': [-119.6982, 34.4208],
  'Santa Cruz': [-122.0308, 36.9741],
  'Stockton': [-121.2908, 37.9577],
  'Ventura': [-119.2290, 34.2746],
  'Boulder': [-105.2705, 40.0150],
  'Fort Collins': [-105.0844, 40.5853],
  'Bridgeport': [-73.1952, 41.1865],
  'New Haven': [-72.9279, 41.3083],
  'Dover': [-75.5244, 39.1582],
  'Cape Coral': [-81.9495, 26.5629],
  'Daytona': [-81.0228, 29.2108],
  'Gainesville': [-82.3248, 29.6516],
  'Lakeland': [-81.9498, 28.0395],
  'Ocala': [-82.1401, 29.1872],
  'Pensacola': [-87.2169, 30.4213],
  'Port St. Lucie': [-80.3531, 27.2730],
  'Sarasota': [-82.5308, 27.3364],
  'Tallahassee': [-84.2807, 30.4383],
  'Vero Beach': [-80.3973, 27.6386],
  'Athens': [-83.3576, 33.9519],
  'Augusta': [-81.9748, 33.4735],
  'Savannah': [-81.0998, 32.0809],
  'Cedar Rapids': [-91.6656, 41.9779],
  'Fort Wayne': [-85.1394, 41.0793],
  'South Bend': [-86.2520, 41.6764],
  'Champaign - Urbana': [-88.2434, 40.1164],
  'Bowling Green': [-86.4436, 36.9685],
  'Lexington': [-84.5037, 38.0406],
  'Lafayette': [-92.0198, 30.2241],
  'Shreveport': [-93.7502, 32.5252],
  'Amherst Town': [-72.5198, 42.3732],
  'Springfield': [-72.5898, 42.1015],
  'Worcester': [-71.8023, 42.2626],
  'Ann Arbor': [-83.7430, 42.2808],
  'Grand Rapids': [-85.6681, 42.9634],
  'Lansing': [-84.5555, 42.7325],
  'Billings': [-108.5007, 45.7833],
  'Helena': [-112.0391, 46.5958],
  'Asheville': [-82.5540, 35.5951],
  'Durham - Chapel Hill': [-78.8986, 35.9940],
  'Fayetteville': [-78.8784, 35.0527],
  'Willmington': [-77.9447, 34.2257],
  'Winston Salem': [-80.2442, 36.0999],
  'Bismarck': [-100.7837, 46.8083],
  'Manchester': [-71.4548, 42.9956],
  'Trenton-Princeton': [-74.7429, 40.2206],
  'Santa Fe': [-105.9378, 35.6870],
  'Albany': [-73.7562, 42.6526],
  'Rochester': [-77.6109, 43.1566],
  'Syracuse': [-76.1474, 43.0481],
  'Akron': [-81.5190, 41.0814],
  'Toledo': [-83.5379, 41.6528],
  'Eugene': [-123.0868, 44.0521],
  'Salem': [-123.0351, 44.9429],
  'Allentown': [-75.4714, 40.6084],
  'Lancaster': [-76.3055, 40.0379],
  'Scranton': [-75.6624, 41.4090],
  'Columbia': [-81.0348, 34.0007],
  'Myrtle Beach': [-78.8867, 33.6891],
  'Sioux Falls': [-96.7311, 43.5460],
  'Chattanooga': [-85.3097, 35.0456],
  'Corpus Christi': [-97.3964, 27.8006],
  'Lubbock': [-101.8313, 33.5779],
  'McAllen': [-98.2300, 26.2034],
  'Tyler': [-95.3010, 32.3513],
  'Waco': [-97.1467, 31.5493],
  'Charlottesville': [-78.4767, 38.0293],
  'Richmond': [-77.4360, 37.5407],
  'Burlington': [-73.2121, 44.4759],
  'Spokane': [-117.4260, 47.6588],
  'Green Bay': [-88.0198, 44.5133],
};

// Determine radius based on existing city shapes
// Average existing radius is about 5-6 SVG units
const CITY_RADIUS = 5.5;

// Load existing files
const cityAreasPath = path.join(__dirname, '..', 'lib', 'us-city-areas.json');
const cityAreas = JSON.parse(fs.readFileSync(cityAreasPath, 'utf8'));

let added = 0;
const newCoordinatesEntries = [];
const newStateEntries = [];

for (const [cityName, [lng, lat]] of Object.entries(NEW_CITIES)) {
  const [cx, cy] = projectCity(lng, lat);

  // Sanity check: should be within the SVG viewport
  if (cx < 0 || cx > 960 || cy < 0 || cy > 600) {
    console.log(`WARNING: ${cityName} projected outside viewport: [${cx}, ${cy}]`);
  }

  if (!cityAreas[cityName]) {
    const d = generateCityPath(cx, cy, CITY_RADIUS);
    cityAreas[cityName] = { center: [cx, cy], d };
    added++;
    console.log(`Added ${cityName}: center=[${cx}, ${cy}]`);
  } else {
    console.log(`SKIP (exists): ${cityName}`);
  }

  // Prepare output for us-city-coordinates.ts
  newCoordinatesEntries.push(`  '${cityName}': [${lng}, ${lat}],`);
}

// Write updated city areas
fs.writeFileSync(cityAreasPath, JSON.stringify(cityAreas));
console.log(`\nWrote ${added} new city areas to us-city-areas.json`);
console.log(`Total city areas: ${Object.keys(cityAreas).length}`);

// Print entries to add to us-city-coordinates.ts
console.log('\n=== Add to CITY_COORDINATES ===');
console.log(newCoordinatesEntries.join('\n'));

// Prepare state mappings
const CITY_STATES = {
  'Moblie': 'AL', 'Tuscaloosa': 'AL', 'Flagstaff': 'AZ',
  'Bakersfield': 'CA', 'Modesto': 'CA', 'Monterrey': 'CA',
  'Sacramento': 'CA', 'San Bernardino - Riverside': 'CA',
  'Santa Barbara': 'CA', 'Santa Cruz': 'CA', 'Stockton': 'CA', 'Ventura': 'CA',
  'Boulder': 'CO', 'Fort Collins': 'CO',
  'Bridgeport': 'CT', 'New Haven': 'CT',
  'Dover': 'DE',
  'Cape Coral': 'FL', 'Daytona': 'FL', 'Gainesville': 'FL', 'Lakeland': 'FL',
  'Ocala': 'FL', 'Pensacola': 'FL', 'Port St. Lucie': 'FL', 'Sarasota': 'FL',
  'Tallahassee': 'FL', 'Vero Beach': 'FL',
  'Athens': 'GA', 'Augusta': 'GA', 'Savannah': 'GA',
  'Cedar Rapids': 'IA',
  'Fort Wayne': 'IN', 'South Bend': 'IN',
  'Champaign - Urbana': 'IL',
  'Bowling Green': 'KY', 'Lexington': 'KY',
  'Lafayette': 'LA', 'Shreveport': 'LA',
  'Amherst Town': 'MA', 'Springfield': 'MA', 'Worcester': 'MA',
  'Ann Arbor': 'MI', 'Grand Rapids': 'MI', 'Lansing': 'MI',
  'Billings': 'MT', 'Helena': 'MT',
  'Asheville': 'NC', 'Durham - Chapel Hill': 'NC', 'Fayetteville': 'NC',
  'Willmington': 'NC', 'Winston Salem': 'NC',
  'Bismarck': 'ND',
  'Manchester': 'NH',
  'Trenton-Princeton': 'NJ',
  'Santa Fe': 'NM',
  'Albany': 'NY', 'Rochester': 'NY', 'Syracuse': 'NY',
  'Akron': 'OH', 'Toledo': 'OH',
  'Eugene': 'OR', 'Salem': 'OR',
  'Allentown': 'PA', 'Lancaster': 'PA', 'Scranton': 'PA',
  'Columbia': 'SC', 'Myrtle Beach': 'SC',
  'Sioux Falls': 'SD',
  'Chattanooga': 'TN',
  'Corpus Christi': 'TX', 'Lubbock': 'TX', 'McAllen': 'TX', 'Tyler': 'TX', 'Waco': 'TX',
  'Charlottesville': 'VA', 'Richmond': 'VA',
  'Burlington': 'VT',
  'Spokane': 'WA',
  'Green Bay': 'WI',
};

console.log('\n=== Add to CITY_TO_STATE_ABBREV ===');
for (const [city, state] of Object.entries(CITY_STATES)) {
  console.log(`  '${city}': '${state}',`);
}
