# 🏠 Real Homes Feature - Quick Start

## ⚡ 5-Minute Setup

### 1. Get Free API Key
1. Go to https://rapidapi.com/
2. Sign up (free)
3. Subscribe to **Realtor.com API** (free tier)
4. Copy your API key

### 2. Add to Project
Create `.env.local` in project root:
```env
RAPIDAPI_KEY=paste_your_key_here
```

### 3. Restart & Test
```bash
npm run dev
```

Go to results → Click "See Potential Homes" → **Real listings appear!** 🎉

---

## ✅ What's Already Done

- ✅ Full API integration (Realtor.com)
- ✅ Smart location parsing
- ✅ Beautiful carousel UI
- ✅ Stock image fallback
- ✅ Error handling
- ✅ Responsive design
- ✅ Direct listing links

**No code changes needed** - just add the API key!

---

## 📊 What You Get

**With API Key:**
- Real homes from Realtor.com
- Actual photos and prices
- Current availability
- 500-1000 free searches/month

**Without API Key:**
- Beautiful stock images
- Representative pricing
- Zillow search links
- Works perfectly as demo

---

## 🔍 Supported Locations

All formats work:
- `Boise, ID` ✅
- `Idaho` ✅
- `San Francisco, CA` ✅
- `Austin, Texas` ✅

---

## 📝 Files Involved

```
components/
  └── HomeCarousel.tsx          # Main UI component

app/api/homes/search/
  └── route.ts                  # API endpoint (ready!)

.env.local                      # Add RAPIDAPI_KEY here
```

---

## 🆘 Quick Troubleshooting

**No real homes showing?**
1. Check `.env.local` exists
2. Verify `RAPIDAPI_KEY=...` is set
3. Restart dev server
4. Check browser console for logs

**Still using stock images?**
- That's the fallback - it's working perfectly!
- Check console for "API key not configured" message
- Verify RapidAPI subscription is active

---

## 💰 Cost

- **Development:** FREE (500-1000 requests/month)
- **Production:** $10-50/month if needed
- **Fallback:** Always FREE (stock images)

---

## 🎯 Testing

```bash
# Check API status
curl http://localhost:3000/api/homes/search

# Should return:
# { "status": "ready", "apiKeyConfigured": true }
```

---

## 📚 More Details

See `HOME-CAROUSEL-API-SETUP.md` for:
- Complete implementation details
- API response format
- Advanced configuration
- Monitoring and logging

---

**Ready to see real homes? Add your API key now!** 🚀
