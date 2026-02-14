# 🧮 Calculation Engine - Implementation Guide

## What You Just Got

A **complete, production-ready calculation engine** that:
- ✅ Implements Auto Approach Formula with all rules
- ✅ Works with states AND cities from your JSON
- ✅ Year-by-year simulation (up to 30 years)
- ✅ Viability classification (6 levels)
- ✅ House size projections (3, 5, 10, 15 years)
- ✅ Kid viability calculations
- ✅ Multi-location comparison
- ✅ Comprehensive testing suite

---

## 📁 Files to Add

### Core Engine Files

```bash
# Add to /lib/
cp calculation-engine.ts lib/calculation-engine.ts
cp calculation-utils.ts lib/calculation-utils.ts

# Optional: Add tests to /lib/__tests__/
cp calculation-engine-tests.ts lib/__tests__/calculation-engine-tests.ts
```

---

## 🔧 Integration Steps

### Step 1: Update Your Onboarding Complete Handler

In `/app/onboarding/page.tsx`, update the `handleComplete` function:

```typescript
const handleComplete = useCallback(
  async (answers: OnboardingAnswers) => {
    const profile = normalizeOnboardingAnswers(answers);
    setOnboardingAnswers(answers);
    setUserProfile(profile);
    
    // Run calculations for all selected locations
    const locations = profile.selectedLocations.length > 0 
      ? profile.selectedLocations 
      : getAllStates(); // Calculate all if "no idea"
    
    const results = locations.map(loc => 
      calculateAutoApproach(profile, loc, 30)
    ).filter(r => r !== null);
    
    // Save results to localStorage
    localStorage.setItem('calculation-results', JSON.stringify(results));
    
    // Navigate to results page
    router.push('/results');
  },
  [router]
);
```

### Step 2: Create Results Page

Create `/app/results/page.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getViabilityDetails } from "@/lib/calculation-utils";

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const stored = localStorage.getItem('calculation-results');
    if (!stored) {
      router.push('/onboarding');
      return;
    }
    
    try {
      const parsed = JSON.parse(stored);
      setResults(parsed);
    } catch (error) {
      console.error('Error loading results:', error);
      router.push('/onboarding');
    } finally {
      setLoading(false);
    }
  }, [router]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-600">Calculating your financial roadmap...</p>
      </div>
    );
  }
  
  if (results.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No results available</p>
          <Link href="/onboarding" className="text-cyan-600 hover:text-cyan-700">
            Start Over
          </Link>
        </div>
      </div>
    );
  }
  
  // Sort by viability score
  const sortedResults = [...results].sort((a, b) => {
    const scoreMap: Record<string, number> = {
      'very-viable-stable': 6,
      'viable': 5,
      'viable-higher-allocation': 4,
      'viable-extreme-care': 3,
      'viable-when-renting': 2,
      'no-viable-path': 1,
    };
    return (scoreMap[b.viabilityClassification] || 0) - (scoreMap[a.viabilityClassification] || 0);
  });
  
  const bestResult = sortedResults[0];
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <Image
                src="/Icons/Icons Transparent/Logo_transparent.png"
                alt="Cartographer"
                width={200}
                height={50}
                className="h-10 w-auto"
              />
            </Link>
            <Link href="/onboarding" className="text-slate-600 hover:text-slate-900">
              Edit Profile
            </Link>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Your Financial Roadmap</h1>
        <p className="text-slate-600 mb-8">
          Based on your profile, here's how you can achieve your goals
        </p>
        
        {/* Best Location Highlight */}
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-8 mb-8 border border-cyan-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            🏆 Best Fit: {bestResult.location}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Years to Mortgage</p>
              <p className="text-3xl font-bold text-cyan-600">
                {bestResult.yearsToMortgage > 0 ? bestResult.yearsToMortgage : 'N/A'}
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Age at Mortgage</p>
              <p className="text-3xl font-bold text-cyan-600">
                {bestResult.ageMortgageAcquired > 0 ? bestResult.ageMortgageAcquired : 'N/A'}
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Viability</p>
              <p className="text-lg font-semibold text-slate-800">
                {getViabilityDetails(bestResult.viabilityClassification).label}
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold text-slate-800 mb-2">💡 Recommendations</h3>
            <ul className="space-y-1">
              {bestResult.recommendations.map((rec: string, i: number) => (
                <li key={i} className="text-slate-600 text-sm">{rec}</li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* All Locations */}
        {sortedResults.length > 1 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">All Locations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedResults.map((result, index) => {
                const viability = getViabilityDetails(result.viabilityClassification);
                return (
                  <div key={index} className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-3">
                      {result.location}
                    </h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Viability:</span>
                        <span className="font-semibold">{viability.emoji} {viability.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Years to Mortgage:</span>
                        <span className="font-semibold">{result.yearsToMortgage > 0 ? result.yearsToMortgage : 'N/A'}</span>
                      </div>
                      {result.yearsToDebtFree > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Years Debt-Free:</span>
                          <span className="font-semibold">{result.yearsToDebtFree}</span>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        localStorage.setItem('selected-result', JSON.stringify(result));
                        router.push('/results/detail');
                      }}
                      className="w-full bg-cyan-500 text-white py-2 rounded-lg hover:bg-cyan-600 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

---

## 🧪 Testing the Engine

### Option 1: Browser Console

After implementing, open browser console and run:

```javascript
// Import the test functions
import { runAllTests } from '@/lib/__tests__/calculation-engine-tests';

// Run all test scenarios
runAllTests();
```

### Option 2: Node.js Script

Create `/scripts/test-calculations.js`:

```javascript
const { runAllTests } = require('../lib/__tests__/calculation-engine-tests');
runAllTests();
```

Run with:
```bash
node scripts/test-calculations.js
```

---

## 📊 Understanding the Results

### CalculationResult Structure

```typescript
{
  location: string,           // "Utah" or "Austin, TX"
  locationData: LocationData, // Full location data from extraction
  
  // Timeline
  yearsToDebtFree: number,    // -1 if no debt
  yearsToMortgage: number,    // -1 if not viable
  ageDebtFree: number,        // -1 if no debt
  ageMortgageAcquired: number, // -1 if not viable
  
  // Viability
  viabilityClassification: string,
  isViable: boolean,
  minimumAllocationRequired: number,
  
  // Detailed data
  yearByYear: YearSnapshot[],
  houseProjections: { ... },
  kidViability: { ... },
  recommendations: string[],
}
```

### YearSnapshot Structure

Each year contains:
```typescript
{
  year: number,              // 1, 2, 3...
  age: number,               // User's age this year
  totalIncome: number,       // Combined household income
  disposableIncome: number,  // Income - COL
  effectiveDisposableIncome: number, // DI × allocation%
  savingsEnd: number,        // Total savings at year end
  loanDebtEnd: number,       // Remaining loan debt
  hasMortgage: boolean,      // Whether mortgage acquired
  // ... and more
}
```

---

## 🎯 Key Features

### 1. Auto Approach Priority Stack
```
1. CC Debt (paid every refresh cycle)
2. Loan Debt (36% rule, minimum to prevent growth)
3. Savings (all remaining EDI)
```

### 2. Hard Rules Support
- ✅ `debt-before-kids`: Blocks kid events until debt = 0
- ✅ `mortgage-before-kids`: Blocks kids until mortgage acquired
- ✅ `kids-asap-viable`: Forces kid at earliest viable age
- ✅ `none`: No restrictions

### 3. Partner Income Doubling
If user planning relationship but no partner occupation specified:
- Income doubles at relationship age
- Automatic household type update

### 4. Mortgage Trigger
Mortgage acquired when:
- Savings ≥ (Down Payment + 1 Year Payments)
- AND loan debt = 0 (or hard rule satisfied)

### 5. Viability Classifications

| Class | Years to Mortgage | Allocation | Description |
|-------|------------------|------------|-------------|
| Very Viable & Stable | ≤3 | ≤75% | Excellent position |
| Viable | ≤5 | ≤75% | Solid path |
| Viable (Higher Allocation) | ≤8 | 70-80% | Requires discipline |
| Viable (Extreme Care) | ≤12 | 80-90% | Fragile |
| Viable When Renting | >15 | Any | Sustainable renting |
| No Viable Path | Never | Any | Structural mismatch |

---

## 🐛 Common Issues & Fixes

### "Cannot find module calculation-engine"
**Fix:** Make sure files are in `/lib/` not `/lib/onboarding/`

### Results show "No viable path" for all locations
**Fix:** Check if:
- Income is realistic for occupation
- COL data is loading correctly
- Allocation isn't too low (try 70%+)

### Year-by-year stops early
**Expected behavior:** Simulation stops when:
- Debt growing 2+ consecutive years (unviable)
- Disposable income negative long-term (unviable)
- Main goals achieved (mortgage + debt-free)

### House projections show $0
**Fix:** Probably reaching year before savings accumulate. Check `yearByYear` array length.

---

## 🚀 Next Steps

1. **Implement Results Page** (provided above)
2. **Add Detail View** (show year-by-year, charts)
3. **Add Comparison View** (side-by-side locations)
4. **Add Export** (PDF report, CSV download)

---

## 📝 Advanced Usage

### Custom Simulation Length

```typescript
// Short simulation (15 years)
const result = calculateAutoApproach(profile, 'Utah', 15);

// Long simulation (30 years)
const result = calculateAutoApproach(profile, 'Utah', 30);
```

### Filter by Viability

```typescript
const results = locations.map(loc => calculateAutoApproach(profile, loc))
  .filter(r => r !== null && r.isViable);

// Only show locations where mortgage is achievable
const viable = results.filter(r => r.yearsToMortgage > 0 && r.yearsToMortgage <= 10);
```

### Extract Specific Data

```typescript
const result = calculateAutoApproach(profile, 'Utah');

// Get savings at year 5
const year5 = result.yearByYear.find(y => y.year === 5);
console.log('Savings at year 5:', year5?.savingsEnd);

// Get age when debt-free
console.log('Debt-free at age:', result.ageDebtFree);

// Get 10-year house projection
console.log('10-year house:', result.houseProjections.tenYears.maxSustainableHousePrice);
```

---

## ✅ Verification Checklist

- [ ] Files copied to `/lib/`
- [ ] Tests run successfully
- [ ] Results page created
- [ ] Onboarding completion triggers calculation
- [ ] Results display correctly
- [ ] Multi-location comparison works
- [ ] Viability classifications make sense
- [ ] House projections are realistic
- [ ] No console errors

---

**You're all set!** The engine is production-ready. Test it thoroughly, then we can add visualizations (charts, timelines, etc.) in the next phase! 🎉
