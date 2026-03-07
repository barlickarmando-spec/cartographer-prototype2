/**
 * Lightweight color scale utilities — replaces d3-scale + d3-scale-chromatic.
 * Provides sequential and diverging color interpolation for heat map coloring.
 */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

type RGB = [number, number, number];

function interpolateColorStops(stops: RGB[], t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const segmentCount = stops.length - 1;
  const segment = Math.min(Math.floor(clamped * segmentCount), segmentCount - 1);
  const localT = (clamped * segmentCount) - segment;
  const from = stops[segment];
  const to = stops[segment + 1];
  return rgbToHex(
    lerp(from[0], to[0], localT),
    lerp(from[1], to[1], localT),
    lerp(from[2], to[2], localT),
  );
}

// Red → Warm neutral → Green diverging ramp (brighter but not harsh)
const RED_YELLOW_GREEN_STOPS: RGB[] = [
  [210, 75, 80],   // 0 - brighter rose
  [228, 120, 95],  // ~1.7 - warm coral
  [238, 170, 110], // ~3.3 - warm amber
  [235, 215, 145], // 5 - soft gold (neutral)
  [170, 210, 125], // ~6.7 - fresh sage
  [90, 185, 105],  // ~8.3 - vivid green
  [45, 155, 70],   // 10 - rich green
];

export function interpolateRatingColor(t: number): string {
  return interpolateColorStops(RED_YELLOW_GREEN_STOPS, t);
}

// Green ramp: light → dark (similar to d3 interpolateGreens)
const GREEN_STOPS: RGB[] = [
  [237, 248, 233],
  [186, 228, 179],
  [116, 196, 118],
  [49, 163, 84],
  [0, 109, 44],
];

// Blue ramp: light → dark (similar to d3 interpolateBlues)
const BLUE_STOPS: RGB[] = [
  [239, 243, 255],
  [189, 215, 231],
  [107, 174, 214],
  [49, 130, 189],
  [8, 81, 156],
];

export function interpolateGreens(t: number): string {
  return interpolateColorStops(GREEN_STOPS, t);
}

export function interpolateBlues(t: number): string {
  return interpolateColorStops(BLUE_STOPS, t);
}

export interface ColorScale {
  (value: number): string;
}

export function createSequentialScale(
  interpolator: (t: number) => string,
  domain: [number, number],
): ColorScale {
  const [min, max] = domain;
  const range = max - min;
  return (value: number) => {
    if (range === 0) return interpolator(0.5);
    const t = (value - min) / range;
    return interpolator(t);
  };
}

/**
 * Creates a color scale for ratings 0-10 using red-yellow-green diverging palette.
 * 0 = deep red (bad), 5 = yellow (neutral), 10 = deep green (great)
 */
export function createRatingColorScale(): ColorScale {
  return (rating: number) => {
    const t = Math.max(0, Math.min(1, rating / 10));
    return interpolateRatingColor(t);
  };
}
