/**
 * Campus Care - Authentication & Portal Selection Logic
 * Handles Student vs Admin entry points, validation, and session routing
 */

// Storage Keys
const STORAGE_KEY_SESSION = 'campusCare_session';
const STORAGE_KEY_REPORTS = 'campusCare_reports';

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

const toastContainer = document.getElementById('toastContainer');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();

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
  } else if (urlParams.get('registered') === 'true') {
    openLoginForm('student');
    showToast('Registration successful! Please sign in with your email and password.', 'success');
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
        status: 'MATCH FOUND',
        createdAt: getDemoRelativeISO(-3, 2),
        history: [
          {
            status: 'OPEN',
            timestamp: getDemoRelativeISO(-3, 2),
            remark: 'Report submitted and pending Admin review'
          },
          {
            status: 'MATCH FOUND',
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
        status: 'MATCH FOUND',
        createdAt: getDemoRelativeISO(-2, 3),
        history: [
          {
            status: 'OPEN',
            timestamp: getDemoRelativeISO(-2, 3),
            remark: 'Report submitted and pending Admin review'
          },
          {
            status: 'MATCH FOUND',
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
        status: 'OPEN',
        createdAt: getDemoRelativeISO(-1, 1),
        history: [
          {
            status: 'OPEN',
            timestamp: getDemoRelativeISO(-1, 1),
            remark: 'Report submitted and pending Admin review'
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
        status: 'IN PROGRESS',
        createdAt: getDemoRelativeISO(-4, 2),
        history: [
          {
            status: 'OPEN',
            timestamp: getDemoRelativeISO(-4, 2),
            remark: 'Report submitted and pending Admin review'
          },
          {
            status: 'IN PROGRESS',
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
        status: 'RESOLVED',
        createdAt: getDemoRelativeISO(-6, 1),
        history: [
          {
            status: 'OPEN',
            timestamp: getDemoRelativeISO(-6, 1),
            remark: 'Report submitted and pending Admin review'
          },
          {
            status: 'IN PROGRESS',
            timestamp: getDemoRelativeISO(-5, 4),
            remark: 'Plumbing technician arrived on site. Main valve shut off for gasket replacement.'
          },
          {
            status: 'RESOLVED',
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
    const submitBtnTextHover = document.getElementById('submitBtnTextHover');
    if (submitBtnTextHover) submitBtnTextHover.textContent = 'Sign In as Student';
    if (loginUsernameInput) loginUsernameInput.placeholder = 'you@college.edu';
  } else {
    if (tabAdminBtn) tabAdminBtn.classList.add('active');
    if (tabStudentBtn) tabStudentBtn.classList.remove('active');
    if (formTitleText) formTitleText.textContent = 'Admin Login';
    if (formSubtext) formSubtext.textContent = 'Sign in to manage and verify campus operations';
    if (submitBtnText) submitBtnText.textContent = 'Sign In as Admin';
    const submitBtnTextHover = document.getElementById('submitBtnTextHover');
    if (submitBtnTextHover) submitBtnTextHover.textContent = 'Sign In as Admin';
    if (loginUsernameInput) loginUsernameInput.placeholder = 'admin@college.edu';
  }

  const studentRegisterLink = document.getElementById('studentRegisterLink');
  if (studentRegisterLink) {
    studentRegisterLink.style.display = role === 'student' ? 'block' : 'none';
  }
  clearErrors();
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
  portalLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const role = activeRoleInput ? activeRoleInput.value : 'student';
    const email = loginUsernameInput ? loginUsernameInput.value.trim().toLowerCase() : '';
    const password = loginPasswordInput ? loginPasswordInput.value : '';

    if (!email) return showFieldError('loginUsername', 'Email address is required');
    if (!password) return showFieldError('loginPassword', 'Password is required');

    const button = document.getElementById('loginSubmitBtn');
    if (button) button.disabled = true;

    try {
      const credential = await CampusCareFirebase.auth.signInWithEmailAndPassword(email, password);
      const profile = await CampusCareFirebase.profileFor(credential.user);
      if (!profile || !['student', 'admin'].includes(profile.role)) {
        await CampusCareFirebase.auth.signOut();
        throw new Error('Your account profile is missing. Ask the Campus Care administrator to finish setting up your profile.');
      }
      if (profile.role !== role) {
        await CampusCareFirebase.auth.signOut();
        throw new Error(`This account is registered as ${profile.role}. Choose the matching login portal.`);
      }

      const session = {
        uid: credential.user.uid,
        email: credential.user.email,
        name: profile.name || credential.user.email,
        role: profile.role,
        loggedInAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      window.location.href = profile.role === 'admin' ? 'admin.html' : 'lost.html';
    } catch (error) {
      if (loginErrorMsg) {
        const authErrors = {
          'auth/invalid-credential': 'Email or password is incorrect.',
          'auth/user-not-found': 'No account exists for this email.',
          'auth/wrong-password': 'Email or password is incorrect.',
          'auth/too-many-requests': 'Too many attempts. Wait a little and try again.',
          'auth/network-request-failed': 'Network error. Check your connection and try again.'
        };
        loginErrorMsg.textContent = authErrors[error.code] || error.message || 'Sign-in failed. Please try again.';
        loginErrorMsg.style.display = 'block';
      }
    } finally {
      if (button) button.disabled = false;
    }
  });
}

/**
 * Show/Hide Password Toggle
 */
document.querySelectorAll('.password-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.classList.toggle('is-visible', show);
    const label = show ? 'Hide password' : 'Show password';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  });
});

/**
 * Google Sign-In (Student & Admin)
 */
const ADMIN_EMAIL = 'sattu0205tnb@gmail.com';
const googleSignInBtn = document.getElementById('googleSignInBtn');

function showLoginError(message) {
  if (loginErrorMsg) {
    loginErrorMsg.textContent = message;
    loginErrorMsg.style.display = 'block';
  }
}

function saveSession(user, name, role) {
  const session = {
    uid: user.uid,
    email: user.email,
    name: name || user.email,
    role: role,
    loggedInAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
}

if (googleSignInBtn) {
  googleSignInBtn.addEventListener('click', async () => {
    clearErrors();
    const role = activeRoleInput ? activeRoleInput.value : 'student';
    googleSignInBtn.disabled = true;

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await CampusCareFirebase.auth.signInWithPopup(provider);
      const user = result.user;
      const email = (user.email || '').toLowerCase();
      const userRef = CampusCareFirebase.db.collection('users').doc(user.uid);

      if (role === 'admin') {
        if (email !== ADMIN_EMAIL) {
          await CampusCareFirebase.auth.signOut();
          showLoginError('Access denied. You are not authorized as admin.');
          return;
        }
        // Make sure the admin profile exists so admin.html role checks pass
        await userRef.set({
          name: user.displayName || email,
          email: email,
          photo: user.photoURL || '',
          role: 'admin'
        }, { merge: true });
        saveSession(user, user.displayName, 'admin');
        window.location.href = 'admin.html';
        return;
      }

      // Student flow
      const snap = await userRef.get();
      let profile = snap.exists ? snap.data() : null;

      if (profile && profile.role && profile.role !== 'student') {
        await CampusCareFirebase.auth.signOut();
        showLoginError(`This account is registered as ${profile.role}. Choose the matching login portal.`);
        return;
      }

      if (!profile) {
        profile = {
          name: user.displayName || '',
          email: email,
          photo: user.photoURL || '',
          role: 'student',
          studentID: '',
          phone: '',
          createdAt: new Date().toISOString()
        };
        await userRef.set(profile);
      }

      saveSession(user, profile.name || user.displayName, 'student');
      window.location.href = 'lost.html';
    } catch (error) {
      const googleErrors = {
        'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
        'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
        'auth/popup-blocked': 'Popup was blocked by your browser. Allow popups and try again.',
        'auth/network-request-failed': 'Network error. Check your connection and try again.',
        'auth/unauthorized-domain': 'This domain is not authorized for Google sign-in in Firebase.',
        'auth/operation-not-allowed': 'Google sign-in is not enabled in Firebase Authentication.'
      };
      showLoginError(googleErrors[error.code] || error.message || 'Google sign-in failed. Please try again.');
    } finally {
      googleSignInBtn.disabled = false;
    }
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
  if (type === 'error') {
    toast.style.borderLeft = '4px solid #EF4444';
  } else if (type === 'success') {
    toast.style.borderLeft = '4px solid #10B981';
  }
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
