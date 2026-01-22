#!/usr/bin/env node

/**
 * Helper script to copy assets from the original project
 * Run: node copy-assets.js
 */

const fs = require('fs');
const path = require('path');

const originalProjectPath = path.join(__dirname, '..', 'maian and pro', 'public');
const targetPath = path.join(__dirname, 'public');

// Assets to copy
const assetsToCopy = [
  {
    from: 'LOGO/d__1_-removebg-preview.png',
    to: 'LOGO/d__1_-removebg-preview.png',
    description: 'DECZON Logo'
  },
  {
    from: 'LOGO/favicon.ico',
    to: 'LOGO/favicon.ico',
    description: 'Favicon',
    optional: true
  }
];

console.log('📦 Copying assets from original project...\n');

let copied = 0;
let skipped = 0;
let errors = 0;

assetsToCopy.forEach(asset => {
  const sourcePath = path.join(originalProjectPath, asset.from);
  const targetDir = path.join(targetPath, path.dirname(asset.to));
  const targetFilePath = path.join(targetPath, asset.to);

  try {
    // Check if source exists
    if (!fs.existsSync(sourcePath)) {
      if (asset.optional) {
        console.log(`⏭️  Skipped (optional): ${asset.description}`);
        skipped++;
        return;
      } else {
        console.log(`❌ Missing: ${asset.description} (${asset.from})`);
        errors++;
        return;
      }
    }

    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copy file
    fs.copyFileSync(sourcePath, targetFilePath);
    console.log(`✅ Copied: ${asset.description}`);
    copied++;
  } catch (error) {
    console.error(`❌ Error copying ${asset.description}:`, error.message);
    errors++;
  }
});

console.log(`\n📊 Summary: ${copied} copied, ${skipped} skipped, ${errors} errors`);

if (errors === 0) {
  console.log('\n✨ Assets copied successfully!');
} else {
  console.log('\n⚠️  Some assets could not be copied. The app will use fallbacks.');
}

