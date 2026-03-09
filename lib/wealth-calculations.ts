/**
 * Wealth generation calculations — home appreciation, equity building, and profit projections.
 * Uses historical US home appreciation rates and location-specific data.
 */

import { getTypicalHomeValue, getPricePerSqft } from './home-value-lookup';

// Historical average US home appreciation rate (nominal, ~3.5-4% long-term)
const DEFAULT_APPRECIATION_RATE = 0.038;

// Mortgage constants
const MORTGAGE_RATE = 0.065; // Current avg 30-year fixed
const MORTGAGE_TERM_YEARS = 30;
const DOWN_PAYMENT_PCT = 0.20;

export interface WealthProjection {
  year: number;
  homeValue: number;
  equity: number;
  mortgageBalance: number;
  totalWealth: number; // equity + savings
  appreciationGain: number; // total appreciation from purchase price
  appreciationPct: number;
}

export interface SellAnalysis {
  year: number;
  homeValue: number;
  mortgageBalance: number;
  equity: number;
  sellingCosts: number; // ~6% agent fees + closing
  netProfit: number;
  totalInvested: number; // down payment + payments made
  roi: number;
  upgradeHomeValue: number; // what home you could buy with proceeds as down payment
}

export interface LocationWealth {
  name: string;
  currentHomeValue: number;
  maxAffordableValue: number;
  wealthAt15: number;
  wealthAt20: number;
  wealthAt25: number;
  wealthAt30: number;
  wealthAt50: number;
  appreciationAt30: number;
  appreciationPctAt30: number;
  effectiveWealth: number; // equity + savings after 30 years
  isViable: boolean;
}

/**
 * Calculate monthly mortgage payment (P&I only).
 */
function monthlyPayment(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Calculate remaining mortgage balance after N years.
 */
function remainingBalance(principal: number, annualRate: number, totalYears: number, yearsPaid: number): number {
  const r = annualRate / 12;
  const n = totalYears * 12;
  const p = yearsPaid * 12;
  if (r === 0) return principal * (1 - p / n);
  const pmt = monthlyPayment(principal, annualRate, totalYears);
  return principal * Math.pow(1 + r, p) - pmt * ((Math.pow(1 + r, p) - 1) / r);
}

/**
 * Project home value appreciation over time.
 */
export function projectHomeValue(
  purchasePrice: number,
  years: number,
  appreciationRate: number = DEFAULT_APPRECIATION_RATE,
): number {
  return purchasePrice * Math.pow(1 + appreciationRate, years);
}

/**
 * Generate full wealth projection timeline for a home purchase.
 */
export function generateWealthTimeline(
  homePrice: number,
  yearsToOwn: number = 0, // years until purchase (from savings period)
  projectionYears: number = 50,
  appreciationRate: number = DEFAULT_APPRECIATION_RATE,
  annualSavings: number = 0,
): WealthProjection[] {
  const timeline: WealthProjection[] = [];
  const downPayment = homePrice * DOWN_PAYMENT_PCT;
  const loanAmount = homePrice - downPayment;

  for (let y = 1; y <= projectionYears; y++) {
    const ownershipYears = Math.max(0, y - yearsToOwn);

    if (ownershipYears <= 0) {
      // Still saving for down payment
      timeline.push({
        year: y,
        homeValue: 0,
        equity: 0,
        mortgageBalance: 0,
        totalWealth: annualSavings * y,
        appreciationGain: 0,
        appreciationPct: 0,
      });
      continue;
    }

    const currentValue = projectHomeValue(homePrice, ownershipYears, appreciationRate);
    const mortgageBal = ownershipYears >= MORTGAGE_TERM_YEARS
      ? 0
      : Math.max(0, remainingBalance(loanAmount, MORTGAGE_RATE, MORTGAGE_TERM_YEARS, ownershipYears));
    const equity = currentValue - mortgageBal;
    const appreciationGain = currentValue - homePrice;

    timeline.push({
      year: y,
      homeValue: Math.round(currentValue),
      equity: Math.round(equity),
      mortgageBalance: Math.round(mortgageBal),
      totalWealth: Math.round(equity + annualSavings * y),
      appreciationGain: Math.round(appreciationGain),
      appreciationPct: homePrice > 0 ? (appreciationGain / homePrice) * 100 : 0,
    });
  }

  return timeline;
}

/**
 * Analyze profit from selling at a specific year.
 */
export function analyzeSale(
  homePrice: number,
  sellAfterYears: number,
  appreciationRate: number = DEFAULT_APPRECIATION_RATE,
): SellAnalysis {
  const downPayment = homePrice * DOWN_PAYMENT_PCT;
  const loanAmount = homePrice - downPayment;
  const monthly = monthlyPayment(loanAmount, MORTGAGE_RATE, MORTGAGE_TERM_YEARS);
  const yearsPaid = Math.min(sellAfterYears, MORTGAGE_TERM_YEARS);
  const totalPayments = monthly * 12 * yearsPaid;

  const salePrice = projectHomeValue(homePrice, sellAfterYears, appreciationRate);
  const mortgageBal = sellAfterYears >= MORTGAGE_TERM_YEARS
    ? 0
    : Math.max(0, remainingBalance(loanAmount, MORTGAGE_RATE, MORTGAGE_TERM_YEARS, sellAfterYears));
  const sellingCosts = salePrice * 0.06; // Agent fees + closing costs
  const equity = salePrice - mortgageBal;
  const netProfit = equity - sellingCosts - downPayment;
  const totalInvested = downPayment + totalPayments;
  const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;

  // What could you buy with equity as new down payment?
  const availableForDownPayment = equity - sellingCosts;
  const upgradeHomeValue = availableForDownPayment > 0 ? availableForDownPayment / DOWN_PAYMENT_PCT : 0;

  return {
    year: sellAfterYears,
    homeValue: Math.round(salePrice),
    mortgageBalance: Math.round(mortgageBal),
    equity: Math.round(equity),
    sellingCosts: Math.round(sellingCosts),
    netProfit: Math.round(netProfit),
    totalInvested: Math.round(totalInvested),
    roi: Math.round(roi * 10) / 10,
    upgradeHomeValue: Math.round(upgradeHomeValue),
  };
}

/**
 * Calculate wealth metrics for a specific location given a max affordable home price.
 */
export function calculateLocationWealth(
  locationName: string,
  maxAffordablePrice: number,
  yearsToOwn: number,
  isViable: boolean,
  annualSavings: number = 0,
): LocationWealth {
  const currentHomeValue = getTypicalHomeValue(locationName);

  if (!isViable || maxAffordablePrice <= 0) {
    return {
      name: locationName,
      currentHomeValue,
      maxAffordableValue: maxAffordablePrice,
      wealthAt15: 0,
      wealthAt20: 0,
      wealthAt25: 0,
      wealthAt30: 0,
      wealthAt50: 0,
      appreciationAt30: 0,
      appreciationPctAt30: 0,
      effectiveWealth: 0,
      isViable: false,
    };
  }

  const timeline = generateWealthTimeline(
    maxAffordablePrice,
    yearsToOwn,
    50,
    DEFAULT_APPRECIATION_RATE,
    annualSavings,
  );

  const at15 = timeline.find(t => t.year === 15);
  const at20 = timeline.find(t => t.year === 20);
  const at25 = timeline.find(t => t.year === 25);
  const at30 = timeline.find(t => t.year === 30);
  const at50 = timeline.find(t => t.year === 50);

  return {
    name: locationName,
    currentHomeValue,
    maxAffordableValue: maxAffordablePrice,
    wealthAt15: at15?.totalWealth ?? 0,
    wealthAt20: at20?.totalWealth ?? 0,
    wealthAt25: at25?.totalWealth ?? 0,
    wealthAt30: at30?.totalWealth ?? 0,
    wealthAt50: at50?.totalWealth ?? 0,
    appreciationAt30: at30?.appreciationGain ?? 0,
    appreciationPctAt30: at30?.appreciationPct ?? 0,
    effectiveWealth: at30?.equity ?? 0,
    isViable,
  };
}

/**
 * Historical home value data points for charting (normalized trend).
 * Based on Case-Shiller US National Home Price Index patterns.
 */
export function getHistoricalTrend(years: number = 30): { year: number; indexValue: number }[] {
  const data: { year: number; indexValue: number }[] = [];
  // Simulate realistic historical pattern with some volatility
  const baseYear = new Date().getFullYear() - years;
  let value = 100;
  for (let i = 0; i <= years; i++) {
    const yr = baseYear + i;
    // Approximate historical patterns
    let growth = DEFAULT_APPRECIATION_RATE;
    if (yr >= 2006 && yr <= 2008) growth = -0.05; // Housing crisis
    else if (yr >= 2009 && yr <= 2011) growth = -0.02; // Recovery
    else if (yr >= 2020 && yr <= 2022) growth = 0.10; // Post-COVID surge
    else if (yr >= 2023) growth = 0.03; // Normalization

    value *= (1 + growth);
    data.push({ year: yr, indexValue: Math.round(value * 10) / 10 });
  }
  return data;
}
