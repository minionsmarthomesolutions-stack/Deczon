# Switch to Node 20 for Firebase Deployment

## Current Issue
You're using **Node 22.17.0**, but Firebase Cloud Functions requires **Node 16, 18, or 20**. This is causing deployment timeouts.

## Quick Fix: Switch to Node 20

### Option 1: Using nvm (Node Version Manager) - Recommended

**Windows:**
1. Download nvm-windows from: https://github.com/coreybutler/nvm-windows/releases
2. Install it
3. Open a new PowerShell/Command Prompt
4. Run:
   ```powershell
   nvm install 20
   nvm use 20
   ```

**Mac/Linux:**
```bash
# Install nvm if you don't have it
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node 20
nvm install 20
nvm use 20
```

### Option 2: Download Node 20 Directly

1. Go to [nodejs.org](https://nodejs.org/)
2. Download **Node.js 20 LTS** (Long Term Support)
3. Install it
4. Restart your terminal
5. Verify: `node --version` should show `v20.x.x`

### Option 3: Use Volta (Cross-platform)

```bash
# Install Volta
# Windows: Download from volta.sh
# Mac/Linux: curl https://get.volta.sh | bash

volta install node@20
```

## After Switching to Node 20

1. **Verify the version:**
   ```bash
   node --version  # Should show v20.x.x
   ```

2. **Clear build cache:**
   ```bash
   rm -rf .next
   rm -rf node_modules/.cache
   ```

3. **Rebuild:**
   ```bash
   npm run build
   ```

4. **Deploy:**
   ```bash
   firebase deploy --only hosting
   ```

## What I've Done

✅ Added `engines` field to `package.json` specifying Node 20
✅ Created `.nvmrc` file for automatic Node version switching
✅ Optimized Firebase initialization to be lazy-loaded (prevents timeout)

## Why This Fixes It

- Firebase Cloud Functions have a 10-second timeout for code loading
- Node 22 has compatibility issues with Firebase's build process
- Node 20 is the recommended LTS version for Firebase
- Lazy Firebase initialization prevents timeout during function startup

---

**Next Step:** Switch to Node 20 using one of the methods above, then deploy again!



