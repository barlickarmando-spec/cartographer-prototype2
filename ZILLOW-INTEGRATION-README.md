# 🏠 Real Estate Integration - Complete Guide

## 📚 All Documentation

Your real estate listings integration comes with complete documentation. Start here!

---

## 🚀 GETTING STARTED

### **1. Quick Start** ⚡
👉 **[QUICK-START.md](./QUICK-START.md)** - **START HERE!**
- 3-step setup guide
- Test instructions
- Quick troubleshooting

### **2. Full Installation Guide** 📖
👉 **[US-PROPERTY-DATA-INSTALLATION.md](./US-PROPERTY-DATA-INSTALLATION.md)**
- Detailed setup instructions
- How the API works
- Testing strategies
- Debugging tips

---

## 🔧 TROUBLESHOOTING

### **3. Find Your Endpoint** 🔍
👉 **[FIND-YOUR-ENDPOINT.md](./FIND-YOUR-ENDPOINT.md)**

**Use this if you get "Not subscribed to this API" error!**

Includes:
- Three ways to test endpoints
- Common endpoint options
- Step-by-step debugging

**Quick test:**
1. Open `test-endpoints.html` in browser
2. Click "Test All Endpoints"
3. See which works!

### **4. API Key Troubleshooting** 🔑
👉 **[ZILLOW-API-KEY-FIX.md](./ZILLOW-API-KEY-FIX.md)**
- Fix "API key not configured" errors
- Verification checklist
- Common mistakes

---

## 🛠️ UTILITY FILES

### **Test Endpoints (3 Options)**

**Option A: HTML Test Page** (Easiest)
```
Open: test-endpoints.html
```
Visual test interface - just click buttons!

**Option B: Node.js Script**
```bash
node test-endpoints.js
```
Automated testing in terminal

**Option C: PowerShell Fix Script**
```powershell
.\fix-api-key.ps1
```
Fixes API key issues

---

## 📁 FILE STRUCTURE

```
project/
├── 📄 QUICK-START.md                    ← Start here!
├── 📄 US-PROPERTY-DATA-INSTALLATION.md  ← Full guide
├── 📄 FIND-YOUR-ENDPOINT.md            ← Endpoint troubleshooting
├── 📄 ZILLOW-API-KEY-FIX.md            ← API key fixes
├── 📄 ZILLOW-INTEGRATION-README.md     ← This file
│
├── 🧪 test-endpoints.html               ← Test in browser
├── 🧪 test-endpoints.js                 ← Test in terminal
├── 🔧 fix-api-key.ps1                   ← Fix API key (Windows)
├── 🔧 fix-api-key.sh                    ← Fix API key (Mac/Linux)
│
├── 🔑 .env.local                        ← Your API key
├── ⚙️ next.config.js                    ← Image domains
│
├── 📦 components/
│   └── RealZillowHomes.tsx              ← Main component
│
└── 📦 app/
    ├── api/zillow/search/route.ts       ← API endpoint
    └── results/page.tsx                 ← Results page
```

---

## ⚡ QUICK REFERENCE

### **Is Everything Working?**

✅ **Check 1:** API endpoint
```
Visit: http://localhost:3000/api/zillow/search
Should show: "apiKeyConfigured": true
```

✅ **Check 2:** In your app
```
1. Complete onboarding
2. Go to results page
3. Click "See Potential Homes"
4. Real homes should load!
```

### **Getting Errors?**

❌ **"API key not configured"**
- Check: `.env.local` exists in project root
- Contains: `RAPIDAPI_KEY=3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9`
- Restart server: `npm run dev`
- Guide: [ZILLOW-API-KEY-FIX.md](./ZILLOW-API-KEY-FIX.md)

❌ **"Not subscribed to this API"**
- Run: `test-endpoints.html` or `node test-endpoints.js`
- Find which endpoint works
- Guide: [FIND-YOUR-ENDPOINT.md](./FIND-YOUR-ENDPOINT.md)

❌ **"No homes found"**
- Try: "Salt Lake City, UT" or "Austin, TX"
- Try: Wider price range
- Check: Browser console (F12) for errors

❌ **Photos not loading**
- Check: `next.config.js` has `ap.rdcpix.com` domain
- Restart: `npm run dev`

---

## 🎯 STEP-BY-STEP DEBUGGING

If something isn't working, follow these steps in order:

### **Step 1: Check API Key**
```bash
# Windows (PowerShell)
cat .env.local

# Should show:
# RAPIDAPI_KEY=3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9
```

If missing, run:
```powershell
.\fix-api-key.ps1
```

### **Step 2: Test Endpoints**

Open `test-endpoints.html` in browser, click "Test All Endpoints"

If none work:
1. Check RapidAPI subscription is active
2. Go to: https://rapidapi.com/developer/dashboard
3. Check which endpoints are in your plan

### **Step 3: Restart Server**
```bash
# Stop server (Ctrl+C)
# Then:
npm run dev
```

### **Step 4: Test API Endpoint**

Visit: http://localhost:3000/api/zillow/search

Should show:
```json
{
  "status": "ready",
  "apiKeyConfigured": true,
  "api": "us-real-estate.p.rapidapi.com"
}
```

### **Step 5: Test in App**

1. Go to http://localhost:3000
2. Complete onboarding
3. Click "See Potential Homes"
4. Check browser console (F12) for errors

---

## 📋 CHECKLIST

Use this to verify everything is set up correctly:

### **Files:**
- [ ] `.env.local` exists with API key
- [ ] `next.config.js` includes image domains
- [ ] `app/api/zillow/search/route.ts` exists
- [ ] `components/RealZillowHomes.tsx` exists

### **Testing:**
- [ ] API endpoint shows `apiKeyConfigured: true`
- [ ] Can complete onboarding
- [ ] Can see results page
- [ ] "See Potential Homes" button works
- [ ] Real homes load with photos
- [ ] Clicking homes opens Realtor.com

### **If Issues:**
- [ ] Ran `test-endpoints.html` to find working endpoint
- [ ] Restarted server after config changes
- [ ] Checked browser console for errors
- [ ] Verified RapidAPI subscription is active

---

## 🎓 UNDERSTANDING THE INTEGRATION

### **How It Works:**

```
User clicks "See Potential Homes"
    ↓
RealZillowHomes component loads
    ↓
Calls /api/zillow/search with location + price range
    ↓
API route calls US Property Data API
    ↓
Filters & normalizes the data
    ↓
Returns up to 12 real homes
    ↓
Component displays homes with photos
    ↓
Each card links to Realtor.com listing
```

### **What You Get:**
- ✅ Real photos from Realtor.com
- ✅ Real prices
- ✅ Bedrooms & bathrooms
- ✅ Square footage
- ✅ Full addresses
- ✅ Listing status
- ✅ Days on market
- ✅ Direct links to listings

---

## 💡 TIPS

### **Better Results:**

Use **"City, State"** format:
- ✅ "Salt Lake City, UT"
- ✅ "Austin, TX"
- ❌ "Utah" (too broad)

### **Adjust Result Limit:**

In `app/api/zillow/search/route.ts` line 54:
```typescript
url.searchParams.append('limit', '20');  // ← Change to 30
```

### **Test Different Scenarios:**

Locations:
- "Austin, TX"
- "Phoenix, AZ"  
- "Denver, CO"

Price Ranges:
- $400K - $500K
- $1M - $1.5M
- $2M+

---

## 🚀 DEPLOYMENT

When ready to deploy:

1. **Add API key to production:**
   - Add `RAPIDAPI_KEY` to your hosting platform's environment variables
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables

2. **Verify image domains:**
   - Check `next.config.js` includes all image CDN domains

3. **Test in production:**
   - Visit `/api/zillow/search` endpoint
   - Complete onboarding
   - Verify homes load

---

## 📞 NEED HELP?

### **Common Questions:**

**Q: Which endpoint should I use?**
A: Run `test-endpoints.html` to find out!

**Q: My endpoint isn't working**
A: Check [FIND-YOUR-ENDPOINT.md](./FIND-YOUR-ENDPOINT.md)

**Q: API key issues?**
A: See [ZILLOW-API-KEY-FIX.md](./ZILLOW-API-KEY-FIX.md)

**Q: Want a different API?**
A: I can configure:
- Zillow API (different provider)
- Realty in US
- Real Estate and MLS

---

## ✅ YOU'RE ALL SET!

Everything is configured and documented. Just:

1. **Restart server:** `npm run dev`
2. **Test endpoint:** http://localhost:3000/api/zillow/search
3. **Try it out:** Complete onboarding → See homes!

**If you hit any issues, use the troubleshooting guides above.** 🎯

---

**Happy house hunting!** 🏠✨
