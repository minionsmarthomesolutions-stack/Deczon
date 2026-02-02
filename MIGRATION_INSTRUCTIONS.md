# Firebase Storage URL Migration Guide

This script fixes the issue where your Firestore database contains dead image URLs pointing to your old bucket (`minion-project-9bb87`) instead of your new one (`deczon-faa54`).

## Prerequisites

1.  **Node.js** installed.
2.  **Service Account Key** for your NEW Firebase project (`deczon-faa54`).

## Step 1: Get Service Account Key

1.  Go to [Firebase Console](https://console.firebase.google.com).
2.  Select your project **`deczon-faa54`**.
3.  Go to **Project Settings** (Gear icon) -> **Service accounts**.
4.  Click **Generate new private key**.
5.  A JSON file will download.
6.  **Rename** this file to `service-account-key.json`.
7.  **Move** this file into the `scripts/` folder where `migrate-images.js` is located.

## Step 2: Install Dependencies

Open your terminal in the project root and install `firebase-admin` if you haven't already:

```bash
npm install firebase-admin
```

## Step 3: Run the Migration

Run the script using Node.js:

```bash
node scripts/migrate-images.js
```

## What the Script Does

1.  Connects to your `products` collection in Firestore.
2.  Scans every document for image fields:
    *   `imageUrl`, `primaryImageUrl`
    *   `images`, `thumbnailUrls`, `additionalImageUrls`
3.  For each URL found:
    *   It extracts the **file path** (e.g., `products/image1.jpg`).
    *   It checks if this file exists in your **NEW** storage bucket (`deczon-faa54`).
4.  **If the file exists:**
    *   It generates a NEW, valid signed URL (valid until year 2100).
    *   It updates the Firestore document with this new URL.
5.  **If the file DOES NOT exist:**
    *   It logs a warning (`File not found`).
    *   It skips updating that specific URL to avoid breaking it further (or removes it from arrays if you prefer).

## Safety

*   The script logs every change to the console.
*   It only writes to Firestore if a valid new URL is generated.
*   It handles errors gracefully without crashing.
