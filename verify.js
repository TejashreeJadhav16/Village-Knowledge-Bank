const fs = require('fs');
const path = require('path');
const { initialize, db } = require('./db');

async function test() {
  console.log('--- STARTING VILLAGE KNOWLEDGE BANK VERIFICATION ---');

  // 1. File existence checks
  const requiredFiles = [
    'package.json',
    '.env',
    'server.js',
    'db.js',
    'public/index.html',
    'public/css/style.css',
    'public/js/translations.js',
    'public/js/recorder.js',
    'public/js/map.js',
    'public/js/app.js',
    'public/placeholder_neem.jpg'
  ];

  let missingFiles = 0;
  for (const f of requiredFiles) {
    const fullPath = path.join(__dirname, f);
    if (fs.existsSync(fullPath)) {
      console.log(`[PASS] File exists: ${f}`);
    } else {
      console.error(`[FAIL] File missing: ${f}`);
      missingFiles++;
    }
  }

  if (missingFiles > 0) {
    console.error(`Verification FAILED: ${missingFiles} files missing.`);
    process.exit(1);
  }

  // 2. Database initialization & seeding checks
  try {
    console.log('Initializing database connection...');
    await initialize();
    console.log(`[PASS] Database successfully initialized using mode: ${db.getType()}`);

    // Verify categories count
    const categoriesCount = await db.get('SELECT COUNT(*) as count FROM categories');
    console.log(`[PASS] Seeded Categories Count: ${categoriesCount.count}`);
    if (categoriesCount.count < 9) {
      throw new Error(`Expected at least 9 categories, found ${categoriesCount.count}`);
    }

    // Verify submissions count
    const submissionsCount = await db.get('SELECT COUNT(*) as count FROM submissions');
    console.log(`[PASS] Seeded Submissions Count: ${submissionsCount.count}`);
    if (submissionsCount.count === 0) {
      throw new Error('No submissions found after seeding.');
    }

    // Verify default admin
    const adminUser = await db.get("SELECT * FROM users WHERE username = 'admin' AND role = 'admin'");
    if (adminUser) {
      console.log('[PASS] Default admin user verified.');
    } else {
      throw new Error('Default admin user missing.');
    }

    // Verify map landmarks
    const landmarksCount = await db.get('SELECT COUNT(*) as count FROM map_landmarks');
    console.log(`[PASS] Seeded Map Landmarks Count: ${landmarksCount.count}`);

  } catch (error) {
    console.error('[FAIL] Database verification failed:', error.message);
    process.exit(1);
  }

  console.log('--- ALL AUTOMATED BACKEND VERIFICATION CHECKS PASSED ---');
  process.exit(0);
}

test();
