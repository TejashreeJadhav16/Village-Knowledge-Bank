# Village Knowledge Bank (ग्राम ज्ञान कोष)

Preserving and sharing traditional village knowledge, culture, and wisdom from elderly people and local communities.

This project is a modern, responsive web application built using **HTML, CSS, JavaScript, Bootstrap 5, Node.js, Express.js**, and supports both **MySQL and SQLite** databases.

---

## 🌟 Key Features

1. **Earthy & Animated Visual Design**
   - Theme inspired by traditional Indian villages, nature, and heritage colors (Terracotta, Saffron Gold, Leaf Green, and warm Sand/Cream background).
   - Glassmorphic card layouts, responsive grids, and high-quality visuals.
   - Smooth slide-and-fade page transitions, liquid hover effects, and sliding active-state navbar underlines.

2. **Elder Voice Archive (Oral Histories)**
   - Browser-based microphone utility using the HTML5 `MediaRecorder` API.
   - Allows elderly village community members to record their folklore, songs, and experiences directly in their local language.
   - Live preview player and dynamic file uploading.

3. **Interactive Village Map**
   - Built on **Leaflet.js** using OpenStreetMap.
   - Interactive pin-dropping: click anywhere on the map to automatically capture coordinates.
   - Plot landmarks such as temples, stepwells, organic farms, historical trees, and monuments.

4. **Multi-language Support (Locales)**
   - Complete localized support for **English**, **Hindi (हिन्दी)**, and **Marathi (मराठी)**.
   - Real-time client-side translation using structured dynamic dictionaries (`public/js/translations.js`).

5. **Flexible Multi-mode Database (MySQL + SQLite)**
   - Abstraction layer (`db.js`) designed to read environment variables from a `.env` file.
   - Connects to your **MySQL** instance, or automatically falls back to **SQLite** (`database.sqlite`) if MySQL is not available.
   - Automatically migrates database tables and seeds sample data on boot.

6. **Admin Moderation Panel**
   - JWT secure cookie-based session authentication (`jsonwebtoken`, `cookie-parser`).
   - Moderation queue for review: administrators can inspect pending submissions, approve them to publish, or reject/delete them.

7. **Herbal Remedy Medical Disclaimer**
   - Integrated warning card on all herbal recipes reminding users that the data is for educational/cultural documentation and does not substitute professional medical advice.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, Leaflet.js
- **Backend**: Node.js, Express.js
- **Database**: MySQL (Primary) / SQLite (Fallback)
- **File Uploads**: Multer (Multipart forms for images, audio, video)

---

## 🚀 Setup & Execution

### 1. Prerequisite Checks
Make sure you have **Node.js** (v18+) and **npm** installed on your system.

### 2. Configure Environment (`.env`)
The application is pre-configured with default values. You can review the `.env` file in the root directory:
```env
PORT=3000
JWT_SECRET=village_wisdom_secret_key_change_me
DB_MODE=sqlite
DB_SQLITE_PATH=./database.sqlite

# Optional: To switch to MySQL, change DB_MODE=mysql and configure:
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=your_mysql_password
# DB_NAME=village_knowledge_bank
```

### 3. Start the Server
Run the startup script in your terminal:
```bash
npm start
```
The server will start, initialize the database files, and output:
```text
Connected to SQLite database at: .../database.sqlite
Server is running at http://localhost:3000
```

### 4. Exploring the Site
- Navigate to **[http://localhost:3000](http://localhost:3000)** in your browser.
- **Login Credentials** (Pre-seeded Administrator):
  - **Username**: `admin`
  - **Password**: `admin123`
- Use the **Admin Panel** link in the navbar to moderate submissions.

---

## 📂 Project Structure

```text
├── .env                  # Configuration variables
├── db.js                 # Database wrapper (MySQL / SQLite fallback)
├── package.json          # Dependencies & startup scripts
├── server.js             # Express API endpoints & middleware
├── verify.js             # Automated test script
├── database.sqlite       # SQLite database file (created on start)
├── uploads/              # Directory for uploaded media (images/audio/video)
└── public/               # Static web files
    ├── index.html        # Main SPA skeleton
    ├── placeholder_neem.jpg  # Generated visual assets
    ├── css/
    │   └── style.css     # Theme stylesheet & micro-animations
    └── js/
        ├── app.js        # Dynamic views, routers, & form submissions
        ├── map.js        # Leaflet mapping integrations
        ├── recorder.js   # Live audio MediaRecorder wrapper
        └── translations.js # Locale mapping dictionary
```
