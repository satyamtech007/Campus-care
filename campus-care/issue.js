/**
 * Campus Care - Issue Reporting & Facilities Management
 * Report Campus Issue Logic & Automated Department Assignment
 */

// Storage Keys
const STORAGE_KEY_REPORTS = 'campusCare_reports';

// Category to Department Mapping
const DEPARTMENT_MAP = {
  'Electricity': 'Electrical Maintenance & Power Division',
  'Plumbing': 'Water Supply & Plumbing Department',
  'Cleanliness': 'Sanitation & Housekeeping Team',
  'Furniture': 'Campus Infrastructure & Carpentry Division',
  'Wi-Fi': 'IT Support & Network Operations Center (NOC)',
  'Other': 'Campus Facilities & Administration'
};

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
  userLogoutBtn.addEventListener('click', async () => {
    localStorage.removeItem('campusCare_session');
    sessionStorage.removeItem('campusCare_session');
    localStorage.removeItem('campusCare_reports');
    await CampusCareFirebase.auth.signOut();
    window.location.href = 'index.html?logout=true';
  });
}

// DOM Elements - Form
const form = document.getElementById('campusIssueForm');
const categorySelect = document.getElementById('category');
const deptPreview = document.getElementById('deptPreview');
const deptPreviewName = document.getElementById('deptPreviewName');
const locationInput = document.getElementById('location');
const descriptionInput = document.getElementById('description');
const studentNameInput = document.getElementById('studentName');
const phoneNumberInput = document.getElementById('phoneNumber');

// Modal Elements
const successModal = document.getElementById('successModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalTrackBtn = document.getElementById('modalTrackBtn');
const copyIdBtn = document.getElementById('copyIdBtn');
const modalReportId = document.getElementById('modalReportId');
const modalDepartment = document.getElementById('modalDepartment');
const modalCategory = document.getElementById('modalCategory');
const modalLocation = document.getElementById('modalLocation');

// Recent Reports Elements
const recentIssuesList = document.getElementById('recentIssuesList');
const issueCountBadge = document.getElementById('issueCountBadge');
const toastContainer = document.getElementById('toastContainer');

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  try {
    await CampusCareFirebase.loadMyReports();
  } catch (error) {
    showToast('Could not load your reports from Firebase. Please refresh and try again.', 'error');
    console.error(error);
  }
  renderRecentIssues();

  try {
    const student = await getAuthenticatedStudent();
    if (student && student.studentName && studentNameInput && !studentNameInput.value) {
      studentNameInput.placeholder = `Logged in as: ${student.studentName}`;
    }
  } catch (err) {
    console.warn('Initialization note:', err);
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

// Real-time Department Preview
categorySelect.addEventListener('change', () => {
  const cat = categorySelect.value;
  if (cat && DEPARTMENT_MAP[cat]) {
    deptPreviewName.textContent = DEPARTMENT_MAP[cat];
    deptPreview.style.display = 'inline-flex';
  } else {
    deptPreview.style.display = 'none';
  }
});

/**
 * Retrieves all stored reports from localStorage
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
 * Ensures Firebase is fully initialized and retrieves the current authenticated student
 */
async function getAuthenticatedStudent() {
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK is not loaded. Please check your network connection.');
  }

  // Ensure Firebase app is initialized
  if (!firebase.apps.length && window.CampusCareFirebase && CampusCareFirebase.config) {
    firebase.initializeApp(CampusCareFirebase.config);
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  // Wait for auth state to be resolved
  const user = await new Promise((resolve) => {
    const unsub = auth.onAuthStateChanged(u => {
      unsub();
      resolve(u);
    }, () => resolve(null));
  });

  let profile = null;
  if (user) {
    try {
      const snap = await db.collection('users').doc(user.uid).get();
      if (snap.exists) {
        profile = snap.data();
      }
    } catch (e) {
      console.warn('Could not read user profile from Firestore:', e);
    }
  }

  // Fallback to local session if auth state is delayed or in demo mode
  let session = null;
  try {
    const raw = sessionStorage.getItem('campusCare_session') || localStorage.getItem('campusCare_session');
    if (raw) session = JSON.parse(raw);
  } catch (_) {}

  const uid = (user && user.uid) || (session && session.uid) || null;
  const studentID = (profile && (profile.studentID || profile.studentId)) || (session && (session.studentID || session.studentId)) || uid || '';
  const studentName = (profile && (profile.name || profile.fullName)) || (session && session.name) || (user && user.displayName) || (user && user.email) || '';

  return {
    user,
    profile,
    uid,
    studentID,
    studentName,
    db
  };
}

/**
 * Saves report to Firestore 'reports' collection and updates local storage
 * @param {Object} report 
 */
async function saveReport(report) {
  // Use CampusCareFirebase.createReport if available
  if (window.CampusCareFirebase && CampusCareFirebase.createReport) {
    return await CampusCareFirebase.createReport(report);
  }

  // Fallback direct Firestore write
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    throw new Error('Firebase Firestore is not initialized.');
  }

  const db = firebase.firestore();
  await db.collection('reports').doc(String(report.id)).set(report);

  // Update local cache
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_REPORTS) || '[]');
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify([report, ...existing.filter(i => i.id !== report.id)]));
  } catch (_) {}

  return report;
}

/**
 * Generates a unique Issue Report ID (e.g. ISSUE-87391)
 * @returns {string} Unique ID
 */
function generateUniqueIssueId() {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `ISSUE-${randomNum}`;
}

/**
 * Validates the form fields
 * Requirements: category, location, description are mandatory
 * @returns {boolean} True if all fields are valid
 */
function validateForm() {
  let isValid = true;

  clearErrors();

  // Validate Category
  if (!categorySelect.value) {
    showError('category', 'Please select the issue category');
    isValid = false;
  }

  // Validate Location
  if (!locationInput.value.trim()) {
    showError('location', 'Location or room number is required');
    isValid = false;
  } else if (locationInput.value.trim().length < 3) {
    showError('location', 'Please provide a more specific location (e.g. Science Block Lab 204)');
    isValid = false;
  }

  // Validate Description
  if (!descriptionInput.value.trim()) {
    showError('description', 'Detailed description of the issue is required');
    isValid = false;
  } else if (descriptionInput.value.trim().length < 10) {
    showError('description', 'Description should be at least 10 characters long');
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
[categorySelect, locationInput, descriptionInput, phoneNumberInput].forEach(elem => {
  if (elem) {
    elem.addEventListener('input', () => {
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
 * Handles form submission with automated routing
 */
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const errBanner = document.getElementById('formSubmitError');
    if (errBanner) {
      errBanner.style.display = 'none';
      errBanner.textContent = '';
    }

    if (!validateForm()) {
      showToast('Please fix the errors before submitting.', 'error');
      return;
    }

    const submitBtn = document.getElementById('submitBtn');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <div style="display:inline-block; width:16px; height:16px; border:2px solid #ffffff; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:8px; vertical-align:middle;"></div>
        <span>Saving to Firestore...</span>
      `;
    }

    try {
      // 1. Ensure Firebase is ready and get logged-in student info
      const student = await getAuthenticatedStudent();
      if (!student || !student.user) {
        throw new Error('You must be signed in with a student account to submit a report. Please log in first.');
      }

      const uniqueId = generateUniqueIssueId();
      const selectedCat = categorySelect.value;
      const assignedDepartment = DEPARTMENT_MAP[selectedCat] || 'Campus Facilities & Administration';
      
      const createdTimestamp = new Date().toISOString();
      const todayDate = new Date().toISOString().split('T')[0];

      const enteredName = studentNameInput ? studentNameInput.value.trim() : '';
      const finalStudentName = enteredName || student.studentName || 'Student';

      // 2. Create issue report object with attached user credentials
      const newReport = {
        id: uniqueId,
        reportId: uniqueId,
        type: 'issue',
        itemName: `${selectedCat} Issue`,
        category: selectedCat,
        date: todayDate,
        location: locationInput.value.trim(),
        description: descriptionInput.value.trim(),
        department: assignedDepartment,
        studentName: finalStudentName,
        studentID: student.studentID || student.uid,
        studentId: student.studentID || student.uid,
        uid: student.uid,
        ownerUid: student.uid,
        phone: phoneNumberInput.value.trim(),
        contact: phoneNumberInput.value.trim(),
        status: 'OPEN', // Standardized default status
        createdAt: createdTimestamp,
        history: [
          {
            status: 'OPEN',
            timestamp: createdTimestamp,
            remark: `Campus issue report logged for ${assignedDepartment} (Pending Admin review)`
          }
        ]
      };

      // 3. Save report to Firestore
      await saveReport(newReport);

      // 4. Clear form upon successful save
      form.reset();
      if (deptPreview) deptPreview.style.display = 'none';
      clearErrors();

      // 5. Update UI, display confirmation modal and success toast
      showSuccessModal(newReport);
      renderRecentIssues();
      showToast(`Issue ${uniqueId} logged and assigned to ${assignedDepartment}!`, 'success');
    } catch (error) {
      console.error('Error saving issue report to Firestore:', error);
      const errorMsg = error.message || 'Could not save the report to Firestore. Please try again.';
      if (errBanner) {
        errBanner.textContent = errorMsg;
        errBanner.style.display = 'block';
        errBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      showToast(errorMsg, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  });
}

/**
 * Populates and shows the success modal dialog
 * @param {Object} report 
 */
function showSuccessModal(report) {
  modalReportId.textContent = report.id;
  modalDepartment.textContent = report.department;
  modalCategory.textContent = report.category;
  modalLocation.textContent = report.location;

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
  deptPreview.style.display = 'none';
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
 * Renders the recent campus issues stored in localStorage
 */
function renderRecentIssues() {
  const allReports = getStoredReports();
  const issueReports = allReports.filter(r => r.type === 'issue');

  issueCountBadge.textContent = issueReports.length;

  if (issueReports.length === 0) {
    recentIssuesList.innerHTML = `
      <div class="empty-state">
        <p>No campus issues reported yet.</p>
      </div>
    `;
    return;
  }

  recentIssuesList.innerHTML = issueReports.map(report => {
    const norm = normalizeStatus(report.status);
    const badgeCls = getStatusBadgeClass(norm);
    return `
      <div class="recent-item-card">
        <div class="recent-card-top">
          <span class="recent-id">${escapeHtml(report.id)}</span>
          <a href="track.html?id=${encodeURIComponent(report.id)}" class="badge ${badgeCls}" style="text-decoration:none; cursor:pointer;" title="Click to track status">
            ${escapeHtml(norm)} &rarr;
          </a>
        </div>
        <div class="recent-name">${escapeHtml(report.itemName)}</div>
        <div class="recent-dept">Dept: ${escapeHtml(report.department || 'Facilities')}</div>
        <div class="recent-meta">
          <span>Location: ${escapeHtml(report.location)}</span>
          <span>Date: ${escapeHtml(report.date)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function normalizeStatus(status) {
  if (!status) return 'OPEN';
  const s = String(status).trim().toUpperCase();
  if (s === 'OPEN') return 'OPEN';
  if (s.includes('MATCH')) return 'MATCH FOUND';
  if (s.includes('PROGRESS') || s.includes('ASSIGN')) return 'IN PROGRESS';
  if (s.includes('RESOLV') || s.includes('RETURN') || s.includes('CLAIM') || s.includes('CLOSE') || s.includes('EXPIRE')) return 'RESOLVED';
  return 'OPEN';
}

function getStatusBadgeClass(status) {
  const norm = normalizeStatus(status);
  switch (norm) {
    case 'OPEN': return 'badge-open';
    case 'MATCH FOUND': return 'badge-match';
    case 'IN PROGRESS': return 'badge-in-progress';
    case 'RESOLVED': return 'badge-resolved';
    default: return 'badge-open';
  }
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
 * Displays brief toast notification with prominent styling for errors and success
 */
function showToast(message, type = 'info') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  if (type === 'error') {
    toast.style.background = '#b91c1c';
    toast.style.color = '#ffffff';
    toast.style.boxShadow = '0 8px 24px rgba(185, 28, 28, 0.4)';
    toast.style.border = '1px solid #ef4444';
  } else if (type === 'success') {
    toast.style.background = '#15803d';
    toast.style.color = '#ffffff';
    toast.style.boxShadow = '0 8px 24px rgba(21, 128, 61, 0.35)';
    toast.style.border = '1px solid #22c55e';
  }

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
  }, 4500);
}
