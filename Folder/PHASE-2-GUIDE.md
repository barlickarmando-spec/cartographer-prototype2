# 🎯 Phase 2: New Onboarding Survey - Implementation Guide

## What's New in This Phase

✅ **Complete 6-step onboarding wizard** matching your new survey structure  
✅ **Conditional logic** - questions adapt based on previous answers  
✅ **Hard rules selection** - multiple choice with visual checkboxes  
✅ **State multi-select** with search functionality  
✅ **Occupation dropdowns** from your JSON data  
✅ **Progress bar** and smooth navigation  
✅ **localStorage persistence** - never lose progress  

---

## 📁 File to Add/Replace

### `/components/onboarding/OnboardingWizard.tsx`

**Replace your existing OnboardingWizard with:**
```bash
cp OnboardingWizard.tsx /path/to/your/project/components/onboarding/OnboardingWizard.tsx
```

This complete wizard includes:
- ✅ Step 1: Current Situation (6 options)
- ✅ Step 2: Household Type (relationship + kids + hard rules)
- ✅ Step 3: Age & Occupation (with partner fields)
- ✅ Step 4: Financial Portfolio (student loans + CC debt + car debt + savings)
- ✅ Step 5: Allocation (slider with visual feedback)
- ✅ Step 6: Location (4 situations with state search)

---

## 🎨 Visual Features

### Progress Bar
- Shows "Step X of 6" 
- Percentage complete
- Animated cyan-to-blue gradient

### Conditional Logic Examples

**Relationship Status:**
- If single → "Do you plan on being in one soon?"
- If linked → "Partner's occupation (optional)"

**Kids Planning:**
- If "Yes" → Age input (optional)
- If "Unsure" → Age input + run 2 scenarios
- If "Already have kids" → Number of kids + plan more?

**Student Loans:**
- Students get: "Input amount" vs "Estimate by major"
- If estimating: Major input field appears
- If linked: Partner loan questions appear

**Location:**
- "May move" → Current location + potential locations
- "Know exactly" → Single location picker
- "Deciding between" → Multi-select with checkboxes
- "No idea" → Info message (analyze all)

### Hard Rules UI
- Multi-select checkboxes with visual feedback
- "None of the above" disables other options
- Cyan highlights for selected rules

---

## 🔧 How It Works

### State Management
```typescript
const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({
  hardRules: [],
  additionalDebts: [],
  potentialLocations: [],
  disposableIncomeAllocation: 70,
});
```

### Progress Persistence
Every change auto-saves to localStorage:
```typescript
useEffect(() => {
  if (Object.keys(answers).length > 0) {
    onProgress(answers as OnboardingAnswers);
  }
}, [answers, onProgress]);
```

### Validation
Each step has a `canProceed()` check:
- Step 1: Current situation selected
- Step 2: Relationship status + kids plan filled
- Step 3: Age + occupation filled
- Step 4: All fields optional (defaults provided)
- Step 5: Allocation set (default 70%)
- Step 6: Location situation selected

---

## 🧪 Testing Checklist

### Test Flow 1: Graduated, Single, Planning Kids
1. **Step 1:** Select "Graduated: Financially Independent"
2. **Step 2:** 
   - Relationship: "No"
   - Plan relationship: "Yes" 
   - Kids: "Yes", age 32
   - Hard rule: "Debt before kids"
3. **Step 3:** Age 25, occupation "Computer and Mathematics"
4. **Step 4:** $50k student loan at 6.5%, $5k CC debt
5. **Step 5:** 70% allocation
6. **Step 6:** "Deciding between" → Select Utah, Texas, California

### Test Flow 2: Student, Linked, Has Kids
1. **Step 1:** "Student: Soon Independent"
2. **Step 2:**
   - Relationship: "Yes" (linked)
   - Kids: "I already have kids" → 2 kids
   - Plan more: "No"
3. **Step 3:** Independence age 24, both occupations
4. **Step 4:** Estimate by major → "Engineering"
5. **Step 5:** 80% allocation
6. **Step 6:** "Know exactly" → Colorado

### Test Flow 3: No College, Moving
1. **Step 1:** "No College Experience or Intent"
2. **Step 2:**
   - Single, no relationship plans
   - Kids: "Unsure", age 30
3. **Step 3:** Age 22, "Construction and Extraction"
4. **Step 4:** No student loans, $10k car debt
5. **Step 5:** 60% allocation
6. **Step 6:** "Currently live/work" → Alabama → considering Georgia, Florida

---

## 🎯 Key Features to Test

### 1. Hard Rules Interaction
- ✅ Select multiple rules (works)
- ✅ Select "None" → disables others
- ✅ Unselect "None" → enables others again

### 2. Partner Income Doubling
- ✅ If single + planning relationship + NO partner occupation → income doubles at relationship age
- ✅ If partner occupation provided → uses actual occupations

### 3. CC Debt Refresh Rate
- ✅ Ask "How many months to get $5,000 CC debt?"
- ✅ Converts to years for calculation (36 months = 3 years)

### 4. Location Multi-Select
- ✅ Search bar filters states
- ✅ Click to toggle selection
- ✅ Visual checkboxes
- ✅ Count displayed below

### 5. Progress Persistence
- ✅ Refresh page mid-survey → progress restored
- ✅ Navigate back/forward → answers preserved
- ✅ localStorage updated on every change

---

## 🐛 Common Issues & Fixes

### "getAllStates is not a function"
**Fix:** Make sure `/lib/data-extraction.ts` is in place with your JSON file at `/data/State_City_Data_Final.json`

### Hard rules not clearing when "None" selected
**Fix:** Already handled! The logic filters out other rules when "None" is clicked

### Partner occupation not appearing
**Fix:** Check Step 2 - must select "linked" relationship status OR "Yes" to relationship plan

### Location search not working
**Fix:** Make sure `getAllStates()` is returning the full state list from your JSON

---

## 📊 Data Flow

```
User fills survey
    ↓
OnboardingWizard state updates
    ↓
Auto-saves to localStorage (onProgress)
    ↓
User clicks "Finish"
    ↓
Calls onComplete(answers)
    ↓
normalize.ts converts to UserProfile
    ↓
Both saved to localStorage
    ↓
Router.push('/stress-test')
```

---

## 🚀 Next Steps

After implementing this wizard, you'll need:

1. **Stress Test Page** - Display all captured data (already exists at `/app/stress-test/page.tsx`)
2. **Calculation Engine** - Implement Auto Approach formula
3. **Results Dashboard** - Show viability, timeline, recommendations

---

## 💡 Customization Options

### Change Colors
In `OnboardingWizard.tsx`, find:
```tsx
className="bg-gradient-to-r from-cyan-500 to-blue-500"
```
Replace `cyan-500` and `blue-500` with your brand colors.

### Adjust Default Allocation
Change line:
```tsx
disposableIncomeAllocation: 70,  // Change this number
```

### Add More Occupations
Edit `getOccupationList()` in `/lib/data-extraction.ts`

---

## 📝 Survey Structure Reference

| Step | Title | Key Fields | Conditional Logic |
|------|-------|-----------|------------------|
| 1 | Current Situation | currentSituation | None |
| 2 | Household Type | relationshipStatus, kidsPlan, hardRules | Relationship plans if single |
| 3 | Age & Occupation | currentAge, userOccupation, partnerOccupation | Age vs independence age based on Step 1 |
| 4 | Financial Portfolio | studentLoanDebt, additionalDebts, savings | Student loan estimation, partner loans |
| 5 | Allocation | disposableIncomeAllocation | None |
| 6 | Location | locationSituation, locations | Different pickers per situation |

---

## ✅ You're Ready!

Run:
```bash
npm run dev
```

Navigate to: `http://localhost:3000/signup` → Should take you through the full 6-step survey!

---

**Questions?** Just ask! Next up: Building the calculation engine to process all this data! 🎉
