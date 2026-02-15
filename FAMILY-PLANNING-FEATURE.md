# Family Planning Feature - Complete ✅

## Overview

Added a comprehensive Family Planning Timeline section to the profile page that shows users when they can afford to have children while remaining on track for homeownership.

---

## What Was Added

### Visual Section on Profile Page

**Location:** `app/(authenticated)/profile/page.tsx`

**Position:** After Cost of Living section, before House Projections timeline

**Features:**
- 🎯 **Minimum Viable Age** for first child (large, prominent display)
- 👶 **Timeline Cards** for up to 3 children (1st, 2nd, 3rd)
- 💡 **Explanation Section** describing what the calculation means
- ⚠️ **Warning Display** if children aren't financially viable

---

## How It Works

### Calculation Logic (Already Exists)

The calculation engine (`lib/calculation-engine.ts`) already computes kid viability:

**Function:** `calculateKidViability()`

**Algorithm:**
1. Binary search for minimum age (current age to +20 years)
2. For each age, runs a simulation with a kid at that age
3. Checks viability 3 years after birth:
   - Disposable income > $0
   - Not accumulating more debt
   - Savings > $5,000
4. Returns minimum age where all conditions are met

**Criteria for Viability:**
```typescript
const isViable = 
  threeYearsLater.disposableIncome > 0 &&
  threeYearsLater.loanDebtEnd <= threeYearsLater.loanDebtStart &&
  threeYearsLater.savingsEnd > 5000;
```

### Data Structure

```typescript
interface KidViabilityResult {
  isViable: boolean;      // Can afford kids?
  minimumAge?: number;    // Minimum age to have kid
  reason?: string;        // Why not viable (if applicable)
}

// In CalculationResult:
kidViability: {
  firstKid: KidViabilityResult;
  secondKid: KidViabilityResult;
  thirdKid: KidViabilityResult;
}
```

---

## Visual Design

### Color Scheme

- **Purple Gradient Background:** `from-purple-50 to-pink-50`
- **Primary Purple:** `#8B5CF6` (borders, icons, numbers)
- **Light Purple:** `#F3E8FF` (card backgrounds)
- **Success Green:** Check marks
- **Warning Yellow:** Not viable state

### Layout

```
┌──────────────────────────────────────────────────┐
│  [Icon]  Family Planning Timeline               │
│          When you can afford children...         │
├──────────────────────────────────────────────────┤
│                                                  │
│  Minimum Viable Age for First Child             │
│                                                  │
│            28                [✓]                 │
│       years old                                  │
│     In 3 years from now                          │
│                                                  │
├──────────────────────────────────────────────────┤
│  [1] First     [2] Second    [3] Third          │
│  Age 28        Age 31        Not viable         │
│  3 years       6 years                           │
├──────────────────────────────────────────────────┤
│  What This Means:                                │
│  ✓ Can have first child at 28                   │
│  ✓ Accounts for ~$15K/year per child            │
│  ✓ Maintains positive cash flow                 │
└──────────────────────────────────────────────────┘
```

---

## Display Variations

### Case 1: Kids Are Viable

**Shows:**
- Large age number (5xl font)
- "years old" label
- Time from now
- Cards for 1st, 2nd, 3rd kids
- Purple check mark icon
- Detailed explanation

**Example:**
```
Minimum Viable Age: 28 years old
  In 3 years from now

[1] First Child: Age 28 (3 years)
[2] Second Child: Age 31 (6 years)
[3] Third Child: Not financially viable
```

---

### Case 2: Kids Not Viable

**Shows:**
- Yellow warning background
- Warning triangle icon
- Explanation of why not viable
- Suggestions to improve situation

**Example:**
```
⚠️ Family Planning Challenge

Based on current projections, having children in 
Austin, TX would make homeownership significantly 
more difficult within the next 20 years.

Consider: Increasing income, reducing debt, or 
exploring more affordable locations if family 
planning is a priority.
```

---

### Case 3: User Already Has Kids

**Shows:**
- Current age for all kids
- Marked as viable (already have them)

---

### Case 4: User Doesn't Plan Kids

**Shows:**
- Nothing (section hidden or shows "Not planning kids")

---

## Testing

### Test Case 1: Young, High Income

**Profile:**
```
Age: 25
Income: $100K
Debt: $30K
Allocation: 70%
```

**Expected:**
- ✅ First kid: Age 27-28 (2-3 years)
- ✅ Second kid: Age 30-31 (5-6 years)
- ✅ Third kid: Age 33-35 (8-10 years)
- ✅ All cards show viable ages
- ✅ Purple success theme

---

### Test Case 2: High Debt

**Profile:**
```
Age: 28
Income: $60K
Debt: $100K
Allocation: 50%
Hard Rule: Debt before kids
```

**Expected:**
- ⚠️ Shows warning message
- ❌ "Must pay off student debt before having kids"
- ❌ Yellow warning theme
- ✅ Suggestions displayed

---

### Test Case 3: Older User

**Profile:**
```
Age: 35
Income: $75K
Debt: $40K
```

**Expected:**
- ✅ First kid: Age 37-38
- ✅ Second kid: Age 40-41
- ❌ Third kid: Not viable (too old/expensive)

---

### Test Case 4: Moderate Income

**Profile:**
```
Age: 30
Income: $65K
Debt: $50K
Allocation: 60%
```

**Expected:**
- ✅ First kid: Age 33-35
- ✅ Second kid: Age 36-38
- ❌ Third kid: Maybe not viable

---

## Integration Points

### 1. Onboarding Data

The calculation uses these onboarding inputs:
- **Kids Plan:** "yes", "no", "maybe", "have-kids"
- **Number of Kids:** Current kids (if any)
- **Hard Rules:** "debt-before-kids", "kids-asap-viable"
- **Planned Kid Ages:** User's intended ages for kids

### 2. Financial Assumptions

**Child Costs (from calculation engine):**
- First year: ~$25,000 (birth, equipment, setup)
- Ongoing: ~$15,000/year per child
- Through age 18

**Household Adjustments:**
- Switches to family household type
- Increases cost of living
- Factors in larger housing needs

---

## User Experience Flow

```
1. User completes onboarding
   ↓
2. Selects "yes" or "maybe" for kids plan
   ↓
3. Calculations run automatically
   ↓
4. Results saved to localStorage
   ↓
5. Redirected to /profile
   ↓
6. Family Planning section displays
   ↓
7. User sees minimum viable age
   ↓
8. Can plan family around homeownership goals
```

---

## Key Messages

### If Viable:
- ✅ "You can have your first child at age X"
- ✅ "Still afford to buy a home"
- ✅ "Accounts for child costs"
- ✅ "Maintains positive cash flow"

### If Not Viable:
- ⚠️ "Children would make homeownership difficult"
- 💡 "Consider: Increasing income"
- 💡 "Consider: Reducing debt"
- 💡 "Consider: More affordable location"

---

## Data Source

**Calculation Engine:** `lib/calculation-engine.ts`

**Function:** `calculateKidViability(profile, locationData)`

**Called In:** Main calculation function (`calculateAutoApproach`)

**Stored In:** `result.kidViability`

**Available Fields:**
```typescript
{
  firstKid: {
    isViable: true,
    minimumAge: 28
  },
  secondKid: {
    isViable: true,
    minimumAge: 31
  },
  thirdKid: {
    isViable: false,
    reason: "Could not find viable age within 20 years"
  }
}
```

---

## Code Location

**Display Component:**
```
app/(authenticated)/profile/page.tsx
  Lines: ~406-520 (approximately)
  Section: Between Cost of Living and House Projections
```

**Calculation Logic:**
```
lib/calculation-engine.ts
  Function: calculateKidViability() (line 990)
  Function: findMinimumViableKidAge() (line 1036)
```

---

## Styling Details

### Typography
- **Main Age:** `text-5xl font-bold text-purple-600`
- **Section Title:** `text-2xl font-bold text-[#2C3E50]`
- **Cards:** `text-3xl font-bold text-purple-600`
- **Body Text:** `text-sm text-[#6B7280]`

### Spacing
- **Section Padding:** `px-8 py-6`
- **Card Padding:** `p-6`
- **Grid Gap:** `gap-4` or `gap-6`
- **Space Between:** `space-y-6`

### Borders & Shadows
- **Main Card:** `border-2 border-purple-300 shadow-sm`
- **Sub Cards:** `border-2 border-purple-200`
- **Warning:** `border-2 border-yellow-200`

---

## Responsive Design

### Mobile (< 768px)
- Single column layout
- Stacked cards
- Full-width elements
- Reduced font sizes

### Tablet (768px - 1024px)
- 2-column grid for some cards
- Optimized spacing

### Desktop (> 1024px)
- 3-column grid for kid cards
- Full layout as designed

---

## Future Enhancements

### Potential Additions:

1. **Interactive Timeline**
   - Visual timeline showing kid ages vs home purchase
   - Drag to adjust kid ages

2. **Cost Breakdown**
   - Show estimated costs per child
   - Break down by category (food, childcare, etc.)

3. **Spacing Recommendations**
   - Optimal years between kids
   - Financial impact of different spacing

4. **Location Comparison**
   - Compare kid viability across locations
   - "Kids are X years sooner in Utah vs California"

5. **What-If Scenarios**
   - "What if I increase allocation to 80%?"
   - "What if I pay off debt first?"

---

## Troubleshooting

### Issue: Section not showing

**Check:**
1. Is `result.kidViability` defined?
2. Does user plan to have kids?
3. Check browser console for errors

**Solution:**
```javascript
// In browser console:
const results = JSON.parse(localStorage.getItem('calculation-results'));
console.log('Kid Viability:', results[0].kidViability);
```

---

### Issue: Wrong minimum age

**Check:**
1. What's user's current age?
2. What's their debt situation?
3. Do they have "debt-before-kids" hard rule?

**Debug:**
```javascript
const profile = JSON.parse(localStorage.getItem('user-profile'));
console.log('Current Age:', profile.currentAge);
console.log('Hard Rules:', profile.hardRules);
console.log('Student Debt:', profile.studentLoanDebt);
```

---

### Issue: All kids show "not viable"

**Possible Causes:**
- High debt load
- Low income
- "Debt before kids" hard rule active
- Low savings allocation

**Solutions:**
- Increase income
- Pay off debt
- Increase allocation percentage
- Choose more affordable location

---

## Success Criteria

Feature is working if:

1. ✅ Section displays on profile page
2. ✅ Shows minimum viable age for first child
3. ✅ Displays cards for 2nd and 3rd kids
4. ✅ Shows warning if not viable
5. ✅ Layout is responsive
6. ✅ Purple theme matches design
7. ✅ Calculations are accurate

---

## Summary

### What Users Get:

- 🎯 **Clear Answer:** "When can I have kids?"
- 📊 **Multiple Scenarios:** 1st, 2nd, 3rd child timelines
- 💡 **Actionable Info:** What affects kid viability
- ⚠️ **Honest Assessment:** If kids aren't viable, explains why
- 🏠 **Integrated Planning:** Kids + homeownership together

### Technical Details:

- ✅ Uses existing calculation engine
- ✅ No new backend needed
- ✅ Data already in results
- ✅ Clean, responsive UI
- ✅ Comprehensive error states

---

**Feature Complete!** Users can now see when they can afford to have children while staying on track for homeownership. 🎉
