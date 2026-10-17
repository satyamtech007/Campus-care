/**
 * Campus Care - My Reports Portal Logic
 * Fetches and displays all submitted reports for the authenticated student.
 */

// State
let myAllReports = [];
let currentFilterType = 'all';
let currentFilterStatus = 'all';
let currentSearchQuery = '';

// DOM Elements
const loadingView = document.getElementById('loadingView');
const emptyReportsState = document.getElementById('emptyReportsState');
const reportsTableContainer = document.getElementById('reportsTableContainer');
const myReportsTableBody = document.getElementById('myReportsTableBody');
const studentAccountName = document.getElementById('studentAccountName');
const reportSearchInput = document.getElementById('reportSearchInput');
const statusFilterSelect = document.getElementById('statusFilterSelect');
const refreshMyReportsBtn = document.getElementById('refreshMyReportsBtn');
const typeFilterTabs = document.querySelectorAll('.type-tab-btn');

// Count Badges
const countAll = document.getElementById('countAll');
const countLost = document.getElementById('countLost');
const countFound = document.getElementById('countFound');
const countIssue = document.getElementById('countIssue');

/**
 * Startup Authentication Verification & Page Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
  // Check if Firebase is loaded
  if (typeof firebase === 'undefined' || !firebase.auth) {
    console.error('Firebase Auth is not available.');
    window.location.replace('login.html');
    return;
  }

  // Monitor Auth State
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      // Not logged in -> redirect to login.html
      window.location.replace('login.html');
      return;
    }

    // Verify role is student
    try {
      if (window.CampusCareFirebase && CampusCareFirebase.profileFor) {
        const profile = await CampusCareFirebase.profileFor(user);
        if (profile) {
          if (profile.role && profile.role !== 'student') {
            window.location.replace('index.html?error=unauthorized');
            return;
          }
          if (studentAccountName) {
            studentAccountName.textContent = profile.name || profile.studentID || user.email;
          }
        } else if (studentAccountName) {
          studentAccountName.textContent = user.email || 'Student';
        }
      } else if (studentAccountName) {
        studentAccountName.textContent = user.email || 'Student';
      }
    } catch (err) {
      console.warn('Profile inspection error:', err);
      if (studentAccountName) studentAccountName.textContent = user.email || 'Student';
    }

    // Attach listeners
    attachEventListeners();

    // Fetch reports for this student
    await loadReportsForStudent(user);
  });
});

/**
 * Fetches all reports submitted by the logged-in student from Firestore.
 * Matches studentID (or student identifier fields) to currently logged-in user's UID.
 */
async function loadReportsForStudent(user) {
  showLoading(true);

  try {
    const db = firebase.firestore();
    const reportsMap = new Map();
    const uid = user.uid;

    // 1. Query where studentID matches logged-in user's UID
    try {
      const snapStudentID = await db.collection('reports').where('studentID', '==', uid).get();
      snapStudentID.forEach(doc => {
        reportsMap.set(doc.id, { ...doc.data(), id: doc.id });
      });
    } catch (err) {
      console.warn('Could not query reports by studentID == UID:', err);
    }

    // 2. Query where ownerUid matches logged-in user's UID
    try {
      const snapOwner = await db.collection('reports').where('ownerUid', '==', uid).get();
      snapOwner.forEach(doc => {
        reportsMap.set(doc.id, { ...doc.data(), id: doc.id });
      });
    } catch (err) {
      console.warn('Could not query reports by ownerUid == UID:', err);
    }

    // 3. Query where studentId (lowercase 'd') matches logged-in user's UID
    try {
      const snapStudentId = await db.collection('reports').where('studentId', '==', uid).get();
      snapStudentId.forEach(doc => {
        reportsMap.set(doc.id, { ...doc.data(), id: doc.id });
      });
    } catch (err) {
      console.warn('Could not query reports by studentId == UID:', err);
    }

    // 4. Also check user profile studentID (if user profile has a roll number like 21CS042, check that too)
    try {
      const userProfileSnap = await db.collection('users').doc(uid).get();
      if (userProfileSnap.exists) {
        const uData = userProfileSnap.data();
        const customID = uData.studentID || uData.studentId;
        if (customID && customID !== uid) {
          try {
            const snapCustom = await db.collection('reports').where('studentID', '==', customID).get();
            snapCustom.forEach(doc => {
              reportsMap.set(doc.id, { ...doc.data(), id: doc.id });
            });
          } catch (_) {}
        }
      }
    } catch (_) {}

    // 5. Offline fallback from localStorage
    try {
      const localReports = JSON.parse(localStorage.getItem('campusCare_reports') || '[]');
      localReports.forEach(r => {
        if (r && r.id && (r.ownerUid === uid || r.studentID === uid || r.studentId === uid)) {
          if (!reportsMap.has(r.id)) {
            reportsMap.set(r.id, r);
          }
        }
      });
    } catch (_) {}

    // Convert map to array
    myAllReports = Array.from(reportsMap.values());

    // Sort by newest report first
    myAllReports.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || 0).getTime();
      const dateB = new Date(b.createdAt || b.date || 0).getTime();
      return dateB - dateA;
    });

  } catch (err) {
    console.error('Error fetching student reports:', err);
    showToast('Failed to load your reports from Firebase.', 'error');
    myAllReports = [];
  } finally {
    showLoading(false);
    updateCounts();
    renderReportsTable();
  }
}

/**
 * Updates summary count badges
 */
function updateCounts() {
  const total = myAllReports.length;
  const lost = myAllReports.filter(r => r.type === 'lost').length;
  const found = myAllReports.filter(r => r.type === 'found').length;
  const issue = myAllReports.filter(r => r.type === 'issue').length;

  if (countAll) countAll.textContent = total;
  if (countLost) countLost.textContent = lost;
  if (countFound) countFound.textContent = found;
  if (countIssue) countIssue.textContent = issue;
}

/**
 * Filters and renders reports in the data table
 */
function renderReportsTable() {
  let filtered = [...myAllReports];

  // 1. Filter by Type Tab
  if (currentFilterType !== 'all') {
    filtered = filtered.filter(r => r.type === currentFilterType);
  }

  // 2. Filter by Status Dropdown
  if (currentFilterStatus !== 'all') {
    filtered = filtered.filter(r => {
      const norm = normalizeStatus(r.status);
      return norm === currentFilterStatus;
    });
  }

  // 3. Filter by Search Query
  if (currentSearchQuery.trim()) {
    const q = currentSearchQuery.trim().toLowerCase();
    filtered = filtered.filter(r => {
      return (
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.itemName && r.itemName.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q)) ||
        (r.location && r.location.toLowerCase().includes(q)) ||
        (r.status && r.status.toLowerCase().includes(q)) ||
        (r.department && r.department.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    });
  }

  // Handle Empty State
  if (filtered.length === 0) {
    reportsTableContainer.style.display = 'none';
    emptyReportsState.style.display = 'block';

    const emptyTitle = document.getElementById('emptyTitleText');
    const emptySub = document.getElementById('emptySubText');
    if (myAllReports.length === 0) {
      if (emptyTitle) emptyTitle.textContent = 'You haven’t submitted any reports yet.';
      if (emptySub) emptySub.textContent = 'Any lost items, found items, or campus maintenance issues you report will appear here with live updates from administration.';
    } else {
      if (emptyTitle) emptyTitle.textContent = 'No matching reports found.';
      if (emptySub) emptySub.textContent = 'Try adjusting your type filter, status filter, or search keywords.';
    }
    return;
  }

  emptyReportsState.style.display = 'none';
  reportsTableContainer.style.display = 'block';

  // Render Rows
  myReportsTableBody.innerHTML = filtered.map(report => {
    const typeBadgeHtml = getTypeBadgeHtml(report.type);
    const statusBadgeHtml = getStatusBadgeHtml(report.status);
    const formattedDate = formatReportDate(report.createdAt || report.date);
    const titleText = report.itemName || report.category || 'Untitled Report';

    return `
      <tr class="table-row">
        <td>
          <a href="track.html?id=${encodeURIComponent(report.id)}" class="table-report-id" title="Click to track status" style="text-decoration: none;">
            ${escapeHtml(report.id)}
          </a>
        </td>
        <td>
          ${typeBadgeHtml}
        </td>
        <td>
          <div class="table-item-title">${escapeHtml(titleText)}</div>
          <span class="table-cat-sub">${escapeHtml(report.category || 'General')}</span>
        </td>
        <td>
          <div class="table-meta-text">${escapeHtml(report.location || 'N/A')}</div>
        </td>
        <td>
          <div class="table-meta-sub">${escapeHtml(formattedDate)}</div>
        </td>
        <td>
          ${statusBadgeHtml}
        </td>
        <td style="text-align: right;">
          <a href="track.html?id=${encodeURIComponent(report.id)}" class="btn btn-secondary" style="min-height: 34px; padding: 0.35rem 0.75rem; font-size: 0.8rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;">
            <span>Track</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Returns type badge HTML
 */
function getTypeBadgeHtml(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'lost') {
    return `<span class="type-pill type-tag-lost">Lost Item</span>`;
  }
  if (t === 'found') {
    return `<span class="type-pill type-tag-found">Found Item</span>`;
  }
  if (t === 'issue') {
    return `<span class="type-pill type-tag-issue">Campus Issue</span>`;
  }
  return `<span class="type-pill">${escapeHtml(type || 'Report')}</span>`;
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
 * Returns status badge with strict standardized color coding:
 * OPEN → Red (.badge-open)
 * MATCH FOUND → Yellow (.badge-match)
 * IN PROGRESS → Purple (.badge-in-progress)
 * RESOLVED → Green (.badge-resolved)
 */
function getStatusBadgeHtml(status) {
  const norm = normalizeStatus(status);

  switch (norm) {
    case 'OPEN':
      return `<span class="badge badge-open">OPEN</span>`;
    case 'MATCH FOUND':
      return `<span class="badge badge-match">MATCH FOUND</span>`;
    case 'IN PROGRESS':
      return `<span class="badge badge-in-progress">IN PROGRESS</span>`;
    case 'RESOLVED':
      return `<span class="badge badge-resolved">RESOLVED</span>`;
    default:
      return `<span class="badge badge-open">OPEN</span>`;
  }
}

/**
 * Formats ISO or date string for display
 */
function formatReportDate(dateVal) {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (_) {
    return String(dateVal);
  }
}

/**
 * Attaches filter & search listeners
 */
function attachEventListeners() {
  // Type filter buttons
  typeFilterTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      typeFilterTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilterType = btn.getAttribute('data-type') || 'all';
      renderReportsTable();
    });
  });

  // Status dropdown filter
  if (statusFilterSelect) {
    statusFilterSelect.addEventListener('change', (e) => {
      currentFilterStatus = e.target.value;
      renderReportsTable();
    });
  }

  // Search input
  if (reportSearchInput) {
    reportSearchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value;
      renderReportsTable();
    });
  }

  // Refresh button
  if (refreshMyReportsBtn) {
    refreshMyReportsBtn.addEventListener('click', async () => {
      const user = firebase.auth().currentUser;
      if (user) {
        showToast('Refreshing your reports...', 'info');
        await loadReportsForStudent(user);
      }
    });
  }
}

/**
 * Toggles loading state UI
 */
function showLoading(isLoading) {
  if (loadingView) loadingView.style.display = isLoading ? 'block' : 'none';
  if (isLoading) {
    if (reportsTableContainer) reportsTableContainer.style.display = 'none';
    if (emptyReportsState) emptyReportsState.style.display = 'none';
  }
}

/**
 * HTML Escaping helper to prevent XSS
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
