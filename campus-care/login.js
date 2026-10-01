/**
 * Campus Care - Authentication & Portal Selection Logic
 * Handles Student vs Admin entry points, validation, and session routing
 */

// Storage Keys
const STORAGE_KEY_SESSION = 'campusCare_session';
const STORAGE_KEY_REPORTS = 'campusCare_reports';

// Demo Credentials Store
const DEMO_ACCOUNTS = {
  student: [
    { username: 'student', password: 'CampusCare@Student26', name: 'Alex Smith (21CS042)', role: 'student' },
    { username: 'alex', password: 'CampusCare@Student26', name: 'Alex Smith (21CS042)', role: 'student' }
  ],
  admin: [
    { username: 'admin', password: 'CampusCare@Admin26', name: 'Campus Care Administrator', role: 'admin' },
    { username: 'admin2', password: 'CampusCare@Admin26', name: 'Facilities Admin Officer', role: 'admin' }
  ]
};

// DOM Elements - Views
const portalSelectionView = document.getElementById('portalSelectionView');
const loginFormView = document.getElementById('loginFormView');
const authAlert = document.getElementById('authAlert');

// DOM Elements - Selection Choice Buttons
const chooseStudentCard = document.getElementById('chooseStudentCard');
const chooseAdminCard = document.getElementById('chooseAdminCard');
const openStudentLoginBtn = document.getElementById('openStudentLoginBtn');
const openAdminLoginBtn = document.getElementById('openAdminLoginBtn');
const backToSelectionBtn = document.getElementById('backToSelectionBtn');

// DOM Elements - Form & Tabs
const tabStudentBtn = document.getElementById('tabStudentBtn');
const tabAdminBtn = document.getElementById('tabAdminBtn');
const activeRoleInput = document.getElementById('activeRole');
const formTitleText = document.getElementById('formTitleText');
const formSubtext = document.getElementById('formSubtext');
const submitBtnText = document.getElementById('submitBtnText');
const portalLoginForm = document.getElementById('portalLoginForm');
const loginUsernameInput = document.getElementById('loginUsername');
const loginPasswordInput = document.getElementById('loginPassword');
const loginErrorMsg = document.getElementById('loginErrorMsg');

// DOM Elements - Demo Chips
const fillStudentDemoBtn = document.getElementById('fillStudentDemoBtn');
const fillAdminDemoBtn = document.getElementById('fillAdminDemoBtn');
const toastContainer = document.getElementById('toastContainer');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();

  // Initialize realistic demo reports if visiting for the first time
  initializeDemoReportsIfEmpty();

  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.get('error') === 'unauthorized') {
    if (authAlert) {
      authAlert.innerHTML = `
        <strong>Access Restricted</strong>
        <p>The Admin Dashboard is restricted. Please sign in with an Admin account to access management tools.</p>
      `;
      authAlert.style.display = 'block';
    }
    openLoginForm('admin');
  } else if (urlParams.get('logout') === 'true') {
    showToast('Logged out successfully.', 'info');
    showSelectionView();
  } else if (urlParams.get('role') === 'admin') {
    openLoginForm('admin');
  } else if (urlParams.get('role') === 'student') {
    openLoginForm('student');
  } else {
    showSelectionView();
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

// Switch Views
function showSelectionView() {
  if (portalSelectionView) portalSelectionView.style.display = 'block';
  if (loginFormView) loginFormView.style.display = 'none';
  clearErrors();
}

function openLoginForm(role) {
  if (portalSelectionView) portalSelectionView.style.display = 'none';
  if (loginFormView) loginFormView.style.display = 'block';
  setRole(role);
  if (loginUsernameInput) loginUsernameInput.focus();
}

// Attach Selection Card Listeners
if (chooseStudentCard) chooseStudentCard.addEventListener('click', () => openLoginForm('student'));
if (chooseAdminCard) chooseAdminCard.addEventListener('click', () => openLoginForm('admin'));
if (openStudentLoginBtn) openStudentLoginBtn.addEventListener('click', (e) => { e.stopPropagation(); openLoginForm('student'); });
if (openAdminLoginBtn) openAdminLoginBtn.addEventListener('click', (e) => { e.stopPropagation(); openLoginForm('admin'); });
if (backToSelectionBtn) backToSelectionBtn.addEventListener('click', showSelectionView);

// Tab Switching
if (tabStudentBtn) tabStudentBtn.addEventListener('click', () => setRole('student'));
if (tabAdminBtn) tabAdminBtn.addEventListener('click', () => setRole('admin'));

function setRole(role) {
  if (activeRoleInput) activeRoleInput.value = role;

  if (role === 'student') {
    if (tabStudentBtn) tabStudentBtn.classList.add('active');
    if (tabAdminBtn) tabAdminBtn.classList.remove('active');
    if (formTitleText) formTitleText.textContent = 'Student Login';
    if (formSubtext) formSubtext.textContent = 'Sign in to file and track campus reports';
    if (submitBtnText) submitBtnText.textContent = 'Sign In as Student';
    if (loginUsernameInput) loginUsernameInput.placeholder = 'e.g. student or 21CS042';
  } else {
    if (tabAdminBtn) tabAdminBtn.classList.add('active');
    if (tabStudentBtn) tabStudentBtn.classList.remove('active');
    if (formTitleText) formTitleText.textContent = 'Admin Login';
    if (formSubtext) formSubtext.textContent = 'Sign in to manage and verify campus operations';
    if (submitBtnText) submitBtnText.textContent = 'Sign In as Admin';
    if (loginUsernameInput) loginUsernameInput.placeholder = 'e.g. admin';
  }
  clearErrors();
}

// Auto-fill Demo Credentials
if (fillStudentDemoBtn) {
  fillStudentDemoBtn.addEventListener('click', () => {
    setRole('student');
    if (loginUsernameInput) loginUsernameInput.value = 'student';
    if (loginPasswordInput) loginPasswordInput.value = 'CampusCare@Student26';
    clearErrors();
    showToast('Filled Student demo credentials', 'info');
  });
}

if (fillAdminDemoBtn) {
  fillAdminDemoBtn.addEventListener('click', () => {
    setRole('admin');
    if (loginUsernameInput) loginUsernameInput.value = 'admin';
    if (loginPasswordInput) loginPasswordInput.value = 'CampusCare@Admin26';
    clearErrors();
    showToast('Filled Admin demo credentials', 'info');
  });
}

// Real-time error clear
if (loginUsernameInput && loginPasswordInput) {
  [loginUsernameInput, loginPasswordInput].forEach(elem => {
    elem.addEventListener('input', clearErrors);
  });
}

function clearErrors() {
  if (loginErrorMsg) {
    loginErrorMsg.style.display = 'none';
    loginErrorMsg.textContent = '';
  }
  document.querySelectorAll('.form-group').forEach(g => g.classList.remove('has-error'));
  document.querySelectorAll('.error-msg').forEach(e => e.textContent = '');
}

/**
 * Handle Form Submit
 */
if (portalLoginForm) {
  portalLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const role = activeRoleInput ? activeRoleInput.value : 'student';
    const username = loginUsernameInput ? loginUsernameInput.value.trim().toLowerCase() : '';
    const password = loginPasswordInput ? loginPasswordInput.value : '';

    let isValid = true;

    if (!username) {
      showFieldError('loginUsername', 'Username is required');
      isValid = false;
    }

    if (!password) {
      showFieldError('loginPassword', 'Password is required');
      isValid = false;
    }

    if (!isValid) return;

    // Validate against demo accounts
    const accounts = DEMO_ACCOUNTS[role] || [];
    const matched = accounts.find(acc => acc.username.toLowerCase() === username && acc.password === password);

    if (!matched) {
      if (loginErrorMsg) {
        loginErrorMsg.textContent = `Invalid ${role} username or password. Please verify your credentials or click a demo account below.`;
        loginErrorMsg.style.display = 'block';
      }
      return;
    }

    // Save session
    const session = {
      username: matched.username,
      name: matched.name,
      role: matched.role,
      loggedInAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));

    showToast(`Welcome, ${matched.name}!`, 'success');

    // Route to appropriate section
    setTimeout(() => {
      if (matched.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'lost.html';
      }
    }, 400);
  });
}

function showFieldError(fieldId, msg) {
  const group = document.getElementById(`group-${fieldId}`);
  const err = document.getElementById(`err-${fieldId}`);
  if (group && err) {
    group.classList.add('has-error');
    err.textContent = msg;
  }
}

/**
 * Toast Notifications
 */
function showToast(message, type = 'info') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3000);
}
