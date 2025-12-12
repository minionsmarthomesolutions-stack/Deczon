# Firebase Hosting Setup for Next.js

This guide will help you deploy your Next.js application to Firebase Hosting.

## Prerequisites

1. **Firebase CLI** - Install globally or use the local version
2. **Firebase Account** - Make sure you're logged in
3. **Node.js** - Version 18 or higher

## Installation Steps

### 1. Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

Or use the local version (already added to devDependencies):
```bash
npm install
```

### 2. Login to Firebase

```bash
firebase login
```

This will open a browser window for authentication.

### 3. Verify Firebase Project

The project is already configured in `.firebaserc`:
- **Project ID**: `minion-project-9bb87`

To verify or change the project:
```bash
firebase use --add
```

### 4. Build Your Next.js App

Before deploying, build your Next.js application:

```bash
npm run build
```

This creates an optimized production build in the `.next` folder.

## Deployment Steps

### Step 1: Initialize Firebase Hosting (First Time Only)

If this is your first time setting up Firebase Hosting for this project:

```bash
firebase init hosting
```

When prompted:
- **What do you want to use as your public directory?** → Enter `.` (current directory)
- **Configure as a single-page app?** → Enter `N` (No, Next.js handles routing)
- **Set up automatic builds and deploys with GitHub?** → Enter `N` (optional)

**Note:** Since we already have `firebase.json` configured, you can skip this step.

### Step 2: Build Your Next.js App

Build your Next.js application for production:

```bash
npm run build
```

This creates an optimized production build in the `.next` folder.

### Step 3: Deploy to Firebase Hosting

**Deploy hosting only:**
```bash
npm run deploy
```

Or:
```bash
firebase deploy --only hosting
```

**Deploy everything (hosting + functions if you have any):**
```bash
npm run deploy:all
```

Or:
```bash
firebase deploy
```

### Important Notes

- **Firebase CLI will automatically detect Next.js** and handle the deployment correctly
- Your API routes (`/api/placeholder`) will work on Firebase Hosting
- Client-side routing will work automatically
- The build output (`.next` folder) will be deployed

## Alternative: Static Export (If Needed)

If you want to use static export instead (loses API routes and SSR):

1. **Update `next.config.js`** to add:
```javascript
const nextConfig = {
  output: 'export',
  // ... rest of your config
}
```

2. **Update `firebase.json`** to point to the export directory:
```json
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

3. **Build and deploy:**
```bash
npm run build
firebase deploy --only hosting
```

**Note:** Static export will not support your `/api/placeholder` route. You'll need to convert it to a static file or use Cloud Functions.

## Firebase Hosting Configuration

The `firebase.json` file is configured with:
- **Source**: Current directory (`.`)
- **Rewrites**: All routes redirect to `/index.html` for client-side routing
- **Ignore**: Excludes `node_modules`, `.git`, and other unnecessary files

## Post-Deployment

After successful deployment, you'll get:
- **Hosting URL**: `https://minion-project-9bb87.web.app`
- **Custom Domain**: Can be configured in Firebase Console

### View Your Deployed App

```bash
firebase open hosting:site
```

## Troubleshooting

### Error: "Firebase CLI not found"
- Install Firebase CLI: `npm install -g firebase-tools`
- Or use local version: `npx firebase deploy`

### Error: "Permission denied"
- Make sure you're logged in: `firebase login`
- Verify project access in Firebase Console

### Error: "Build failed"
- Check that all dependencies are installed: `npm install`
- Verify build works locally: `npm run build`
- Check for TypeScript errors: `npm run lint`

### API Routes Not Working
- Firebase Hosting with Next.js framework support handles API routes automatically
- If using static export, API routes won't work (convert to static files or use Cloud Functions)

### Images Not Loading
- Verify Firebase Storage CORS settings (see `FIREBASE_SETUP.md`)
- Check image paths in your code
- Ensure images are in the `public` folder or properly referenced

## Environment Variables

If you need environment variables in production:

1. **Set in Firebase Console:**
   - Go to Firebase Console → Project Settings → Environment Variables
   - Add your variables there

2. **Or use `.env.production`:**
   - Create `.env.production` file
   - Add your variables (don't commit sensitive data)
   - Firebase will use these during build

## Custom Domain Setup

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Follow the verification steps
4. Update your DNS records as instructed

## Continuous Deployment (Optional)

You can set up automatic deployments with GitHub Actions:

1. Create `.github/workflows/firebase-deploy.yml`
2. Add Firebase token as GitHub secret
3. Push to trigger automatic deployment

## Monitoring

- **Analytics**: Firebase Analytics automatically tracks your app
- **Performance**: Check Firebase Console → Performance
- **Errors**: Monitor in Firebase Console → Crashlytics (if enabled)

## Rollback

If something goes wrong, you can rollback:

```bash
firebase hosting:clone SOURCE_SITE_ID:SOURCE_CHANNEL_ID TARGET_SITE_ID:TARGET_CHANNEL_ID
```

Or use Firebase Console → Hosting → Releases → Rollback

## Next Steps

1. ✅ Build your app: `npm run build`
2. ✅ Deploy to Firebase: `npm run deploy`
3. ✅ Test your live site
4. ✅ Set up custom domain (optional)
5. ✅ Configure environment variables (if needed)

Your Next.js app is now live on Firebase Hosting! 🚀

