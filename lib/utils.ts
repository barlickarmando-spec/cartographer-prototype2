/**
 * Format large numbers for display
 * Converts 1906000 → "1.9M", 950000 → "950K", etc.
 * 
 * @param value - Number to format
 * @param decimals - Decimal places for millions/billions (default: 1)
 * @returns Formatted string
 */
export function formatLargeNumber(value: number, decimals: number = 1): string {
  if (value >= 1000000000) {
    // Billions: 1,500,000,000 → "1.5B"
    return `${(value / 1000000000).toFixed(decimals)}B`;
  } else if (value >= 1000000) {
    // Millions: 1,906,000 → "1.9M"
    return `${(value / 1000000).toFixed(decimals)}M`;
  } else if (value >= 1000) {
    // Thousands: 45,000 → "45K"
    return `${Math.round(value / 1000)}K`;
  } else {
    // Less than 1000: 500 → "500"
    return value.toLocaleString();
  }
}

/**
 * Format currency with smart large number formatting
 * Converts 1906000 → "$1.9M", 950000 → "$950K"
 * 
 * @param value - Number to format as currency
 * @param decimals - Decimal places for millions/billions (default: 1)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, decimals: number = 1): string {
  return `$${formatLargeNumber(value, decimals)}`;
}

/**
 * Pluralize a word based on count
 * Fixes "1 years" → "1 year", keeps "5 years"
 * 
 * @param count - Number to check
 * @param singular - Singular form (e.g., "year")
 * @param plural - Optional plural form (e.g., "children"), defaults to singular + "s"
 * @returns Correctly pluralized string with count
 * 
 * @example
 * pluralize(1, 'year')                    // "1 year"
 * pluralize(5, 'year')                    // "5 years"
 * pluralize(1, 'child', 'children')       // "1 child"
 * pluralize(3, 'child', 'children')       // "3 children"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural || `${singular}s`);
  return `${count} ${word}`;
}

/**
 * Format time period in years with proper grammar
 * @param years - Number of years
 * @returns Formatted string (e.g., "1 year", "5 years")
 */
export function formatYears(years: number): string {
  return pluralize(years, 'year');
}

/**
 * Format time period in months with proper grammar
 * @param months - Number of months
 * @returns Formatted string (e.g., "1 month", "12 months")
 */
export function formatMonths(months: number): string {
  return pluralize(months, 'month');
}

/**
 * Combine class names conditionally
 * Useful for Tailwind CSS conditional classes
 * 
 * @param classes - Array of class names or conditionals
 * @returns Combined class string
 * 
 * @example
 * cn('base-class', isActive && 'active-class', 'another-class')
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
