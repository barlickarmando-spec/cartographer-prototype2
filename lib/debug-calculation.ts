/**
 * DEBUG HELPER - Use this to diagnose calculation failures
 * 
 * Place this at the top of your results page or onboarding completion handler
 */

import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { getLocationData, getSalary } from '@/lib/data-extraction';
import { calculateAutoApproach } from '@/lib/calculation-engine';

/**
 * Debug the entire calculation flow
 * This will log every step and show exactly where it's failing
 */
export function debugCalculation(answers: any) {
  console.log('=== STARTING DEBUG ===');
  console.log('1. Raw onboarding answers:', JSON.stringify(answers, null, 2));
  
  try {
    // Step 1: Normalize answers
    console.log('\n2. Normalizing answers...');
    const profile = normalizeOnboardingAnswers(answers);
    console.log('   ✅ Profile created:', JSON.stringify(profile, null, 2));
    
    // Step 2: Check profile fields
    console.log('\n3. Checking profile fields...');
    console.log(`   currentAge: ${profile.currentAge} (${typeof profile.currentAge})`);
    console.log(`   userOccupation: "${profile.userOccupation}"`);
    console.log(`   studentLoanDebt: ${profile.studentLoanDebt}`);
    console.log(`   studentLoanRate: ${profile.studentLoanRate}`);
    console.log(`   disposableIncomeAllocation: ${profile.disposableIncomeAllocation}`);
    console.log(`   currentSavings: ${profile.currentSavings}`);
    console.log(`   selectedLocations: [${profile.selectedLocations.join(', ')}]`);
    
    // Step 3: Test location data extraction
    console.log('\n4. Testing location data extraction...');
    const testLocation = profile.selectedLocations[0] || 'Utah';
    console.log(`   Testing location: "${testLocation}"`);
    
    const locationData = getLocationData(testLocation);
    if (!locationData) {
      console.error(`   ❌ FAILED: Location "${testLocation}" not found!`);
      console.log('   Available locations sample:');
      console.log('   - Try: "Utah"');
      console.log('   - Try: "Texas"');
      console.log('   - Try: "Austin, TX"');
      return;
    }
    console.log(`   ✅ Location data found:`, {
      name: locationData.name,
      type: locationData.type,
      hasRentData: !!locationData.rent,
      hasHousingData: !!locationData.housing,
      hasCOLData: !!locationData.adjustedCOL,
    });
    
    // Step 4: Test salary extraction
    console.log('\n5. Testing salary extraction...');
    const salary = getSalary(testLocation, profile.userOccupation, profile.userSalary);
    console.log(`   Salary for "${profile.userOccupation}" in ${testLocation}: $${salary}`);
    
    if (salary === 0) {
      console.warn(`   ⚠️ WARNING: Salary is $0! Occupation might not be found.`);
      console.log(`   Occupation entered: "${profile.userOccupation}"`);
      console.log('   Common occupations:');
      console.log('   - "Computer and Mathematics"');
      console.log('   - "Healthcare"');
      console.log('   - "Education"');
      console.log('   - "Business and Finance"');
    }
    
    // Step 5: Test calculation
    console.log('\n6. Running calculation...');
    console.log(`   Location: ${testLocation}`);
    console.log(`   Years: 30`);
    
    const result = calculateAutoApproach(profile, testLocation, 30);
    
    if (!result) {
      console.error('   ❌ FAILED: calculateAutoApproach returned null');
      console.log('   This means location was not found in data-extraction.ts');
      return;
    }
    
    if (!result.calculationSuccessful) {
      console.error('   ❌ FAILED: Calculation unsuccessful');
      console.error('   Error message:', result.errorMessage);
      console.error('   Warnings:', result.warnings);
      return;
    }
    
    console.log('   ✅ SUCCESS!');
    console.log('   Results:', {
      location: result.location,
      viable: result.isViable,
      classification: result.viabilityClassification,
      yearsToMortgage: result.yearsToMortgage,
      yearsToDebtFree: result.yearsToDebtFree,
      simulationYears: result.yearByYear.length,
    });
    
    console.log('\n=== DEBUG COMPLETE ===');
    return result;
    
  } catch (error) {
    console.error('\n❌ EXCEPTION THROWN:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
  }
}

/**
 * Quick test with minimal profile
 */
export function quickTest() {
  console.log('=== QUICK TEST ===');
  
  const testAnswers = {
    // Step 1
    currentSituation: 'graduated-independent',
    
    // Step 2
    relationshipStatus: 'single',
    kidsPlan: 'no',
    hardRules: ['none'],
    
    // Step 3
    currentAge: 25,
    userOccupation: 'Computer and Mathematics',
    userSalary: undefined,
    
    // Step 4
    userStudentLoanDebt: 45000,
    userStudentLoanRate: 0.065,
    additionalDebts: [],
    savingsAccountValue: 5000,
    
    // Step 5
    disposableIncomeAllocation: 70,
    
    // Step 6
    locationSituation: 'know-exactly',
    exactLocation: 'Utah',
    potentialLocations: [],
  };
  
  debugCalculation(testAnswers);
}

/**
 * Test data extraction directly
 */
export function testDataExtraction() {
  console.log('=== TESTING DATA EXTRACTION ===');
  
  // Test 1: Import check
  console.log('\n1. Checking imports...');
  try {
    console.log('   ✅ data-extraction.ts imported successfully');
  } catch (error) {
    console.error('   ❌ FAILED to import data-extraction.ts');
    console.error('   Error:', error);
    return;
  }
  
  // Test 2: Get location data
  console.log('\n2. Testing getLocationData...');
  const locations = ['Utah', 'Texas', 'Austin, TX', 'New York'];
  
  locations.forEach(loc => {
    const data = getLocationData(loc);
    if (data) {
      console.log(`   ✅ "${loc}" found:`, {
        name: data.name,
        type: data.type,
      });
    } else {
      console.error(`   ❌ "${loc}" NOT FOUND`);
    }
  });
  
  // Test 3: Get salary data
  console.log('\n3. Testing getSalary...');
  const testCases = [
    { location: 'Utah', occupation: 'Computer and Mathematics' },
    { location: 'Texas', occupation: 'Healthcare' },
    { location: 'Austin, TX', occupation: 'Education' },
  ];
  
  testCases.forEach(({ location, occupation }) => {
    const salary = getSalary(location, occupation);
    console.log(`   ${location} + ${occupation}: $${salary.toLocaleString()}`);
  });
}

/**
 * Validate profile before calculation
 */
export function validateProfileDetailed(profile: any) {
  console.log('=== VALIDATING PROFILE ===');
  const errors: string[] = [];
  
  // Check each field
  console.log('\n1. Required fields:');
  
  if (!profile.currentAge) {
    errors.push('currentAge is missing');
    console.error('   ❌ currentAge is missing');
  } else if (typeof profile.currentAge !== 'number') {
    errors.push('currentAge is not a number');
    console.error(`   ❌ currentAge is not a number: ${typeof profile.currentAge}`);
  } else if (profile.currentAge < 18 || profile.currentAge > 100) {
    errors.push('currentAge must be 18-100');
    console.error(`   ❌ currentAge out of range: ${profile.currentAge}`);
  } else {
    console.log(`   ✅ currentAge: ${profile.currentAge}`);
  }
  
  if (!profile.userOccupation) {
    errors.push('userOccupation is missing');
    console.error('   ❌ userOccupation is missing');
  } else if (typeof profile.userOccupation !== 'string') {
    errors.push('userOccupation is not a string');
    console.error(`   ❌ userOccupation is not a string: ${typeof profile.userOccupation}`);
  } else {
    console.log(`   ✅ userOccupation: "${profile.userOccupation}"`);
  }
  
  if (profile.studentLoanDebt === undefined || profile.studentLoanDebt === null) {
    errors.push('studentLoanDebt is missing');
    console.error('   ❌ studentLoanDebt is missing');
  } else if (typeof profile.studentLoanDebt !== 'number') {
    errors.push('studentLoanDebt is not a number');
    console.error(`   ❌ studentLoanDebt is not a number: ${typeof profile.studentLoanDebt}`);
  } else if (profile.studentLoanDebt < 0) {
    errors.push('studentLoanDebt cannot be negative');
    console.error(`   ❌ studentLoanDebt is negative: ${profile.studentLoanDebt}`);
  } else {
    console.log(`   ✅ studentLoanDebt: $${profile.studentLoanDebt}`);
  }
  
  if (profile.studentLoanRate === undefined || profile.studentLoanRate === null) {
    errors.push('studentLoanRate is missing');
    console.error('   ❌ studentLoanRate is missing');
  } else if (typeof profile.studentLoanRate !== 'number') {
    errors.push('studentLoanRate is not a number');
    console.error(`   ❌ studentLoanRate is not a number: ${typeof profile.studentLoanRate}`);
  } else if (profile.studentLoanRate < 0 || profile.studentLoanRate > 1) {
    errors.push('studentLoanRate must be 0-1 (e.g., 0.065 for 6.5%)');
    console.error(`   ⚠️ studentLoanRate might be wrong format: ${profile.studentLoanRate}`);
    if (profile.studentLoanRate > 1) {
      console.error('   NOTE: Should be 0.065 NOT 6.5');
    }
  } else {
    console.log(`   ✅ studentLoanRate: ${profile.studentLoanRate} (${profile.studentLoanRate * 100}%)`);
  }
  
  if (profile.disposableIncomeAllocation === undefined || profile.disposableIncomeAllocation === null) {
    errors.push('disposableIncomeAllocation is missing');
    console.error('   ❌ disposableIncomeAllocation is missing');
  } else if (typeof profile.disposableIncomeAllocation !== 'number') {
    errors.push('disposableIncomeAllocation is not a number');
    console.error(`   ❌ disposableIncomeAllocation is not a number: ${typeof profile.disposableIncomeAllocation}`);
  } else if (profile.disposableIncomeAllocation < 0 || profile.disposableIncomeAllocation > 100) {
    errors.push('disposableIncomeAllocation must be 0-100');
    console.error(`   ❌ disposableIncomeAllocation out of range: ${profile.disposableIncomeAllocation}`);
  } else {
    console.log(`   ✅ disposableIncomeAllocation: ${profile.disposableIncomeAllocation}%`);
  }
  
  console.log('\n2. Summary:');
  if (errors.length === 0) {
    console.log('   ✅ All fields valid!');
  } else {
    console.error(`   ❌ ${errors.length} error(s) found:`);
    errors.forEach((error, i) => {
      console.error(`      ${i + 1}. ${error}`);
    });
  }
  
  return errors;
}

// Export all debug functions as a named export
const debugUtils = {
  debugCalculation,
  quickTest,
  testDataExtraction,
  validateProfileDetailed,
};

export default debugUtils;
