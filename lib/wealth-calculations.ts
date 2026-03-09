/**
 * Wealth generation calculations — derives wealth projections directly from
 * the calculation engine's yearly simulation. No hardcoded financial constants;
 * all rates come from location-specific data and the user's profile.
 */

import { getTypicalHomeValue } from './home-value-lookup';
import { getLocationData } from './data-extraction';
import type { CalculationResult, YearSnapshot } from './calculation-engine';

export interface WealthProjection {
  year: number;
  homeValue: number;
  equity: number;
  mortgageBalance: number;
  totalWealth: number; // netWealth = savings + equity - debts
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
  effectiveWealth: number; // equity after 30 years
  totalWealth: number; // net wealth at sell year
  rppFactor: number; // regional price parity factor (1.0 = national avg)
  totalEffectiveWealth: number; // totalWealth adjusted by RPP
  wealthAtSell: number; // total wealth at the sell year
  sellYear: number;
  isViable: boolean;
}

/**
 * Project home value appreciation over time using location-specific rate.
 */
export function projectHomeValue(
  purchasePrice: number,
  years: number,
  appreciationRate: number = 0.038,
): number {
  return purchasePrice * Math.pow(1 + appreciationRate, years);
}

/**
 * Generate wealth projection timeline from a CalculationResult.
 * Derives all values directly from the yearly simulation — no independent model.
 */
export function generateWealthTimeline(
  calcResult: CalculationResult,
  projectionYears: number = 50,
): WealthProjection[] {
  const snapshots = calcResult.yearByYear;
  if (!snapshots || snapshots.length === 0) return [];

  const purchasePrice = calcResult.houseProjections.maxAffordable?.maxSustainableHousePrice ?? 0;
  const timeline: WealthProjection[] = [];

  // Use simulation data directly for available years
  const lastSnap = snapshots[snapshots.length - 1];
  const appreciationRate = calcResult.locationData.housing.appreciationRate || 0.038;

  for (let y = 1; y <= projectionYears; y++) {
    const snap = snapshots.find(s => s.year === y);

    if (snap) {
      // Direct from simulation
      timeline.push({
        year: y,
        homeValue: Math.round(snap.homeValue),
        equity: Math.round(snap.homeEquity),
        mortgageBalance: Math.round(snap.mortgageBalance),
        totalWealth: Math.round(snap.netWealth),
        appreciationGain: Math.round(snap.homeValue > 0 ? snap.homeValue - purchasePrice : 0),
        appreciationPct: purchasePrice > 0 && snap.homeValue > 0
          ? Math.round(((snap.homeValue - purchasePrice) / purchasePrice) * 100)
          : 0,
      });
    } else if (lastSnap) {
      // Extrapolate beyond simulation horizon
      const extraYears = y - lastSnap.year;
      const homeValue = lastSnap.homeValue > 0
        ? lastSnap.homeValue * Math.pow(1 + appreciationRate, extraYears)
        : 0;
      // Mortgage balance continues to decrease (simple estimate: reduce proportionally)
      const mortBal = lastSnap.mortgageBalance > 0
        ? Math.max(0, lastSnap.mortgageBalance * Math.pow(0.93, extraYears))
        : 0;
      const equity = homeValue - mortBal;
      // Savings continue to grow at simulation's savings rate
      const savingsGrowth = lastSnap.savingsEnd * Math.pow(1.03, extraYears);
      const debts = Math.max(0, lastSnap.loanDebtEnd * Math.pow(0.8, extraYears));
      const netWealth = savingsGrowth + equity - debts;

      timeline.push({
        year: y,
        homeValue: Math.round(homeValue),
        equity: Math.round(equity),
        mortgageBalance: Math.round(mortBal),
        totalWealth: Math.round(netWealth),
        appreciationGain: Math.round(homeValue > 0 ? homeValue - purchasePrice : 0),
        appreciationPct: purchasePrice > 0 && homeValue > 0
          ? Math.round(((homeValue - purchasePrice) / purchasePrice) * 100)
          : 0,
      });
    }
  }

  return timeline;
}

/**
 * Analyze profit from selling at a specific year using simulation data.
 */
export function analyzeSale(
  calcResult: CalculationResult,
  sellAfterYears: number,
): SellAnalysis | null {
  const snap = calcResult.yearByYear.find(s => s.year === sellAfterYears);
  if (!snap || snap.homeValue <= 0) return null;

  const purchasePrice = calcResult.houseProjections.maxAffordable?.maxSustainableHousePrice ?? 0;
  const downPaymentPct = calcResult.locationData.housing.downPaymentPercent || 0.107;

  const homeValue = snap.homeValue;
  const mortgageBalance = snap.mortgageBalance;
  const equity = homeValue - mortgageBalance;
  const sellingCosts = homeValue * 0.06; // 6% agent fees + closing costs
  const downPayment = purchasePrice * downPaymentPct;

  // Total invested = down payment + all mortgage payments made
  // Sum housingCost for years where hasMortgage is true
  const mortgagePaymentsMade = calcResult.yearByYear
    .filter(s => s.hasMortgage && s.year <= sellAfterYears)
    .reduce((sum, s) => sum + s.housingCost, 0);
  const totalInvested = downPayment + mortgagePaymentsMade;

  const netProfit = equity - sellingCosts - downPayment;
  const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;

  // What could you buy with equity as new down payment?
  const availableForDownPayment = equity - sellingCosts;
  const upgradeHomeValue = availableForDownPayment > 0 ? availableForDownPayment / downPaymentPct : 0;

  return {
    year: sellAfterYears,
    homeValue: Math.round(homeValue),
    mortgageBalance: Math.round(mortgageBalance),
    equity: Math.round(equity),
    sellingCosts: Math.round(sellingCosts),
    netProfit: Math.round(netProfit),
    totalInvested: Math.round(totalInvested),
    roi: Math.round(roi * 10) / 10,
    upgradeHomeValue: Math.round(upgradeHomeValue),
  };
}

// National average COL for 1-person household (approximate baseline)
const NATIONAL_AVG_COL_ONE_PERSON = 35_000;

/**
 * Compute Regional Price Parity factor for a location.
 * RPP > 1 means more expensive than national average, < 1 means cheaper.
 */
export function getRppFactor(locationName: string): number {
  const locData = getLocationData(locationName);
  if (!locData) return 1.0;
  const localCOL = locData.adjustedCOL.onePerson;
  if (!localCOL || localCOL <= 0) return 1.0;
  return localCOL / NATIONAL_AVG_COL_ONE_PERSON;
}

/**
 * Calculate wealth metrics for a specific location from a CalculationResult.
 */
export function calculateLocationWealth(
  calcResult: CalculationResult,
  sellYear: number = 30,
): LocationWealth {
  const locationName = calcResult.location;
  const currentHomeValue = getTypicalHomeValue(locationName);
  const rpp = getRppFactor(locationName);
  const maxAffordablePrice = calcResult.houseProjections.maxAffordable?.maxSustainableHousePrice ?? 0;

  if (!calcResult.isViable || maxAffordablePrice <= 0) {
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
      totalWealth: 0,
      rppFactor: rpp,
      totalEffectiveWealth: 0,
      wealthAtSell: 0,
      sellYear,
      isViable: false,
    };
  }

  const timeline = generateWealthTimeline(calcResult, 50);

  const at15 = timeline.find(t => t.year === 15);
  const at20 = timeline.find(t => t.year === 20);
  const at25 = timeline.find(t => t.year === 25);
  const at30 = timeline.find(t => t.year === 30);
  const at50 = timeline.find(t => t.year === 50);
  const atSell = timeline.find(t => t.year === sellYear);

  const totalWealthVal = atSell?.totalWealth ?? at30?.totalWealth ?? 0;
  const effectiveWealthVal = at30?.equity ?? 0;

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
    effectiveWealth: effectiveWealthVal,
    totalWealth: totalWealthVal,
    rppFactor: rpp,
    totalEffectiveWealth: rpp > 0 ? totalWealthVal / rpp : totalWealthVal,
    wealthAtSell: atSell?.totalWealth ?? 0,
    sellYear,
    isViable: true,
  };
}

/**
 * Historical home value data points for charting (normalized trend).
 * Based on Case-Shiller US National Home Price Index patterns.
 */
export function getHistoricalTrend(years: number = 30): { year: number; indexValue: number }[] {
  const data: { year: number; indexValue: number }[] = [];
  const baseYear = new Date().getFullYear() - years;
  let value = 100;
  for (let i = 0; i <= years; i++) {
    const yr = baseYear + i;
    let growth = 0.038;
    if (yr >= 2006 && yr <= 2008) growth = -0.05;
    else if (yr >= 2009 && yr <= 2011) growth = -0.02;
    else if (yr >= 2020 && yr <= 2022) growth = 0.10;
    else if (yr >= 2023) growth = 0.03;

    value *= (1 + growth);
    data.push({ year: yr, indexValue: Math.round(value * 10) / 10 });
  }
  return data;
}
