# Quick Test Guide - Viability Fix

## 🧪 How to Test the Fix

### Test 1: High Allocation (Should be "Viable" or "Very Viable")

1. **Start fresh onboarding:**
   ```
   Visit: http://localhost:3000/onboarding
   ```

2. **Fill out with HIGH allocation:**
   - Age: 25
   - Occupation: Software Engineer
   - Relationship: Single
   - Student debt: $30,000
   - **Allocation: 70%** ← High allocation
   - Location: Utah (or any location)

3. **Expected Results:**
   - ✅ Viability badge: **"Viable"** or **"Very Viable & Stable"**
   - ❌ Should NOT say: "Viable (Higher Allocation)"
   - ✅ Badge color: Blue or Green (not yellow/orange)

4. **Check recommendations:**
   - Should mention you're doing well
   - Should NOT say you need to increase allocation
   - May mention you have room for quality of life

---

### Test 2: Low Allocation (Should be "Higher Allocation")

1. **Start fresh onboarding:**
   ```
   Clear localStorage first: localStorage.clear()
   Visit: http://localhost:3000/onboarding
   ```

2. **Fill out with LOW allocation:**
   - Age: 25
   - Occupation: Teacher
   - Relationship: Single
   - Student debt: $40,000
   - **Allocation: 40%** ← Low allocation
   - Location: Utah

3. **Expected Results:**
   - ✅ Viability badge: **"Viable (Higher Allocation)"**
   - ✅ Badge color: Yellow/Orange
   - ✅ This is CORRECT usage

4. **Check recommendations:**
   - Should suggest increasing allocation
   - Should tell you the minimum required %
   - Should explain why more allocation helps

---

### Test 3: Medium Allocation (Edge Case)

1. **Start fresh onboarding**

2. **Fill out with MEDIUM allocation:**
   - Age: 28
   - Occupation: Software Engineer
   - Relationship: Married (2 earners)
   - Student debt: $25,000
   - **Allocation: 55-60%** ← Medium
   - Location: Austin, TX

3. **Expected Results:**
   - ✅ Likely: **"Viable"**
   - ✅ Badge: Blue
   - ✅ Timeline: 5-8 years probably

---

### Test 4: Check Timeline Display

1. **Complete any onboarding**

2. **Go to profile page:**
   ```
   http://localhost:3000/profile
   ```

3. **Verify timeline section:**
   - ✅ Section header: "Your Homeownership Timeline"
   - ✅ Subtitle about stages of journey
   - ✅ See projections for: 3, 5, 10, 15 years
   - ✅ All projections visible (not hidden)

4. **Check each projection card:**
   - Shows: Age, Total Savings, Max Price, Size
   - Has: "See Potential Homes" button
   - Clicking button: Shows home carousel

---

## 🎯 What to Look For

### CORRECT Behavior:

| User Allocation | Min Required | Expected Badge |
|----------------|--------------|----------------|
| 70% | 55% | ✅ "Viable" or "Very Viable" |
| 60% | 55% | ✅ "Viable" |
| 58% | 55% | ✅ "Viable" |
| 55% | 55% | ✅ "Viable" |
| 52% | 55% | ✅ "Viable" (within buffer) |
| 50% | 55% | ✅ "Viable (Higher Allocation)" |
| 40% | 55% | ✅ "Viable (Higher Allocation)" |

### INCORRECT Behavior (Should NOT happen):

| User Allocation | Min Required | WRONG Badge |
|----------------|--------------|-------------|
| 70% | 55% | ❌ "Viable (Higher Allocation)" |
| 65% | 55% | ❌ "Viable (Higher Allocation)" |
| 58% | 55% | ❌ "Viable (Higher Allocation)" |

---

## 🐛 If Something's Wrong

### Problem: Still showing "Higher Allocation" when user exceeds minimum

**Check:**
1. Did you save `lib/calculation-engine.ts`?
2. Did you restart the dev server?
3. Clear browser cache and localStorage
4. Check console for errors

**Fix:**
```bash
# Restart dev server
npm run dev

# In browser console:
localStorage.clear()
location.reload()
```

### Problem: 3-year projection not showing

**Check:**
1. Is `result.houseProjections.threeYears` available?
2. Maybe you can't afford a home in 3 years (expected)
3. Try with higher allocation or lower debt

### Problem: Viability seems random

**Debug:**
```typescript
// Add to browser console on profile page:
const results = JSON.parse(localStorage.getItem('calculation-results'));
console.log('User allocation:', results[0].minimumAllocationRequired);
console.log('Viability:', results[0].viabilityClassification);
console.log('Timeline:', results[0].yearsToMortgage);
```

---

## ✅ Success Criteria

The fix is working if:

1. ✅ User with 70% allocation + 55% requirement = "Viable" (NOT "Higher Allocation")
2. ✅ User with 50% allocation + 55% requirement = "Viable (Higher Allocation)" (CORRECT)
3. ✅ Timeline section shows all available projections (3, 5, 10, 15 years)
4. ✅ Viability badge matches allocation comparison
5. ✅ Recommendations are consistent with viability badge

---

## 📊 Quick Visual Test

### Before Fix:
```
User: 70% | Required: 55% → Badge: "Higher Allocation" ❌
Timeline: Shows 5, 10, 15 years only
```

### After Fix:
```
User: 70% | Required: 55% → Badge: "Viable" ✅
Timeline: Shows 3, 5, 10, 15 years (if available)
```

---

## 🔍 Console Debugging

Add this to your browser console on the profile page:

```javascript
// Get calculation results
const results = JSON.parse(localStorage.getItem('calculation-results'));
const result = results[0];

// Log key info
console.log('=== VIABILITY DEBUG ===');
console.log('User Allocation:', result.minimumAllocationRequired, '%');
console.log('Viability Classification:', result.viabilityClassification);
console.log('Years to Mortgage:', result.yearsToMortgage);
console.log('Years to Debt Free:', result.yearsToDebtFree);

// Get user profile
const profile = JSON.parse(localStorage.getItem('user-profile'));
console.log('Actual User Allocation:', profile.disposableIncomeAllocation, '%');

// Compare
const userHas = profile.disposableIncomeAllocation;
const minRequired = result.minimumAllocationRequired;
console.log('Comparison:');
console.log('  User has:', userHas, '%');
console.log('  Minimum required:', minRequired, '%');
console.log('  Difference:', userHas - minRequired, '%');
console.log('  User exceeds?', userHas >= minRequired);
```

---

## 🎉 You're Done!

If all tests pass, the viability logic is fixed and working correctly!
