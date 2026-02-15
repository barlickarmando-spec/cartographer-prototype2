# Logo Setup Instructions

## Current Status

✅ **Temporary logo is active** - Text-based logo with gradient icon

## To Use Your Image Logo

### Step 1: Save the Logo File

1. Save your Cartographer logo image (drafting table illustration)
2. File name: `Logos.png`
3. Location: `public/Logos.png`

### Step 2: Update Layout to Use Image

Replace the logo section in `app/(authenticated)/layout.tsx`:

**Replace this (current temporary logo):**
```typescript
<div className="flex items-center gap-3">
  <div className="w-12 h-12 bg-gradient-to-br...">
    <svg>...</svg>
  </div>
  <div>
    <div className="text-2xl font-bold...">Cartographer</div>
    <div className="text-xs text-gray-500...">Your Path to Homeownership</div>
  </div>
</div>
```

**With this (image logo):**
```typescript
<Image
  src="/Logos.png"
  alt="Cartographer"
  width={200}
  height={60}
  className="h-12 w-auto"
  priority
/>
```

### Step 3: Verify

```bash
# Check file exists:
ls public/Logos.png

# Restart dev server:
npm run dev
```

---

## Logo Specs

**Image Requirements:**
- Format: PNG (or SVG)
- Recommended size: 400px wide minimum
- Transparent background preferred
- High resolution for retina displays

**Display Size:**
- Height: 48px (h-12 in Tailwind)
- Width: Auto (maintains aspect ratio)

---

## Current Temporary Logo

The temporary logo provides:
- Blue gradient background matching your brand
- Map icon (consistent with app theme)
- "Cartographer" text in brand blue (#5BA4E5)
- Tagline for context
- Professional appearance

---

## Quick File Check

```powershell
# Check if logo exists:
Test-Path "public\Logos.png"

# List public folder contents:
Get-ChildItem public
```

---

Once you have the image file in place, just update the code as shown above!
