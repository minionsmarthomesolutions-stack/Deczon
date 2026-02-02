const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account-key.json');
const STORAGE_BUCKET = 'deczon-faa54.firebasestorage.app';

const COLLECTIONS_TO_MIGRATE = [
    "amount-acknowledge", "approvals", "attendance", "banners", "bills", "blogs", "boq", "brands",
    "cart", "categories", "categoryAssignments", "categoryBanners", "configuredUnits", "counters",
    "customers", "events", "expenses", "groups", "holidays", "items", "labour", "labourAttendance",
    "labourDetails", "labourRoles", "leadCategories", "leadCounters", "leadorder", "leads",
    "managementTeams", "materialVendors", "measurements", "messages", "mileage", "notifications",
    "orders", "payments", "photos", "presence", "productCounters", "productGroups", "products",
    "project-expenses", "project-tasks", "projectCounters", "projectGroups", "projects",
    "purchaseOrders", "quoteTerms", "quotes", "services", "settings", "siteVisitNotifications",
    "siteVisits", "sitesuoervising", "sitevisitupdate", "staff", "staff_attendance_archive",
    "subContractors", "task", "taskLists", "tasks", "teamAssignments", "users",
    "vendorCredits", "warranties", "wishlist"
];

// ==========================================
// SETUP
// ==========================================

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`\n❌ ERROR: Service account key not found at: ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
}

const serviceAccount = require(path.resolve(SERVICE_ACCOUNT_PATH));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: STORAGE_BUCKET
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function extractFilePathFromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const regex = /\/b\/[^/]+\/o\/([^?#]+)/;
    const match = url.match(regex);
    if (!match || !match[1]) return null;
    return decodeURIComponent(match[1]);
}

/**
 * Generates a new long-lived signed URL for a file path.
 * Checks if the file exists first.
 */
async function generateNewSignedUrl(filePath) {
    try {
        const file = bucket.file(filePath);
        const [exists] = await file.exists();
        if (!exists) {
            // Uncomment to debug missing files
            console.warn(`      ⚠️ File missing in new bucket: ${filePath}`);
            return null;
        }

        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '01-01-2100' // Valid until 2100
        });
        return url;
    } catch (error) {
        console.error(`      ❌ Error generating URL: ${error.message}`);
        return null;
    }
}

/**
 * Recursively traverses an object/array to find and update any Firebase URL.
 * Returns true if any change was made within the object.
 */
async function deepUpdate(obj) {
    let changed = false;

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            const item = obj[i];
            if (typeof item === 'string' && item.includes('firebasestorage')) {
                const filePath = extractFilePathFromUrl(item);
                if (filePath) {
                    const newUrl = await generateNewSignedUrl(filePath);
                    if (newUrl && newUrl !== item) {
                        obj[i] = newUrl;
                        changed = true;
                        process.stdout.write('.'); // Progress dot
                    }
                }
            } else if (typeof item === 'object' && item !== null) {
                // Recursively checking nested objects/arrays
                const nestedChanged = await deepUpdate(item);
                if (nestedChanged) changed = true;
            }
        }
    } else if (typeof obj === 'object' && obj !== null) {
        // Check if it's a Firestore Timestamp or GeoPoint (skip them)
        if (obj.constructor && (obj.constructor.name === 'Timestamp' || obj.constructor.name === 'GeoPoint')) {
            return false;
        }

        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (typeof val === 'string' && val.includes('firebasestorage')) {
                const filePath = extractFilePathFromUrl(val);
                if (filePath) {
                    const newUrl = await generateNewSignedUrl(filePath);
                    if (newUrl && newUrl !== val) {
                        obj[key] = newUrl;
                        changed = true;
                        process.stdout.write('+'); // Progress plus
                    }
                }
            } else if (typeof val === 'object' && val !== null) {
                // Recursively checking nested objects
                const nestedChanged = await deepUpdate(val);
                if (nestedChanged) changed = true;
            }
        }
    }

    return changed;
}

// ==========================================
// MAIN EXECUTION
// ==========================================

async function runMigration() {
    console.log('🚀 Starting DEEP RECURSIVE Firebase URL Migration (All Collections)...');
    console.log(`🎯 Bucket: ${STORAGE_BUCKET}`);
    console.log('Legend: (.) = Array Item Updated, (+) = Field Updated\n');

    let totalDocsUpdated = 0;

    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
        console.log(`\n📂 Scanning Collection: ${collectionName}...`);

        try {
            const snapshot = await db.collection(collectionName).get();

            if (snapshot.empty) {
                console.log('   No documents found.');
                continue;
            }

            console.log(`   Found ${snapshot.size} documents.`);

            for (const doc of snapshot.docs) {
                const data = doc.data();

                // Scan specifically this document
                const wasChanged = await deepUpdate(data);

                if (wasChanged) {
                    await doc.ref.set(data); // Use set() to overwrite with completely updated deeply-nested structure
                    console.log(`\n   💾 Updated Doc: ${doc.id}`);
                    totalDocsUpdated++;
                }
            }

        } catch (error) {
            console.error(`❌ Error scanning ${collectionName}:`, error);
        }
    }

    console.log(`\n\n✨ Migration Complete! Documents updated: ${totalDocsUpdated}`);
    process.exit(0);
}

runMigration();
