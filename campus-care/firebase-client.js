/* Campus Care Firebase connection. The web config is public; database access is
   controlled by Firestore Security Rules, not by hiding this file. */
(function () {
  const config = {
    apiKey: "AIzaSyCWZl7VPMNtiAnq1kUtlij2Y7reVrWMvMs",
    authDomain: "campus-care-c2b7f.firebaseapp.com",
    projectId: "campus-care-c2b7f",
    storageBucket: "campus-care-c2b7f.firebasestorage.app",
    messagingSenderId: "704656473178",
    appId: "1:704656473178:web:ea5598227e5f3dcd2b2c63",
    measurementId: "G-B53QG6RRJ2"
  };

  if (!firebase.apps.length) firebase.initializeApp(config);

  const auth = firebase.auth();
  const db = firebase.firestore();
  function currentUser() {
    if (auth.currentUser) {
      return Promise.resolve(auth.currentUser);
    }
    return new Promise(resolve => {
      const unsubscribe = auth.onAuthStateChanged(user => {
        unsubscribe();
        resolve(user);
      }, () => resolve(null));
    });
  }

  async function profileFor(user) {
    if (!user) return null;
    const snap = await db.collection('users').doc(user.uid).get();
    return snap.exists ? snap.data() : null;
  }

  function cacheReports(reports) {
    localStorage.setItem('campusCare_reports', JSON.stringify(reports));
  }

  async function requireRole(role) {
    const user = await currentUser();
    const profile = await profileFor(user);
    if (!user || !profile || (role && profile.role !== role)) {
      window.location.replace(role === 'admin' ? 'index.html?role=admin&error=unauthorized' : 'index.html');
      return null;
    }
    return { user, profile };
  }

  async function reportsOwnedBy(user) {
    const snapshot = await db.collection('reports').where('ownerUid', '==', user.uid).get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  }

  async function loadMyReports() {
    const account = await requireRole('student');
    if (!account) return [];
    cacheReports([]);
    const reports = await reportsOwnedBy(account.user);
    cacheReports(reports);
    return reports;
  }

  async function loadAllReports() {
    const account = await requireRole('admin');
    if (!account) return [];
    const snapshot = await db.collection('reports').get();
    const reports = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    cacheReports(reports);
    return reports;
  }

  async function getMyReport(reportId) {
    const account = await requireRole('student');
    if (!account) return null;
    const doc = await db.collection('reports').doc(String(reportId)).get();
    if (!doc.exists || doc.data().ownerUid !== account.user.uid) return null;
    return { ...doc.data(), id: doc.id };
  }

  async function createReport(report) {
    const user = await currentUser();
    if (!user) {
      throw new Error('Please sign in with your student account before submitting a report.');
    }
    const profile = await profileFor(user);
    if (profile && profile.role && profile.role !== 'student') {
      throw new Error(`Your account role is ${profile.role}. Only student accounts can submit reports.`);
    }

    const uid = user.uid;
    const studentID = (profile && (profile.studentID || profile.studentId)) || report.studentID || report.studentId || uid;
    const studentName = (report.studentName && report.studentName !== 'Anonymous Student' && report.studentName !== 'Anonymous Finder')
      ? report.studentName
      : ((profile && (profile.name || profile.fullName)) || user.displayName || user.email || 'Student');

    const saved = {
      ...report,
      id: String(report.id),
      reportId: String(report.id),
      ownerUid: uid,
      uid: uid,
      studentID: studentID,
      studentId: studentID,
      studentName: studentName
    };

    await db.collection('reports').doc(saved.id).set(saved);
    const existing = JSON.parse(localStorage.getItem('campusCare_reports') || '[]');
    cacheReports([saved, ...existing.filter(item => item.id !== saved.id)]);
    return saved;
  }

  async function saveAdminReports(reports) {
    const account = await requireRole('admin');
    if (!account) throw new Error('Sign in with an admin account to update reports.');
    for (let start = 0; start < reports.length; start += 450) {
      const batch = db.batch();
      reports.slice(start, start + 450).forEach(report => {
        const { id, ...data } = report;
        batch.set(db.collection('reports').doc(String(id)), data);
      });
      await batch.commit();
    }
    cacheReports(reports);
  }

  window.CampusCareFirebase = {
    auth,
    db,
    currentUser,
    profileFor,
    requireRole,
    loadMyReports,
    loadAllReports,
    getMyReport,
    createReport,
    saveAdminReports,
    cacheReports
  };
})();
