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
