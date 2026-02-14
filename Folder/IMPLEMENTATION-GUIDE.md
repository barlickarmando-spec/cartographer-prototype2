# 🚀 Cartographer Implementation Guide

## Phase 1: Auth Facade + Data Extraction (COMPLETE)

This guide contains all the code you need to:
1. ✅ Bypass broken authentication
2. ✅ Extract location data from your JSON  
3. ✅ Set up the new onboarding types
4. ✅ Test the onboarding flow

---

## 📁 Files to Update

### 1. **Auth Facade** - Get Users to Onboarding Fast

Replace these files in your project:

#### `/app/signup/page.tsx`
```tsx
// Replace with: signup-page-facade.tsx
// Location: /home/claude/signup-page-facade.tsx
```
✅ **What it does:** Lets users enter anything → routes directly to `/onboarding`
✅ **Shows:** "Testing Mode" banner so users know auth is bypassed

#### `/app/login/page.tsx`  
```tsx
// Replace with: login-page-facade.tsx
// Location: /home/claude/login-page-facade.tsx
```
✅ **What it does:** Same as signup - instant access to onboarding

---

### 2. **Data Extraction Utility** - Pull Location Data

#### `/lib/data-extraction.ts` (NEW FILE)
```tsx
// Copy from: /home/claude/data-extraction.ts
```

✅ **What it does:**
- Extracts salaries by occupation for each state
- Gets housing/mortgage data (median home value, interest rates, down payment %)
- Gets adjusted cost of living for all 12 household types
- Gets rent costs by bedroom size (1BR, 2BR, 3BR)

✅ **Key functions:**
```typescript
getLocationData('Utah') // Returns all data for Utah
getSalary('Utah', 'Computer and Mathematics') // Returns salary
getAllStates() // Returns list of all states
```

---

### 3. **Updated TypeScript Types**

#### `/lib/onboarding/types.ts` (REPLACE)
```tsx
// Replace with: /home/claude/onboarding-types.ts
```

✅ **What it includes:**
- `OnboardingAnswers` - Raw survey responses
- `UserProfile` - Normalized data for calculations
- `HouseholdTypeEnum` - All 12 household types
- `HardRule` - New hard rules (debt-before-kids, mortgage-before-kids, etc.)
- Helper functions for household type determination

---

### 4. **Normalization Logic**

#### `/lib/onboarding/normalize.ts` (REPLACE)
```tsx
// Replace with: /home/claude/normalize.ts
```

✅ **What it does:**
- Converts `OnboardingAnswers` → `UserProfile`
- Applies partner income doubling rule
- Consolidates all debts
- Determines household type from relationship + kids
- Handles "unsure" cases with averages

---

## 🎯 How to Use These Files

### Step 1: Copy Files to Your Project

```bash
# Auth facades
cp /home/claude/signup-page-facade.tsx app/signup/page.tsx
cp /home/claude/login-page-facade.tsx app/login/page.tsx

# Data utilities
mkdir -p lib
cp /home/claude/data-extraction.ts lib/data-extraction.ts

# Onboarding types
mkdir -p lib/onboarding
cp /home/claude/onboarding-types.ts lib/onboarding/types.ts
cp /home/claude/normalize.ts lib/onboarding/normalize.ts
```

### Step 2: Move JSON Data File

```bash
# Make sure your JSON is accessible
mkdir -p data
mv State_City_Data_Final.json data/State_City_Data_Final.json
```

### Step 3: Update Imports in data-extraction.ts

Change line 8:
```typescript
import stateData from '@/data/State_City_Data_Final.json';
```

Make sure your `tsconfig.json` allows JSON imports:
```json
{
  "compilerOptions": {
    "resolveJsonModule": true,
    ...
  }
}
```

### Step 4: Test the Facade

1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000/signup`
3. You should see the "Testing Mode" banner
4. Click "Start Survey" → Should route to `/onboarding`

---

## 🧪 Testing Data Extraction

Create a test page to verify data extraction works:

#### `/app/test-data/page.tsx` (temporary)
```tsx
'use client';

import { useState } from 'react';
import { getLocationData, getAllStates, getSalary } from '@/lib/data-extraction';

export default function TestDataPage() {
  const [state, setState] = useState('Utah');
  const [data, setData] = useState<any>(null);
  
  const handleLoad = () => {
    const locationData = getLocationData(state);
    setData(locationData);
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Data Extraction</h1>
      
      <select 
        value={state} 
        onChange={(e) => setState(e.target.value)}
        className="border rounded px-4 py-2 mb-4"
      >
        {getAllStates().map(s => (
          <key={s} value={s}>{s}</option>
        ))}
      </select>
      
      <button 
        onClick={handleLoad}
        className="bg-cyan-500 text-white px-6 py-2 rounded ml-4"
      >
        Load Data
      </button>
      
      {data && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-2">{state} Data</h2>
          <pre className="bg-slate-100 p-4 rounded overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

Visit `http://localhost:3000/test-data` to verify extraction works!

---

## 📊 Next Steps

### Phase 2: New Onboarding Survey (Coming Next)
- Build the 6-step wizard with conditional logic
- Implement hard rules selection
- Add state dropdown with search
- Occupation dropdowns

### Phase 3: Calculation Engine
- Implement Auto Approach formula
- Year-by-year simulation
- Viability classification
- House size projections
- Kid viability calculation

---

## 🔍 Key Data Structures

### Household Types (12 Total)
```typescript
OnePerson                  // Single, no kids
OneWorkerOneAdult          // Couple, 1 earner, no kids
TwoEarners                 // Couple, 2 earners, no kids
SingleParentOneKid         // Single parent + 1 kid
SingleParentTwoKids        // Single parent + 2 kids
SingleParentThreeKids      // Single parent + 3+ kids
FamilyThreeOneWorker       // Couple + 1 kid, 1 earner
FamilyFourOneWorker        // Couple + 2 kids, 1 earner
FamilyFiveOneWorker        // Couple + 3+ kids, 1 earner
FamilyThreeTwoWorkers      // Couple + 1 kid, 2 earners
FamilyFourTwoWorkers       // Couple + 2 kids, 2 earners
FamilyFiveTwoWorkers       // Couple + 3+ kids, 2 earners
```

### Hard Rules
```typescript
'debt-before-kids'         // Pay off debt before having kids
'mortgage-before-kids'     // Get mortgage before having kids
'kids-asap-viable'         // Have kids as soon as financially viable
'none'                     // No hard rules
```

### Location Data Structure
```typescript
{
  salaries: {
    management: number,
    computerAndMathematics: number,
    // ... 22 occupations total
  },
  housing: {
    medianHomeValue: number,
    mortgageRate: number,
    downPaymentPercent: number,
    annualMortgagePayment: number,
  },
  adjustedCOL: {
    onePerson: number,
    twoEarners: number,
    // ... 12 household types
  },
  rent: {
    oneBedroomAnnual: number,
    twoBedroomAnnual: number,
    threeBedroomAnnual: number,
  }
}
```

---

## ❓ Troubleshooting

### "Cannot find module '@/data/State_City_Data_Final.json'"
- Make sure JSON is in `/data` folder
- Check tsconfig.json has `"resolveJsonModule": true`

### "localStorage is not defined"
- Storage functions run client-side only
- Make sure components using storage have `"use client"`

### Signup still showing error
- Clear browser cache
- Check you replaced the right file (`/app/signup/page.tsx`)
- Restart dev server

---

## 🎉 You're Ready!

Run these commands to get started:
```bash
npm run dev
```

Then navigate to:
- `http://localhost:3000/signup` - Test the facade
- `http://localhost:3000/test-data` - Test data extraction
- `http://localhost:3000/onboarding` - Test the survey (once updated)

---

**Need help?** Just ask! Next we'll build:
1. The new 6-step onboarding wizard
2. State/occupation dropdowns with search
3. Conditional logic for hard rules
4. The Auto Approach calculation engine
