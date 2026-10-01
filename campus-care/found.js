/**
 * Campus Care - Lost & Found Management System
 * Report Found Item Logic (with Private Owner Verification)
 */

// Storage Keys & Expiry Configuration
const STORAGE_KEY_REPORTS = 'campusCare_reports';
const ITEM_EXPIRY_DAYS = 30; // Number of days before an unclaimed lost/found item report expires

// DOM Elements - Navigation
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
    localStorage.removeItem('campusCare_session');
    sessionStorage.removeItem('campusCare_session');
    window.location.href = 'index.html?logout=true';
  });
}

// DOM Elements - Form
const form = document.getElementById('foundItemForm');
const itemNameInput = document.getElementById('itemName');
const categorySelect = document.getElementById('category');
const foundDateInput = document.getElementById('foundDate');
const locationInput = document.getElementById('location');
const descriptionInput = document.getElementById('description');
const secretDetailInput = document.getElementById('secretDetail');
const studentNameInput = document.getElementById('studentName');
const phoneNumberInput = document.getElementById('phoneNumber');
const emailInput = document.getElementById('email');
const keptAtSelect = document.getElementById('keptAt');

// Modal Elements
const successModal = document.getElementById('successModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalTrackBtn = document.getElementById('modalTrackBtn');
const copyIdBtn = document.getElementById('copyIdBtn');
const modalReportId = document.getElementById('modalReportId');
const modalItemName = document.getElementById('modalItemName');
const modalCategory = document.getElementById('modalCategory');
const modalLocation = document.getElementById('modalLocation');
const modalDate = document.getElementById('modalDate');

// Recent Reports Elements
const recentFoundList = document.getElementById('recentFoundList');
const foundCountBadge = document.getElementById('foundCountBadge');
const toastContainer = document.getElementById('toastContainer');

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();

  const today = new Date().toISOString().split('T')[0];
  foundDateInput.setAttribute('max', today);
  foundDateInput.value = today;

  // Initialize realistic demo reports if visiting for the first time
  initializeDemoReportsIfEmpty();

  // Run automatic expiry check before displaying any reports
  checkAndExpireOldItemReports();

  // Load initial found reports from localStorage
  renderRecentFoundReports();
});

/**
 * Theme Toggle Functionality
 */
function initThemeToggle() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (!themeToggleBtn) return;
  const toggleText = themeToggleBtn.querySelector('.theme-toggle-text');

  function updateToggleUI(theme) {
    if (toggleText) {
      toggleText.textContent = theme === 'dark' ? 'Light' : 'Dark';
    }
    themeToggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode');
    themeToggleBtn.setAttribute('title', theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode');
  }

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateToggleUI(currentTheme);

  themeToggleBtn.addEventListener('click', () => {
    const active = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = active === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('campusCare_theme', nextTheme);
    } catch (e) {}
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
  initializeDemoReportsIfEmpty();
  checkAndExpireOldItemReports();
  checkAndRunCrossMatching();
  try {
    const data = localStorage.getItem(STORAGE_KEY_REPORTS);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading localStorage:', err);
    return [];
  }
}

/**
 * Saves report to localStorage and runs matching
 * @param {Object} report 
 */
function saveReport(report) {
  const reports = getStoredReports();
  reports.unshift(report); // Add new reports to top
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
  checkAndRunCrossMatching();
}

/**
 * Generates a unique Found Report ID (e.g. FOUND-87391)
 * @returns {string} Unique ID
 */
function generateUniqueFoundId() {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `FOUND-${randomNum}`;
}

/**
 * Validates the form fields
 * Requirements: itemName, category, foundDate, location, description, secretDetail are mandatory
 * @returns {boolean} True if all fields are valid
 */
function validateForm() {
  let isValid = true;

  // Clear previous errors
  clearErrors();

  // Validate Item Name
  if (!itemNameInput.value.trim()) {
    showError('itemName', 'Item name is required (e.g. Black Titan Watch)');
    isValid = false;
  } else if (itemNameInput.value.trim().length < 3) {
    showError('itemName', 'Item name should be at least 3 characters long');
    isValid = false;
  }

  // Validate Category
  if (!categorySelect.value) {
    showError('category', 'Please select a valid item category');
    isValid = false;
  }

  // Validate Date Found
  if (!foundDateInput.value) {
    showError('foundDate', 'Please select the date when the item was found');
    isValid = false;
  }

  // Validate Location
  if (!locationInput.value.trim()) {
    showError('location', 'Location is required (e.g. Near Cafeteria Counter)');
    isValid = false;
  } else if (locationInput.value.trim().length < 3) {
    showError('location', 'Please provide a more descriptive location');
    isValid = false;
  }

  // Validate Description
  if (!descriptionInput.value.trim()) {
    showError('description', 'General description is required to help the owner recognize their item');
    isValid = false;
  } else if (descriptionInput.value.trim().length < 10) {
    showError('description', 'Description should be at least 10 characters');
    isValid = false;
  }

  // Validate Detail only the owner would know (Secret Detail)
  if (!secretDetailInput.value.trim()) {
    showError('secretDetail', 'A confidential detail only the owner would know is required for verification');
    isValid = false;
  } else if (secretDetailInput.value.trim().length < 5) {
    showError('secretDetail', 'Please provide a clear distinguishing secret detail (at least 5 characters)');
    isValid = false;
  }

  // Validate Phone Number (10 digits required)
  const phoneClean = phoneNumberInput ? phoneNumberInput.value.trim().replace(/\D/g, '') : '';
  if (!phoneNumberInput || !phoneNumberInput.value.trim()) {
    showError('phoneNumber', 'Phone number is required');
    isValid = false;
  } else if (phoneClean.length !== 10) {
    showError('phoneNumber', 'Please enter a valid 10-digit phone number');
    isValid = false;
  }

  // Validate Item currently kept at (Required)
  if (!keptAtSelect || !keptAtSelect.value) {
    showError('keptAt', 'Please select where the item is currently kept');
    isValid = false;
  }

  return isValid;
}

/**
 * Displays error message for a specific input
 */
function showError(fieldId, message) {
  const group = document.getElementById(`group-${fieldId}`);
  const errSpan = document.getElementById(`err-${fieldId}`);
  if (group && errSpan) {
    group.classList.add('has-error');
    errSpan.textContent = message;
  }
}

/**
 * Clears all error states from form
 */
function clearErrors() {
  const groups = document.querySelectorAll('.form-group');
  groups.forEach(g => g.classList.remove('has-error'));
  const errSpans = document.querySelectorAll('.error-msg');
  errSpans.forEach(s => {
    s.textContent = '';
  });
}

// Attach real-time validation clear on input
[itemNameInput, categorySelect, foundDateInput, locationInput, descriptionInput, secretDetailInput, phoneNumberInput, emailInput, keptAtSelect].forEach(elem => {
  if (elem) {
    elem.addEventListener('input', () => {
      const group = elem.closest('.form-group');
      if (group && group.classList.contains('has-error')) {
        group.classList.remove('has-error');
        const errSpan = group.querySelector('.error-msg');
        if (errSpan) errSpan.textContent = '';
      }
    });
    elem.addEventListener('change', () => {
      const group = elem.closest('.form-group');
      if (group && group.classList.contains('has-error')) {
        group.classList.remove('has-error');
        const errSpan = group.querySelector('.error-msg');
        if (errSpan) errSpan.textContent = '';
      }
    });
  }
});

/**
 * Handles form submission
 */
form.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!validateForm()) {
    showToast('Please fix the errors in the form before submitting.', 'error');
    return;
  }

  const uniqueId = generateUniqueFoundId();
  const timestamp = new Date().toISOString();

  // Create found report object
  const newReport = {
    id: uniqueId,
    type: 'found',
    itemName: itemNameInput.value.trim(),
    category: categorySelect.value,
    date: foundDateInput.value,
    location: locationInput.value.trim(),
    description: descriptionInput.value.trim(),
    secretDetail: secretDetailInput.value.trim(), // Stored securely; NEVER exposed publicly
    studentName: studentNameInput.value.trim() || 'Anonymous Finder',
    phone: phoneNumberInput.value.trim(),
    contact: phoneNumberInput.value.trim(),
    email: emailInput && emailInput.value.trim() ? emailInput.value.trim() : 'Not provided',
    keptAt: keptAtSelect && keptAtSelect.value ? keptAtSelect.value : 'Not provided',
    status: 'Open',
    createdAt: timestamp,
    history: [
      {
        status: 'Open',
        timestamp: timestamp,
        remark: 'Found item report submitted by finder'
      }
    ]
  };

  // Save to localStorage
  saveReport(newReport);

  // Update UI and show confirmation modal
  showSuccessModal(newReport);
  renderRecentFoundReports();
  showToast(`Found Report ${uniqueId} saved successfully!`, 'success');
});

/**
 * Populates and shows the success modal dialog
 * @param {Object} report 
 */
function showSuccessModal(report) {
  modalReportId.textContent = report.id;
  modalItemName.textContent = report.itemName;
  modalCategory.textContent = report.category;
  modalLocation.textContent = report.location;
  modalDate.textContent = report.date;

  successModal.classList.add('active');
  successModal.setAttribute('aria-hidden', 'false');
}

/**
 * Closes the success modal and resets form
 */
function closeModal() {
  successModal.classList.remove('active');
  successModal.setAttribute('aria-hidden', 'true');
  form.reset();
  const today = new Date().toISOString().split('T')[0];
  foundDateInput.value = today;
  clearErrors();
}

modalCloseBtn.addEventListener('click', closeModal);

if (modalTrackBtn) {
  modalTrackBtn.addEventListener('click', () => {
    const id = modalReportId.textContent;
    if (id) {
      window.location.href = `track.html?id=${encodeURIComponent(id)}`;
    }
  });
}

// Close modal when clicking outside dialog
successModal.addEventListener('click', (e) => {
  if (e.target === successModal) {
    closeModal();
  }
});

// Copy Report ID to Clipboard
copyIdBtn.addEventListener('click', () => {
  const idText = modalReportId.textContent;
  navigator.clipboard.writeText(idText).then(() => {
    showToast(`Copied ${idText} to clipboard!`);
  }).catch(() => {
    showToast('Failed to copy ID to clipboard', 'error');
  });
});

/**
 * Renders the recent found reports stored in localStorage (filtered to found items)
 * Note: NEVER renders the secretDetail on any public view
 */
function renderRecentFoundReports() {
  const allReports = getStoredReports();
  const foundReports = allReports.filter(r => r.type === 'found');

  foundCountBadge.textContent = foundReports.length;

  if (foundReports.length === 0) {
    recentFoundList.innerHTML = `
      <div class="empty-state">
        <p>No found items registered yet.</p>
      </div>
    `;
    return;
  }

  recentFoundList.innerHTML = foundReports.map(report => `
    <div class="recent-item-card">
      <div class="recent-card-top">
        <span class="recent-id">${escapeHtml(report.id)}</span>
        <a href="track.html?id=${encodeURIComponent(report.id)}" class="badge badge-open" style="text-decoration:none; cursor:pointer;" title="Click to track status">
          ${escapeHtml(report.status)} &rarr;
        </a>
      </div>
      <div class="recent-name">${escapeHtml(report.itemName)}</div>
      <div class="recent-meta">
        <span>Location: ${escapeHtml(report.location)}</span>
        <span>Date: ${escapeHtml(report.date)}</span>
        <span>Category: ${escapeHtml(report.category)}</span>
      </div>
    </div>
  `).join('');
}

/**
 * Helper to escape HTML characters to prevent XSS
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
 * Displays brief toast notification
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
  }, 3500);
}
