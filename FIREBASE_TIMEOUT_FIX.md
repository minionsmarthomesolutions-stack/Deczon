# Fix: Firebase Deployment Timeout

## Problem
Deployment is timing out with: "User code failed to load. Cannot determine backend specification. Timeout after 10000."

## Root Causes

1. **Node Version Mismatch**: You're using Node 22, but Firebase expects Node 16, 18, or 20
2. **Initialization Timeout**: Next.js app taking too long to initialize in Cloud Function environment

## Solutions

### Solution 1: Use Node 20 (Recommended)

**Option A: Use nvm (Node Version Manager)**

1. Install nvm if you don't have it:
   - Windows: Download from [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)
   - Mac/Linux: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash`

2. Switch to Node 20:
   ```bash
   nvm install 20
   nvm use 20
   ```

3. Verify:
   ```bash
   node --version  # Should show v20.x.x
   ```

4. Deploy again:
   ```bash
   firebase deploy --only hosting
   ```

**Option B: Download Node 20 Directly**

1. Download Node.js 20 LTS from [nodejs.org](https://nodejs.org/)
2. Install it
3. Restart your terminal
4. Deploy again

### Solution 2: Optimize Firebase Initialization

The timeout might be caused by Firebase initialization. Let's make it lazy:

**Update `lib/firebase.ts`** to use lazy initialization:

```typescript
// Only initialize when actually needed, not at module load
export const getDb = () => {
  if (typeof window === 'undefined') {
    // Server-side: initialize if needed
    if (!db && typeof window === 'undefined') {
      // Initialize for server
    }
  }
  return db
}
```

### Solution 3: Increase Timeout (Temporary Workaround)

If the above doesn't work, you can try increasing the function timeout, but this requires initializing functions:

```bash
firebase init functions
```

Then update the function configuration.

## Quick Fix Steps

1. **Switch to Node 20:**
   ```bash
   nvm use 20
   # or install Node 20 directly
   ```

2. **Clear build cache:**
   ```bash
   rm -rf .next
   npm run build
   ```

3. **Deploy again:**
   ```bash
   firebase deploy --only hosting
   ```

## Why This Happens

- Firebase Cloud Functions have a 10-second timeout for code loading
- Node 22 might have compatibility issues with Firebase's build process
- Heavy module imports or synchronous operations during initialization can cause timeouts

## Verification

After switching to Node 20, verify:
```bash
node --version  # Should be v20.x.x
npm --version
firebase --version
```

Then try deploying again.

---

**Note:** The `.nvmrc` file has been created to help nvm automatically use Node 20. The `engines` field in `package.json` also specifies Node 20.



