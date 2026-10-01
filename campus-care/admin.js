/**
 * Campus Care - Admin Operations Dashboard Logic
 * Role-protected dashboard for updating issue statuses, verifying claims, and closing reports
 */

// Storage Keys & Expiry Configuration
const STORAGE_KEY_REPORTS = 'campusCare_reports';
const STORAGE_KEY_SESSION = 'campusCare_session';
const ITEM_EXPIRY_DAYS = 30; // Number of days before an unclaimed lost/found item report expires

// State variables
let allReports = [];
let currentTypeFilter = 'all';
let currentStatusFilter = 'all';
let currentSearchQuery = '';

// DOM Elements - Profile & Logout
const adminUserName = document.getElementById('adminUserName');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');

// DOM Elements - Stats
const statTotalReports = document.getElementById('statTotalReports');
const statOpenIssues = document.getElementById('statOpenIssues');
const statFoundPending = document.getElementById('statFoundPending');
const statResolvedCount = document.getElementById('statResolvedCount');

const countTypeAll = document.getElementById('countTypeAll');
const countTypeLost = document.getElementById('countTypeLost');
const countTypeFound = document.getElementById('countTypeFound');
const countTypeIssue = document.getElementById('countTypeIssue');

// DOM Elements - Filters
const typeTabBtns = document.querySelectorAll('.type-tab-btn');
const adminSearchInput = document.getElementById('adminSearchInput');
const statusFilterSelect = document.getElementById('statusFilterSelect');
const reportsTableBody = document.getElementById('reportsTableBody');
const tableEmptyState = document.getElementById('tableEmptyState');

// DOM Elements - Status Modal
const statusModal = document.getElementById('statusModal');
const statusModalReportId = document.getElementById('statusModalReportId');
const statusModalTitle = document.getElementById('statusModalTitle');
const statusModalTargetId = document.getElementById('statusModalTargetId');
const newStatusSelect = document.getElementById('newStatusSelect');
const statusRemark = document.getElementById('statusRemark');
const statusUpdateForm = document.getElementById('statusUpdateForm');
const closeStatusModalX = document.getElementById('closeStatusModalX');
const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');

// DOM Elements - Verify Claim Modal
const verifyClaimModal = document.getElementById('verifyClaimModal');
const verifyItemTitle = document.getElementById('verifyItemTitle');
const verifyReportId = document.getElementById('verifyReportId');
const verifySecretDetail = document.getElementById('verifySecretDetail');
const verifyTargetId = document.getElementById('verifyTargetId');
const claimantNameInput = document.getElementById('claimantName');
const claimantContactInput = document.getElementById('claimantContact');
const claimantAnswerInput = document.getElementById('claimantAnswer');
const claimAdminRemarkInput = document.getElementById('claimAdminRemark');
const btnApproveClaim = document.getElementById('btnApproveClaim');
const btnRejectClaim = document.getElementById('btnRejectClaim');
const closeVerifyModalX = document.getElementById('closeVerifyModalX');
const closeVerifyModalBtn = document.getElementById('closeVerifyModalBtn');

// DOM Elements - History Modal
const historyModal = document.getElementById('historyModal');
const historyModalReportId = document.getElementById('historyModalReportId');
const historyTimelineContainer = document.getElementById('historyTimelineContainer');
const closeHistoryModalX = document.getElementById('closeHistoryModalX');
const closeHistoryModalBtn = document.getElementById('closeHistoryModalBtn');

const toastContainer = document.getElementById('toastContainer');

// Startup initialization
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();

  // Initialize realistic demo reports if visiting for the first time
  initializeDemoReportsIfEmpty();
  if (!checkAdminAuth()) return;
  loadReports();
  attachFilterListeners();
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
 * Access Control Check
 * @returns {boolean} True if authenticated as Admin
 */
function checkAdminAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION) || sessionStorage.getItem(STORAGE_KEY_SESSION);
    const session = raw ? JSON.parse(raw) : null;
    if (!session || session.role !== 'admin') {
      window.location.replace('index.html?error=unauthorized');
      return false;
    }
    if (adminUserName && session.name) {
      adminUserName.textContent = session.name;
    }
    return true;
  } catch (err) {
    window.location.replace('index.html?error=unauthorized');
    return false;
  }
}

/**
 * Loads reports from localStorage and updates UI (runs expiry check and matching check first)
 */
function loadReports() {
  initializeDemoReportsIfEmpty();
  checkAndExpireOldItemReports();
  checkAndRunCrossMatching();
  try {
    const data = localStorage.getItem(STORAGE_KEY_REPORTS);
    allReports = data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading reports:', e);
    allReports = [];
  }

  updateStats();
  renderTable();
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
 * Saves reports to localStorage
 */
function saveReportsToStorage() {
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(allReports));
}

/**
 * Computes KPI counts and badge indicators
 */
function updateStats() {
  const total = allReports.length;
  const lostCount = allReports.filter(r => r.type === 'lost').length;
  const foundCount = allReports.filter(r => r.type === 'found').length;
  const issueCount = allReports.filter(r => r.type === 'issue').length;

  const openIssues = allReports.filter(r => r.type === 'issue' && (r.status === 'Open' || r.status === 'Assigned' || r.status === 'In Progress')).length;
  const foundPending = allReports.filter(r => r.type === 'found' && (r.status === 'Open' || r.status === 'Match Found')).length;
  const resolvedCount = allReports.filter(r => r.status === 'Resolved' || r.status === 'Returned' || r.status === 'Closed').length;

  statTotalReports.textContent = total;
  statOpenIssues.textContent = openIssues;
  statFoundPending.textContent = foundPending;
  statResolvedCount.textContent = resolvedCount;

  countTypeAll.textContent = total;
  countTypeLost.textContent = lostCount;
  countTypeFound.textContent = foundCount;
  countTypeIssue.textContent = issueCount;
}

/**
 * Filters and renders reports in the data table
 */
function renderTable() {
  let filtered = [...allReports];

  // Filter by Type
  if (currentTypeFilter !== 'all') {
    filtered = filtered.filter(r => r.type === currentTypeFilter);
  }

  // Filter by Status
  if (currentStatusFilter !== 'all') {
    filtered = filtered.filter(r => r.status === currentStatusFilter);
  }

  // Search query filter
  if (currentSearchQuery.trim()) {
    const q = currentSearchQuery.trim().toLowerCase();
    filtered = filtered.filter(r => {
      return (
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.itemName && r.itemName.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q)) ||
        (r.location && r.location.toLowerCase().includes(q)) ||
        (r.studentName && r.studentName.toLowerCase().includes(q)) ||
        (r.department && r.department.toLowerCase().includes(q)) ||
        (r.keptAt && r.keptAt.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    });
  }

  if (filtered.length === 0) {
    reportsTableBody.innerHTML = '';
    tableEmptyState.style.display = 'block';
    return;
  }

  tableEmptyState.style.display = 'none';

  reportsTableBody.innerHTML = filtered.map(report => {
    const typeLabel = report.type === 'issue' ? 'Campus Issue' : report.type === 'found' ? 'Found Item' : 'Lost Item';
    const typeClass = report.type === 'issue' ? 'type-tag-issue' : report.type === 'found' ? 'type-tag-found' : 'type-tag-lost';
    const statusClass = getStatusBadgeClass(report.status);

    const isFoundItem = report.type === 'found';
    const isReturnedOrClosed = report.status === 'Returned' || report.status === 'Closed' || report.status === 'Resolved';

    return `
      <tr class="table-row">
        <td>
          <span class="table-report-id">${escapeHtml(report.id)}</span>
        </td>
        <td>
          <span class="type-pill ${typeClass}">${typeLabel}</span>
        </td>
        <td>
          <div class="table-item-title">${escapeHtml(report.itemName || report.category)}</div>
          <span class="table-cat-sub">${escapeHtml(report.category)}</span>
        </td>
        <td>
          <div class="table-meta-text">Location: ${escapeHtml(report.location || 'N/A')}</div>
          <div class="table-meta-sub">Date: ${escapeHtml(report.date || '-')}</div>
        </td>
        <td>
          ${report.department ? `<div class="dept-name-tag">${escapeHtml(report.department)}</div>` : ''}
          <div class="table-meta-sub">By: ${escapeHtml(report.studentName || 'Anonymous')}</div>
          <div class="table-meta-sub">Phone: <strong>${escapeHtml(report.phone || (report.contact && report.contact !== 'Not provided' ? report.contact : null) || 'Not provided')}</strong>${report.type === 'found' ? ` &bull; Kept at: <strong>${escapeHtml(report.keptAt || 'Not provided')}</strong>` : ''}</div>
        </td>
        <td>
          <span class="badge ${statusClass}">${escapeHtml(report.status || 'Open')}</span>
        </td>
        <td>
          <div class="table-actions-cell">
            ${isFoundItem && !isReturnedOrClosed ? `
              <button type="button" class="btn-table-action btn-action-verify" onclick="openVerifyClaimModal('${escapeHtml(report.id)}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <span>Verify Claim</span>
              </button>
            ` : ''}

            <button type="button" class="btn-table-action btn-action-status" onclick="openStatusModal('${escapeHtml(report.id)}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              <span>Update Status</span>
            </button>

            <button type="button" class="btn-table-action btn-action-history" onclick="openHistoryModal('${escapeHtml(report.id)}')" title="View History Log">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>Audit</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Maps status string to badge CSS class
 */
function getStatusBadgeClass(status) {
  if (!status) return 'badge-open';
  const s = status.toLowerCase();
  if (s.includes('open')) return 'badge-open';
  if (s.includes('assign')) return 'badge-assigned';
  if (s.includes('progress')) return 'badge-in-progress';
  if (s.includes('match')) return 'badge-match';
  if (s.includes('return') || s.includes('claim')) return 'badge-returned';
  if (s.includes('resolv')) return 'badge-resolved';
  if (s.includes('expire') || s.includes('close')) return 'badge-expired';
  return 'badge-open';
}

/**
 * Filter event bindings
 */
function attachFilterListeners() {
  typeTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTypeFilter = btn.getAttribute('data-type');
      renderTable();
    });
  });

  if (adminSearchInput) {
    adminSearchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value;
      renderTable();
    });
  }

  statusFilterSelect.addEventListener('change', (e) => {
    currentStatusFilter = e.target.value;
    renderTable();
  });

  refreshBtn.addEventListener('click', () => {
    loadReports();
    showToast('Dashboard refreshed with latest data', 'info');
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    sessionStorage.removeItem(STORAGE_KEY_SESSION);
    window.location.href = 'index.html?logout=true';
  });
}

/**
 * Status Update Modal Workflow
 */
window.openStatusModal = function(reportId) {
  const report = allReports.find(r => r.id === reportId);
  if (!report) return;

  statusModalReportId.textContent = report.id;
  statusModalTitle.textContent = report.itemName || report.category;
  statusModalTargetId.value = report.id;
  const statusStudentElem = document.getElementById('statusModalStudentName');
  const statusPhoneElem = document.getElementById('statusModalPhone');
  if (statusStudentElem) statusStudentElem.textContent = report.studentName || 'Anonymous';
  if (statusPhoneElem) statusPhoneElem.textContent = report.phone || (report.contact && report.contact !== 'Not provided' ? report.contact : null) || 'Not provided';
  
  const statusKeptWrapper = document.getElementById('statusModalKeptAtWrapper');
  const statusKeptElem = document.getElementById('statusModalKeptAt');
  if (statusKeptWrapper && statusKeptElem) {
    if (report.type === 'found') {
      statusKeptWrapper.style.display = 'inline';
      statusKeptElem.textContent = report.keptAt || 'Not provided';
    } else {
      statusKeptWrapper.style.display = 'none';
    }
  }

  // Populate status choices strictly matching the report type
  if (report.type === 'issue') {
    // Campus issues only: Open, Assigned, In Progress, Resolved
    newStatusSelect.innerHTML = `
      <option value="Open">Open</option>
      <option value="Assigned">Assigned</option>
      <option value="In Progress">In Progress</option>
      <option value="Resolved">Resolved</option>
    `;
  } else {
    // Lost and Found items only: Open, Match Found, Returned, Expired
    newStatusSelect.innerHTML = `
      <option value="Open">Open</option>
      <option value="Match Found">Match Found</option>
      <option value="Returned">Returned</option>
      <option value="Expired">Expired</option>
    `;
  }

  const validOption = Array.from(newStatusSelect.options).some(opt => opt.value === report.status);
  newStatusSelect.value = validOption ? report.status : 'Open';
  statusRemark.value = '';
  document.getElementById('err-statusRemark').textContent = '';

  statusModal.classList.add('active');
  statusModal.setAttribute('aria-hidden', 'false');
};

function closeStatusModal() {
  statusModal.classList.remove('active');
  statusModal.setAttribute('aria-hidden', 'true');
}

closeStatusModalX.addEventListener('click', closeStatusModal);
closeStatusModalBtn.addEventListener('click', closeStatusModal);

statusUpdateForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const reportId = statusModalTargetId.value;
  const newStatus = newStatusSelect.value;
  const remarkText = statusRemark.value.trim();

  if (!remarkText) {
    document.getElementById('err-statusRemark').textContent = 'Admin remark/notes are required for status update.';
    return;
  }

  const report = allReports.find(r => r.id === reportId);
  if (!report) return;

  // Update status & history
  report.status = newStatus;
  if (!Array.isArray(report.history)) {
    report.history = [];
  }

  report.history.push({
    status: newStatus,
    timestamp: new Date().toISOString(),
    remark: `Admin update: ${remarkText}`
  });

  saveReportsToStorage();
  closeStatusModal();
  updateStats();
  renderTable();
  showToast(`Status for ${reportId} updated to "${newStatus}"!`, 'success');
});

/**
 * Claim Verification Modal Workflow (Found items)
 */
window.openVerifyClaimModal = function(reportId) {
  const report = allReports.find(r => r.id === reportId);
  if (!report) return;

  verifyTargetId.value = report.id;
  verifyReportId.textContent = report.id;
  verifyItemTitle.textContent = report.itemName;
  const verifyFinderElem = document.getElementById('verifyFinderName');
  const verifyFinderPhoneElem = document.getElementById('verifyFinderPhone');
  const verifyFinderKeptElem = document.getElementById('verifyFinderKeptAt');
  if (verifyFinderElem) verifyFinderElem.textContent = report.studentName || 'Finder';
  if (verifyFinderPhoneElem) verifyFinderPhoneElem.textContent = report.phone || (report.contact && report.contact !== 'Not provided' ? report.contact : null) || 'Not provided';
  if (verifyFinderKeptElem) verifyFinderKeptElem.textContent = report.keptAt || 'Not provided';
  verifySecretDetail.textContent = report.secretDetail || 'No secret detail recorded for this item.';

  claimantNameInput.value = '';
  claimantContactInput.value = '';
  claimantAnswerInput.value = '';
  if (claimAdminRemarkInput) claimAdminRemarkInput.value = '';

  // Clear errors
  document.querySelectorAll('.error-msg').forEach(e => e.textContent = '');

  verifyClaimModal.classList.add('active');
  verifyClaimModal.setAttribute('aria-hidden', 'false');
};

function closeVerifyModal() {
  verifyClaimModal.classList.remove('active');
  verifyClaimModal.setAttribute('aria-hidden', 'true');
}

closeVerifyModalX.addEventListener('click', closeVerifyModal);
closeVerifyModalBtn.addEventListener('click', closeVerifyModal);

// Approve Claim & Mark Returned
btnApproveClaim.addEventListener('click', () => {
  const reportId = verifyTargetId.value;
  const claimantName = claimantNameInput.value.trim();
  const claimantContact = claimantContactInput.value.trim();
  const claimantAnswer = claimantAnswerInput.value.trim();
  const adminRemark = claimAdminRemarkInput ? claimAdminRemarkInput.value.trim() : '';

  let hasErr = false;
  if (!claimantName) {
    document.getElementById('err-claimantName').textContent = 'Claimant name is required.';
    hasErr = true;
  }
  if (!claimantContact) {
    document.getElementById('err-claimantContact').textContent = 'Claimant contact is required.';
    hasErr = true;
  }
  if (!claimantAnswer) {
    document.getElementById('err-claimantAnswer').textContent = "Claimant's answer is required.";
    hasErr = true;
  }

  if (hasErr) return;

  const report = allReports.find(r => r.id === reportId);
  if (!report) return;

  report.status = 'Returned';
  report.claimant = {
    name: claimantName,
    contact: claimantContact,
    answer: claimantAnswer,
    verifiedAt: new Date().toISOString()
  };

  if (!Array.isArray(report.history)) {
    report.history = [];
  }

  const remarkMsg = `Claim APPROVED & Item Returned to ${claimantName} (${claimantContact}). Proof provided: "${claimantAnswer}". ${adminRemark ? `Notes: ${adminRemark}` : ''}`;

  report.history.push({
    status: 'Returned',
    timestamp: new Date().toISOString(),
    remark: remarkMsg
  });

  saveReportsToStorage();
  closeVerifyModal();
  updateStats();
  renderTable();
  showToast(`Item ${reportId} successfully verified & returned to ${claimantName}!`, 'success');
});

// Reject Claim
btnRejectClaim.addEventListener('click', () => {
  const reportId = verifyTargetId.value;
  const claimantName = claimantNameInput.value.trim() || 'Claimant';
  const claimantAnswer = claimantAnswerInput.value.trim() || 'No answer provided';
  const adminRemark = claimAdminRemarkInput ? claimAdminRemarkInput.value.trim() : '';

  const report = allReports.find(r => r.id === reportId);
  if (!report) return;

  if (!Array.isArray(report.history)) {
    report.history = [];
  }

  const remarkMsg = `Claim REJECTED for ${claimantName}. Provided proof "${claimantAnswer}" did NOT match confidential owner detail. ${adminRemark ? `Admin Note: ${adminRemark}` : ''}`;

  report.history.push({
    status: report.status || 'Open',
    timestamp: new Date().toISOString(),
    remark: remarkMsg
  });

  saveReportsToStorage();
  closeVerifyModal();
  updateStats();
  renderTable();
  showToast(`Claim rejected for ${claimantName}. Audit log recorded.`, 'info');
});

/**
 * Audit History Modal Workflow
 */
window.openHistoryModal = function(reportId) {
  const report = allReports.find(r => r.id === reportId);
  if (!report) return;

  historyModalReportId.textContent = `${report.id} - ${report.itemName || report.category}`;
  const histStudentElem = document.getElementById('historyReporterName');
  const histPhoneElem = document.getElementById('historyReporterPhone');
  if (histStudentElem) histStudentElem.textContent = report.studentName || 'Anonymous';
  if (histPhoneElem) histPhoneElem.textContent = report.phone || (report.contact && report.contact !== 'Not provided' ? report.contact : null) || 'Not provided';

  const historyKeptWrapper = document.getElementById('historyKeptAtWrapper');
  const historyKeptElem = document.getElementById('historyReporterKeptAt');
  if (historyKeptWrapper && historyKeptElem) {
    if (report.type === 'found') {
      historyKeptWrapper.style.display = 'inline';
      historyKeptElem.textContent = report.keptAt || 'Not provided';
    } else {
      historyKeptWrapper.style.display = 'none';
    }
  }

  const historyList = Array.isArray(report.history) && report.history.length > 0 ? report.history : [
    {
      status: report.status || 'Open',
      timestamp: report.createdAt || new Date().toISOString(),
      remark: 'Initial report submitted'
    }
  ];

  const sorted = [...historyList].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  historyTimelineContainer.innerHTML = sorted.map((entry, index) => {
    const isLatest = index === 0;
    const badgeClass = getStatusBadgeClass(entry.status);
    const timeStr = formatDateTime(entry.timestamp);

    return `
      <div class="timeline-item ${isLatest ? 'is-latest' : ''}">
        <div class="timeline-node">
          <div class="timeline-dot ${badgeClass}"></div>
          ${index < sorted.length - 1 ? '<div class="timeline-line"></div>' : ''}
        </div>
        <div class="timeline-body">
          <div class="timeline-top">
            <div class="timeline-status-group">
              <span class="badge ${badgeClass}">${escapeHtml(entry.status || 'Update')}</span>
              ${isLatest ? '<span class="latest-tag">Latest</span>' : ''}
            </div>
            <time class="timeline-time">${timeStr}</time>
          </div>
          <div class="timeline-remark">
            <p>${escapeHtml(entry.remark || 'No remark entered.')}</p>
          </div>
        </div>
      </div>
    `;
  }).join('');

  historyModal.classList.add('active');
  historyModal.setAttribute('aria-hidden', 'false');
};

function closeHistoryModal() {
  historyModal.classList.remove('active');
  historyModal.setAttribute('aria-hidden', 'true');
}

closeHistoryModalX.addEventListener('click', closeHistoryModal);
closeHistoryModalBtn.addEventListener('click', closeHistoryModal);

/**
 * Helpers
 */
function formatDateTime(isoString) {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
}
