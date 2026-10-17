/**
 * Campus Care - Student Profile Logic
 * Handles authentication checks, profile details rendering, phone number editing,
 * photo uploads to Firebase Storage, reports statistics, and logout confirmation.
 */

// Immediate initialization for theme and modal listeners
initThemeToggle();
initLogoutModal();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStudentProfilePage);
} else {
  initStudentProfilePage();
}

async function initStudentProfilePage() {
  initThemeToggle();
  initMobileNav();
  initLogoutModal();

  // 1. Initial synchronous session check from localStorage
  let session = null;
  try {
    session = JSON.parse(localStorage.getItem('campusCare_session') || '{}');
  } catch (_) {}

  // If session says admin, redirect
  if (session && session.role === 'admin') {
    window.location.replace('admin-profile.html');
    return;
  }

  // Initial user object and values from session
  let uid = (session && session.uid) || 'student-user';
  let initialFullName = (session && session.name) || 'Student';
  let initialStudentID = (session && (session.studentID || session.rollNumber)) || 'STU-1001';
  let initialEmail = (session && session.email) || 'student@campuscare.edu';
  let initialPhone = (session && session.phone) || '';
  let initialPhoto = (session && (session.photo || session.photoURL)) || '';
  let initialCreatedAt = (session && (session.createdAt || session.loggedInAt)) || null;

  // Render initial profile immediately so UI is responsive
  renderStudentInfo({
    name: initialFullName,
    studentID: initialStudentID,
    email: initialEmail,
    phone: initialPhone,
    photoUrl: initialPhoto,
    createdAt: initialCreatedAt
  });

  // Attach Phone Editor immediately
  initPhoneEditor(uid, session);

  // Load report stats from localStorage immediately
  loadStudentReportsStats(initialStudentID, uid, initialEmail);

  // 2. Authenticate and enforce Student Login with Firebase
  let currentUser = null;
  let studentProfile = session;

  try {
    if (window.CampusCareFirebase) {
      const user = await Promise.race([
        CampusCareFirebase.currentUser(),
        new Promise(resolve => setTimeout(() => resolve(null), 1200))
      ]);
      if (user) {
        currentUser = user;
        const profile = await Promise.race([
          CampusCareFirebase.profileFor(user),
          new Promise(resolve => setTimeout(() => resolve(null), 1200))
        ]);
        if (profile) {
          studentProfile = profile;
        }
      }
    }
  } catch (err) {
    console.warn('Firebase auth verification error:', err);
  }

  // If not logged in at all, redirect to login.html
  if (!studentProfile && !currentUser) {
    window.location.replace('login.html');
    return;
  }

  if (studentProfile && studentProfile.role === 'admin') {
    window.location.replace('admin-profile.html');
    return;
  }

  // 3. Fetch latest profile data from Firestore users collection with timeout
  uid = (currentUser && currentUser.uid) || (studentProfile && studentProfile.uid) || uid;
  let firestoreUserData = {};

  try {
    if (CampusCareFirebase && CampusCareFirebase.db && uid && currentUser) {
      const fetchPromise = CampusCareFirebase.db.collection('users').doc(uid).get();
      const userDoc = await Promise.race([
        fetchPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
      ]);
      if (userDoc && userDoc.exists) {
        firestoreUserData = userDoc.data() || {};
      }
    }
  } catch (fetchErr) {
    console.warn('Firestore fetch skipped or timed out:', fetchErr);
  }

  // 4. Synchronize values with latest Firestore data
  const auth = (window.CampusCareFirebase && CampusCareFirebase.auth) || (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null);

  const authEmail = (auth && auth.currentUser && auth.currentUser.email)
    ? auth.currentUser.email
    : (firestoreUserData.email || (studentProfile && studentProfile.email) || initialEmail);

  const fullName = firestoreUserData.name || (auth && auth.currentUser && auth.currentUser.displayName) || (studentProfile && studentProfile.name) || initialFullName;
  const studentID = firestoreUserData.studentID || firestoreUserData.rollNumber || (studentProfile && (studentProfile.studentID || studentProfile.rollNumber)) || initialStudentID;
  const phone = firestoreUserData.phone || (studentProfile && studentProfile.phone) || initialPhone;
  const photoUrl = (auth && auth.currentUser && auth.currentUser.photoURL) || firestoreUserData.photoURL || firestoreUserData.photo || (studentProfile && (studentProfile.photoURL || studentProfile.photo)) || initialPhoto;
  const createdAt = firestoreUserData.createdAt || (auth && auth.currentUser && auth.currentUser.metadata ? auth.currentUser.metadata.creationTime : null) || (studentProfile && (studentProfile.createdAt || studentProfile.loggedInAt)) || initialCreatedAt;

  renderStudentInfo({
    name: fullName,
    studentID: studentID,
    email: authEmail,
    phone: phone,
    photoUrl: photoUrl,
    createdAt: createdAt
  });

  // Re-bind phone editor with latest verified UID
  initPhoneEditor(uid, studentProfile || session);

  // Attach Photo Upload
  initPhotoUpload(currentUser || { uid: uid }, fullName, authEmail);

  // Re-query latest stats from Firestore
  loadStudentReportsStats(studentID, uid, authEmail);
}

/**
 * Renders the Student Profile details to DOM
 */
function renderStudentInfo({ name, studentID, email, phone, photoUrl, createdAt }) {
  const profileFullName = document.getElementById('profileFullName');
  const profileStudentID = document.getElementById('profileStudentID');
  const profileEmail = document.getElementById('profileEmail');
  const profilePhoneInput = document.getElementById('profilePhoneInput');
  const profileCreatedAt = document.getElementById('profileCreatedAt');
  const cardStudentName = document.getElementById('cardStudentName');
  const cardStudentID = document.getElementById('cardStudentID');

  if (profileFullName) profileFullName.textContent = name;
  if (profileStudentID) profileStudentID.textContent = studentID;
  if (profileEmail) profileEmail.textContent = email;
  if (profilePhoneInput) profilePhoneInput.value = phone || '';
  if (cardStudentName) cardStudentName.textContent = name;
  if (cardStudentID) cardStudentID.textContent = studentID;

  if (profileCreatedAt) {
    profileCreatedAt.textContent = formatJoinedDate(createdAt);
  }

  renderAvatar(photoUrl, name, email);
}

/**
 * Renders Photo or Initial Avatar Circle (Indigo #4F46E5 background with white text)
 */
function renderAvatar(photoUrl, name, email) {
  const avatarInitials = document.getElementById('avatarInitials');
  const avatarImage = document.getElementById('avatarImage');

  const initials = getInitials(name, email);

  if (photoUrl && photoUrl.trim()) {
    if (avatarImage) {
      avatarImage.src = photoUrl;
      avatarImage.style.display = 'block';
    }
    if (avatarInitials) {
      avatarInitials.style.display = 'none';
    }
  } else {
    if (avatarInitials) {
      avatarInitials.textContent = initials;
      avatarInitials.style.display = 'flex';
      avatarInitials.style.width = '130px';
      avatarInitials.style.height = '130px';
      avatarInitials.style.borderRadius = '50%';
      avatarInitials.style.alignItems = 'center';
      avatarInitials.style.justifyContent = 'center';
      avatarInitials.style.backgroundColor = '#4F46E5';
      avatarInitials.style.color = '#FFFFFF';
    }
    if (avatarImage) {
      avatarImage.style.display = 'none';
      avatarImage.src = '';
    }
  }
}

/**
 * Computes 2-letter uppercase initials
 */
function getInitials(name, email) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'ST';
}

/**
 * Formats join date string
 */
function formatJoinedDate(dateValue) {
  if (!dateValue) return 'October 17, 2026';
  try {
    let d;
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      d = dateValue.toDate();
    } else if (dateValue.seconds) {
      d = new Date(dateValue.seconds * 1000);
    } else {
      d = new Date(dateValue);
    }
    if (isNaN(d.getTime())) return 'October 17, 2026';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    return 'October 17, 2026';
  }
}

/**
 * Handles Phone Number Edit and Firestore Update
 */
function initPhoneEditor(uid, studentProfile) {
  const phoneInput = document.getElementById('profilePhoneInput');
  const saveBtn = document.getElementById('savePhoneBtn');

  if (!phoneInput || !saveBtn) return;

  // Restrict to digits only while typing
  phoneInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
  });

  saveBtn.addEventListener('click', async () => {
    const rawVal = phoneInput.value.trim();
    const digitsOnly = rawVal.replace(/\D/g, '');

    if (digitsOnly.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      phoneInput.focus();
      return;
    }

    const originalBtnHtml = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <span>Saving...</span>
    `;

    try {
      // 1. Update in Firestore users collection
      if (CampusCareFirebase && CampusCareFirebase.db && uid) {
        try {
          const timestamp = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
            ? firebase.firestore.FieldValue.serverTimestamp()
            : new Date().toISOString();
          await CampusCareFirebase.db.collection('users').doc(uid).set({
            phone: digitsOnly,
            updatedAt: timestamp
          }, { merge: true });
        } catch (dbErr) {
          console.warn('Firestore update warning (using local session fallback):', dbErr);
        }
      }

      // 2. Update cached session in localStorage
      try {
        const session = JSON.parse(localStorage.getItem('campusCare_session') || '{}');
        session.phone = digitsOnly;
        localStorage.setItem('campusCare_session', JSON.stringify(session));
      } catch (_) {}

      showToast('Phone number updated successfully!', 'success');
    } catch (saveErr) {
      console.error('Failed to update phone number in Firestore:', saveErr);
      showToast(`Error updating phone: ${saveErr.message || 'Please try again.'}`, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalBtnHtml;
    }
  });
}

/**
 * Queries Firestore reports collection where studentID matches logged-in user
 */
async function loadStudentReportsStats(studentID, uid, email) {
  const statTotalReports = document.getElementById('statTotalReports');
  const statActiveReports = document.getElementById('statActiveReports');
  const statResolvedReports = document.getElementById('statResolvedReports');

  let totalCount = 0;
  let activeCount = 0;
  let resolvedCount = 0;

  try {
    if (CampusCareFirebase && CampusCareFirebase.db) {
      // Fetch all reports to match by studentID or uid/email
      const snapshot = await CampusCareFirebase.db.collection('reports').get();
      
      snapshot.forEach(doc => {
        const data = doc.data() || {};
        const matchesStudentID = data.studentID && String(data.studentID).trim().toLowerCase() === String(studentID).trim().toLowerCase();
        const matchesRollNumber = data.rollNumber && String(data.rollNumber).trim().toLowerCase() === String(studentID).trim().toLowerCase();
        const matchesUid = data.ownerUid && data.ownerUid === uid;
        const matchesEmail = data.email && String(data.email).trim().toLowerCase() === String(email).trim().toLowerCase();

        if (matchesStudentID || matchesRollNumber || matchesUid || matchesEmail) {
          totalCount++;
          const status = (data.status || 'OPEN').trim().toUpperCase();
          if (status === 'RESOLVED') {
            resolvedCount++;
          } else {
            activeCount++;
          }
        }
      });
    }
  } catch (err) {
    console.warn('Error querying Firestore reports:', err);
    // Fallback to local reports storage
    try {
      const localReports = JSON.parse(localStorage.getItem('campusCare_reports') || '[]');
      localReports.forEach(r => {
        const matchesStudentID = r.studentID && String(r.studentID).trim().toLowerCase() === String(studentID).trim().toLowerCase();
        const matchesRollNumber = r.rollNumber && String(r.rollNumber).trim().toLowerCase() === String(studentID).trim().toLowerCase();
        const matchesUid = r.ownerUid && r.ownerUid === uid;
        const matchesEmail = r.email && String(r.email).trim().toLowerCase() === String(email).trim().toLowerCase();

        if (matchesStudentID || matchesRollNumber || matchesUid || matchesEmail) {
          totalCount++;
          const status = (r.status || 'OPEN').trim().toUpperCase();
          if (status === 'RESOLVED') {
            resolvedCount++;
          } else {
            activeCount++;
          }
        }
      });
    } catch (_) {}
  }

  if (statTotalReports) statTotalReports.textContent = totalCount;
  if (statActiveReports) statActiveReports.textContent = activeCount;
  if (statResolvedReports) statResolvedReports.textContent = resolvedCount;
}

/**
 * Handles Profile Picture Upload to Firebase Storage
 */
function initPhotoUpload(currentUser, studentName, studentEmail) {
  const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
  const profilePicInput = document.getElementById('profilePicInput');
  const uploadProgressBox = document.getElementById('uploadProgressBox');
  const uploadProgressFill = document.getElementById('uploadProgressFill');
  const uploadProgressText = document.getElementById('uploadProgressText');

  if (!uploadPhotoBtn || !profilePicInput) return;

  uploadPhotoBtn.addEventListener('click', () => {
    profilePicInput.click();
  });

  profilePicInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Validate format (jpg, png, webp only)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Please upload a valid image file (JPG, PNG, or WEBP only).', 'error');
      profilePicInput.value = '';
      return;
    }

    // Validate size (max 2MB)
    const MAX_SIZE_BYTES = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      showToast('File size exceeds the 2MB limit. Please choose a smaller photo.', 'error');
      profilePicInput.value = '';
      return;
    }

    // Check Firebase Storage availability
    if (!CampusCareFirebase.storage) {
      showToast('Firebase Storage is not available. Please verify network configuration.', 'error');
      return;
    }

    // Start Upload UI
    uploadPhotoBtn.disabled = true;
    if (uploadProgressBox) uploadProgressBox.style.display = 'block';
    if (uploadProgressFill) uploadProgressFill.style.width = '0%';
    if (uploadProgressText) uploadProgressText.textContent = 'Uploading... 0%';

    try {
      const uid = currentUser.uid || 'student-uid';
      const storageRef = CampusCareFirebase.storage.ref(`profile-pics/${uid}`);
      const uploadTask = storageRef.put(file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = snapshot.totalBytes > 0
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
          if (uploadProgressFill) uploadProgressFill.style.width = `${progress}%`;
          if (uploadProgressText) uploadProgressText.textContent = `Uploading... ${progress}%`;
        },
        (uploadError) => {
          console.error('Firebase Storage upload error:', uploadError);
          showToast(`Upload failed: ${uploadError.message || 'Please try again.'}`, 'error');
          resetUploadUI();
        },
        async () => {
          try {
            // Get Download URL
            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();

            // 1. Update Firebase Auth Profile
            try {
              if (currentUser.updateProfile) {
                await currentUser.updateProfile({ photoURL: downloadURL });
              }
            } catch (authErr) {
              console.warn('Could not update Firebase Auth photoURL:', authErr);
            }

            // 2. Update Firestore User Document
            await CampusCareFirebase.db.collection('users').doc(uid).set({
              photo: downloadURL,
              photoURL: downloadURL
            }, { merge: true });

            // 3. Update active session cache
            try {
              const session = JSON.parse(localStorage.getItem('campusCare_session') || '{}');
              session.photo = downloadURL;
              session.photoURL = downloadURL;
              localStorage.setItem('campusCare_session', JSON.stringify(session));
            } catch (_) {}

            // 4. Display uploaded photo immediately
            renderAvatar(downloadURL, studentName, studentEmail);

            // 5. Show success toast
            showToast('Profile photo uploaded and updated successfully!', 'success');
          } catch (postUploadErr) {
            console.error('Post-upload processing error:', postUploadErr);
            showToast('Photo uploaded, but profile sync failed. Please refresh.', 'error');
          } finally {
            resetUploadUI();
          }
        }
      );
    } catch (err) {
      console.error('Photo upload initialization failed:', err);
      showToast(`Upload error: ${err.message || 'Please try again.'}`, 'error');
      resetUploadUI();
    }
  });

  function resetUploadUI() {
    uploadPhotoBtn.disabled = false;
    profilePicInput.value = '';
    if (uploadProgressBox) {
      setTimeout(() => {
        uploadProgressBox.style.display = 'none';
        if (uploadProgressFill) uploadProgressFill.style.width = '0%';
      }, 1000);
    }
  }
}

/**
 * Logout Modal & Confirmation
 */
function initLogoutModal() {
  const logoutBtn = document.getElementById('userLogoutBtn');
  const modal = document.getElementById('ccLogoutModal');
  if (!modal) return;

  // Make sure modal starts completely hidden with inline styles & inactive class
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  modal.style.setProperty('display', 'none', 'important');
  modal.style.setProperty('opacity', '0', 'important');
  modal.style.setProperty('visibility', 'hidden', 'important');
  modal.style.setProperty('pointer-events', 'none', 'important');
  modal.style.setProperty('backdrop-filter', 'none', 'important');
  modal.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
  document.body.style.overflow = '';

  const cancelBtn = modal.querySelector('#ccCancelLogoutBtn');
  if (cancelBtn) {
    cancelBtn.onclick = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      modal.style.setProperty('display', 'none', 'important');
      modal.style.setProperty('opacity', '0', 'important');
      modal.style.setProperty('visibility', 'hidden', 'important');
      modal.style.setProperty('pointer-events', 'none', 'important');
      modal.style.setProperty('backdrop-filter', 'none', 'important');
      modal.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
      document.body.style.overflow = '';
    };
  }

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      modal.style.setProperty('display', 'none', 'important');
      modal.style.setProperty('opacity', '0', 'important');
      modal.style.setProperty('visibility', 'hidden', 'important');
      modal.style.setProperty('pointer-events', 'none', 'important');
      modal.style.setProperty('backdrop-filter', 'none', 'important');
      modal.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
      document.body.style.overflow = '';
    }
  };

  if (logoutBtn) {
    logoutBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showLogoutConfirmation({
        title: 'Confirm Logout',
        message: 'Are you sure you want to log out of your student session? Any unsaved form progress will be lost.',
        onConfirm: async () => {
          localStorage.removeItem('campusCare_session');
          sessionStorage.removeItem('campusCare_session');
          localStorage.removeItem('campusCare_reports');

          try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
              await firebase.auth().signOut();
            } else if (window.CampusCareFirebase && CampusCareFirebase.auth) {
              await CampusCareFirebase.auth.signOut();
            }
          } catch (err) {
            console.error('Firebase signOut error:', err);
          } finally {
            window.location.href = 'index.html?logout=true';
          }
        }
      });
    };
  }
}

function showLogoutConfirmation({ title = 'Confirm Logout', message = 'Are you sure you want to log out?', onConfirm }) {
  const modal = document.getElementById('ccLogoutModal');
  if (!modal) return;

  const titleElem = modal.querySelector('#ccLogoutTitle');
  const descElem = modal.querySelector('#ccLogoutDesc');
  const cancelBtn = modal.querySelector('#ccCancelLogoutBtn');
  const confirmBtn = modal.querySelector('#ccConfirmLogoutBtn');

  if (titleElem) titleElem.textContent = title;
  if (descElem) descElem.textContent = message;
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<span>Log Out</span>';
  }
  if (cancelBtn) cancelBtn.disabled = false;

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.setProperty('display', 'none', 'important');
    modal.style.setProperty('opacity', '0', 'important');
    modal.style.setProperty('visibility', 'hidden', 'important');
    modal.style.setProperty('pointer-events', 'none', 'important');
    modal.style.setProperty('backdrop-filter', 'none', 'important');
    modal.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  if (cancelBtn) {
    cancelBtn.onclick = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      closeModal();
    };
  }

  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal();
    }
  };

  if (confirmBtn) {
    confirmBtn.onclick = async (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span>Logging out...</span>';
      if (cancelBtn) cancelBtn.disabled = true;

      if (typeof onConfirm === 'function') {
        try {
          await onConfirm();
        } catch (err) {
          console.error('Logout error:', err);
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = '<span>Log Out</span>';
          if (cancelBtn) cancelBtn.disabled = false;
        }
      }
    };
  }

  document.addEventListener('keydown', onKeyDown);
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  modal.style.setProperty('display', 'flex', 'important');
  modal.style.setProperty('opacity', '1', 'important');
  modal.style.setProperty('visibility', 'visible', 'important');
  modal.style.setProperty('pointer-events', 'auto', 'important');
  modal.style.removeProperty('backdrop-filter');
  modal.style.removeProperty('-webkit-backdrop-filter');
  document.body.style.overflow = 'hidden';
  if (cancelBtn) cancelBtn.focus();
}

/**
 * Mobile Navigation Toggle
 */
function initMobileNav() {
  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');
  if (!navToggle || !siteNav) return;

  navToggle.onclick = (e) => {
    e.preventDefault();
    const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', !isExpanded);
    siteNav.classList.toggle('nav-open');
  };
}

/**
 * Dark/Light Mode Theme Toggle Functionality
 */
function initThemeToggle() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (!themeToggleBtn) return;

  function updateToggleUI(theme) {
    const isDark = theme === 'dark';
    const label = isDark ? 'Switch to Light mode' : 'Switch to Dark mode';
    themeToggleBtn.setAttribute('aria-label', label);
    themeToggleBtn.setAttribute('title', label);
  }

  // 1. Read saved theme from localStorage
  const savedTheme = localStorage.getItem('campusCare_theme');
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

  // 2. Apply the correct theme on page load
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateToggleUI(currentTheme);

  // 3. Toggle between dark and light mode when clicked & save preference
  themeToggleBtn.onclick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const active = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = active === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('campusCare_theme', nextTheme);
    } catch (err) {
      console.warn('Could not save theme preference:', err);
    }
    updateToggleUI(nextTheme);
  };
}

/**
 * Toast Notifications
 */
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  toastContainer.style.position = 'fixed';
  toastContainer.style.bottom = '2rem';
  toastContainer.style.right = '2rem';
  toastContainer.style.zIndex = '999999';
  toastContainer.style.display = 'flex';
  toastContainer.style.flexDirection = 'column';
  toastContainer.style.gap = '0.75rem';

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.background = 'var(--bg-surface, #ffffff)';
  toast.style.color = 'var(--text-main, #1e293b)';
  toast.style.border = '1px solid var(--border-color, #e2e8f0)';
  toast.style.padding = '0.85rem 1.25rem';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.18)';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '0.75rem';
  toast.style.fontWeight = '600';
  toast.style.fontSize = '0.9rem';

  if (type === 'error') {
    toast.style.borderLeft = '4px solid #EF4444';
  } else if (type === 'success') {
    toast.style.borderLeft = '4px solid #10B981';
  } else if (type === 'warning') {
    toast.style.borderLeft = '4px solid #F59E0B';
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
  }, 3500);
}
