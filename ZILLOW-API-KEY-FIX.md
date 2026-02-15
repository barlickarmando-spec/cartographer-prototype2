# 🔧 FIX: API Key Not Configured

## ❌ Problem
The API says: "API key not configured" or "apiKeyConfigured: false"

## ✅ Solution - Follow These Steps:

### **Step 1: Create .env.local in the RIGHT location**

The file MUST be in your project root (same folder as `package.json`).

```bash
# First, make sure you're in the right directory
# You should see package.json when you run:
ls package.json

# If you see it, you're in the right place!
# If not, navigate to your project root first
```

### **Step 2: Create the file with your API key**

```bash
# Run this command (copy the whole thing):
cat > .env.local << 'EOF'
RAPIDAPI_KEY=3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9
EOF
```

**OR manually create it:**

1. Create a file named `.env.local` in your project root
2. Add exactly this line (nothing else):
```
RAPIDAPI_KEY=3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9
```
3. Save the file

### **Step 3: Verify the file exists**

```bash
# Check the file exists
ls -la .env.local

# Check the content
cat .env.local

# Should show:
# RAPIDAPI_KEY=3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9
```

### **Step 4: Make sure there are NO EXTRA SPACES**

Common mistakes:
```bash
# ❌ WRONG - space before key
 RAPIDAPI_KEY=3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9

# ❌ WRONG - space around =
RAPIDAPI_KEY = 3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9

# ❌ WRONG - quotes around key
"RAPIDAPI_KEY"=3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9

# ✅ CORRECT - no spaces, no quotes on variable name
RAPIDAPI_KEY=3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9
```

### **Step 5: IMPORTANT - Restart the Server**

Environment variables are only loaded when the server starts!

```bash
# Stop the server (Ctrl+C in the terminal running npm run dev)
# Then start it again:
npm run dev
```

**Wait for:**
```
✓ Ready in 2.3s
```

### **Step 6: Test the API**

Visit: http://localhost:3000/api/zillow/search

Should show:
```json
{
  "status": "ready",
  "apiKeyConfigured": true  ← Should be true now!
}
```

---

## 🔍 DEBUGGING

### **Check 1: File Location**

```bash
# Your project structure should look like:
your-project/
├── .env.local          ← Must be here!
├── package.json        ← Same level
├── next.config.js
├── app/
├── components/
└── ...
```

### **Check 2: File Name**

```bash
# Check exact filename
ls -la | grep env

# Should show:
# .env.local

# NOT:
# env.local (missing the dot)
# .env (wrong name)
# .env.local.txt (wrong extension)
```

### **Check 3: File Content**

```bash
# View the file
cat .env.local

# Should show EXACTLY:
RAPIDAPI_KEY=3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9

# Check for hidden characters
xxd .env.local | head
```

### **Check 4: Environment Variable Loaded**

After restarting server, check if Next.js sees it:

```bash
# In your API route, add this temporarily:
console.log('API Key:', process.env.RAPIDAPI_KEY);

# Restart server
# Make a request
# Check terminal output
```

---

## 🎯 COMPLETE FIX SCRIPT

Run this entire script to fix everything:

```bash
#!/bin/bash

echo "🔧 Fixing API Key Configuration..."

# 1. Navigate to project root
cd "$(dirname "$(find . -name package.json -type f | head -1)")"

echo "📍 Current directory: $(pwd)"

# 2. Remove old .env.local if it exists
rm -f .env.local

# 3. Create new .env.local with correct API key
echo "RAPIDAPI_KEY=3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9" > .env.local

# 4. Verify
echo "✅ Created .env.local"
echo "📄 Content:"
cat .env.local

echo ""
echo "🔄 Now restart your server with: npm run dev"
```

Save this as `fix-api-key.sh`, then run:
```bash
chmod +x fix-api-key.sh
./fix-api-key.sh
```

---

## 🚨 STILL NOT WORKING?

### **Try Manual Creation:**

1. **Open your project in VS Code (or any editor)**
2. **Right-click on the root folder** (where package.json is)
3. **New File**
4. **Name it:** `.env.local` (with the dot!)
5. **Add this content:**
   ```
   RAPIDAPI_KEY=3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9
   ```
6. **Save**
7. **Restart dev server:** Stop (Ctrl+C) then `npm run dev`

### **Check in Browser Dev Tools:**

```javascript
// In browser console, run:
fetch('/api/zillow/search')
  .then(r => r.json())
  .then(d => console.log('API Key Configured:', d.apiKeyConfigured));

// Should log: true
```

---

## ✅ VERIFICATION CHECKLIST

- [ ] File is named `.env.local` (with dot)
- [ ] File is in project root (same level as package.json)
- [ ] File contains: `RAPIDAPI_KEY=3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9`
- [ ] No extra spaces or quotes
- [ ] Server has been restarted
- [ ] http://localhost:3000/api/zillow/search shows `apiKeyConfigured: true`

---

## 📝 COMMON MISTAKES

| Mistake | Fix |
|---------|-----|
| File in wrong folder | Must be in project root |
| Forgot the dot (env.local) | Must be `.env.local` |
| Didn't restart server | Ctrl+C then `npm run dev` |
| Extra spaces | `RAPIDAPI_KEY=...` (no spaces) |
| Quotes around value | No quotes needed |
| Wrong file encoding | Save as plain text UTF-8 |

---

**After fixing, the API should work and you'll see real Zillow homes!** 🏠✨
