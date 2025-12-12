# Firebase Phone Authentication Setup Guide

If you're encountering `auth/invalid-app-credential` errors, follow these steps:

## 1. Enable Phone Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `minion-project-9bb87`
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Phone** provider
5. Enable it and click **Save**

## 2. Add Authorized Domains

This is crucial for local development:

1. In Firebase Console, go to **Authentication** → **Settings**
2. Scroll down to **Authorized domains**
3. Make sure these domains are listed:
   - `localhost`
   - `127.0.0.1`
   - Your production domain (if applicable)

4. If `localhost` or `127.0.0.1` are missing:
   - Click **Add domain**
   - Enter `localhost` and click **Add**
   - Click **Add domain** again
   - Enter `127.0.0.1` and click **Add**

## 3. Test with 127.0.0.1

Sometimes Firebase works better with `127.0.0.1` instead of `localhost`:

- Instead of: `http://localhost:3000/login`
- Try: `http://127.0.0.1:3000/login`

## 4. Verify Firebase Configuration

Check that your `lib/firebase.ts` has the correct configuration:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyC95KAn9-etdlgijBnJkAVR7JGQj4EEtZU",
  authDomain: "minion-project-9bb87.firebaseapp.com",
  projectId: "minion-project-9bb87",
  // ... other config
}
```

## 5. Check Browser Console

Look for any additional error messages in the browser console that might give more context.

## Common Issues

### Issue: `auth/invalid-app-credential`
**Solution**: 
- Add `localhost` and `127.0.0.1` to Authorized Domains
- Try accessing via `127.0.0.1` instead of `localhost`
- Ensure Phone Authentication is enabled

### Issue: reCAPTCHA not loading
**Solution**:
- Check browser console for reCAPTCHA errors
- Ensure the reCAPTCHA container element exists in DOM
- Try refreshing the page

### Issue: OTP not received
**Solution**:
- Check phone number format (should be +91XXXXXXXXXX)
- Verify SMS quota in Firebase Console
- Check phone number is valid and can receive SMS

## Testing

After making these changes:
1. Clear browser cache
2. Restart your Next.js dev server
3. Try logging in again

If issues persist, check the Firebase Console logs for more details.

