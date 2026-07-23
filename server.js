const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
require('dotenv').config();

const { db, initialize: initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'village_wisdom_default_secret_key';

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure dummy placeholder image exists
const placeholderPath = path.join(__dirname, 'public', 'placeholder_neem.jpg');
// We will create the public folder and subfolders when writing frontend, 
// but let's make sure our file upload folders are set up.

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
// Serve static uploads
app.use('/uploads', express.static(uploadDir));

// Authentication Middleware
function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
}

function requireAuth(req, res, next) {
  authenticateToken(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  });
}

function requireAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

// -------------------------------------------------------------
// Auth Routes
// -------------------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, 'user']
    );

    const token = jwt.sign({ id: result.insertId, username, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.status(201).json({ message: 'User registered successfully', user: { username, role: 'user' } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.json({ message: 'Logged in successfully', user: { username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  if (!req.user) {
    return res.json({ loggedIn: false });
  }
  res.json({ loggedIn: true, user: req.user });
});

// -------------------------------------------------------------
// Category Routes
// -------------------------------------------------------------
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.query('SELECT * FROM categories');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Knowledge Submission Routes
// -------------------------------------------------------------
app.post('/api/submissions', authenticateToken, upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, description, category_id, village, contributor_name, language } = req.body;

    if (!title || !description || !category_id || !village || !contributor_name) {
      return res.status(400).json({ error: 'Title, description, category, village, and contributor name are required.' });
    }

    const photo_url = req.files['photo'] ? `/uploads/${req.files['photo'][0].filename}` : null;
    const audio_url = req.files['audio'] ? `/uploads/${req.files['audio'][0].filename}` : null;
    const video_url = req.files['video'] ? `/uploads/${req.files['video'][0].filename}` : null;

    const user_id = req.user ? req.user.id : null;
    // Auto-approve if submission is by admin, otherwise needs moderation (is_approved = 0)
    const is_approved = (req.user && req.user.role === 'admin') ? 1 : 0;

    const result = await db.run(
      `INSERT INTO submissions (title, description, category_id, photo_url, audio_url, video_url, village, contributor_name, language, user_id, is_approved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, parseInt(category_id), photo_url, audio_url, video_url, village, contributor_name, language || 'en', user_id, is_approved]
    );

    res.status(201).json({
      message: is_approved ? 'Submission approved and published!' : 'Submission received and is pending admin approval.',
      submissionId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch submissions with search & filter
app.get('/api/submissions', authenticateToken, async (req, res) => {
  try {
    const { category, village, language, search, pending } = req.query;

    let sql = 'SELECT s.*, c.name_en as category_name FROM submissions s JOIN categories c ON s.category_id = c.id WHERE 1=1';
    const params = [];

    // Filter pending submissions (admin only)
    if (pending === 'true') {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required to view pending submissions.' });
      }
      sql += ' AND s.is_approved = 0';
    } else {
      sql += ' AND s.is_approved = 1';
    }

    if (category) {
      sql += ' AND s.category_id = ?';
      params.push(parseInt(category));
    }

    if (village) {
      sql += ' AND LOWER(s.village) LIKE ?';
      params.push(`%${village.toLowerCase()}%`);
    }

    if (language) {
      sql += ' AND s.language = ?';
      params.push(language);
    }

    if (search) {
      sql += ' AND (LOWER(s.title) LIKE ? OR LOWER(s.description) LIKE ? OR LOWER(s.contributor_name) LIKE ?)';
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY s.created_at DESC';

    const submissions = await db.query(sql, params);
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/submissions/:id', async (req, res) => {
  try {
    const submission = await db.get(
      'SELECT s.*, c.name_en as category_name FROM submissions s JOIN categories c ON s.category_id = c.id WHERE s.id = ?',
      [parseInt(req.params.id)]
    );

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Elder Voice Archive - filter submissions that have audio
app.get('/api/archive', async (req, res) => {
  try {
    const archive = await db.query(
      'SELECT s.*, c.name_en as category_name FROM submissions s JOIN categories c ON s.category_id = c.id WHERE s.is_approved = 1 AND s.audio_url IS NOT NULL AND s.audio_url != "" ORDER BY s.created_at DESC'
    );
    res.json(archive);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Comment Routes
// -------------------------------------------------------------
app.get('/api/submissions/:id/comments', async (req, res) => {
  try {
    const comments = await db.query(
      'SELECT * FROM comments WHERE submission_id = ? ORDER BY created_at DESC',
      [parseInt(req.params.id)]
    );
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/submissions/:id/comments', async (req, res) => {
  try {
    const { user_name, comment_text } = req.body;
    if (!user_name || !comment_text) {
      return res.status(400).json({ error: 'Name and comment text are required' });
    }

    const result = await db.run(
      'INSERT INTO comments (submission_id, user_name, comment_text) VALUES (?, ?, ?)',
      [parseInt(req.params.id), user_name, comment_text]
    );

    const newComment = {
      id: result.insertId,
      submission_id: parseInt(req.params.id),
      user_name,
      comment_text,
      created_at: new Date()
    };

    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Interactive Map Routes
// -------------------------------------------------------------
app.get('/api/landmarks', async (req, res) => {
  try {
    const landmarks = await db.query('SELECT * FROM map_landmarks');
    res.json(landmarks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/landmarks', async (req, res) => {
  try {
    const { title, description, type, latitude, longitude, contributor_name } = req.body;

    if (!title || !type || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Title, type, latitude, and longitude are required' });
    }

    const result = await db.run(
      'INSERT INTO map_landmarks (title, description, type, latitude, longitude, contributor_name) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description || '', type, parseFloat(latitude), parseFloat(longitude), contributor_name || 'Anonymous']
    );

    res.status(201).json({
      message: 'Landmark added successfully',
      landmarkId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Admin Moderation Routes
// -------------------------------------------------------------
app.post('/api/admin/submissions/:id/approve', requireAdmin, async (req, res) => {
  try {
    await db.run('UPDATE submissions SET is_approved = 1 WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'Submission approved successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/submissions/:id', requireAdmin, async (req, res) => {
  try {
    // Delete files if they exist
    const sub = await db.get('SELECT photo_url, audio_url, video_url FROM submissions WHERE id = ?', [parseInt(req.params.id)]);
    if (sub) {
      const paths = [sub.photo_url, sub.audio_url, sub.video_url];
      paths.forEach(p => {
        if (p) {
          const filePath = path.join(__dirname, p);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              console.error('Failed to delete file:', filePath, err.message);
            }
          }
        }
      });
    }

    await db.run('DELETE FROM submissions WHERE id = ?', [parseInt(req.params.id)]);
    await db.run('DELETE FROM comments WHERE submission_id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'Submission deleted successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/comments/:id', requireAdmin, async (req, res) => {
  try {
    await db.run('DELETE FROM comments WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'Comment deleted successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback: serve index.html for unknown SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

start();
