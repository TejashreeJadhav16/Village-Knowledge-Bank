// State Management
let currentLanguage = localStorage.getItem('village_lang') || 'en';
let currentUser = null;
let activePage = 'home';
let categories = [];
let selectedMapCoords = null;

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  // Set default language selector
  document.getElementById('lang-select').value = currentLanguage;
  
  // Load font size preference
  const savedFontSize = localStorage.getItem('village_font_size') || 'normal';
  setFontSize(savedFontSize);

  // Load categories
  await fetchCategories();
  
  // Check auth status
  await checkAuth();

  // Route initial page
  const hash = window.location.hash.replace('#', '') || 'home';
  navigate(hash);

  // Listen for hash changes
  window.addEventListener('hashchange', () => {
    const page = window.location.hash.replace('#', '') || 'home';
    navigate(page);
  });
});

// Font size utility
function setFontSize(size) {
  if (size === 'large') {
    document.body.classList.add('large-font');
    document.getElementById('font-large').classList.add('active');
    document.getElementById('font-normal').classList.remove('active');
  } else {
    document.body.classList.remove('large-font');
    document.getElementById('font-large').classList.remove('active');
    document.getElementById('font-normal').classList.add('active');
  }
  localStorage.setItem('village_font_size', size);
}

// Translations logic
function changeLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('village_lang', lang);
  applyTranslations();
  
  // Refresh content on the active page to update categories or titles
  renderActivePage();
}

function applyTranslations() {
  const t = translations[currentLanguage];
  if (!t) return;

  // Translate all text elements with data-trans attribute
  document.querySelectorAll('[data-trans]').forEach(el => {
    const key = el.getAttribute('data-trans');
    if (t[key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.setAttribute('placeholder', t[key]);
      } else {
        el.textContent = t[key];
      }
    }
  });

  // Highlight active link in navbar
  document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  const activeLink = document.getElementById(`nav-${activePage}`);
  if (activeLink) activeLink.classList.add('active');
}

function getCurrentTranslation(key) {
  const t = translations[currentLanguage];
  return (t && t[key]) ? t[key] : key;
}

// Auth APIs
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.loggedIn) {
      currentUser = data.user;
      document.getElementById('user-greeting').textContent = `(${currentUser.username})`;
      document.getElementById('user-greeting').classList.remove('d-none');
      document.getElementById('login-nav-item').classList.add('d-none');
      document.getElementById('logout-nav-item').classList.remove('d-none');

      // Admin panel link visibility
      if (currentUser.role === 'admin') {
        document.getElementById('admin-nav-item').classList.remove('d-none');
      } else {
        document.getElementById('admin-nav-item').classList.add('d-none');
      }
    } else {
      currentUser = null;
      document.getElementById('user-greeting').classList.add('d-none');
      document.getElementById('login-nav-item').classList.remove('d-none');
      document.getElementById('logout-nav-item').classList.add('d-none');
      document.getElementById('admin-nav-item').classList.add('d-none');
    }
  } catch (err) {
    console.error('Error checking auth:', err);
  }
}

async function handleLogout() {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) {
      showToast('Logged out successfully', 'success');
      await checkAuth();
      navigate('home');
    }
  } catch (err) {
    showToast('Failed to logout', 'danger');
  }
}

// Fetch categories
async function fetchCategories() {
  try {
    const res = await fetch('/api/categories');
    if (res.ok) {
      categories = await res.json();
    }
  } catch (err) {
    console.error('Error fetching categories:', err);
  }
}

// Helper to translate category names dynamically
function getCategoryName(category) {
  if (!category) return '';
  if (currentLanguage === 'hi') return category.name_hi;
  if (currentLanguage === 'mr') return category.name_mr;
  return category.name_en;
}

// Router
function navigate(page) {
  if (window.location.hash.replace('#', '') !== page) {
    window.location.hash = page;
  } else {
    activePage = page;
    renderActivePage();
  }
}

function renderActivePage() {
  const root = document.getElementById('app-root');
  
  // Trigger CSS fade-in transition on page change
  root.classList.remove('animate-fade-in');
  void root.offsetWidth; // Force reflow
  root.classList.add('animate-fade-in');
  
  // Highlight active link in nav
  document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  const activeLink = document.getElementById(`nav-${activePage}`);
  if (activeLink) activeLink.classList.add('active');

  // Check custom route parameters
  if (activePage.startsWith('details-')) {
    const id = activePage.split('-')[1];
    renderDetailsPage(id);
    return;
  }

  switch (activePage) {
    case 'home':
      renderHomePage();
      break;
    case 'archive':
      renderArchivePage();
      break;
    case 'map':
      renderMapPage();
      break;
    case 'submit':
      renderSubmitPage();
      break;
    case 'admin':
      if (!currentUser || currentUser.role !== 'admin') {
        navigate('home');
      } else {
        renderAdminPage();
      }
      break;
    case 'login':
      renderLoginPage();
      break;
    case 'register':
      renderRegisterPage();
      break;
    default:
      renderHomePage();
  }
  
  applyTranslations();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('notification-container');
  const toastId = 'toast-' + Date.now();
  const alertClass = `alert-${type}`;
  
  const toastHtml = `
    <div id="${toastId}" class="alert ${alertClass} alert-dismissible fade show shadow-sm" role="alert" style="min-width: 250px;">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', toastHtml);
  
  // Auto dismiss after 4 seconds
  setTimeout(() => {
    const el = document.getElementById(toastId);
    if (el) {
      const bsAlert = new bootstrap.Alert(el);
      bsAlert.close();
    }
  }, 4000);
}

// -------------------------------------------------------------
// Home Page
// -------------------------------------------------------------
function renderHomePage() {
  const root = document.getElementById('app-root');
  
  // Render structure
  root.innerHTML = `
    <!-- Hero Section -->
    <section class="hero-section text-center text-md-start">
      <div class="container">
        <div class="row align-items-center g-5">
          <div class="col-lg-7">
            <h1 class="hero-title fw-bold" data-trans="heroTitle">Preserving Village Wisdom for Future Generations</h1>
            <p class="hero-lead mb-4" data-trans="heroSub">A digital repository of traditional farming, ancient medicine, folk songs, local histories, and local heritage shared by elders and community members.</p>
            <div class="d-flex flex-wrap gap-3">
              <button class="btn btn-heritage-primary btn-lg" onclick="navigate('submit')" data-trans="heroCtaShare">Share Your Knowledge</button>
              <a href="#knowledge-section" class="btn btn-outline-light btn-lg" data-trans="heroCtaExplore">Explore Wisdom</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Categories Grid -->
    <section class="py-5 bg-white border-bottom">
      <div class="container">
        <div class="text-center mb-5">
          <h2 class="fw-bold" data-trans="categoriesTitle">Browse Categories</h2>
          <p class="text-muted" data-trans="categoriesSub">Discover the rich heritage of traditional practices and stories.</p>
        </div>
        <div class="row g-4 justify-content-center">
          ${categories.map(cat => {
            let catNameTransKey = '';
            if (cat.name_en === 'Traditional Farming Methods') catNameTransKey = 'categoryFarming';
            else if (cat.name_en === 'Herbal Remedies') catNameTransKey = 'categoryHerbal';
            else if (cat.name_en === 'Local History') catNameTransKey = 'categoryHistory';
            else if (cat.name_en === 'Folk Stories and Songs') catNameTransKey = 'categoryFolk';
            else if (cat.name_en === 'Handicrafts and Skills') catNameTransKey = 'categoryHandicrafts';
            else if (cat.name_en === 'Traditional Recipes') catNameTransKey = 'categoryRecipes';
            else if (cat.name_en === 'Festivals and Customs') catNameTransKey = 'categoryFestivals';
            else if (cat.name_en === 'Water Conservation Methods') catNameTransKey = 'categoryWater';
            else if (cat.name_en === 'Animal Care Practices') catNameTransKey = 'categoryAnimal';

            return `
              <div class="col-6 col-md-4 col-lg-3">
                <div class="category-card" onclick="filterByCategoryId(${cat.id})">
                  <div class="category-icon-wrapper">
                    <i class="bi ${cat.icon}"></i>
                  </div>
                  <h5 class="category-title" ${catNameTransKey ? `data-trans="${catNameTransKey}"` : ''}>${getCategoryName(cat)}</h5>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </section>

    <!-- Search, Filters, and Knowledge Listing -->
    <section class="py-5" id="knowledge-section">
      <div class="container">
        <div class="row g-4 mb-5">
          <div class="col-12">
            <div class="card p-4 border-0 shadow-sm" style="background-color: var(--theme-bg-sand);">
              <h4 class="fw-bold mb-4" data-trans="searchTitle">Search and Filter Wisdom</h4>
              <form id="filter-form" onsubmit="handleFilterSubmit(event)" class="row g-3">
                <div class="col-md-3">
                  <select id="filter-cat" class="form-select">
                    <option value="" data-trans="filterCategory">All Categories</option>
                    ${categories.map(cat => `<option value="${cat.id}">${getCategoryName(cat)}</option>`).join('')}
                  </select>
                </div>
                <div class="col-md-3">
                  <input type="text" id="filter-village" class="form-control" data-trans="filterVillage" placeholder="Filter by Village">
                </div>
                <div class="col-md-3">
                  <select id="filter-lang" class="form-select">
                    <option value="" data-trans="filterLanguage">All Languages</option>
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="mr">मराठी (Marathi)</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <div class="input-group">
                    <input type="text" id="search-keyword" class="form-control" data-trans="searchPlaceholder" placeholder="Search...">
                    <button class="btn btn-heritage-primary" type="submit" data-trans="searchBtn">Search</button>
                  </div>
                </div>
                <div class="col-12 text-end">
                  <button type="button" class="btn btn-link text-muted p-0" onclick="clearFilters()" data-trans="clearBtn">Clear Filters</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Submissions Grid -->
        <div class="row g-4" id="submissions-list">
          <div class="col-12 text-center py-5">
            <div class="spinner-border text-success" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  // Fetch and display submissions
  loadSubmissions();
}

async function loadSubmissions(queryParams = {}) {
  const listContainer = document.getElementById('submissions-list');
  if (!listContainer) return;

  try {
    let url = '/api/submissions';
    const params = new URLSearchParams();
    
    Object.keys(queryParams).forEach(key => {
      if (queryParams[key]) {
        params.append(key, queryParams[key]);
      }
    });

    const queryString = params.toString();
    if (queryString) {
      url += '?' + queryString;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load submissions');
    
    const submissions = await res.json();
    
    if (submissions.length === 0) {
      listContainer.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-journal-x fs-1 text-muted"></i>
          <p class="mt-3 text-muted" data-trans="noResults">No approved submissions found matching your criteria.</p>
        </div>
      `;
      applyTranslations();
      return;
    }

    listContainer.innerHTML = submissions.map(sub => {
      // Find category icon
      const cat = categories.find(c => c.id === sub.category_id);
      const catIcon = cat ? cat.icon : 'bi-journal-text';
      const catName = cat ? getCategoryName(cat) : sub.category_name;
      
      const photoSrc = sub.photo_url || 'https://images.unsplash.com/photo-1508873535684-277a3cbcc4e8?q=80&w=600&auto=format&fit=crop';
      
      // Localized labels
      const byLabel = currentLanguage === 'hi' ? 'द्वारा' : (currentLanguage === 'mr' ? 'यांच्याकडून' : 'By');
      const villageLabel = currentLanguage === 'hi' ? 'गाँव' : (currentLanguage === 'mr' ? 'गाव' : 'Village');

      return `
        <div class="col-md-6 col-lg-4">
          <div class="submission-card d-flex flex-column">
            <img src="${photoSrc}" class="submission-img" alt="${sub.title}" onerror="this.src='https://images.unsplash.com/photo-1508873535684-277a3cbcc4e8?q=80&w=600&auto=format&fit=crop'">
            <div class="submission-content d-flex flex-column flex-grow-1">
              <div class="submission-meta">
                <span class="badge-heritage"><i class="bi ${catIcon} me-1"></i>${catName}</span>
                <span class="text-muted"><i class="bi bi-geo-alt me-1"></i>${villageLabel}: ${sub.village}</span>
              </div>
              <h4 class="fw-bold mb-2">${sub.title}</h4>
              <p class="text-muted flex-grow-1 text-truncate-3" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                ${sub.description}
              </p>
              <div class="d-flex align-items-center justify-content-between mt-3 pt-3 border-top">
                <div class="small text-muted">
                  <i class="bi bi-person me-1"></i>${byLabel}: <strong>${sub.contributor_name}</strong>
                </div>
                <button class="btn btn-sm btn-heritage-secondary" onclick="navigate('details-${sub.id}')">
                  <span data-trans="back">Read More</span> <i class="bi bi-arrow-right ms-1"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Quick translation refresh
    applyTranslations();

  } catch (err) {
    console.error('Error fetching submissions:', err);
    listContainer.innerHTML = `
      <div class="col-12 text-center py-5 text-danger">
        <i class="bi bi-exclamation-triangle fs-1"></i>
        <p class="mt-3">Failed to load content. Please check connection.</p>
      </div>
    `;
  }
}

function handleFilterSubmit(e) {
  e.preventDefault();
  const category = document.getElementById('filter-cat').value;
  const village = document.getElementById('filter-village').value;
  const language = document.getElementById('filter-lang').value;
  const search = document.getElementById('search-keyword').value;

  loadSubmissions({ category, village, language, search });
}

function filterByCategoryId(catId) {
  navigate('home');
  // Wait a millisecond to let the HTML render
  setTimeout(() => {
    const catSelect = document.getElementById('filter-cat');
    if (catSelect) {
      catSelect.value = catId;
      loadSubmissions({ category: catId });
    }
  }, 100);
}

function clearFilters() {
  document.getElementById('filter-form').reset();
  loadSubmissions();
}

// -------------------------------------------------------------
// Details Page (Single Submission & Comments)
// -------------------------------------------------------------
async function renderDetailsPage(id) {
  const root = document.getElementById('app-root');
  
  root.innerHTML = `
    <div class="container py-5">
      <div class="mb-4">
        <button class="btn btn-outline-secondary" onclick="navigate('home')">
          <i class="bi bi-arrow-left me-1"></i> <span data-trans="back">Back</span>
        </button>
      </div>
      <div id="details-container">
        <div class="text-center py-5">
          <div class="spinner-border text-success" role="status"></div>
        </div>
      </div>
    </div>
  `;

  applyTranslations();

  try {
    const res = await fetch(`/api/submissions/${id}`);
    if (!res.ok) throw new Error('Submission not found');
    const sub = await res.json();
    
    const cat = categories.find(c => c.id === sub.category_id);
    const catName = cat ? getCategoryName(cat) : sub.category_name;
    const catIcon = cat ? cat.icon : 'bi-journal';
    
    // Check if it's herbal remedy
    const isHerbal = cat && cat.name_en === 'Herbal Remedies';
    
    const photoHtml = sub.photo_url ? `
      <div class="mb-4 text-center">
        <img src="${sub.photo_url}" class="img-fluid rounded shadow-sm" style="max-height: 450px; object-fit: cover;" alt="${sub.title}">
      </div>
    ` : '';

    const audioHtml = sub.audio_url ? `
      <div class="media-container mt-4">
        <h5 class="fw-bold mb-3"><i class="bi bi-mic me-2 text-danger"></i>Listen to Elder's Voice</h5>
        <audio controls class="w-100">
          <source src="${sub.audio_url}" type="audio/webm">
          <source src="${sub.audio_url}" type="audio/ogg">
          <source src="${sub.audio_url}" type="audio/wav">
          Your browser does not support the audio element.
        </audio>
      </div>
    ` : '';

    const videoHtml = sub.video_url ? `
      <div class="media-container mt-4">
        <h5 class="fw-bold mb-3"><i class="bi bi-play-circle me-2 text-success"></i>Watch Demonstration Video</h5>
        <video controls class="w-100 rounded">
          <source src="${sub.video_url}" type="video/mp4">
          Your browser does not support the video element.
        </video>
      </div>
    ` : '';

    const disclaimerHtml = isHerbal ? `
      <div class="disclaimer-alert" role="alert">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        <span data-trans="herbDisclaimer">${translations[currentLanguage].herbDisclaimer}</span>
      </div>
    ` : '';

    const detailsContainer = document.getElementById('details-container');
    detailsContainer.innerHTML = `
      <div class="row g-5">
        <div class="col-lg-8">
          <div class="card border-0 shadow-sm p-4 p-md-5 bg-white rounded-4">
            
            ${disclaimerHtml}

            <div class="details-header">
              <span class="badge-heritage mb-3 d-inline-block"><i class="bi ${catIcon} me-1"></i>${catName}</span>
              <h1 class="fw-bold mb-3">${sub.title}</h1>
              
              <div class="d-flex flex-wrap gap-3 text-muted small">
                <span><i class="bi bi-person me-1"></i>Contributor: <strong>${sub.contributor_name}</strong></span>
                <span><i class="bi bi-geo-alt me-1"></i>Village: <strong>${sub.village}</strong></span>
                <span><i class="bi bi-calendar me-1"></i>Date: <strong>${new Date(sub.created_at).toLocaleDateString()}</strong></span>
                <span><i class="bi bi-translate me-1"></i>Language: <strong>${sub.language.toUpperCase()}</strong></span>
              </div>
            </div>

            ${photoHtml}

            <div class="description-content fs-5 mt-4" style="white-space: pre-wrap; color: var(--theme-text-dark);">
              ${sub.description}
            </div>

            ${audioHtml}
            ${videoHtml}

          </div>
        </div>

        <div class="col-lg-4">
          <div class="card border-0 shadow-sm p-4 bg-white rounded-4">
            <h4 class="fw-bold mb-4" data-trans="commentsTitle">Community Discussions</h4>
            
            <!-- Comment Submission Form -->
            <form id="comment-form" onsubmit="handleCommentSubmit(event, ${sub.id})" class="mb-4">
              <div class="mb-3">
                <input type="text" id="comment-author-input" class="form-control" placeholder="Your Name" data-trans="commentName" required>
              </div>
              <div class="mb-3">
                <textarea id="comment-text-input" rows="3" class="form-control" placeholder="Add a Comment" data-trans="commentText" required></textarea>
              </div>
              <button class="btn btn-heritage-primary w-100 btn-sm" type="submit" data-trans="commentBtn">Post Comment</button>
            </form>

            <hr>

            <!-- Comments List -->
            <div id="comments-list" class="mt-4">
              <div class="text-center py-3">
                <div class="spinner-border spinner-border-sm text-success" role="status"></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    applyTranslations();
    loadComments(sub.id);

  } catch (err) {
    document.getElementById('details-container').innerHTML = `
      <div class="alert alert-danger">
        <h4>Error</h4>
        <p>${err.message}</p>
      </div>
    `;
  }
}

async function loadComments(submissionId) {
  const container = document.getElementById('comments-list');
  if (!container) return;

  try {
    const res = await fetch(`/api/submissions/${submissionId}/comments`);
    if (!res.ok) throw new Error();
    const comments = await res.json();

    if (comments.length === 0) {
      container.innerHTML = `
        <p class="text-muted text-center py-3" data-trans="noComments">No comments yet. Share your experience or thoughts below!</p>
      `;
      applyTranslations();
      return;
    }

    container.innerHTML = comments.map(c => `
      <div class="comment-box">
        <div class="d-flex justify-content-between mb-1">
          <span class="comment-author">${c.user_name}</span>
          <span class="comment-date">${new Date(c.created_at).toLocaleDateString()}</span>
        </div>
        <p class="mb-0 text-muted small">${c.comment_text}</p>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<p class="text-danger small">Failed to load comments.</p>`;
  }
}

async function handleCommentSubmit(e, submissionId) {
  e.preventDefault();
  const userName = document.getElementById('comment-author-input').value;
  const commentText = document.getElementById('comment-text-input').value;

  try {
    const res = await fetch(`/api/submissions/${submissionId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_name: userName, comment_text: commentText })
    });

    if (res.ok) {
      showToast('Comment posted successfully!', 'success');
      document.getElementById('comment-text-input').value = '';
      loadComments(submissionId);
    } else {
      throw new Error('Failed to post comment');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// -------------------------------------------------------------
// Elder Voice Archive
// -------------------------------------------------------------
function renderArchivePage() {
  const root = document.getElementById('app-root');
  
  root.innerHTML = `
    <div class="container py-5">
      <div class="text-center mb-5">
        <h1 class="fw-bold" data-trans="archiveTitle">Elder Voice Archive</h1>
        <p class="text-muted lead" data-trans="archiveSub">Listen to oral histories, local songs, stories, and experiences narrated directly by village elders in their native languages.</p>
      </div>
      
      <div class="row g-4" id="archive-list">
        <div class="col-12 text-center py-5">
          <div class="spinner-border text-success" role="status"></div>
        </div>
      </div>
    </div>
  `;

  loadArchiveItems();
}

async function loadArchiveItems() {
  const container = document.getElementById('archive-list');
  if (!container) return;

  try {
    const res = await fetch('/api/archive');
    if (!res.ok) throw new Error();
    const items = await res.json();

    if (items.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-volume-mute fs-1 text-muted"></i>
          <p class="mt-3 text-muted" data-trans="noVoiceRecords">No voice archive recordings found yet.</p>
        </div>
      `;
      applyTranslations();
      return;
    }

    container.innerHTML = items.map(sub => {
      const cat = categories.find(c => c.id === sub.category_id);
      const catName = cat ? getCategoryName(cat) : sub.category_name;
      
      return `
        <div class="col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm p-4 h-100 d-flex flex-column bg-white">
            <span class="badge-heritage mb-3 align-self-start"><i class="bi bi-mic me-1"></i>${catName}</span>
            <h4 class="fw-bold mb-2">${sub.title}</h4>
            <p class="text-muted small mb-3"><i class="bi bi-geo-alt me-1"></i>${sub.village} | Contributor: <strong>${sub.contributor_name}</strong></p>
            <p class="text-muted text-truncate-3 flex-grow-1">${sub.description}</p>
            
            <div class="mt-3">
              <audio controls class="w-100 mb-3">
                <source src="${sub.audio_url}" type="audio/webm">
                <source src="${sub.audio_url}" type="audio/ogg">
                <source src="${sub.audio_url}" type="audio/wav">
              </audio>
              <button class="btn btn-sm btn-heritage-primary w-100" onclick="navigate('details-${sub.id}')">
                Read Transcription & Discuss
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `<div class="col-12 text-danger text-center">Failed to load archive.</div>`;
  }
}

// -------------------------------------------------------------
// Map Page
// -------------------------------------------------------------
function renderMapPage() {
  const root = document.getElementById('app-root');
  
  root.innerHTML = `
    <div class="container py-5">
      <div class="text-center mb-5">
        <h1 class="fw-bold" data-trans="mapTitle">Interactive Village Map</h1>
        <p class="text-muted lead" data-trans="mapSub">Pinpoint historical sites, ancient stepwells, protected forests, organic farms, and temples in your community.</p>
      </div>

      <div class="row g-4">
        <div class="col-lg-8">
          <div id="village-map"></div>
          <p class="text-muted mt-2 small" data-trans="mapInstruction">Click anywhere on the map to select coordinates, fill the form, and add a landmark.</p>
        </div>

        <div class="col-lg-4">
          <div class="map-control-panel">
            <h4 class="fw-bold mb-3" data-trans="mapPinTitle">Pin Landmark Name</h4>
            <form id="map-pin-form" onsubmit="handleMapPinSubmit(event)">
              <div class="mb-3">
                <label class="form-label" data-trans="mapPinTitle">Landmark Name</label>
                <input type="text" id="map-title-input" class="form-control" required>
              </div>
              <div class="mb-3">
                <label class="form-label" data-trans="mapPinDesc">Landmark Details</label>
                <textarea id="map-desc-input" rows="3" class="form-control" required></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label" data-trans="mapPinType">Landmark Type</label>
                <select id="map-type-input" class="form-select" required>
                  <option value="well" data-trans="well">Well / Stepwell</option>
                  <option value="temple" data-trans="temple">Temple / Sacred Site</option>
                  <option value="farm" data-trans="farm">Organic Farm / Orchard</option>
                  <option value="historical" data-trans="historical">Historical Monument / Tree</option>
                  <option value="other" data-trans="other">Other Landmark</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label" data-trans="commentName">Your Name</label>
                <input type="text" id="map-contributor-input" class="form-control">
              </div>
              <div class="row g-2 mb-3">
                <div class="col">
                  <label class="form-label small text-muted">Lat</label>
                  <input type="text" id="map-lat-input" class="form-control form-control-sm" readonly placeholder="Click map">
                </div>
                <div class="col">
                  <label class="form-label small text-muted">Lng</label>
                  <input type="text" id="map-lng-input" class="form-control form-control-sm" readonly placeholder="Click map">
                </div>
              </div>
              <button class="btn btn-heritage-primary w-100" type="submit" data-trans="mapPinBtn">Add Pin to Current Location</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize Leaflet Map
  setTimeout(() => {
    initVillageMap((lat, lng) => {
      document.getElementById('map-lat-input').value = lat.toFixed(6);
      document.getElementById('map-lng-input').value = lng.toFixed(6);
      showToast(`Selected coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'info');
    });
  }, 100);
}

async function handleMapPinSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('map-title-input').value;
  const description = document.getElementById('map-desc-input').value;
  const type = document.getElementById('map-type-input').value;
  const contributor = document.getElementById('map-contributor-input').value;

  const success = await submitMapLandmark(title, description, type, contributor);
  if (success) {
    showToast('Landmark pinned successfully!', 'success');
    document.getElementById('map-pin-form').reset();
  }
}

// -------------------------------------------------------------
// Share Wisdom Page (Form & Recording)
// -------------------------------------------------------------
let recordedAudioFile = null;

function renderSubmitPage() {
  const root = document.getElementById('app-root');
  
  root.innerHTML = `
    <div class="container py-5">
      <div class="text-center mb-5">
        <h1 class="fw-bold" data-trans="submitTitle">Share Traditional Wisdom</h1>
        <p class="text-muted lead" data-trans="submitSub">Document the wisdom of the elders. Fill out the form below to submit a recipe, folk song, remedy, or technique.</p>
      </div>

      <div class="row justify-content-center">
        <div class="col-lg-8">
          <div class="card border-0 shadow-sm p-4 p-md-5 bg-white rounded-4">
            <form id="submission-form" onsubmit="handleSubSubmit(event)">
              
              <div class="mb-3">
                <label class="form-label fw-semibold" data-trans="formTitle">Title of Knowledge</label>
                <input type="text" id="sub-title" class="form-control" placeholder="e.g., Natural pesticide using Neem" data-trans="formTitlePlaceholder" required>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold" data-trans="formDesc">Detailed Description</label>
                <textarea id="sub-desc" rows="6" class="form-control" placeholder="Describe the method, recipe, history, or remedy in detail..." data-trans="formDescPlaceholder" required></textarea>
              </div>

              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label fw-semibold" data-trans="formCategory">Select Category</label>
                  <select id="sub-cat" class="form-select" required>
                    <option value="">-- Choose Category --</option>
                    ${categories.map(cat => `<option value="${cat.id}">${getCategoryName(cat)}</option>`).join('')}
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold" data-trans="formLanguage">Language of Content</label>
                  <select id="sub-lang" class="form-select" required>
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="mr">मराठी (Marathi)</option>
                  </select>
                </div>
              </div>

              <div class="row g-3 mb-4">
                <div class="col-md-6">
                  <label class="form-label fw-semibold" data-trans="formVillage">Village Name</label>
                  <input type="text" id="sub-village" class="form-control" placeholder="e.g., Kondanpur" data-trans="formVillagePlaceholder" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold" data-trans="formContributor">Contributor Name (Elder/Expert)</label>
                  <input type="text" id="sub-contributor" class="form-control" placeholder="e.g., Kamaladevi Patil" data-trans="formContributorPlaceholder" required>
                </div>
              </div>

              <!-- Media Uploads -->
              <div class="card p-3 border-0 bg-light mb-4">
                <h5 class="fw-bold mb-3"><i class="bi bi-paperclip me-1 text-primary"></i>Media Attachments</h5>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label small fw-semibold" data-trans="formPhoto">Photo (Image)</label>
                    <input type="file" id="sub-photo" class="form-control form-control-sm" accept="image/*">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-semibold" data-trans="formVideo">Video File</label>
                    <input type="file" id="sub-video" class="form-control form-control-sm" accept="video/*">
                  </div>
                  <div class="col-12">
                    <label class="form-label small fw-semibold" data-trans="formAudio">Audio Recording / File</label>
                    <input type="file" id="sub-audio" class="form-control form-control-sm" accept="audio/*">
                  </div>
                </div>
              </div>

              <!-- Voice Recording (For Elders) -->
              <div class="recorder-container mb-4">
                <h5 class="fw-bold" data-trans="audioRecordLabel">Or Record Audio Live:</h5>
                <p class="text-muted small">Elders can click the record button below to speak directly into the microphone in their local language.</p>
                
                <div class="d-flex justify-content-center align-items-center gap-3">
                  <button type="button" class="recorder-btn" id="record-btn" onclick="toggleAudioRecording()">
                    <i class="bi bi-mic"></i>
                  </button>
                </div>
                
                <div class="recording-status text-danger" id="recording-status" style="display: none;">
                  <span class="spinner-grow spinner-grow-sm me-1" role="status"></span> Recording...
                </div>

                <div class="mt-3" id="audio-preview-container" style="display: none;">
                  <p class="text-success fw-bold small" data-trans="recordSuccess"><i class="bi bi-check-circle me-1"></i>Recording completed successfully!</p>
                  <audio id="audio-preview" controls class="w-100"></audio>
                </div>
              </div>

              <button class="btn btn-heritage-primary w-100 py-2 fs-5" type="submit" data-trans="formSubmitBtn">Submit to Knowledge Bank</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  recordedAudioFile = null;
}

async function toggleAudioRecording() {
  const btn = document.getElementById('record-btn');
  const status = document.getElementById('recording-status');
  const previewContainer = document.getElementById('audio-preview-container');
  const preview = document.getElementById('audio-preview');

  if (!window.voiceRecorder.isRecording) {
    try {
      await window.voiceRecorder.start();
      btn.classList.add('recording');
      btn.innerHTML = '<i class="bi bi-stop-fill"></i>';
      status.style.display = 'block';
      previewContainer.style.display = 'none';
      recordedAudioFile = null;
    } catch (err) {
      showToast(translations[currentLanguage].recordFailed || 'Microphone access denied.', 'danger');
    }
  } else {
    try {
      const blob = await window.voiceRecorder.stop();
      btn.classList.remove('recording');
      btn.innerHTML = '<i class="bi bi-mic"></i>';
      status.style.display = 'none';

      // Load blob into preview player
      const audioURL = URL.createObjectURL(blob);
      preview.src = audioURL;
      previewContainer.style.display = 'block';

      // Store file for form submission
      recordedAudioFile = window.voiceRecorder.getFile();
      showToast('Recording saved!', 'success');
    } catch (err) {
      console.error(err);
      btn.classList.remove('recording');
      btn.innerHTML = '<i class="bi bi-mic"></i>';
      status.style.display = 'none';
      showToast('Error stopping recorder.', 'danger');
    }
  }
}

async function handleSubSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('sub-title').value;
  const description = document.getElementById('sub-desc').value;
  const category_id = document.getElementById('sub-cat').value;
  const language = document.getElementById('sub-lang').value;
  const village = document.getElementById('sub-village').value;
  const contributor = document.getElementById('sub-contributor').value;

  const photoFile = document.getElementById('sub-photo').files[0];
  const videoFile = document.getElementById('sub-video').files[0];
  let audioFile = document.getElementById('sub-audio').files[0];

  // If live recording was made, prioritize it over uploaded audio file
  if (recordedAudioFile) {
    audioFile = recordedAudioFile;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('category_id', category_id);
  formData.append('language', language);
  formData.append('village', village);
  formData.append('contributor_name', contributor);

  if (photoFile) formData.append('photo', photoFile);
  if (videoFile) formData.append('video', videoFile);
  if (audioFile) formData.append('audio', audioFile);

  showToast('Submitting...', 'info');

  try {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      showToast(data.message, 'success');
      // If admin submitted, they can view immediately, otherwise redirect home
      setTimeout(() => {
        navigate('home');
      }, 1500);
    } else {
      throw new Error(data.error || 'Failed to submit');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// -------------------------------------------------------------
// Authentication Pages (Login & Register)
// -------------------------------------------------------------
function renderLoginPage() {
  const root = document.getElementById('app-root');
  
  root.innerHTML = `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-md-5">
          <div class="card border-0 shadow-sm p-4 p-md-5 bg-white rounded-4">
            <h2 class="fw-bold mb-4 text-center" data-trans="loginTitle">Access Account</h2>
            <form onsubmit="handleLoginSubmit(event)">
              <div class="mb-3">
                <label class="form-label" data-trans="usernameLabel">Username</label>
                <input type="text" id="login-username" class="form-control" required>
              </div>
              <div class="mb-3">
                <label class="form-label" data-trans="passwordLabel">Password</label>
                <input type="password" id="login-password" class="form-control" required>
              </div>
              <button class="btn btn-heritage-primary w-100 py-2 mb-3" type="submit" data-trans="loginBtn">Login</button>
              <div class="text-center text-muted small">
                <span data-trans="dontHaveAccount">Don't have an account?</span> 
                <a href="#register" onclick="navigate('register')" class="text-success fw-bold" data-trans="navRegister">Register</a>
              </div>
            </form>
            <div class="mt-4 pt-3 border-top text-center text-muted small">
              <i class="bi bi-info-circle me-1"></i><span data-trans="adminRoleNotice">Only approved administrator credentials can review and approve submissions.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Logged in successfully!', 'success');
      await checkAuth();
      if (currentUser.role === 'admin') navigate('admin');
      else navigate('home');
    } else {
      throw new Error(data.error || 'Login failed');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function renderRegisterPage() {
  const root = document.getElementById('app-root');
  
  root.innerHTML = `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-md-5">
          <div class="card border-0 shadow-sm p-4 p-md-5 bg-white rounded-4">
            <h2 class="fw-bold mb-4 text-center" data-trans="registerTitle">Create Account</h2>
            <form onsubmit="handleRegisterSubmit(event)">
              <div class="mb-3">
                <label class="form-label" data-trans="usernameLabel">Username</label>
                <input type="text" id="reg-username" class="form-control" required>
              </div>
              <div class="mb-3">
                <label class="form-label" data-trans="passwordLabel">Password</label>
                <input type="password" id="reg-password" class="form-control" required>
              </div>
              <button class="btn btn-heritage-primary w-100 py-2 mb-3" type="submit" data-trans="registerBtn">Register</button>
              <div class="text-center text-muted small">
                <span data-trans="alreadyHaveAccount">Already have an account?</span> 
                <a href="#login" onclick="navigate('login')" class="text-success fw-bold" data-trans="navLogin">Login</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Registration successful!', 'success');
      await checkAuth();
      navigate('home');
    } else {
      throw new Error(data.error || 'Registration failed');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// -------------------------------------------------------------
// Admin Moderation Panel
// -------------------------------------------------------------
function renderAdminPage() {
  const root = document.getElementById('app-root');
  
  root.innerHTML = `
    <div class="container py-5">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="fw-bold" data-trans="adminTitle">Admin Moderation Dashboard</h1>
        <button class="btn btn-outline-secondary" onclick="navigate('home')">
          <i class="bi bi-house me-1"></i> Home
        </button>
      </div>

      <div class="card border-0 shadow-sm p-4 bg-white rounded-4">
        <h3 class="fw-bold mb-4" data-trans="adminPendingSub">Pending Approvals</h3>
        
        <div class="table-responsive">
          <table class="table table-hover table-heritage">
            <thead>
              <tr>
                <th data-trans="tableTitle">Title</th>
                <th data-trans="tableCategory">Category</th>
                <th data-trans="tableVillage">Village</th>
                <th data-trans="tableContributor">Contributor</th>
                <th data-trans="tableActions">Actions</th>
              </tr>
            </thead>
            <tbody id="admin-pending-list">
              <tr>
                <td colspan="5" class="text-center py-4">
                  <div class="spinner-border text-success" role="status"></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  loadPendingSubmissions();
}

async function loadPendingSubmissions() {
  const container = document.getElementById('admin-pending-list');
  if (!container) return;

  try {
    const res = await fetch('/api/submissions?pending=true');
    if (!res.ok) throw new Error();
    const submissions = await res.json();

    if (submissions.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-muted" data-trans="adminNoPending">
            No submissions currently pending moderation.
          </td>
        </tr>
      `;
      applyTranslations();
      return;
    }

    container.innerHTML = submissions.map(sub => {
      const cat = categories.find(c => c.id === sub.category_id);
      const catName = cat ? getCategoryName(cat) : sub.category_name;

      return `
        <tr>
          <td>
            <a href="#" onclick="navigate('details-${sub.id}'); return false;" class="text-success fw-bold">${sub.title}</a>
          </td>
          <td>${catName}</td>
          <td>${sub.village}</td>
          <td>${sub.contributor_name}</td>
          <td>
            <div class="d-flex gap-2">
              <button class="btn btn-xs btn-success" onclick="approveSubmission(${sub.id})" data-trans="adminApproveBtn">
                Approve
              </button>
              <button class="btn btn-xs btn-danger" onclick="rejectSubmission(${sub.id})" data-trans="adminRejectBtn">
                Reject
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    applyTranslations();

  } catch (err) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger py-4">Failed to load moderation entries.</td>
      </tr>
    `;
  }
}

async function approveSubmission(id) {
  try {
    const res = await fetch(`/api/admin/submissions/${id}/approve`, { method: 'POST' });
    if (res.ok) {
      showToast('Submission approved and published!', 'success');
      loadPendingSubmissions();
    } else {
      throw new Error();
    }
  } catch (err) {
    showToast('Failed to approve submission', 'danger');
  }
}

async function rejectSubmission(id) {
  if (!confirm('Are you sure you want to reject and delete this submission?')) return;
  
  try {
    const res = await fetch(`/api/admin/submissions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Submission rejected and deleted.', 'warning');
      loadPendingSubmissions();
    } else {
      throw new Error();
    }
  } catch (err) {
    showToast('Failed to delete submission', 'danger');
  }
}
