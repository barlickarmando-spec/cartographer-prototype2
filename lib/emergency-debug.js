/**
 * EMERGENCY DEBUG - MINIMAL TEST
 * 
 * Copy this ENTIRE code and paste it in your browser console (F12)
 * This will test each piece individually to find the exact problem
 */

// TEST 1: Check if imports work
console.log('TEST 1: Checking imports...');
try {
  const extraction = await import('/lib/data-extraction');
  console.log('✅ data-extraction.ts loads');
  console.log('   Functions:', Object.keys(extraction));
} catch (e) {
  console.error('❌ FAILED to load data-extraction.ts');
  console.error('   Error:', e.message);
  console.error('   PATH ISSUE: Make sure file is at /lib/data-extraction.ts');
}

// TEST 2: Check if we can get location data
console.log('\nTEST 2: Testing getLocationData...');
try {
  const { getLocationData } = await import('/lib/data-extraction');
  
  const testLocations = ['Utah', 'Texas', 'California', 'Austin, TX'];
  testLocations.forEach(loc => {
    const data = getLocationData(loc);
    if (data) {
      console.log(`✅ "${loc}" found - type: ${data.type}`);
    } else {
      console.error(`❌ "${loc}" NOT FOUND`);
    }
  });
} catch (e) {
  console.error('❌ getLocationData failed:', e.message);
}

// TEST 3: Check if we can get salary
console.log('\nTEST 3: Testing getSalary...');
try {
  const { getSalary } = await import('/lib/data-extraction');
  
  const salary = getSalary('Utah', 'Computer and Mathematics');
  console.log(`✅ Salary: $${salary.toLocaleString()}`);
  
  if (salary === 0) {
    console.error('❌ Salary is $0 - occupation not found!');
  }
} catch (e) {
  console.error('❌ getSalary failed:', e.message);
}

// TEST 4: Check if normalize works
console.log('\nTEST 4: Testing normalizeOnboardingAnswers...');
try {
  const { normalizeOnboardingAnswers } = await import('/lib/onboarding/normalize');
  
  const testAnswers = {
    currentSituation: 'graduated-independent',
    relationshipStatus: 'single',
    kidsPlan: 'no',
    hardRules: ['none'],
    currentAge: 25,
    userOccupation: 'Computer and Mathematics',
    userStudentLoanDebt: 0,
    userStudentLoanRate: 0.065,
    additionalDebts: [],
    savingsAccountValue: 5000,
    disposableIncomeAllocation: 70,
    locationSituation: 'know-exactly',
    exactLocation: 'Utah',
    potentialLocations: [],
  };
  
  const profile = normalizeOnboardingAnswers(testAnswers);
  console.log('✅ Profile created');
  console.log('   Age:', profile.currentAge);
  console.log('   Occupation:', profile.userOccupation);
  console.log('   Locations:', profile.selectedLocations);
} catch (e) {
  console.error('❌ normalizeOnboardingAnswers failed:', e.message);
  console.error('   Stack:', e.stack);
}

// TEST 5: Try minimal calculation
console.log('\nTEST 5: Testing calculateAutoApproach...');
try {
  const { normalizeOnboardingAnswers } = await import('/lib/onboarding/normalize');
  const { calculateAutoApproach } = await import('/lib/calculation-engine');
  
  const testAnswers = {
    currentSituation: 'graduated-independent',
    relationshipStatus: 'single',
    kidsPlan: 'no',
    hardRules: ['none'],
    currentAge: 25,
    userOccupation: 'Computer and Mathematics',
    userStudentLoanDebt: 0,
    userStudentLoanRate: 0.065,
    additionalDebts: [],
    savingsAccountValue: 5000,
    disposableIncomeAllocation: 70,
    locationSituation: 'know-exactly',
    exactLocation: 'Utah',
    potentialLocations: [],
  };
  
  const profile = normalizeOnboardingAnswers(testAnswers);
  const result = calculateAutoApproach(profile, 'Utah', 30);
  
  if (!result) {
    console.error('❌ calculateAutoApproach returned NULL');
    console.error('   This means location not found');
  } else if (!result.calculationSuccessful) {
    console.error('❌ Calculation unsuccessful');
    console.error('   Error:', result.errorMessage);
    console.error('   Warnings:', result.warnings);
  } else {
    console.log('✅ CALCULATION SUCCESSFUL!');
    console.log('   Location:', result.location);
    console.log('   Viable:', result.isViable);
    console.log('   Years to mortgage:', result.yearsToMortgage);
  }
} catch (e) {
  console.error('❌ calculateAutoApproach failed:', e.message);
  console.error('   Stack:', e.stack);
}

console.log('\n=== TESTS COMPLETE ===');
console.log('Copy all output above and share it!');
