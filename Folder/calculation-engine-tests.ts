/**
 * Calculation Engine - Test Examples
 * Demonstrates how to use the calculation engine with data extraction
 */

import { calculateAutoApproach } from './calculation-engine';
import { calculateDetailedHouseProjections, calculateDetailedKidViability, compareLocations } from './calculation-utils';
import { UserProfile, HouseholdTypeEnum } from './onboarding/types';

// ===== TEST SCENARIO 1: Married Couple, 2 Earners, Planning Kids =====
// This is the example from our working validation

export function testScenario1_MarriedCouple() {
  console.log('\n=== TEST SCENARIO 1: Married Couple ===\n');
  
  const profile: UserProfile = {
    // Demographics
    currentAge: 26,
    isFinanciallyIndependent: true,
    
    // Household
    householdType: HouseholdTypeEnum.TwoEarners,
    relationshipStatus: 'linked',
    numEarners: 2,
    numKids: 0,
    
    // Life Planning
    kidsPlan: 'yes',
    plannedKidAges: [30], // First kid at 30
    hardRules: ['none'],
    
    // Income - will be calculated from location + occupation
    userOccupation: 'Computer and Mathematics',
    partnerOccupation: 'Computer and Mathematics',
    usePartnerIncomeDoubling: false,
    
    // Debt (starting with $0 as in our example)
    studentLoanDebt: 0,
    studentLoanRate: 0,
    creditCardDebt: 0,
    creditCardAPR: 0.216,
    creditCardRefreshMonths: 36,
    carDebt: 0,
    carDebtRate: 0,
    otherDebt: 0,
    otherDebtRate: 0,
    
    // Savings
    currentSavings: 0,
    
    // Preferences
    disposableIncomeAllocation: 70,
    
    // Location
    locationSituation: 'know-exactly',
    selectedLocations: ['Utah'],
    currentLocation: 'Utah',
  };
  
  // Run calculation
  const result = calculateAutoApproach(profile, 'Utah', 15);
  
  if (!result) {
    console.error('❌ Calculation failed - could not find Utah data');
    return;
  }
  
  // Display results
  console.log('📊 RESULTS:');
  console.log(`Location: ${result.location}`);
  console.log(`Viability: ${result.viabilityClassification}`);
  console.log(`Years to Mortgage: ${result.yearsToMortgage}`);
  console.log(`Age at Mortgage: ${result.ageMortgageAcquired}`);
  console.log(`Minimum Allocation: ${result.minimumAllocationRequired}%`);
  
  console.log('\n💰 YEAR-BY-YEAR SNAPSHOT:');
  result.yearByYear.slice(0, 5).forEach(year => {
    console.log(`Year ${year.year} (Age ${year.age}):`);
    console.log(`  Income: $${year.totalIncome.toLocaleString()}`);
    console.log(`  DI: $${year.disposableIncome.toLocaleString()}`);
    console.log(`  EDI: $${year.effectiveDisposableIncome.toLocaleString()}`);
    console.log(`  Savings: $${Math.round(year.savingsEnd).toLocaleString()}`);
    console.log(`  Loan Debt: $${Math.round(year.loanDebtEnd).toLocaleString()}`);
    console.log(`  Has Mortgage: ${year.hasMortgage ? 'Yes' : 'No'}`);
    if (year.kidBornThisYear > 0) {
      console.log(`  👶 Kid #${year.kidBornThisYear} born!`);
    }
    console.log('');
  });
  
  console.log('\n🏠 HOUSE PROJECTIONS:');
  console.log(`3 Years: $${Math.round(result.houseProjections.threeYears.maxSustainableHousePrice).toLocaleString()}`);
  console.log(`5 Years: $${Math.round(result.houseProjections.fiveYears.maxSustainableHousePrice).toLocaleString()}`);
  console.log(`10 Years: $${Math.round(result.houseProjections.tenYears.maxSustainableHousePrice).toLocaleString()}`);
  
  console.log('\n💡 RECOMMENDATIONS:');
  result.recommendations.forEach(rec => console.log(`  ${rec}`));
}

// ===== TEST SCENARIO 2: Single, Student Loans, Planning Kids =====

export function testScenario2_SingleWithDebt() {
  console.log('\n=== TEST SCENARIO 2: Single with Student Debt ===\n');
  
  const profile: UserProfile = {
    currentAge: 25,
    isFinanciallyIndependent: true,
    householdType: HouseholdTypeEnum.OnePerson,
    relationshipStatus: 'single',
    numEarners: 1,
    numKids: 0,
    
    kidsPlan: 'yes',
    plannedKidAges: [32],
    hardRules: ['debt-before-kids'], // Must pay off debt first
    
    userOccupation: 'Education, Training, Library',
    usePartnerIncomeDoubling: false,
    
    // Significant student loan debt
    studentLoanDebt: 50000,
    studentLoanRate: 0.065,
    creditCardDebt: 5000,
    creditCardAPR: 0.216,
    creditCardRefreshMonths: 36,
    carDebt: 0,
    carDebtRate: 0,
    otherDebt: 0,
    otherDebtRate: 0,
    
    currentSavings: 2000,
    disposableIncomeAllocation: 70,
    
    locationSituation: 'know-exactly',
    selectedLocations: ['Texas'],
    currentLocation: 'Texas',
  };
  
  const result = calculateAutoApproach(profile, 'Texas', 20);
  
  if (!result) {
    console.error('❌ Calculation failed');
    return;
  }
  
  console.log('📊 RESULTS:');
  console.log(`Viability: ${result.viabilityClassification}`);
  console.log(`Years to Debt Free: ${result.yearsToDebtFree}`);
  console.log(`Years to Mortgage: ${result.yearsToMortgage}`);
  console.log(`Age Debt Free: ${result.ageDebtFree}`);
  console.log(`Minimum Allocation: ${result.minimumAllocationRequired}%`);
  
  // Show debt payoff progress
  console.log('\n💳 DEBT PAYOFF PROGRESS:');
  result.yearByYear.slice(0, 10).forEach(year => {
    if (year.loanDebtEnd > 0 || year.year === 1) {
      console.log(`Year ${year.year}: Loan Debt = $${Math.round(year.loanDebtEnd).toLocaleString()}, Savings = $${Math.round(year.savingsEnd).toLocaleString()}`);
    }
  });
}

// ===== TEST SCENARIO 3: Comparing Multiple Locations =====

export function testScenario3_MultipleLocations() {
  console.log('\n=== TEST SCENARIO 3: Comparing Locations ===\n');
  
  const profile: UserProfile = {
    currentAge: 28,
    isFinanciallyIndependent: true,
    householdType: HouseholdTypeEnum.TwoEarners,
    relationshipStatus: 'linked',
    numEarners: 2,
    numKids: 0,
    
    kidsPlan: 'yes',
    plannedKidAges: [32],
    hardRules: ['none'],
    
    userOccupation: 'Healthcare Practitioners and Technical Work',
    partnerOccupation: 'Management',
    usePartnerIncomeDoubling: false,
    
    studentLoanDebt: 30000,
    studentLoanRate: 0.055,
    creditCardDebt: 0,
    creditCardAPR: 0.216,
    creditCardRefreshMonths: 36,
    carDebt: 0,
    carDebtRate: 0,
    otherDebt: 0,
    otherDebtRate: 0,
    
    currentSavings: 15000,
    disposableIncomeAllocation: 75,
    
    locationSituation: 'deciding-between',
    selectedLocations: ['Texas', 'Utah', 'Colorado', 'Florida'],
  };
  
  // Calculate for all selected locations
  const locations = ['Texas', 'Utah', 'Colorado', 'Florida'];
  const results = locations.map(loc => calculateAutoApproach(profile, loc, 15)).filter(r => r !== null);
  
  if (results.length === 0) {
    console.error('❌ All calculations failed');
    return;
  }
  
  // Compare results
  const comparison = compareLocations(results);
  
  console.log('🏆 LOCATION RANKINGS:\n');
  comparison.forEach((loc, index) => {
    console.log(`${index + 1}. ${loc.location} (Score: ${loc.score})`);
    console.log(`   Viability: ${loc.viability}`);
    console.log(`   Years to Mortgage: ${loc.yearsToMortgage}`);
    console.log(`   Final Savings: $${Math.round(loc.finalSavings).toLocaleString()}`);
    console.log('');
  });
  
  // Show best location details
  const bestResult = results.find(r => r.location === comparison[0].location);
  if (bestResult) {
    console.log(`\n✨ BEST OPTION: ${bestResult.location}\n`);
    console.log('💡 Recommendations:');
    bestResult.recommendations.forEach(rec => console.log(`  ${rec}`));
  }
}

// ===== TEST SCENARIO 4: City vs State Comparison =====

export function testScenario4_CityVsState() {
  console.log('\n=== TEST SCENARIO 4: City vs State ===\n');
  
  const profile: UserProfile = {
    currentAge: 24,
    isFinanciallyIndependent: true,
    householdType: HouseholdTypeEnum.OnePerson,
    relationshipStatus: 'single',
    numEarners: 1,
    numKids: 0,
    
    kidsPlan: 'unsure',
    plannedKidAges: [],
    hardRules: ['none'],
    
    userOccupation: 'Computer and Mathematics',
    usePartnerIncomeDoubling: false,
    
    studentLoanDebt: 25000,
    studentLoanRate: 0.06,
    creditCardDebt: 0,
    creditCardAPR: 0.216,
    creditCardRefreshMonths: 36,
    carDebt: 0,
    carDebtRate: 0,
    otherDebt: 0,
    otherDebtRate: 0,
    
    currentSavings: 5000,
    disposableIncomeAllocation: 70,
    
    locationSituation: 'deciding-between',
    selectedLocations: ['Texas', 'Austin, TX'],
  };
  
  console.log('Comparing: Texas (state average) vs Austin, TX (city-specific)\n');
  
  const texasResult = calculateAutoApproach(profile, 'Texas', 15);
  const austinResult = calculateAutoApproach(profile, 'Austin, TX', 15);
  
  if (!texasResult || !austinResult) {
    console.error('❌ Could not compare - missing data');
    return;
  }
  
  console.log('📊 TEXAS (State):');
  console.log(`  Salary: $${texasResult.yearByYear[0]?.totalIncome.toLocaleString()}`);
  console.log(`  Median Home: $${texasResult.locationData.housing.medianHomeValue.toLocaleString()}`);
  console.log(`  Years to Mortgage: ${texasResult.yearsToMortgage}`);
  console.log(`  Viability: ${texasResult.viabilityClassification}`);
  
  console.log('\n📊 AUSTIN, TX (City):');
  console.log(`  Salary: $${austinResult.yearByYear[0]?.totalIncome.toLocaleString()}`);
  console.log(`  Median Home: $${austinResult.locationData.housing.medianHomeValue.toLocaleString()}`);
  console.log(`  Years to Mortgage: ${austinResult.yearsToMortgage}`);
  console.log(`  Viability: ${austinResult.viabilityClassification}`);
  
  console.log('\n💡 ANALYSIS:');
  const salaryDiff = austinResult.yearByYear[0].totalIncome - texasResult.yearByYear[0].totalIncome;
  const homeDiff = austinResult.locationData.housing.medianHomeValue - texasResult.locationData.housing.medianHomeValue;
  
  console.log(`  Salary Difference: ${salaryDiff > 0 ? '+' : ''}$${salaryDiff.toLocaleString()}`);
  console.log(`  Home Price Difference: ${homeDiff > 0 ? '+' : ''}$${homeDiff.toLocaleString()}`);
  console.log(`  Better Option: ${austinResult.yearsToMortgage < texasResult.yearsToMortgage ? 'Austin' : 'Texas'}`);
}

// ===== RUN ALL TESTS =====

export function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║    CARTOGRAPHER CALCULATION ENGINE - TESTS        ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  try {
    testScenario1_MarriedCouple();
    testScenario2_SingleWithDebt();
    testScenario3_MultipleLocations();
    testScenario4_CityVsState();
    
    console.log('\n✅ ALL TESTS COMPLETED\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
  }
}

// Export for use in Node.js or browser console
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testScenario1_MarriedCouple,
    testScenario2_SingleWithDebt,
    testScenario3_MultipleLocations,
    testScenario4_CityVsState,
    runAllTests,
  };
}
