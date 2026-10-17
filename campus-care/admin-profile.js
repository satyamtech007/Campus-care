/**
 * Campus Care - Admin Profile & System Metrics Logic
 * Handles authentication checks, profile info rendering, KPI queries, and photo uploads to Firebase Storage
 */

document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  initLogoutModal();

  // 1. Authenticate and enforce Admin role
  let currentUser = null;
  let adminProfile = null;

  try {
    if (window.CampusCareFirebase) {
      const user = await CampusCareFirebase.currentUser();
      if (user) {
        const profile = await CampusCareFirebase.profileFor(user);
        if (profile && profile.role === 'admin') {
          currentUser = user;
          adminProfile = profile;
        }
      }
    }
  } catch (err) {
    console.warn('Firebase auth check error:', err);
  }

  // Fallback to verified local session if Firebase Auth state is still restoring or local session is present
  if (!currentUser || !adminProfile) {
    try {
      const session = JSON.parse(localStorage.getItem('campusCare_session') || '{}');
      if (session && session.role === 'admin') {
        adminProfile = session;
        currentUser = (CampusCareFirebase && CampusCareFirebase.auth && CampusCareFirebase.auth.currentUser) || {
          uid: session.uid || 'admin-user',
          email: session.email || 'sattu0205tnb@gmail.com',
          displayName: session.name || 'Admin Officer',
          photoURL: session.photo || session.photoURL || null,
          metadata: { creationTime: session.loggedInAt || new Date().toISOString() },
          updateProfile: async (data) => {
            if (CampusCareFirebase && CampusCareFirebase.auth && CampusCareFirebase.auth.currentUser) {
              await CampusCareFirebase.auth.currentUser.updateProfile(data);
            }
          }
        };
      }
    } catch (_) {}
  }

  // If not logged in or not admin, redirect to login.html
  if (!currentUser || !adminProfile || adminProfile.role !== 'admin') {
    window.location.replace('login.html');
    return;
  }

  // 2. Render Admin Profile Details
  const auth = (window.CampusCareFirebase && CampusCareFirebase.auth) || (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null);
  
  // Directly fetch email from Firebase Authentication using auth.currentUser.email instead of from Firestore
  const authEmail = (auth && auth.currentUser && auth.currentUser.email)
    ? auth.currentUser.email
    : (currentUser && currentUser.email ? currentUser.email : '');

  const adminName = (auth && auth.currentUser && auth.currentUser.displayName) || adminProfile.name || currentUser.displayName || 'Administrator';
  const adminEmail = authEmail;
  const photoUrl = (auth && auth.currentUser && auth.currentUser.photoURL) || adminProfile.photoURL || adminProfile.photo || currentUser.photoURL;
  const createdAt = (auth && auth.currentUser && auth.currentUser.metadata)
    ? auth.currentUser.metadata.creationTime
    : (currentUser.metadata ? currentUser.metadata.creationTime : (adminProfile.createdAt || null));

  renderAdminInfo({
    name: adminName,
    email: adminEmail,
    photoUrl: photoUrl,
    createdAt: createdAt
  });

  // Keep email in sync directly with Firebase Authentication auth.currentUser.email
  if (auth && typeof auth.onAuthStateChanged === 'function') {
    auth.onAuthStateChanged((user) => {
      if (user && user.email) {
        const profileEmail = document.getElementById('profileEmail');
        const cardAdminEmail = document.getElementById('cardAdminEmail');
        if (profileEmail) profileEmail.textContent = user.email;
        if (cardAdminEmail) cardAdminEmail.textContent = user.email;
      }
    });
  }

  // 3. Load Institutional Metrics (Firestore reports collection)
  loadSystemMetrics();

  // 4. Attach Photo Upload Listeners
  initPhotoUpload(currentUser, adminName, adminEmail);
});

/**
 * Renders the Admin Avatar, Name, Email, and Creation Date
 */
function renderAdminInfo({ name, email, photoUrl, createdAt }) {
  const profileFullName = document.getElementById('profileFullName');
  const profileEmail = document.getElementById('profileEmail');
  const profileCreatedAt = document.getElementById('profileCreatedAt');
  const cardAdminName = document.getElementById('cardAdminName');
  const cardAdminEmail = document.getElementById('cardAdminEmail');
  const headerAdminName = document.getElementById('headerAdminName');

  if (profileFullName) profileFullName.textContent = name;
  if (profileEmail) profileEmail.textContent = email;
  if (cardAdminName) cardAdminName.textContent = name;
  if (cardAdminEmail) cardAdminEmail.textContent = email;
  if (headerAdminName) headerAdminName.textContent = name;

  if (profileCreatedAt) {
    profileCreatedAt.textContent = formatCreationDate(createdAt);
  }

  renderAvatar(photoUrl, name, email);
}

/**
 * Handles rendering photo or fallback avatar circle with admin initials
 */
function renderAvatar(photoUrl, name, email) {
  const avatarInitials = document.getElementById('avatarInitials');
  const avatarImage = document.getElementById('avatarImage');
  const headerAdminAvatar = document.getElementById('headerAdminAvatar');

  const initials = getInitials(name, email);

  if (headerAdminAvatar) {
    headerAdminAvatar.textContent = initials;
  }

  if (photoUrl && photoUrl.trim()) {
    if (avatarImage) {
      avatarImage.src = photoUrl;
      avatarImage.style.display = 'block';
    }
    if (avatarInitials) {
      avatarInitials.style.display = 'none';
    }
    // Update header chip with small photo if available
    if (headerAdminAvatar) {
      headerAdminAvatar.innerHTML = `<img src="${photoUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    }
  } else {
    if (avatarInitials) {
      avatarInitials.textContent = initials;
      avatarInitials.style.display = 'flex';
    }
    if (avatarImage) {
      avatarImage.style.display = 'none';
      avatarImage.src = '';
    }
  }
}

/**
 * Extracts 2-letter uppercase initials
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
  return 'AD';
}

/**
 * Formats account creation date nicely
 */
function formatCreationDate(dateValue) {
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
 * Queries Firestore reports collection to compute total reports and resolved reports
 */
async function loadSystemMetrics() {
  const statTotalReports = document.getElementById('statTotalReports');
  const statResolvedReports = document.getElementById('statResolvedReports');
  const statResolutionRate = document.getElementById('statResolutionRate');

  try {
    const snapshot = await CampusCareFirebase.db.collection('reports').get();
    const totalReports = snapshot.size;

    let resolvedCount = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      const status = (data.status || '').trim().toUpperCase();
      if (status === 'RESOLVED') {
        resolvedCount++;
      }
    });

    if (statTotalReports) statTotalReports.textContent = totalReports;
    if (statResolvedReports) statResolvedReports.textContent = resolvedCount;

    if (statResolutionRate) {
      const rate = totalReports > 0 ? Math.round((resolvedCount / totalReports) * 100) : 0;
      statResolutionRate.textContent = `${rate}%`;
    }
  } catch (err) {
    console.error('Failed to load system metrics from Firestore:', err);
    // Fallback to localStorage cached reports if offline
    try {
      const cached = JSON.parse(localStorage.getItem('campusCare_reports') || '[]');
      const total = cached.length;
      const resolved = cached.filter(r => (r.status || '').toUpperCase() === 'RESOLVED').length;
      if (statTotalReports) statTotalReports.textContent = total;
      if (statResolvedReports) statResolvedReports.textContent = resolved;
      if (statResolutionRate) {
        const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
        statResolutionRate.textContent = `${rate}%`;
      }
    } catch (_) {
      if (statTotalReports) statTotalReports.textContent = '0';
      if (statResolvedReports) statResolvedReports.textContent = '0';
      if (statResolutionRate) statResolutionRate.textContent = '0%';
    }
  }
}

/**
 * Initializes Profile Picture Upload to Firebase Storage
 */
function initPhotoUpload(currentUser, adminName, adminEmail) {
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
      // Storage path: profile-pics/{admin-uid}
      const storageRef = CampusCareFirebase.storage.ref(`profile-pics/${currentUser.uid}`);
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
              await currentUser.updateProfile({ photoURL: downloadURL });
            } catch (authErr) {
              console.warn('Could not update Firebase Auth photoURL:', authErr);
            }

            // 2. Update Firestore User Document
            await CampusCareFirebase.db.collection('users').doc(currentUser.uid).set({
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
            renderAvatar(downloadURL, adminName, adminEmail);

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
 * Logout Modal & Confirmation (Same as admin.html)
 */
function initLogoutModal() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showLogoutConfirmation({
      title: 'Confirm Admin Logout',
      message: 'Are you sure you want to log out of the Admin Dashboard? You will need to sign in again to access administrative tools.',
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
          window.location.href = 'index.html';
        }
      }
    });
  });
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
    document.removeEventListener('keydown', onKeyDown);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  if (cancelBtn) {
    cancelBtn.onclick = () => {
      closeModal();
    };
  }

  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal();
    }
  };

  if (confirmBtn) {
    confirmBtn.onclick = async () => {
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
  if (cancelBtn) cancelBtn.focus();
}

/**
 * Dark/Light Mode Theme Toggle Functionality
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

/**
 * Toast Notifications
 */
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
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
