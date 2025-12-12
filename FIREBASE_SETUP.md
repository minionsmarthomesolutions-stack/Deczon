# Firebase Setup Guide

## Fixing "Missing or insufficient permissions" Error

This error occurs when Firestore security rules are blocking read access. Here's how to fix it:

### Option 1: Temporary Development Rules (For Testing Only)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `minion-project-9bb87`
3. Navigate to **Firestore Database** → **Rules**
4. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to all collections (for development)
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

5. Click **Publish**

⚠️ **Warning**: These rules allow anyone to read your data. Only use for development!

### Option 2: Proper Security Rules (Recommended for Production)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Products - public read, authenticated write
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Categories - public read, authenticated write
    match /categories/{categoryId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Banners - public read, authenticated write
    match /banners/{bannerId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Services - public read, authenticated write
    match /services/{serviceId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Blogs - public read, authenticated write
    match /blogs/{blogId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Users - read own data, write own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Cart - user can only access their own cart
    match /carts/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Option 3: Use the App Without Firebase (Fallback Mode)

The app is designed to work even without Firebase permissions. It will:
- Show empty sections if Firebase data is unavailable
- Use fallback static data where available
- Continue functioning for UI/UX testing

The permission errors are logged as warnings (not errors) and won't break the app.

## Setting Up Firebase Collections

Make sure you have these collections in Firestore:

1. **products** - Product catalog
2. **categories** - Product categories
3. **banners** - Homepage banners
4. **services** - Service listings
5. **blogs** - Blog posts
6. **users** - User profiles

## Testing Firebase Connection

After updating rules, refresh your Next.js app. The warnings should disappear if permissions are correctly set.

## Logo Image Setup

If you see a 404 error for the logo:

1. Copy the logo file from your original project:
   - From: `maian and pro/public/LOGO/d__1_-removebg-preview.png`
   - To: `nextjs-deczon/public/LOGO/d__1_-removebg-preview.png`

2. Or update the path in `components/Header.tsx` if your logo is in a different location.

3. The app will automatically show "DECZON" text if the image fails to load.

## Fixing CORS Errors for Firebase Storage Images

If you see CORS errors like:
```
Access to image at 'https://firebasestorage.googleapis.com/...' from origin 'http://localhost:3001' 
has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value 
'http://localhost:3000' that is not equal to the supplied origin.
```

This happens because Firebase Storage CORS is configured to only allow `http://localhost:3000`, but your app is running on `http://localhost:3001`.

### Solution 1: Update Firebase Storage CORS (Recommended)

1. **Install Google Cloud SDK (gsutil)** if you haven't already:
   - Download from: https://cloud.google.com/sdk/docs/install
   - Or use: `pip install gsutil`

2. **Authenticate with Google Cloud**:
   ```bash
   gcloud auth login
   ```

3. **Set your Firebase project**:
   ```bash
   gcloud config set project minion-project-9bb87
   ```

4. **Apply the CORS configuration**:
   ```bash
   gsutil cors set cors.json gs://minion-project-9bb87.firebasestorage.app
   ```

   The `cors.json` file in this directory is already configured to allow:
   - `http://localhost:3000`
   - `http://localhost:3001`
   - `http://127.0.0.1:3000`
   - `http://127.0.0.1:3001`

5. **Verify the CORS configuration**:
   ```bash
   gsutil cors get gs://minion-project-9bb87.firebasestorage.app
   ```

### Solution 2: Run Next.js on Port 3000 (Quick Fix)

If you can't update CORS settings, you can force Next.js to run on port 3000:

1. **Update `package.json`**:
   ```json
   "scripts": {
     "dev": "next dev -p 3000",
     ...
   }
   ```

2. **Or set environment variable**:
   ```bash
   PORT=3000 npm run dev
   ```

   On Windows PowerShell:
   ```powershell
   $env:PORT=3000; npm run dev
   ```

3. **Make sure nothing else is using port 3000**:
   ```bash
   # Check what's using port 3000
   netstat -ano | findstr :3000
   ```

### Solution 3: Update CORS via Firebase Console (Alternative)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `minion-project-9bb87`
3. Navigate to **Storage** → **Rules**
4. Note: CORS settings for Storage are typically managed via gsutil, not the console rules

### Understanding the Error

- **CORS (Cross-Origin Resource Sharing)** is a browser security feature
- Firebase Storage is configured to only accept requests from specific origins
- Your app on `localhost:3001` is being blocked because only `localhost:3000` is allowed
- The fix is to add `localhost:3001` to the allowed origins list

After applying the CORS fix, refresh your browser and the images should load correctly.

