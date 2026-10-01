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
  userLogoutBtn.addEventListener('click', () => {
    localStorage.removeItem('campusCare_session');
    sessionStorage.removeItem('campusCare_session');
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
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();

  // Initialize realistic demo reports if visiting for the first time
  initializeDemoReportsIfEmpty();
  renderRecentIssues();
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
  initializeDemoReportsIfEmpty();
  try {
    const data = localStorage.getItem(STORAGE_KEY_REPORTS);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading localStorage:', err);
    return [];
  }
}

/**
 * Saves report to localStorage
 * @param {Object} report 
 */
function saveReport(report) {
  const reports = getStoredReports();
  reports.unshift(report); // Add new reports to top
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
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
form.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!validateForm()) {
    showToast('Please fix the errors before submitting.', 'error');
    return;
  }

  const uniqueId = generateUniqueIssueId();
  const selectedCat = categorySelect.value;
  const assignedDepartment = DEPARTMENT_MAP[selectedCat] || 'Campus Facilities & Administration';
  
  const createdTimestamp = new Date().toISOString();
  const assignedTimestamp = new Date(Date.now() + 500).toISOString();
  const todayDate = new Date().toISOString().split('T')[0];

  // Create issue report object with Open status -> auto-assigned to responsible department
  const newReport = {
    id: uniqueId,
    type: 'issue',
    itemName: `${selectedCat} Issue`,
    category: selectedCat,
    date: todayDate,
    location: locationInput.value.trim(),
    description: descriptionInput.value.trim(),
    department: assignedDepartment,
    studentName: studentNameInput.value.trim() || 'Anonymous Student',
    phone: phoneNumberInput.value.trim(),
    contact: phoneNumberInput.value.trim(),
    status: 'Assigned', // Automatically updated to Assigned
    createdAt: createdTimestamp,
    history: [
      {
        status: 'Open',
        timestamp: createdTimestamp,
        remark: 'Campus issue report logged by student'
      },
      {
        status: 'Assigned',
        timestamp: assignedTimestamp,
        remark: `Automatically assigned to ${assignedDepartment} for inspection and resolution`
      }
    ]
  };

  // Save to localStorage
  saveReport(newReport);

  // Update UI and show confirmation modal
  showSuccessModal(newReport);
  renderRecentIssues();
  showToast(`Issue ${uniqueId} logged and assigned to ${assignedDepartment}!`, 'success');
});

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

  recentIssuesList.innerHTML = issueReports.map(report => `
    <div class="recent-item-card">
      <div class="recent-card-top">
        <span class="recent-id">${escapeHtml(report.id)}</span>
        <a href="track.html?id=${encodeURIComponent(report.id)}" class="badge badge-assigned" style="text-decoration:none; cursor:pointer;" title="Click to track status">
          ${escapeHtml(report.status)} &rarr;
        </a>
      </div>
      <div class="recent-name">${escapeHtml(report.itemName)}</div>
      <div class="recent-dept">Dept: ${escapeHtml(report.department || 'Facilities')}</div>
      <div class="recent-meta">
        <span>Location: ${escapeHtml(report.location)}</span>
        <span>Date: ${escapeHtml(report.date)}</span>
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
