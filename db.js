const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let dbClient = null;
let dbType = 'sqlite'; // 'sqlite' or 'mysql'

// SQLite connection and query wrapper
let sqliteDb = null;
function initSqlite() {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.resolve(process.env.DB_SQLITE_PATH || './database.sqlite');
  
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err.message);
    } else {
      console.log('Connected to SQLite database at:', dbPath);
    }
  });
}

function runSqliteQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    // Standardize some MySQL-specific syntax to SQLite syntax if needed
    // e.g. AUTO_INCREMENT -> AUTOINCREMENT (we will write cross-compatible SQL in migrations)
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function runSqliteCommand(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ insertId: this.lastID, changes: this.changes });
    });
  });
}

// MySQL connection and query wrapper
let mysqlPool = null;
async function initMysql() {
  const mysql = require('mysql2/promise');
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'village_knowledge_bank',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  try {
    // First connect without database to create it if it doesn't exist
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\`;`);
    await connection.end();

    // Now create pool with database
    mysqlPool = mysql.createPool(config);
    console.log(`Connected to MySQL database: ${config.database} on ${config.host}`);
    dbType = 'mysql';
  } catch (error) {
    console.warn('MySQL connection failed. Falling back to SQLite. Error:', error.message);
    dbType = 'sqlite';
    initSqlite();
  }
}

// Unified Database API
const db = {
  // Query returns rows (for SELECT)
  async query(sql, params = []) {
    if (dbType === 'mysql') {
      const [rows] = await mysqlPool.query(sql, params);
      return rows;
    } else {
      return runSqliteQuery(sql, params);
    }
  },

  // Get a single row
  async get(sql, params = []) {
    if (dbType === 'mysql') {
      const [rows] = await mysqlPool.query(sql, params);
      return rows[0] || null;
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
    }
  },

  // Run updates/inserts (returns insertId, changes)
  async run(sql, params = []) {
    if (dbType === 'mysql') {
      const [result] = await mysqlPool.query(sql, params);
      return {
        insertId: result.insertId,
        changes: result.affectedRows
      };
    } else {
      return runSqliteCommand(sql, params);
    }
  },

  getType() {
    return dbType;
  }
};

// Initialize database connection
async function initialize() {
  const mode = (process.env.DB_MODE || 'sqlite').toLowerCase();
  if (mode === 'mysql') {
    await initMysql();
  } else {
    initSqlite();
  }

  // Create tables and seed data
  await createTables();
  await seedData();
}

async function createTables() {
  const isMySQL = dbType === 'mysql';
  const autoIncrement = isMySQL ? 'AUTO_INCREMENT' : 'AUTOINCREMENT';
  const primaryKey = isMySQL ? 'INT PRIMARY KEY AUTO_INCREMENT' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const textType = isMySQL ? 'LONGTEXT' : 'TEXT';
  const blobType = isMySQL ? 'BLOB' : 'TEXT';

  // Users Table
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id ${primaryKey},
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories Table
  await db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id ${primaryKey},
      name_en VARCHAR(255) NOT NULL,
      name_hi VARCHAR(255) NOT NULL,
      name_mr VARCHAR(255) NOT NULL,
      icon VARCHAR(100) NOT NULL
    )
  `);

  // Submissions Table
  await db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id ${primaryKey},
      title VARCHAR(255) NOT NULL,
      description ${textType} NOT NULL,
      category_id INT NOT NULL,
      photo_url VARCHAR(500),
      audio_url VARCHAR(500),
      video_url VARCHAR(500),
      village VARCHAR(255) NOT NULL,
      contributor_name VARCHAR(255) NOT NULL,
      language VARCHAR(50) DEFAULT 'en',
      user_id INT,
      is_approved INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Map Landmarks Table
  await db.run(`
    CREATE TABLE IF NOT EXISTS map_landmarks (
      id ${primaryKey},
      title VARCHAR(255) NOT NULL,
      description ${textType},
      type VARCHAR(100) NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      contributor_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Comments Table
  await db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id ${primaryKey},
      submission_id INT NOT NULL,
      user_name VARCHAR(255) NOT NULL,
      comment_text ${textType} NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function seedData() {
  // Check if categories are already seeded
  const categoryCount = await db.get('SELECT COUNT(*) as count FROM categories');
  if (categoryCount.count === 0) {
    const defaultCategories = [
      { en: 'Traditional Farming Methods', hi: 'पारंपरिक खेती के तरीके', mr: 'पारंपारिक शेती पद्धती', icon: 'bi-tree' },
      { en: 'Herbal Remedies', hi: 'पारंपरिक जड़ी-बूटियाँ', mr: 'औषधीय वनस्पती आणि घरगुती उपाय', icon: 'bi-heart-pulse' },
      { en: 'Local History', hi: 'स्थानीय इतिहास', mr: 'स्थानिक इतिहास', icon: 'bi-journal-bookmark' },
      { en: 'Folk Stories and Songs', hi: 'लोक कथाएँ और गीत', mr: 'लोककथा आणि लोकगीते', icon: 'bi-music-note-beamed' },
      { en: 'Handicrafts and Skills', hi: 'हस्तशिल्प और कौशल', mr: 'हस्तकला आणि कौशल्ये', icon: 'bi-palette' },
      { en: 'Traditional Recipes', hi: 'पारंपरिक व्यंजन', mr: 'पारंपारिक पाककृती', icon: 'bi-egg-fried' },
      { en: 'Festivals and Customs', hi: 'त्योहार और रीति-रिवाज', mr: 'सण आणि प्रथा', icon: 'bi-calendar-event' },
      { en: 'Water Conservation Methods', hi: 'जल संरक्षण विधियाँ', mr: 'जलसंधारण पद्धती', icon: 'bi-droplet' },
      { en: 'Animal Care Practices', hi: 'पशु देखभाल प्रथाएं', mr: 'प्राण्यांची काळजी घेण्याच्या पद्धती', icon: 'bi-shield-heart' }
    ];

    for (const cat of defaultCategories) {
      await db.run(
        'INSERT INTO categories (name_en, name_hi, name_mr, icon) VALUES (?, ?, ?, ?)',
        [cat.en, cat.hi, cat.mr, cat.icon]
      );
    }
    console.log('Seeded default categories.');
  }

  // Check if admin user is already seeded
  const adminExists = await db.get("SELECT * FROM users WHERE role = 'admin'");
  if (!adminExists) {
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('admin123', salt);
    await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['admin', adminPasswordHash, 'admin']
    );
    console.log('Seeded default admin user (username: admin, password: admin123)');
  }

  // Check if submissions are seeded
  const submissionCount = await db.get('SELECT COUNT(*) as count FROM submissions');
  if (submissionCount.count === 0) {
    const sampleSubmissions = [
      {
        title: 'Vedic Organic Pesticide (Neemastra)',
        description: 'Neemastra is an organic insecticide prepared from neem leaves, cow urine, and cow dung. It is highly effective against sucking pests, mealybugs, and whiteflies. Preparation: Take 100 liters of water, add 5 liters of cow urine, 2 kg of cow dung, and 5 kg of crushed neem leaves. Stir it well and let it ferment for 48 hours in shade. Mix twice daily. Strain and spray on crops.',
        category_id: 1, // Traditional Farming Methods
        photo_url: '/placeholder_neem.jpg',
        audio_url: '',
        video_url: '',
        village: 'Ralegan Siddhi',
        contributor_name: 'Babasaheb Patankar',
        language: 'mr',
        is_approved: 1
      },
      {
        title: 'Turmeric and Tulsi for Seasonal Cold',
        description: 'For seasonal coughs, colds, and mild fever, a traditional brew of Fresh Tulsi leaves, Turmeric, Ginger, and Black Pepper is extremely effective. Recipe: Boil 10-12 leaves of Tulsi, a slice of fresh ginger, half a teaspoon of organic turmeric powder, and 3 crushed black pepper seeds in 2 cups of water. Reduce it to half. Add a spoonful of honey after it cools down to warm. Drink twice a day. DISCLAIMER: This information is preserved for cultural and educational purposes and is not professional medical advice.',
        category_id: 2, // Herbal Remedies
        photo_url: '',
        audio_url: '',
        video_url: '',
        village: 'Kondanpur',
        contributor_name: 'Kamla Bai',
        language: 'hi',
        is_approved: 1
      },
      {
        title: 'Clay Pot Cooling Chamber (Janata Fridge)',
        description: 'A traditional double-walled clay container design used to preserve vegetables without electricity. A larger clay pot is placed over a smaller clay pot, and the gap between them is filled with wet sand. Evaporative cooling keeps the inner chamber 5-10 degrees cooler than the outside temperature. This keeps green vegetables fresh for 4-5 days.',
        category_id: 5, // Handicrafts and Skills
        photo_url: '',
        audio_url: '',
        video_url: '',
        village: 'Hivre Bazar',
        contributor_name: 'Ramesh Shinde',
        language: 'en',
        is_approved: 1
      }
    ];

    for (const sub of sampleSubmissions) {
      await db.run(
        `INSERT INTO submissions (title, description, category_id, photo_url, audio_url, video_url, village, contributor_name, language, is_approved)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sub.title, sub.description, sub.category_id, sub.photo_url, sub.audio_url, sub.video_url, sub.village, sub.contributor_name, sub.language, sub.is_approved]
      );
    }

    // Seed some comments for sample submissions
    await db.run(
      'INSERT INTO comments (submission_id, user_name, comment_text) VALUES (?, ?, ?)',
      [1, 'Shubham Patil', 'I tried this in my cotton field and saw a major reduction in whiteflies. Thanks for sharing!']
    );
    await db.run(
      'INSERT INTO comments (submission_id, user_name, comment_text) VALUES (?, ?, ?)',
      [2, 'Anita Deshmukh', 'This is exactly how my grandmother used to treat our winter coughs. Very effective!']
    );

    // Seed some map landmarks
    const landmarks = [
      { title: 'Ancient Stepwell (Barav)', description: 'A 400-year-old rainwater harvesting stepwell. Restored in 2021 by the villagers to store up to 50,000 liters of monsoon runoff.', type: 'well', latitude: 18.5204, longitude: 73.8567, contributor: 'Gram Panchayat' },
      { title: 'Community Sacred Grove (Devrai)', description: 'A protected forest patch dedicated to the local deity where tree cutting is strictly prohibited. Home to diverse medicinal herbs.', type: 'historical', latitude: 18.5240, longitude: 73.8610, contributor: 'Elders Committee' },
      { title: 'Panchayat Organic Model Farm', description: 'Demonstration site for multi-cropping, composting, and seed-saving methods.', type: 'farm', latitude: 18.5150, longitude: 73.8500, contributor: 'Krishi Vikas' }
    ];

    for (const lm of landmarks) {
      await db.run(
        'INSERT INTO map_landmarks (title, description, type, latitude, longitude, contributor_name) VALUES (?, ?, ?, ?, ?, ?)',
        [lm.title, lm.description, lm.type, lm.latitude, lm.longitude, lm.contributor]
      );
    }

    console.log('Seeded sample submissions, comments, and map landmarks.');
  }
}

module.exports = {
  db,
  initialize
};
