# Quick Test Guide - Family Planning Feature

## 🧪 How to Test

### Test 1: See the Feature (High Income)

1. **Clear existing data:**
   ```javascript
   // In browser console:
   localStorage.clear();
   ```

2. **Complete onboarding:**
   ```
   Visit: http://localhost:3000/onboarding
   ```

3. **Fill out with these values:**
   - Age: **25**
   - Occupation: **Software Engineer**
   - Salary: **$100,000**
   - Relationship: **Single**
   - Student Loan Debt: **$30,000**
   - Kids Plan: **"Yes, planning to have kids"** ← Important!
   - Allocation: **70%**
   - Location: **Utah**

4. **Expected Results on /profile:**
   - ✅ See purple "Family Planning Timeline" section
   - ✅ Main card: "Minimum Viable Age: **27-28 years old**"
   - ✅ Time from now: "In 2-3 years"
   - ✅ Three cards showing:
     - [1] First Child: Age 27-28
     - [2] Second Child: Age 30-31
     - [3] Third Child: Age 33-35 (or "Not viable")
   - ✅ Purple check mark icon
   - ✅ Explanation section with bullets

---

### Test 2: Kids Not Viable (High Debt)

1. **Clear and restart onboarding**

2. **Fill out with these values:**
   - Age: **28**
   - Occupation: **Teacher**
   - Salary: **$50,000**
   - Relationship: **Single**
   - Student Loan Debt: **$100,000** ← High debt
   - Kids Plan: **"Yes, planning to have kids"**
   - Hard Rules: **"Pay off debt before having kids"** ← Select this!
   - Allocation: **60%**
   - Location: **San Francisco**

3. **Expected Results:**
   - ⚠️ See yellow warning card (not purple)
   - ❌ Warning triangle icon
   - ❌ Message: "Family Planning Challenge"
   - ✅ Reason: "Must pay off student debt before having kids (hard rule)"
   - ✅ Suggestions to improve situation

---

### Test 3: No Kids Planned

1. **Clear and restart onboarding**

2. **Fill out but select:**
   - Kids Plan: **"No, not planning to have kids"** ← Select this

3. **Expected Results:**
   - ✅ Family Planning section may not appear (or shows "Not planning kids")
   - ✅ This is correct behavior

---

### Test 4: Already Have Kids

1. **Clear and restart onboarding**

2. **Fill out with:**
   - Kids Plan: **"I already have kids"**
   - Number of Kids: **1**

3. **Expected Results:**
   - ✅ Section shows current age for all kids
   - ✅ All marked as viable (you already have them!)

---

## 🎯 What to Look For

### When Kids ARE Viable:

| Element | Expected |
|---------|----------|
| Background | Purple gradient (`from-purple-50 to-pink-50`) |
| Icon | Purple circle with family icon |
| Main Number | Large (text-5xl) age in purple |
| Time Estimate | "In X years from now" |
| Kid Cards | 3 cards (1st, 2nd, 3rd) |
| Check Mark | Purple check icon (✓) |
| Explanation | Purple bullets with details |

### When Kids NOT Viable:

| Element | Expected |
|---------|----------|
| Background | Yellow (`yellow-50`) |
| Icon | Yellow warning triangle |
| Message | "Family Planning Challenge" |
| Reason | Why not viable |
| Suggestions | Ways to improve |

---

## 🔍 Quick Visual Check

### Success State:
```
┌──────────────────────────────────────┐
│ [Purple Icon] Family Planning        │
│                                      │
│  Minimum Viable Age:                │
│         28                          │
│    years old                        │
│  In 3 years from now                │
│                                      │
│  [1] Age 28  [2] Age 31  [3] N/A   │
│                                      │
│  ✓ Explanation bullets              │
└──────────────────────────────────────┘
```

### Warning State:
```
┌──────────────────────────────────────┐
│ [Yellow Icon] Family Planning        │
│                                      │
│  ⚠️ Family Planning Challenge       │
│                                      │
│  Having children would make         │
│  homeownership difficult...         │
│                                      │
│  Consider: Increasing income...     │
└──────────────────────────────────────┘
```

---

## 🐛 Debug Console Commands

### Check if data exists:

```javascript
// Get calculation results
const results = JSON.parse(localStorage.getItem('calculation-results'));

// Check kid viability data
console.log('Kid Viability:', results[0].kidViability);

// Should see:
// {
//   firstKid: { isViable: true, minimumAge: 28 },
//   secondKid: { isViable: true, minimumAge: 31 },
//   thirdKid: { isViable: false, reason: "..." }
// }
```

### Check user profile:

```javascript
const profile = JSON.parse(localStorage.getItem('user-profile'));

console.log('Kids Plan:', profile.kidsPlan);
console.log('Current Age:', profile.currentAge);
console.log('Hard Rules:', profile.hardRules);
```

### Verify section renders:

```javascript
// Check if element exists
const section = document.querySelector('[class*="from-purple-50"]');
console.log('Family Planning Section:', section ? 'Found ✓' : 'Not found ✗');
```

---

## 📊 Test Matrix

| Profile | Expected First Kid Age | Expected Result |
|---------|----------------------|-----------------|
| 25yo, $100K, $30K debt | 27-28 | ✅ Viable |
| 25yo, $60K, $100K debt | 32-35 | ✅ Viable (delayed) |
| 28yo, $50K, $100K debt + rule | - | ❌ Must pay debt |
| 35yo, $80K, $40K debt | 37-38 | ✅ Viable |
| 40yo, $60K, $60K debt | 43-45+ | ⚠️ Maybe not viable |

---

## ✅ Success Checklist

The feature is working if:

- [x] Section appears on profile page
- [x] Purple theme (when viable)
- [x] Yellow theme (when not viable)
- [x] Shows minimum age for first child
- [x] Shows cards for 2nd and 3rd kids
- [x] Explanation bullets display
- [x] Time from now calculates correctly
- [x] Responsive on mobile
- [x] Icons display properly
- [x] Warning state shows when appropriate

---

## 🎉 Expected User Experience

**Scenario: Young professional**
```
Sarah, 26 years old
$95K salary
$25K student loans
Wants kids someday

Result:
"Minimum Viable Age: 28 years old"
"In 2 years from now"

Sarah's Reaction: 
"Great! I can have kids in 2 years and still 
buy a house by age 32. Perfect timing!"
```

**Scenario: High debt**
```
Mike, 30 years old
$65K salary
$120K student loans
Wants kids but has "debt before kids" rule

Result:
"Must pay off debt first"
"Consider: Increasing income or debt payoff"

Mike's Reaction:
"Makes sense. I'll focus on paying off loans 
first, then start a family around age 35-36."
```

---

## 🚨 Common Issues

### Issue: Section not showing

**Likely Cause:**
- User selected "No kids" in onboarding
- kidViability data is null/undefined

**Fix:**
- Make sure to select "Yes" or "Maybe" for kids plan
- Complete full onboarding
- Check console for errors

---

### Issue: Shows "Not viable" for all kids

**Likely Cause:**
- Very high debt
- Low income
- Expensive location
- "Debt before kids" rule active

**This is correct!** The calculation is saying kids aren't financially viable.

**User options:**
- Increase income
- Pay off debt
- Choose cheaper location
- Increase allocation

---

## 📱 Mobile Testing

1. **Open DevTools** (F12)
2. **Toggle device toolbar** (Ctrl+Shift+M)
3. **Select mobile device** (iPhone, Galaxy, etc.)
4. **Test responsiveness:**
   - Section should stack vertically
   - Cards should be full-width
   - Text should be readable
   - No horizontal scroll

---

## 🎨 Visual Polish Check

- [ ] Purple gradient background looks smooth
- [ ] Icons are centered in circles
- [ ] Numbers are big and bold (5xl)
- [ ] Cards have proper spacing
- [ ] Borders are consistent (2px)
- [ ] Check marks display correctly
- [ ] Warning triangle shows in yellow state
- [ ] Hover states work (if any)
- [ ] Shadows are subtle
- [ ] Text is readable on all backgrounds

---

**Ready to test!** Just complete onboarding with kids plan and check your profile. 🎉
