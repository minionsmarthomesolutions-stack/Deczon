# Login Page Implementation

This document describes the login page and authentication implementation for the Next.js application.

## Overview

The login page implements Firebase Phone Authentication with OTP verification, matching the functionality from the original HTML version.

## Files Created

1. **`app/login/page.tsx`** - Main login page component
2. **`app/login/login.module.css`** - Login page styles

## Features Implemented

### ✅ Phone Number Input
- Country code (+91) display
- 10-digit phone number input
- Input validation
- Auto-formatting (numbers only)

### ✅ OTP Verification
- 6-digit OTP input fields
- Auto-focus next input on entry
- Auto-verify when all 6 digits entered
- Backspace navigation between inputs
- Visual feedback

### ✅ Firebase Authentication
- Phone authentication with Firebase Auth
- reCAPTCHA integration (invisible)
- OTP sending and verification
- User session management
- Firestore user data storage

### ✅ User Experience
- Loading states
- Error messages
- Resend OTP with 30-second timer
- Redirect after successful login
- Remember redirect URL

### ✅ Integration
- Header component updated to link to `/login` when not authenticated
- Redirect URL stored in localStorage
- User data saved to Firestore on first login

## Usage

### Accessing the Login Page

Users can access the login page by:
1. Clicking the "Login" button in the header (when not authenticated)
2. Navigating directly to `/login`
3. Being redirected from protected pages

### Login Flow

1. **Enter Phone Number**
   - User enters 10-digit phone number
   - Clicks "Send OTP" button
   - reCAPTCHA is solved automatically (invisible)

2. **Receive OTP**
   - OTP is sent to the phone number via SMS
   - User sees OTP input screen
   - 30-second resend timer starts

3. **Enter OTP**
   - User enters 6-digit OTP
   - Auto-verifies when all digits entered
   - Or clicks "Verify OTP" button

4. **Success**
   - User is authenticated
   - User data saved to Firestore
   - Redirects to original page or home

### Resend OTP

- Available after 30 seconds
- Creates new reCAPTCHA verifier
- Sends new OTP
- Resets timer

## Firebase Configuration

### Required Firebase Setup

1. **Enable Phone Authentication**
   - Go to Firebase Console
   - Navigate to Authentication → Sign-in method
   - Enable "Phone" provider

2. **Configure reCAPTCHA**
   - Firebase automatically handles reCAPTCHA
   - No additional configuration needed for invisible reCAPTCHA

3. **Firestore Rules** (for user data storage)
   ```javascript
   match /users/{userId} {
     allow read: if request.auth != null && request.auth.uid == userId;
     allow write: if request.auth != null;
   }
   ```

## Code Structure

### Login Page Component (`app/login/page.tsx`)

**State Management:**
- `phoneNumber` - User's phone number input
- `otp` - Array of 6 OTP digits
- `showOtp` - Toggle between phone and OTP screens
- `error` - Error message display
- `loading` - Loading state
- `resendTimer` - Countdown timer for resend
- `confirmationResult` - Firebase confirmation result

**Key Functions:**
- `handleSendOtp()` - Sends OTP to phone number
- `handleVerifyOtp()` - Verifies entered OTP
- `handleResendOtp()` - Resends OTP
- `handleOtpChange()` - Handles OTP input with auto-focus

### Styling (`app/login/login.module.css`)

Matches the original design with:
- Gradient background
- Centered card layout
- Responsive design
- Form input styling
- OTP input grid
- Button states

## Integration with Header

The Header component (`components/Header.tsx`) has been updated to:
- Link to `/login` when user is not authenticated
- Link to `/account` when user is authenticated
- Store redirect URL in localStorage before navigating to login
- Display user name or "Login" based on auth state

## Redirect Logic

After successful login:
1. Checks `redirect` query parameter
2. Checks `redirectAfterLogin` in localStorage
3. Falls back to home page (`/`)

Example redirect URLs:
- `/login?redirect=/cart` - Redirects to cart after login
- `/login` - Redirects to home after login

## Error Handling

The login page handles:
- Invalid phone numbers
- Network errors
- Invalid OTP
- reCAPTCHA expiration
- Firebase authentication errors

All errors are displayed in a user-friendly error message box.

## Testing

To test the login functionality:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to login page:**
   - Go to `http://localhost:3000/login`
   - Or click "Login" in header

3. **Test phone authentication:**
   - Enter a valid phone number
   - Receive OTP via SMS
   - Enter OTP to verify

## Notes

- Phone numbers are stored with country code (+91)
- User data is saved to Firestore collection `users`
- User document ID is the phone number without country code
- Session is maintained via Firebase Auth state
- localStorage is used for redirect URL and session flags

## Future Enhancements

Potential improvements:
- [ ] Email/password authentication option
- [ ] Social login (Google, Facebook)
- [ ] Remember me functionality
- [ ] Two-factor authentication
- [ ] Account recovery options

