# 🔄 Data Extraction Update - Cities Support

## What Changed?

Your data has **THREE tabs** with both states AND cities:
- **Tab A:** State-level salary data (51 states)
- **Tab B:** City-level salary data (72 major cities)
- **Tab C:** Housing + COL data for BOTH states AND cities (121 total)

The original extraction only pulled states. This update adds full city support!

---

## 📁 Files to Replace

### 1. `/lib/data-extraction.ts`

**Replace with:** `data-extraction-v2.ts`

```bash
cp data-extraction-v2.ts /your/project/lib/data-extraction.ts
```

### 2. Update Step 6 in `/components/onboarding/OnboardingWizard.tsx`

**Replace the Step6Location function** with the version in `Step6Location-Updated.tsx`

Also update the import at the top:
```typescript
// OLD:
import { getAllStates, getOccupationList } from "@/lib/data-extraction";

// NEW:
import { getAllLocations, getOccupationList } from "@/lib/data-extraction";
```

---

## ✨ New Features

### 1. **getAllLocations()** - Returns States + Cities
```typescript
const locations = getAllLocations();
// Returns:
// [
//   { name: "Alabama", displayName: "Alabama", type: "state" },
//   { name: "Alaska", displayName: "Alaska", type: "state" },
//   ...
//   { name: "Austin", displayName: "Austin, TX", type: "city" },
//   { name: "Boston", displayName: "Boston, MA", type: "city" },
//   ...
// ]
```

### 2. **getLocationData()** - Works for Both
```typescript
// States
const utahData = getLocationData('Utah');

// Cities (any format)
const austinData1 = getLocationData('Austin');
const austinData2 = getLocationData('Austin, TX');
```

### 3. **Smart Location Matching**
- Handles "City" or "City, ST" format
- Matches across all three JSON tabs
- Returns unified LocationData structure

---

## 🎯 How It Works

### State Data Flow
```
getLocationData("Utah")
    ↓
Searches Tab A (affordability) for "Utah"
    ↓
Searches Tab C (housing) for "Utah" + Classification="State"
    ↓
Combines both → Returns LocationData
```

### City Data Flow
```
getLocationData("Austin, TX")
    ↓
Parses "Austin" + "TX"
    ↓
Searches Tab B (city affordability) for "Austin" in TX
    ↓
Searches Tab C (city housing) for "Austin" + Classification="City"
    ↓
Combines both → Returns LocationData
```

---

## 🎨 Updated UI

### Location Picker Now Shows:

**Dropdown (know-exactly / currently-live):**
```
States
  └─ Alabama
  └─ Alaska
  └─ Arizona
  ...

Major Cities
  └─ Albuquerque, NM
  └─ Anaheim, CA
  └─ Anchorage, AK
  └─ Atlanta, GA
  └─ Austin, TX
  ...
```

**Multi-Select (deciding-between / may-move):**
- Search bar filters both states and cities
- Two sections: "States" and "Major Cities"
- City format: "Austin (TX)" for clarity
- Checkboxes for each location

---

## 🧪 Test the Update

### Test Data Extraction:

```typescript
// Test state
const utah = getLocationData('Utah');
console.log('Utah salary (Computer):', utah?.salaries.computerAndMathematics);
console.log('Utah median home:', utah?.housing.medianHomeValue);

// Test city
const austin = getLocationData('Austin, TX');
console.log('Austin salary (Computer):', austin?.salaries.computerAndMathematics);
console.log('Austin median home:', austin?.housing.medianHomeValue);

// Test all locations
const allLocs = getAllLocations();
console.log('Total locations:', allLocs.length);
console.log('States:', allLocs.filter(l => l.type === 'state').length);
console.log('Cities:', allLocs.filter(l => l.type === 'city').length);
```

Expected output:
```
Total locations: 121
States: 51
Cities: 70
```

---

## 📊 Available Cities (Sample)

The JSON includes these major cities:
- Albuquerque, NM
- Anaheim, CA
- Anchorage, AK
- Atlanta, GA
- Austin, TX
- Boston, MA
- Chicago, IL
- Dallas, TX
- Denver, CO
- Houston, TX
- Los Angeles, CA
- Miami, FL
- New York, NY
- Philadelphia, PA
- Phoenix, AZ
- San Diego, CA
- San Francisco, CA
- Seattle, WA
- Washington, DC
- ... and ~50 more

---

## 🔍 Data Structure Reference

### LocationData Type
```typescript
{
  name: string;           // "Austin" or "Utah"
  displayName: string;    // "Austin, TX" or "Utah"
  type: 'state' | 'city'; // Location type
  state: string;          // "TX" or "Utah"
  
  salaries: { ... };      // 22 occupation categories
  housing: { ... };       // Mortgage + home values
  adjustedCOL: { ... };   // 12 household types
  rent: { ... };          // 1BR, 2BR, 3BR
  creditCardDebt: { ... };
}
```

---

## ⚠️ Important Notes

### City vs State Differences:
- **Cities:** Higher salaries, higher COL, more expensive housing
- **States:** Averages across the entire state
- **User choice:** Let them compare "Texas" vs "Austin, TX"

### Data Sources:
- **Tab A** (`rough_affordability_model`): States only
- **Tab B** (`rough_affordability_model_citie`): Cities only
- **Tab C** (`rough_housing_model`): Both (use `Classification` field)

### Matching Logic:
```typescript
// City in Tab C has:
{
  "City/State": "Austin",
  "State": "TX",
  "Classification": "City"
}

// State in Tab C has:
{
  "City/State": "Utah",
  "State": "UT",
  "Classification": "State"
}
```

---

## 🐛 Troubleshooting

### "Cannot find city data"
- Check city name spelling
- Verify city exists in Tab B (`rough_affordability_model_citie`)
- Try with state code: "Austin, TX"

### "getAllLocations returns empty"
- Verify JSON file is at `/data/State_City_Data_Final.json`
- Check `tsconfig.json` has `resolveJsonModule: true`
- Restart dev server

### Cities not showing in dropdown
- Make sure you updated the import in OnboardingWizard.tsx
- Replaced Step6Location function completely
- Check browser console for errors

---

## ✅ Verification Checklist

- [ ] Replaced `/lib/data-extraction.ts` with v2
- [ ] Updated imports in OnboardingWizard.tsx
- [ ] Replaced Step6Location function
- [ ] Tested `getAllLocations()` returns ~121 items
- [ ] Tested state lookup: `getLocationData('Utah')`
- [ ] Tested city lookup: `getLocationData('Austin, TX')`
- [ ] Location dropdown shows both states and cities
- [ ] Multi-select works for both types
- [ ] Search filters both states and cities

---

## 🚀 Next Phase

With this update, you can now:
1. ✅ Query any state or major city
2. ✅ Compare salary/COL between states and cities
3. ✅ Let users select "Texas" vs "Austin, TX" vs both
4. ✅ Run calculations for 121 different locations

**Next:** Build the calculation engine to process all this data!

---

## 📝 Quick Reference

| Function | Purpose | Returns |
|----------|---------|---------|
| `getLocationData(name)` | Get all data for a location | LocationData \| null |
| `getAllLocations()` | Get all states + cities | Array of {name, displayName, type} |
| `getAllStates()` | Get just states | string[] |
| `getAllCities()` | Get just cities | Array of {name, displayName, state} |
| `getSalary(location, occupation)` | Get salary | number |
| `getOccupationList()` | Get all occupations | string[] |

---

**You're all set!** Test it out and let me know if you need any adjustments! 🎉
