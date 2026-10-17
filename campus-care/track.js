/**
 * Campus Care - Lost & Found Management System
 * Track Status & Update History Logic
 */

// Storage Keys & Expiry Configuration
const STORAGE_KEY_REPORTS = 'campusCare_reports';
const ITEM_EXPIRY_DAYS = 30; // Number of days before an unclaimed lost/found item report expires

// DOM Elements - Search
const trackForm = document.getElementById('trackForm');
const trackInput = document.getElementById('trackInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const trackInputError = document.getElementById('trackInputError');
const quickSuggestions = document.getElementById('quickSuggestions');
const quickPillsList = document.getElementById('quickPillsList');

// DOM Elements - States
const notFoundState = document.getElementById('notFoundState');
const notFoundMessage = document.getElementById('notFoundMessage');
const trackResultContainer = document.getElementById('trackResultContainer');

// DOM Elements - Report Summary
const resultItemName = document.getElementById('resultItemName');
const resultReportId = document.getElementById('resultReportId');
const resultCategoryBadge = document.getElementById('resultCategoryBadge');
const resultStatusBadge = document.getElementById('resultStatusBadge');
const resultLocation = document.getElementById('resultLocation');
const resultDateLost = document.getElementById('resultDateLost');
const resultStudentName = document.getElementById('resultStudentName');
const resultCreatedAt = document.getElementById('resultCreatedAt');
const resultDescription = document.getElementById('resultDescription');
const copyResultIdBtn = document.getElementById('copyResultIdBtn');

// DOM Elements - Timeline
const timelineContainer = document.getElementById('timelineContainer');
const toastContainer = document.getElementById('toastContainer');

// Mobile navigation toggle
const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('siteNav');
if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });
}

// User Logout handler
const userLogoutBtn = document.getElementById('userLogoutBtn');
if (userLogoutBtn) {
  userLogoutBtn.addEventListener('click', () => {
    showLogoutModal({
      title: 'Log Out of Student Account?',
      message: 'You are about to log out of your student session. Any unsaved form progress will be discarded.',
      onConfirm: async () => {
        try {
          localStorage.removeItem('campusCare_session');
          sessionStorage.removeItem('campusCare_session');
          if (window.CampusCareFirebase && CampusCareFirebase.auth) {
            await CampusCareFirebase.auth.signOut();
          }
        } catch (e) {
          console.warn('Sign out warning:', e);
        }
        window.location.href = 'index.html?logout=true';
      }
    });
  });
}

/**
 * Universal logout confirmation modal
 */
function showLogoutModal({ title, message, onConfirm }) {
  let modal = document.getElementById('ccLogoutModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ccLogoutModal';
    modal.className = 'modal-overlay';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'ccLogoutTitle');
    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 440px; text-align: center; padding: 2rem 1.75rem;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--color-danger-soft, #fef2f2); border: 2px solid var(--color-danger-border, #fecaca); color: var(--color-danger, #ef4444); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem auto;">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </div>
        <h3 class="modal-title" id="ccLogoutTitle" style="font-size: 1.35rem; margin-bottom: 0.5rem;"></h3>
        <p class="modal-subtitle" id="ccLogoutDesc" style="font-size: 0.92rem; color: var(--text-muted); margin-bottom: 1.5rem; line-height: 1.5;"></p>
        <div class="modal-actions" style="display: flex; gap: 0.75rem; justify-content: center;">
          <button type="button" class="btn btn-secondary" id="ccCancelLogoutBtn" style="flex: 1; min-height: 44px;">
            <span>Cancel</span>
          </button>
          <button type="button" class="btn" id="ccConfirmLogoutBtn" style="flex: 1; min-height: 44px; background: var(--color-danger, #ef4444); color: #ffffff; border: 1px solid var(--color-danger, #ef4444); font-weight: 600; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);">
            <span>Log Out</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const titleElem = modal.querySelector('#ccLogoutTitle');
  const descElem = modal.querySelector('#ccLogoutDesc');
  const cancelBtn = modal.querySelector('#ccCancelLogoutBtn');
  const confirmBtn = modal.querySelector('#ccConfirmLogoutBtn');

  titleElem.textContent = title;
  descElem.textContent = message;
  confirmBtn.disabled = false;
  confirmBtn.innerHTML = '<span>Log Out</span>';
  cancelBtn.disabled = false;

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  cancelBtn.onclick = () => {
    closeModal();
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal();
    }
  };

  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    confirmBtn.innerHTML = '<span>Logging out...</span>';
    if (onConfirm) {
      await onConfirm();
    }
    closeModal();
  };

  document.addEventListener('keydown', onKeyDown);
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  confirmBtn.focus();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  try {
    if (window.CampusCareFirebase && CampusCareFirebase.loadMyReports) {
      await CampusCareFirebase.loadMyReports();
    }
  } catch (error) {
    console.warn('Initial loadMyReports warning:', error);
  }

  renderQuickSuggestions();

  // Check URL parameters for ?id=... or ?reportId=... or ?reportID=...
  const urlParams = new URLSearchParams(window.location.search);
  const idFromUrl = urlParams.get('id') || urlParams.get('reportId') || urlParams.get('reportID');
  if (idFromUrl) {
    trackInput.value = idFromUrl.trim();
    clearSearchBtn.style.display = 'flex';
    performTrack(idFromUrl.trim());
  }
});

/**
 * Theme Toggle Functionality
 */
function initThemeToggle() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (!themeToggleBtn) return;

  function updateToggleUI(theme) {
    const label = theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode';
    themeToggleBtn.setAttribute('aria-label', label);
    themeToggleBtn.setAttribute('title', label);
  }

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateToggleUI(currentTheme);

  themeToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const active = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = active === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('campusCare_theme', nextTheme);
    } catch (err) {}
    updateToggleUI(nextTheme);
  });
}

/* ==========================================================================
   Demo Data Initialization
   Populates initial sample reports ONLY on first visit when localStorage has no data.
   Never overwrites real user reports.
   ========================================================================== */

/**
 * Returns a date string YYYY-MM-DD relative to today.
 * @param {number} offsetDays - Number of days offset (e.g. -2 for 2 days ago)
 * @returns {string}
 */
function getDemoRelativeDateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

/**
 * Returns an ISO timestamp string relative to today.
 * @param {number} offsetDays - Number of days offset
 * @param {number} offsetHours - Additional hours offset
 * @returns {string}
 */
function getDemoRelativeISO(offsetDays, offsetHours = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(d.getHours() + offsetHours);
  return d.toISOString();
}

/**
 * Initializes realistic demo reports if no campusCare_reports data exists in localStorage.
 * Uses fake names, phone numbers, and relative dates so reports never expire prematurely.
 */
function initializeDemoReportsIfEmpty() {
  try {
    // Strictly load ONLY when the browser has no campusCare_reports saved yet (first visit)
    if (localStorage.getItem(STORAGE_KEY_REPORTS) !== null) {
      return;
    }

    const demoReports = [
      {
        id: 'LOST-10101',
        type: 'lost',
        itemName: 'Black wireless earbuds',
        category: 'Electronics',
        date: getDemoRelativeDateStr(-3),
        location: 'Central Library 2nd Floor',
        description: 'Matte black wireless earbuds inside an oval charging case left near study table 14.',
        studentName: 'Demo Student (Fake User)',
        phone: '9000000001',
        contact: '9000000001',
        status: 'Match Found',
        createdAt: getDemoRelativeISO(-3, 2),
        history: [
          {
            status: 'Open',
            timestamp: getDemoRelativeISO(-3, 2),
            remark: 'Lost item report submitted by student'
          },
          {
            status: 'Match Found',
            timestamp: getDemoRelativeISO(-2, 4),
            remark: 'Potential matching item found (FOUND-20202: Black wireless earbuds). Handed to administration for verification.'
          }
        ]
      },
      {
        id: 'FOUND-20202',
        type: 'found',
        itemName: 'Black wireless earbuds',
        category: 'Electronics',
        date: getDemoRelativeDateStr(-2),
        location: 'Central Library 2nd Floor',
        description: 'Black wireless earbuds in a black charging case discovered under table 14 in library reading area.',
        secretDetail: 'Yellow smile sticker on the inner lid of the charging case',
        studentName: 'Good Samaritan (Fake User)',
        phone: '9000000002',
        contact: '9000000002',
        email: 'samaritan.demo@campus.test',
        keptAt: 'Handed to Security Desk',
        status: 'Match Found',
        createdAt: getDemoRelativeISO(-2, 3),
        history: [
          {
            status: 'Open',
            timestamp: getDemoRelativeISO(-2, 3),
            remark: 'Found item report submitted by finder'
          },
          {
            status: 'Match Found',
            timestamp: getDemoRelativeISO(-2, 4),
            remark: 'Potential matching lost report found (LOST-10101: Black wireless earbuds). Handed to administration for verification.'
          }
        ]
      },
      {
        id: 'LOST-30303',
        type: 'lost',
        itemName: 'Advanced Engineering Mathematics Textbook',
        category: 'Books & Stationery',
        date: getDemoRelativeDateStr(-1),
        location: 'FET Block Room 204',
        description: 'Hardcover 10th edition textbook with a blue protective cover and highlighter marks in chapter 4.',
        studentName: 'Jordan Lee (Fake User)',
        phone: '9000000003',
        contact: '9000000003',
        status: 'Open',
        createdAt: getDemoRelativeISO(-1, 1),
        history: [
          {
            status: 'Open',
            timestamp: getDemoRelativeISO(-1, 1),
            remark: 'Lost item report submitted by student'
          }
        ]
      },
      {
        id: 'ISSUE-40404',
        type: 'issue',
        itemName: 'Electricity Issue',
        category: 'Electricity',
        date: getDemoRelativeDateStr(-4),
        location: 'Science Block 3rd Floor Lab 302',
        description: 'Flickering overhead tube lights and sparking electrical socket on workbench 3.',
        department: 'Electrical Maintenance & Power Division',
        studentName: 'Morgan Taylor (Fake User)',
        phone: '9000000004',
        contact: '9000000004',
        status: 'In Progress',
        createdAt: getDemoRelativeISO(-4, 2),
        history: [
          {
            status: 'Open',
            timestamp: getDemoRelativeISO(-4, 2),
            remark: 'Campus issue report logged by student'
          },
          {
            status: 'Assigned',
            timestamp: getDemoRelativeISO(-4, 3),
            remark: 'Automatically assigned to Electrical Maintenance & Power Division for inspection and resolution'
          },
          {
            status: 'In Progress',
            timestamp: getDemoRelativeISO(-2, 5),
            remark: 'Electrician dispatched. Replacement ballast ordered and socket wiring is undergoing repair.'
          }
        ]
      },
      {
        id: 'ISSUE-50505',
        type: 'issue',
        itemName: 'Plumbing Issue',
        category: 'Plumbing',
        date: getDemoRelativeDateStr(-6),
        location: 'Hostel Block B 1st Floor Restroom',
        description: 'Severe water leakage from the main flush valve causing water accumulation on the floor.',
        department: 'Water Supply & Plumbing Department',
        studentName: 'Sam Rivera (Fake User)',
        phone: '9000000005',
        contact: '9000000005',
        status: 'Resolved',
        createdAt: getDemoRelativeISO(-6, 1),
        history: [
          {
            status: 'Open',
            timestamp: getDemoRelativeISO(-6, 1),
            remark: 'Campus issue report logged by student'
          },
          {
            status: 'Assigned',
            timestamp: getDemoRelativeISO(-6, 2),
            remark: 'Automatically assigned to Water Supply & Plumbing Department for inspection and resolution'
          },
          {
            status: 'In Progress',
            timestamp: getDemoRelativeISO(-5, 4),
            remark: 'Plumbing technician arrived on site. Main valve shut off for gasket replacement.'
          },
          {
            status: 'Resolved',
            timestamp: getDemoRelativeISO(-1, 3),
            remark: 'Defective valve replaced and tested under full water pressure. Leak resolved completely.'
          }
        ]
      }
    ];

    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(demoReports));
  } catch (err) {
    console.error('Error initializing demo reports:', err);
  }
}

// Toggle clear search button visibility
trackInput.addEventListener('input', () => {
  if (trackInput.value.trim().length > 0) {
    clearSearchBtn.style.display = 'flex';
  } else {
    clearSearchBtn.style.display = 'none';
  }
  hideInputError();
});

clearSearchBtn.addEventListener('click', () => {
  trackInput.value = '';
  clearSearchBtn.style.display = 'none';
  hideInputError();
  notFoundState.style.display = 'none';
  trackResultContainer.style.display = 'none';
  trackInput.focus();
});

/**
 * Checks all stored reports and automatically marks unclaimed lost and found item reports
 * as 'Expired' if 30 days have elapsed since their creation date.
 * Campus issues are excluded from this rule.
 */
function checkAndExpireOldItemReports() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (!rawData) return;

    const reports = JSON.parse(rawData);
    if (!Array.isArray(reports)) return;

    let hasUpdates = false;
    const now = new Date();
    const expiryThresholdMs = ITEM_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    reports.forEach(report => {
      // Apply only to item reports (lost and found), NOT campus issues
      if (report.type === 'lost' || report.type === 'found') {
        // Only expire unclaimed items (status Open or Match Found, not Returned or already Expired)
        const isUnclaimed = report.status === 'Open' || report.status === 'Match Found';

        if (isUnclaimed) {
          const createdAtDate = report.createdAt ? new Date(report.createdAt) : (report.date ? new Date(report.date) : null);

          if (createdAtDate && !isNaN(createdAtDate.getTime())) {
            const ageMs = now.getTime() - createdAtDate.getTime();

            if (ageMs >= expiryThresholdMs) {
              report.status = 'Expired';

              if (!Array.isArray(report.history)) {
                report.history = [];
              }

              report.history.push({
                status: 'Expired',
                timestamp: now.toISOString(),
                remark: 'Unclaimed after 30 days, handed to administration'
              });

              hasUpdates = true;
            }
          }
        }
      }
    });

    if (hasUpdates) {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
    }
  } catch (err) {
    console.error('Error during item report expiry check:', err);
  }
}

/**
 * Normalizes text: trims, lowercases, and collapses whitespace.
 */
function normalizeMatchText(str) {
  if (!str) return '';
  return String(str).toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Extracts distinct words/tokens from text.
 */
function extractMatchKeywords(str) {
  if (!str) return [];
  const normalized = normalizeMatchText(str);
  const words = normalized.match(/[\p{L}\p{N}]+/gu) || [];
  return Array.from(new Set(words.filter(w => w.length >= 2)));
}

/**
 * Checks if two text strings match in keywords or sub-phrases (case-insensitive, ignoring extra spaces).
 */
function isKeywordMatch(textA, textB) {
  const normA = normalizeMatchText(textA);
  const normB = normalizeMatchText(textB);
  if (!normA || !normB) return false;
  if (normA === normB || normA.includes(normB) || normB.includes(normA)) return true;

  const wordsA = extractMatchKeywords(textA);
  const wordsB = extractMatchKeywords(textB);
  if (wordsA.length === 0 || wordsB.length === 0) return false;

  return wordsA.some(wA => wordsB.includes(wA));
}

/**
 * Checks if locations match (case-insensitive, ignoring extra spaces).
 */
function isLocationMatch(locA, locB) {
  const normA = normalizeMatchText(locA);
  const normB = normalizeMatchText(locB);
  if (!normA || !normB) return false;
  return normA === normB || normA.includes(normB) || normB.includes(normA);
}

/**
 * Evaluates whether a lost report and a found report match on category, keywords, location, and date.
 */
function areReportsMatching(lostReport, foundReport) {
  // Category comparison
  const catA = normalizeMatchText(lostReport.category);
  const catB = normalizeMatchText(foundReport.category);
  if (catA !== catB) return false;

  // Location comparison (case-insensitive, ignoring extra spaces)
  if (!isLocationMatch(lostReport.location, foundReport.location)) return false;

  // Date comparison (checks matching dates or found on/after lost date)
  const dateA = normalizeMatchText(lostReport.date);
  const dateB = normalizeMatchText(foundReport.date);
  if (dateA && dateB) {
    const tLost = new Date(dateA).getTime();
    const tFound = new Date(dateB).getTime();
    if (!isNaN(tLost) && !isNaN(tFound)) {
      if (dateA !== dateB && tFound < tLost) {
        return false;
      }
    } else if (dateA !== dateB) {
      return false;
    }
  }

  // Keyword comparison: compares item name and description
  const lostText = `${lostReport.itemName || ''} ${lostReport.description || ''}`;
  const foundText = `${foundReport.itemName || ''} ${foundReport.description || ''}`;
  if (!isKeywordMatch(lostText, foundText)) return false;

  return true;
}

/**
 * Runs bi-directional matching between lost reports and found reports.
 * Whenever a lost report and a found report match, both reports are updated to 'Match Found'
 * and each receives a history entry mentioning the other report's ID.
 * Works in both directions regardless of whether the lost or found report was submitted first.
 */
function checkAndRunCrossMatching() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (!rawData) return;
    const reports = JSON.parse(rawData);
    if (!Array.isArray(reports)) return;

    let hasUpdates = false;
    const now = new Date();

    // Eligible candidates are active unclaimed lost and found items
    const lostReports = reports.filter(r => r.type === 'lost' && (r.status === 'Open' || r.status === 'Match Found'));
    const foundReports = reports.filter(r => r.type === 'found' && (r.status === 'Open' || r.status === 'Match Found'));

    lostReports.forEach(lost => {
      foundReports.forEach(found => {
        if (areReportsMatching(lost, found)) {
          // Update lost report if needed
          if (lost.status !== 'Match Found') {
            lost.status = 'Match Found';
            hasUpdates = true;
          }
          if (!Array.isArray(lost.history)) lost.history = [];
          const lostHasEntry = lost.history.some(h => h.remark && h.remark.includes(found.id));
          if (!lostHasEntry) {
            lost.history.push({
              status: 'Match Found',
              timestamp: now.toISOString(),
              remark: `Potential matching item found (${found.id}: ${found.itemName || found.category}). Handed to administration for verification.`
            });
            hasUpdates = true;
          }

          // Update found report if needed
          if (found.status !== 'Match Found') {
            found.status = 'Match Found';
            hasUpdates = true;
          }
          if (!Array.isArray(found.history)) found.history = [];
          const foundHasEntry = found.history.some(h => h.remark && h.remark.includes(lost.id));
          if (!foundHasEntry) {
            found.history.push({
              status: 'Match Found',
              timestamp: now.toISOString(),
              remark: `Potential matching lost report found (${lost.id}: ${lost.itemName || lost.category}). Handed to administration for verification.`
            });
            hasUpdates = true;
          }
        }
      });
    });

    if (hasUpdates) {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
    }
  } catch (err) {
    console.error('Error during cross matching:', err);
  }
}

/**
 * Retrieves all stored reports from localStorage (after running expiry and matching checks)
 * @returns {Array} Array of report objects
 */
function getStoredReports() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_REPORTS);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading localStorage:', err);
    return [];
  }
}

/**
 * Renders quick clickable pills of recent reports stored in localStorage
 */
function renderQuickSuggestions() {
  const reports = getStoredReports();
  if (!reports || reports.length === 0) {
    quickSuggestions.style.display = 'none';
    return;
  }

  quickSuggestions.style.display = 'flex';
  quickPillsList.innerHTML = '';

  // Show up to 5 most recent reports
  const recentSlice = reports.slice(0, 5);
  recentSlice.forEach(report => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'quick-pill';
    pill.innerHTML = `
      <strong>${escapeHtml(report.id)}</strong>
      <span class="pill-name">${escapeHtml(truncate(report.itemName, 18))}</span>
    `;
    pill.addEventListener('click', () => {
      trackInput.value = report.id;
      clearSearchBtn.style.display = 'flex';
      performTrack(report.id);
    });
    quickPillsList.appendChild(pill);
  });
}

/**
 * Handles Track Form Submission
 */
/**
 * Searches Firestore for a report across:
 * 1. Single 'reports' collection (by doc ID, and where reportId / reportID / id equals query)
 * 2. Separate collections: 'lostItems', 'foundItems', 'campusIssues' (and variations)
 * Returns normalized report object or null.
 */
async function fetchReportFromFirestore(enteredId) {
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    return null;
  }

  const db = firebase.firestore();
  const rawId = enteredId.trim();
  const upperId = rawId.toUpperCase();
  const lowerId = rawId.toLowerCase();

  // Distinct variations to match against
  const candidateIds = Array.from(new Set([rawId, upperId, lowerId])).filter(Boolean);

  function normalizeDoc(doc, fallbackType = '') {
    if (!doc || !doc.exists) return null;
    const data = doc.data() || {};
    const id = data.reportId || data.reportID || data.id || doc.id;
    const type = data.type || fallbackType || (id.toUpperCase().startsWith('LOST') ? 'lost' : id.toUpperCase().startsWith('FOUND') ? 'found' : 'issue');
    const title = data.itemName || data.title || data.category || 'Campus Report';
    const location = data.location || data.room || data.area || 'Campus';
    const status = normalizeStatus(data.status || 'OPEN');
    const dateSubmitted = data.dateSubmitted || data.createdAt || data.date || data.dateLost || data.dateFound || new Date().toISOString();
    const studentName = data.studentName || data.name || data.reporterName || (data.ownerUid ? 'Logged-in Student' : 'Anonymous');
    const description = data.description || data.details || '';
    const department = data.department || data.assignedDepartment || '';

    // History array
    let history = Array.isArray(data.history) && data.history.length > 0 ? [...data.history] : [];
    if (history.length === 0) {
      history.push({
        status: status,
        timestamp: dateSubmitted,
        remark: `Report ${id} logged with status ${status}`
      });
    }

    return {
      ...data,
      id,
      reportId: id,
      type,
      itemName: title,
      title,
      status,
      location,
      dateSubmitted,
      date: typeof dateSubmitted === 'string' && dateSubmitted.includes('T') ? dateSubmitted.split('T')[0] : dateSubmitted,
      createdAt: data.createdAt || dateSubmitted,
      studentName,
      description,
      department,
      history
    };
  }

  // 1. Search primary single collection: 'reports'
  try {
    for (const cId of candidateIds) {
      // Direct doc ID
      try {
        const docSnap = await db.collection('reports').doc(cId).get();
        if (docSnap.exists) {
          return normalizeDoc(docSnap);
        }
      } catch (e) {}

      // where('reportId', '==', cId)
      try {
        const qSnap = await db.collection('reports').where('reportId', '==', cId).limit(1).get();
        if (!qSnap.empty) {
          return normalizeDoc(qSnap.docs[0]);
        }
      } catch (e) {}

      // where('reportID', '==', cId)
      try {
        const qSnap = await db.collection('reports').where('reportID', '==', cId).limit(1).get();
        if (!qSnap.empty) {
          return normalizeDoc(qSnap.docs[0]);
        }
      } catch (e) {}

      // where('id', '==', cId)
      try {
        const qSnap = await db.collection('reports').where('id', '==', cId).limit(1).get();
        if (!qSnap.empty) {
          return normalizeDoc(qSnap.docs[0]);
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Querying single reports collection error:', err);
  }

  // 2. Search separate collections: 'lostItems', 'foundItems', 'campusIssues'
  const separateCollections = [
    { name: 'lostItems', type: 'lost' },
    { name: 'foundItems', type: 'found' },
    { name: 'campusIssues', type: 'issue' },
    { name: 'lost_items', type: 'lost' },
    { name: 'found_items', type: 'found' },
    { name: 'campus_issues', type: 'issue' },
    { name: 'issues', type: 'issue' },
    { name: 'lost', type: 'lost' },
    { name: 'found', type: 'found' }
  ];

  for (const col of separateCollections) {
    try {
      for (const cId of candidateIds) {
        // Direct doc
        try {
          const docSnap = await db.collection(col.name).doc(cId).get();
          if (docSnap.exists) {
            return normalizeDoc(docSnap, col.type);
          }
        } catch (e) {}

        // where('reportId', '==', cId)
        try {
          const qSnap = await db.collection(col.name).where('reportId', '==', cId).limit(1).get();
          if (!qSnap.empty) {
            return normalizeDoc(qSnap.docs[0], col.type);
          }
        } catch (e) {}

        // where('reportID', '==', cId)
        try {
          const qSnap = await db.collection(col.name).where('reportID', '==', cId).limit(1).get();
          if (!qSnap.empty) {
            return normalizeDoc(qSnap.docs[0], col.type);
          }
        } catch (e) {}

        // where('id', '==', cId)
        try {
          const qSnap = await db.collection(col.name).where('id', '==', cId).limit(1).get();
          if (!qSnap.empty) {
            return normalizeDoc(qSnap.docs[0], col.type);
          }
        } catch (e) {}
      }
    } catch (err) {
      // If collection doesn't exist, continue smoothly
    }
  }

  return null;
}

/**
 * Handles Track Form Submission
 */
trackForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = trackInput.value.trim();

  if (!query) {
    showInputError('Please enter a Report ID to search (e.g. LOST-12345)');
    trackInput.focus();
    return;
  }

  clearSearchBtn.style.display = 'flex';
  await performTrack(query);
});

/**
 * Executes lookup by report ID across Firestore and Local Storage
 * @param {string} searchId 
 */
async function performTrack(searchId) {
  hideInputError();
  if (!searchId || !searchId.trim()) {
    showInputError('Please enter a Report ID to search (e.g. LOST-12345)');
    return;
  }

  const query = searchId.trim();
  const normalizedSearch = query.toUpperCase();

  // Show loading state on track button
  const submitBtn = document.getElementById('trackSubmitBtn');
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      <span>Searching...</span>
    `;
  }

  let foundReport = null;

  // 1. Query Firestore first across single & separate collections
  try {
    foundReport = await fetchReportFromFirestore(query);
  } catch (err) {
    console.warn('Firestore fetch error:', err);
  }

  // 2. Fallback to localStorage if not found in Firestore
  if (!foundReport) {
    const allReports = getStoredReports();
    foundReport = allReports.find(r => 
      (r.id && r.id.toUpperCase() === normalizedSearch) ||
      (r.reportId && r.reportId.toUpperCase() === normalizedSearch) ||
      (r.reportID && r.reportID.toUpperCase() === normalizedSearch)
    );
  }

  // Restore track button state
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
  }

  if (!foundReport) {
    // Hide results & show Error / Not Found state with clear message
    trackResultContainer.style.display = 'none';
    notFoundState.style.display = 'block';
    notFoundMessage.textContent = 'No report found with this ID. Please check and try again.';
    
    // Smooth scroll to error state
    notFoundState.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  // Cache found report in localStorage
  try {
    const reports = getStoredReports();
    const filtered = reports.filter(item => 
      item.id !== foundReport.id && 
      item.reportId !== foundReport.id && 
      item.reportID !== foundReport.id
    );
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify([foundReport, ...filtered]));
    renderQuickSuggestions();
  } catch (e) {}

  // Found -> Hide error, show result
  notFoundState.style.display = 'none';
  renderReportDetails(foundReport);
  trackResultContainer.style.display = 'block';

  // Smooth scroll to results
  trackResultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Populates report details and history into UI
 * @param {Object} report 
 */
function renderReportDetails(report) {
  // Summary info
  resultItemName.textContent = report.itemName || 'Campus Report';
  resultReportId.textContent = report.id;
  resultCategoryBadge.textContent = report.category || 'General';
  resultLocation.textContent = report.location || 'Not specified';
  resultDateLost.textContent = report.date || 'Not specified';
  resultStudentName.textContent = report.studentName || 'Anonymous';
  resultCreatedAt.textContent = formatDateTime(report.createdAt);
  resultDescription.textContent = report.description || 'No detailed description provided.';

  // Optional Department Cell
  const deptCell = document.getElementById('deptCell');
  const resultDepartment = document.getElementById('resultDepartment');
  if (deptCell && resultDepartment) {
    if (report.department) {
      resultDepartment.textContent = report.department;
      deptCell.style.display = 'flex';
    } else {
      deptCell.style.display = 'none';
    }
  }

  // Type Badge
  const resultTypeBadge = document.getElementById('resultTypeBadge');
  const resultSubtitle = document.getElementById('resultSubtitle');
  if (resultTypeBadge) {
    const typeLabel = report.type === 'issue' ? 'Campus Issue' : report.type === 'found' ? 'Found Item' : 'Lost Item';
    resultTypeBadge.textContent = `Type: ${typeLabel}`;
  }
  if (resultSubtitle) {
    resultSubtitle.textContent = report.type === 'issue' ? 'Campus Maintenance Report' : report.type === 'found' ? 'Found Item Report' : 'Lost Item Report';
  }

  // Status Badge - Standardized 4 Statuses
  const currentStatus = normalizeStatus(report.status);
  resultStatusBadge.textContent = currentStatus;
  resultStatusBadge.className = `badge ${getStatusBadgeClass(currentStatus)} badge-xl`;

  // Render Full Update History Timeline
  renderHistoryTimeline(report);
}

/**
 * Normalizes any report status to one of the 4 canonical statuses:
 * OPEN, MATCH FOUND, IN PROGRESS, RESOLVED
 */
function normalizeStatus(status) {
  if (!status) return 'OPEN';
  const s = String(status).trim().toUpperCase();
  if (s === 'OPEN') return 'OPEN';
  if (s.includes('MATCH')) return 'MATCH FOUND';
  if (s.includes('PROGRESS') || s.includes('ASSIGN')) return 'IN PROGRESS';
  if (s.includes('RESOLV') || s.includes('RETURN') || s.includes('CLAIM') || s.includes('CLOSE') || s.includes('EXPIRE')) return 'RESOLVED';
  return 'OPEN';
}

/**
 * Maps status string to badge CSS class:
 * OPEN -> badge-open (Red)
 * MATCH FOUND -> badge-match (Yellow)
 * IN PROGRESS -> badge-in-progress (Purple)
 * RESOLVED -> badge-resolved (Green)
 * @param {string} status 
 * @returns {string} CSS class
 */
function getStatusBadgeClass(status) {
  const norm = normalizeStatus(status);
  switch (norm) {
    case 'OPEN':
      return 'badge-open';
    case 'MATCH FOUND':
      return 'badge-match';
    case 'IN PROGRESS':
      return 'badge-in-progress';
    case 'RESOLVED':
      return 'badge-resolved';
    default:
      return 'badge-open';
  }
}

/**
 * Renders the full chronological history timeline
 * @param {Object} report 
 */
function renderHistoryTimeline(report) {
  let historyList = [];

  if (Array.isArray(report.history) && report.history.length > 0) {
    historyList = [...report.history];
  } else {
    // Fallback if legacy item without history array
    historyList = [
      {
        status: report.status || 'OPEN',
        timestamp: report.createdAt || new Date().toISOString(),
        remark: 'Report submitted by student'
      }
    ];
  }

  // Sort history: latest on top for easy status tracking
  // We will display them with newest on top, marked as latest
  const sortedHistory = [...historyList].sort((a, b) => {
    const tA = new Date(a.timestamp || 0).getTime();
    const tB = new Date(b.timestamp || 0).getTime();
    return tB - tA; // descending
  });

  timelineContainer.innerHTML = sortedHistory.map((entry, index) => {
    const isLatest = index === 0;
    const normStatus = normalizeStatus(entry.status);
    const badgeClass = getStatusBadgeClass(normStatus);
    const formattedTime = formatDateTime(entry.timestamp);

    return `
      <div class="timeline-item ${isLatest ? 'is-latest' : ''}">
        <div class="timeline-node">
          <div class="timeline-dot ${badgeClass}"></div>
          ${index < sortedHistory.length - 1 ? '<div class="timeline-line"></div>' : ''}
        </div>
        <div class="timeline-body">
          <div class="timeline-top">
            <div class="timeline-status-group">
              <span class="badge ${badgeClass}">${escapeHtml(normStatus)}</span>
              ${isLatest ? '<span class="latest-tag">Latest Update</span>' : ''}
            </div>
            <time class="timeline-time" datetime="${escapeHtml(entry.timestamp)}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              ${formattedTime}
            </time>
          </div>
          <div class="timeline-remark">
            <p>${escapeHtml(entry.remark || 'No remark entered for this update.')}</p>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Formats ISO date time string to human readable format
 * @param {string} isoString 
 * @returns {string} Formatted date/time
 */
function formatDateTime(isoString) {
  if (!isoString) return 'Date not available';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
}

/**
 * Displays validation error under the input box
 * @param {string} msg 
 */
function showInputError(msg) {
  trackInputError.textContent = msg;
  trackInputError.style.display = 'block';
}

/**
 * Hides input validation error
 */
function hideInputError() {
  trackInputError.textContent = '';
  trackInputError.style.display = 'none';
}

// Copy Report ID to Clipboard
copyResultIdBtn.addEventListener('click', () => {
  const idText = resultReportId.textContent;
  if (!idText) return;

  navigator.clipboard.writeText(idText).then(() => {
    showToast(`Copied ${idText} to clipboard!`, 'success');
  }).catch(() => {
    showToast('Failed to copy ID to clipboard', 'error');
  });
});

/**
 * Helper to truncate long strings
 */
function truncate(str, maxLen = 20) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

/**
 * Helper to escape HTML characters
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Displays toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}
