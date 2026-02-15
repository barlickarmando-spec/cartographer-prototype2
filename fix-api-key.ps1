# PowerShell script to fix API key configuration

Write-Host "🔧 Fixing API Key Configuration..." -ForegroundColor Cyan

# 1. Get current directory
$projectRoot = Get-Location
Write-Host "📍 Current directory: $projectRoot" -ForegroundColor Yellow

# 2. Remove old .env.local if it exists
if (Test-Path ".env.local") {
    Remove-Item ".env.local"
    Write-Host "🗑️  Removed old .env.local" -ForegroundColor Gray
}

# 3. Create new .env.local with correct API key
$apiKey = "RAPIDAPI_KEY=3b86e8a737mshcc69ac4077e9c00p18b472jsnc475ce3e84b9"
$apiKey | Out-File -FilePath ".env.local" -Encoding ASCII -NoNewline

# 4. Verify
Write-Host "✅ Created .env.local" -ForegroundColor Green
Write-Host "📄 Content:" -ForegroundColor Cyan
Get-Content ".env.local"

Write-Host ""
Write-Host "🔄 Now restart your server with: npm run dev" -ForegroundColor Yellow
