# 🔍 FIND YOUR AVAILABLE ENDPOINT

## ❌ Problem
"Not subscribed to this API" means the specific endpoint we're calling isn't in your subscription.

---

## ✅ SOLUTION: Find Which Endpoint You Have

### **Step 1: Go to Your Subscription Page**

1. Visit: https://rapidapi.com/developer/dashboard
2. Click **"My Subscriptions"**
3. Find **"US Property Data"** (or similar)
4. Click on it

### **Step 2: Check Available Endpoints**

On your subscription page:
1. Look for the **"Endpoints"** tab
2. You should see a list of endpoints like:
   - `/for-sale`
   - `/properties/list-for-sale`
   - `/properties/v2/list-for-sale`
   - `/v2/for-sale`
   - `/search`
   - etc.

### **Step 3: Test in RapidAPI**

1. Click on one of the endpoints (try `/for-sale` first)
2. Look for a **"Test Endpoint"** button
3. Fill in test parameters:
   - **city**: `Austin`
   - **state_code**: `TX`
4. Click **"Test"**
5. If you get results → That's your endpoint! ✅
6. If you get "not subscribed" → Try another endpoint

---

## 🎯 COMMON US PROPERTY DATA ENDPOINTS

Try these in order:

### **Option 1: /for-sale**
```
https://us-real-estate.p.rapidapi.com/for-sale
Parameters: city, state_code, price_min, price_max
```

### **Option 2: /properties/list-for-sale**
```
https://us-real-estate.p.rapidapi.com/properties/list-for-sale
Parameters: city, state_code
```

### **Option 3: /v2/for-sale**
```
https://us-real-estate.p.rapidapi.com/v2/for-sale
Parameters: city, state_code
```

### **Option 4: /search**
```
https://us-real-estate.p.rapidapi.com/search
Parameters: location, status
```

---

## ⚡ QUICK TEST - THREE WAYS TO TEST

### **Method 1: HTML Test Page (EASIEST)**

1. Open `test-endpoints.html` in your browser
2. Click **"Test All Endpoints"**
3. See which ones work! ✅

### **Method 2: Node.js Script**

```bash
node test-endpoints.js
```

This will test all common endpoints in your terminal.

### **Method 3: Browser Console** (see below)

---

## 🌐 MANUAL TEST - RUN IN BROWSER CONSOLE

Open your browser console (F12) and run:

```javascript
// Test Option 1: /for-sale
fetch('https://us-real-estate.p.rapidapi.com/for-sale?city=Austin&state_code=TX', {
  headers: {
    'X-RapidAPI-Key': '3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9',
    'X-RapidAPI-Host': 'us-real-estate.p.rapidapi.com'
  }
})
.then(r => r.json())
.then(d => console.log('✅ Option 1 (/for-sale):', d))
.catch(e => console.error('❌ Option 1 failed:', e));

// Test Option 2: /properties/list-for-sale
fetch('https://us-real-estate.p.rapidapi.com/properties/list-for-sale?city=Austin&state_code=TX', {
  headers: {
    'X-RapidAPI-Key': '3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9',
    'X-RapidAPI-Host': 'us-real-estate.p.rapidapi.com'
  }
})
.then(r => r.json())
.then(d => console.log('✅ Option 2 (/properties/list-for-sale):', d))
.catch(e => console.error('❌ Option 2 failed:', e));

// Test Option 3: /v2/for-sale
fetch('https://us-real-estate.p.rapidapi.com/v2/for-sale?city=Austin&state_code=TX', {
  headers: {
    'X-RapidAPI-Key': '3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9',
    'X-RapidAPI-Host': 'us-real-estate.p.rapidapi.com'
  }
})
.then(r => r.json())
.then(d => console.log('✅ Option 3 (/v2/for-sale):', d))
.catch(e => console.error('❌ Option 3 failed:', e));
```

**Look for the one that returns data instead of an error!**

---

## 📸 OR: SCREENSHOT METHOD

1. Go to: https://rapidapi.com/developer/dashboard
2. Click your US Property Data subscription
3. Take a screenshot of the **Endpoints** list
4. Share the screenshot

I'll tell you exactly which endpoint to use!

---

## 🔧 ONCE YOU FIND THE WORKING ENDPOINT

Tell me which one worked, for example:
- "Option 1 `/for-sale` works!"
- "Option 2 `/properties/list-for-sale` works!"
- "None of them work, but I see endpoint `/xyz` in my dashboard"

Then I'll update the code with the correct endpoint.

---

## 🎯 CHECK YOUR FREE TIER LIMITS

Sometimes the free tier only includes certain endpoints:

1. On your subscription page
2. Look for **"Pricing"** or **"Plan Details"**
3. See which endpoints are included in FREE tier
4. That's the one you need to use!

---

## 📋 WHAT TO TELL ME:

After testing, tell me:

1. **Which endpoint worked?**
   - Example: `/for-sale`, `/properties/list-for-sale`, `/v2/for-sale`

2. **What parameters did it accept?**
   - Example: `city + state_code`, or `location`, or `city + state + price_min + price_max`

3. **What did the response look like?**
   - Just paste the first few lines, like:
   ```json
   {
     "data": {
       "home_search": { ... }
     }
   }
   ```

**Then I'll create the exact working code for you!** 🎯

---

## 🚨 IF NONE WORK

### **Option 1:** Activate Your Free Subscription
- Go to the API page on RapidAPI
- Look for "Subscribe" or "Subscribe to Test" button
- Make sure free tier is activated
- Sometimes you need to click "Subscribe" even for free tier

### **Option 2:** Check What's Included in Your Plan
- The API might have changed their free tier
- Check what's included in free plan
- Some endpoints might require paid plan

### **Option 3:** Use a Different Free API

If US Property Data doesn't work, I can configure these instead:

**Free Real Estate APIs:**
- **Zillow API** (zillow56.p.rapidapi.com)
- **Realty in US** (realty-in-us.p.rapidapi.com)
- **Real Estate and MLS** (real-estate-and-mls.p.rapidapi.com)

Let me know which one you want and I'll reconfigure everything!

---

## 💡 TIPS

### Check Response Format
Different endpoints return data in different formats:

**Format 1:**
```json
{
  "data": {
    "home_search": {
      "results": [ ... ]
    }
  }
}
```

**Format 2:**
```json
{
  "results": [ ... ]
}
```

**Format 3:**
```json
[ ... array of homes ... ]
```

Don't worry about this - just tell me which endpoint works and I'll handle the response format!

---

## 🎬 NEXT STEPS

1. **Run the test script:** `node test-endpoints.js`
2. **Or test in browser console** using the code above
3. **Or check your RapidAPI dashboard** to see available endpoints
4. **Tell me which works!**

Then I'll update the code and you'll be ready to go! 🚀
