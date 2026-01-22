# Setup Instructions

## Quick Fix for Build Errors

If you're encountering the `undici` module parse error, follow these steps:

### Step 1: Clean Installation

**Windows (PowerShell):**
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

**Mac/Linux:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Step 2: Clear Next.js Cache

```bash
rm -rf .next
npm run dev
```

### Step 3: Verify Node.js Version

Make sure you're using Node.js 18 or higher:
```bash
node --version
```

If you need to update Node.js:
- Download from [nodejs.org](https://nodejs.org/)
- Or use nvm: `nvm install 20 && nvm use 20`

### Step 4: If Issues Persist

Try installing with legacy peer deps:
```bash
npm install --legacy-peer-deps
```

Or use yarn instead:
```bash
yarn install
yarn dev
```

## Common Issues

### Module parse failed: Unexpected token

This is usually resolved by:
1. Updating to the latest dependencies (already done in package.json)
2. Cleaning node_modules and reinstalling
3. Ensuring Node.js version is 18+

### Firebase initialization errors

The app includes fallback data, so it will work even if Firebase isn't configured initially.

### Port already in use

If port 3000 is busy:
```bash
npm run dev -- -p 3001
```

