# 🚨 Debugging Guide - Calculation Engine

## Quick Start: Emergency Test

### **Option 1: Browser Console (Fastest)**

1. Open your app in browser
2. Press `F12` to open DevTools
3. Click **Console** tab
4. Copy and paste the entire contents of `lib/emergency-debug.js`
5. Press Enter
6. Copy all output and analyze

### **Option 2: Use Debug Functions**

In any component:

```typescript
import { debugCalculation, quickTest } from '@/lib/debug-calculation';

// Quick test with sample data
quickTest();

// Or test with actual onboarding data
debugCalculation(onboardingAnswers);
```

---

## 🔍 Common Error Scenarios

### ❌ Error 1: "Cannot find module '@/lib/calculation-engine'"

**Cause:** File doesn't exist or wrong path

**Fix:**
- Verify file exists: `lib/calculation-engine.ts`
- Restart dev server: `npm run dev`
- Check `tsconfig.json` has `"@/*": ["./"]`

---

### ❌ Error 2: "Location 'Utah' not found"

**Cause:** Location name doesn't match data exactly

**Fix:**
- Check capitalization: `"Utah"` not `"utah"`
- Check city format: `"Austin, TX"` not `"Austin TX"`
- Test with: `getLocationData('Utah')` in console

**Common Location Names:**
```
States: "Utah", "Texas", "California", "New York"
Cities: "Austin, TX", "Denver, CO", "Seattle, WA"
```

---

### ❌ Error 3: "Invalid studentLoanRate"

**Cause:** Interest rate is percentage (6.5) instead of decimal (0.065)

**Fix in Step 4:**
```typescript
// User enters: 6.5
// Store as: 0.065

<input 
  type="number"
  step="0.1"
  placeholder="6.5"
  value={answers.userStudentLoanRate ? answers.userStudentLoanRate * 100 : ''}
  onChange={(e) => {
    const percent = parseFloat(e.target.value);
    updateAnswer('userStudentLoanRate', percent / 100); // ← Convert to decimal
  }}
/>
```

---

### ❌ Error 4: "Calculation returned null"

**Cause:** Multiple possible issues

**Debug Steps:**
1. Check if location exists: `getLocationData(locationName)`
2. Check if profile is valid: `validateProfileDetailed(profile)`
3. Check salary data: `getSalary(location, occupation)`

**Quick Fix:**
```typescript
const result = calculateAutoApproach(profile, 'Utah', 30);

if (!result) {
  console.error('Location not found in data');
  console.log('Trying to calculate for:', location);
  console.log('Available test location: Utah');
}
```

---

### ❌ Error 5: "Profile validation errors"

**Cause:** Missing or invalid required fields

**Required Fields:**
- `currentAge` (18-100)
- `userOccupation` (string)
- `studentLoanDebt` (>= 0)
- `studentLoanRate` (0-1 decimal)
- `disposableIncomeAllocation` (0-100)
- `currentSavings` (>= 0)

**Test:**
```typescript
import { validateProfileDetailed } from '@/lib/debug-calculation';

const errors = validateProfileDetailed(profile);
if (errors.length > 0) {
  console.error('Profile errors:', errors);
}
```

---

## 🧪 Testing Checklist

Before deployment, verify:

### **1. Data Layer Works**
```typescript
import { testDataExtraction } from '@/lib/debug-calculation';
testDataExtraction();
```

**Should show:**
- ✅ Utah found
- ✅ Texas found
- ✅ Salaries > $0

### **2. Normalization Works**
```typescript
const profile = normalizeOnboardingAnswers(sampleAnswers);
console.log('Profile:', profile);
```

**Should have:**
- ✅ currentAge set
- ✅ userOccupation set
- ✅ selectedLocations array populated

### **3. Calculation Works**
```typescript
import { quickTest } from '@/lib/debug-calculation';
quickTest();
```

**Should show:**
- ✅ SUCCESS!
- ✅ viable: true
- ✅ yearsToMortgage: 4

---

## 📋 Debug Function Reference

### `debugCalculation(answers)`
**Full end-to-end test**
- Tests normalization
- Tests location data
- Tests calculation
- Shows exact failure point

```typescript
import { debugCalculation } from '@/lib/debug-calculation';
const result = debugCalculation(onboardingAnswers);
```

### `quickTest()`
**Quick smoke test with sample data**
- No parameters needed
- Tests entire flow
- Shows if system works

```typescript
import { quickTest } from '@/lib/debug-calculation';
quickTest();
```

### `testDataExtraction()`
**Test location and salary data**
- Checks if locations exist
- Checks if salaries work
- No calculation involved

```typescript
import { testDataExtraction } from '@/lib/debug-calculation';
testDataExtraction();
```

### `validateProfileDetailed(profile)`
**Validate UserProfile object**
- Checks all required fields
- Checks data types
- Checks value ranges
- Returns array of errors

```typescript
import { validateProfileDetailed } from '@/lib/debug-calculation';
const errors = validateProfileDetailed(profile);
```

---

## 🔧 Field Name Reference

### Onboarding Answers → Field Names

**Step 4 (Financial Portfolio):**
```typescript
{
  userStudentLoanDebt: 45000,      // NOT studentLoanDebt
  userStudentLoanRate: 0.065,      // NOT studentLoanRate
  partnerStudentLoanDebt: 0,       // Optional
  partnerStudentLoanRate: 0,       // Optional
  savingsAccountValue: 5000,       // NOT currentSavings
  additionalDebts: [],             // Array of DebtEntry
}
```

**Step 6 (Location):**
```typescript
{
  locationSituation: 'know-exactly',
  exactLocation: 'Utah',           // Optional
  currentLocation: undefined,      // Optional
  potentialLocations: [],          // Array of strings
}
```

### UserProfile (After Normalization)

```typescript
{
  currentAge: 25,
  userOccupation: 'Computer and Mathematics',
  studentLoanDebt: 45000,          // Combines user + partner
  studentLoanRate: 0.065,          // Weighted average
  currentSavings: 5000,
  disposableIncomeAllocation: 70,
  selectedLocations: ['Utah'],     // Normalized from answers
}
```

---

## 🎯 Quick Copy-Paste Tests

### Test 1: Check Imports
```typescript
import { getLocationData, getSalary } from '@/lib/data-extraction';
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { calculateAutoApproach } from '@/lib/calculation-engine';

console.log('All imports successful!');
```

### Test 2: Check Location Data
```typescript
import { getLocationData } from '@/lib/data-extraction';

const utah = getLocationData('Utah');
console.log('Utah:', utah ? 'FOUND' : 'NOT FOUND');
console.log('Rent 1BR:', utah?.rent.oneBedroomMonthly);
console.log('Median Home:', utah?.housing.medianHomeValue);
```

### Test 3: Check Salary Data
```typescript
import { getSalary } from '@/lib/data-extraction';

const salary = getSalary('Utah', 'Computer and Mathematics');
console.log('Salary:', salary > 0 ? `$${salary}` : 'NOT FOUND');
```

### Test 4: Check Normalization
```typescript
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';

const answers = {
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

const profile = normalizeOnboardingAnswers(answers);
console.log('Profile:', profile);
```

### Test 5: Full Calculation
```typescript
import { normalizeOnboardingAnswers } from '@/lib/onboarding/normalize';
import { calculateAutoApproach } from '@/lib/calculation-engine';

const answers = {/* same as Test 4 */};
const profile = normalizeOnboardingAnswers(answers);
const result = calculateAutoApproach(profile, 'Utah', 30);

console.log('Success:', result?.calculationSuccessful);
console.log('Viable:', result?.isViable);
console.log('Years:', result?.yearsToMortgage);
```

---

## 🆘 When All Else Fails

1. **Clear cache and restart:**
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Check file structure:**
   ```
   /lib/
     calculation-engine.ts
     data-extraction.ts
     debug-calculation.ts
     emergency-debug.js
     /onboarding/
       types.ts
       normalize.ts
   ```

3. **Run emergency debug:**
   - Open `lib/emergency-debug.js`
   - Copy entire contents
   - Paste in browser console (F12)
   - Share output

4. **Check browser console:**
   - Any red errors?
   - What's the last successful log?
   - Any warnings?

---

## 📞 Getting Help

When asking for help, provide:

1. **Console output** from emergency-debug.js
2. **Error message** (exact text)
3. **Code snippet** where error occurs
4. **Browser** (Chrome/Firefox/Safari)
5. **Node version** (`node -v`)

---

**Happy Debugging!** 🐛🔧
