# DECZON - Next.js E-commerce Application

A modern Next.js application for DECZON smart home solutions, converted from the original HTML/CSS/JavaScript implementation.

## Features

- 🏠 Smart home product catalog
- 🛒 Shopping cart functionality
- 🔐 Firebase authentication
- 📱 Responsive design
- 🎨 Modern UI with CSS modules
- 🔍 Product search
- 📝 Blog section
- 🎯 Service listings

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clean install (if you encounter build errors):**
```bash
# Remove existing node_modules and lock file
rm -rf node_modules package-lock.json

# For Windows PowerShell:
# Remove-Item -Recurse -Force node_modules, package-lock.json
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Troubleshooting

**If you encounter the `undici` module parse error:**

1. Make sure you're using Node.js 18+:
```bash
node --version
```

2. Clean install dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

3. If the issue persists, try using a different Node.js version (18.x or 20.x LTS recommended)

4. Clear Next.js cache:
```bash
rm -rf .next
npm run dev
```

**If you see "Missing or insufficient permissions" Firebase error:**

This is a Firestore security rules issue. The app will still work, but you won't see Firebase data. To fix:

1. See `FIREBASE_SETUP.md` for detailed instructions
2. Or update Firestore rules in Firebase Console to allow public read access (development only)

**If you see a 404 error for the logo image:**

1. Run the asset copy script:
   ```bash
   npm run copy-assets
   ```

2. Or manually copy the logo:
   ```bash
   # Create the directory
   mkdir -p public/LOGO
   
   # Copy the logo file (adjust path as needed)
   cp "../maian and pro/public/LOGO/d__1_-removebg-preview.png" public/LOGO/
   ```

3. The app will automatically show "DECZON" text as a fallback if the image is missing

## Project Structure

```
nextjs-deczon/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── components/
│   ├── Header.tsx          # Header component
│   ├── BannerSection.tsx   # Banner carousel
│   ├── ProductsSection.tsx # Product listings
│   ├── PromoSection.tsx    # Promotional deals
│   ├── ServicesSection.tsx # Services section
│   ├── BlogSection.tsx     # Blog posts
│   ├── Footer.tsx          # Footer component
│   └── ProductCard.tsx     # Product card component
├── lib/
│   └── firebase.ts         # Firebase configuration
└── public/                 # Static assets
```

## Firebase Configuration

The app uses Firebase for:
- Authentication
- Firestore database (products, categories, blogs, banners)
- Storage (images)

Firebase configuration is in `lib/firebase.ts`. Make sure your Firebase project is set up with the same structure as the original application.

## Key Features Implemented

1. **Header**: Search, location selector, cart, user account
2. **Banner Section**: Dynamic banners from Firebase
3. **Product Sections**: Category-based product listings
4. **Promo Section**: Deals and offers
5. **Services Section**: Professional services
6. **Blog Section**: Latest blog posts
7. **Footer**: Links and information

## Building for Production

```bash
npm run build
npm start
```

## Notes

- The application maintains the same UI/UX as the original HTML version
- All Firebase integrations are preserved
- CSS has been converted to CSS modules for better component isolation
- TypeScript is used for type safety
- The app uses Next.js 14 App Router

## License

Same as the original DECZON project.

