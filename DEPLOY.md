# Quick Deployment Guide

## 🚀 Deploy Your Next.js App to Firebase Hosting

### Quick Start (3 Steps)

1. **Login to Firebase:**
   ```bash
   firebase login
   ```

2. **Build your app:**
   ```bash
   npm run build
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   ```

That's it! Your app will be live at: `https://minion-project-9bb87.web.app`

---

## 📋 Detailed Steps

### Prerequisites Check
- ✅ Node.js installed (v18+)
- ✅ Firebase account
- ✅ Project configured (`.firebaserc` already set up)

### Step-by-Step

1. **Install dependencies** (if not done):
   ```bash
   npm install
   ```

2. **Login to Firebase** (first time only):
   ```bash
   firebase login
   ```
   This opens a browser for authentication.

3. **Verify project** (optional):
   ```bash
   firebase use
   ```
   Should show: `minion-project-9bb87`

4. **Build the app:**
   ```bash
   npm run build
   ```
   Wait for the build to complete successfully.

5. **Deploy:**
   ```bash
   npm run deploy
   ```
   Or use: `firebase deploy --only hosting`

6. **View your site:**
   ```bash
   firebase open hosting:site
   ```

---

## 🔧 Troubleshooting

### "Firebase CLI not found"
```bash
npm install -g firebase-tools
```
Or use local version: `npx firebase deploy`

### "Permission denied"
- Make sure you're logged in: `firebase login`
- Check Firebase Console for project access

### "Build failed"
- Check for errors: `npm run build`
- Fix TypeScript errors: `npm run lint`
- Ensure all dependencies installed: `npm install`

### API Routes Not Working
- Firebase Hosting supports Next.js API routes automatically
- Make sure you're not using static export mode

---

## 📝 Files Created

- ✅ `firebase.json` - Firebase Hosting configuration
- ✅ `.firebaserc` - Project ID configuration
- ✅ `package.json` - Updated with deployment scripts
- ✅ `.gitignore` - Excludes build files and Firebase cache

---

## 🎯 Next Steps After Deployment

1. **Set up custom domain** (optional):
   - Firebase Console → Hosting → Add custom domain

2. **Configure environment variables** (if needed):
   - Firebase Console → Project Settings → Environment Variables

3. **Set up continuous deployment** (optional):
   - GitHub Actions or Firebase CI/CD

4. **Monitor your app:**
   - Firebase Console → Hosting → View analytics

---

## 📚 More Information

See `FIREBASE_HOSTING.md` for detailed documentation.

---

**Your app is ready to deploy!** 🎉

