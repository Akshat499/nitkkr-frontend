/* ════════════════════════════════════════════════════════
   NIT KKR — FIREBASE AUTH.JS
   Complete with: Email, Phone OTP, Google Sign-In
════════════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey: "AIzaSyBA6XiGjdKuC3rzu3VaX-uvraK0S6Ub-m0",
  authDomain: "nitkkr-search-engine.firebaseapp.com",
  projectId: "nitkkr-search-engine",
  storageBucket: "nitkkr-search-engine.firebasestorage.app",
  messagingSenderId: "443403440031",
  appId: "1:443403440031:web:f58f3976bd59acfc6437aa",
  measurementId: "G-PRQDBDE4LT"
};

const FirebaseAuth = (() => {

  let _app, _auth, _db;
  let _recaptchaVerifier  = null;
  let _confirmationResult = null;

  // ── Initialize ──────────────────────────────────────
  function init() {
    if (_app) return;
    if (typeof firebase === 'undefined') {
      console.error('[FirebaseAuth] Firebase SDK not loaded.');
      return;
    }
    try {
      _app = firebase.app();
    } catch(e) {
      _app = firebase.initializeApp(firebaseConfig);
    }
    _auth = firebase.auth();
    _db   = firebase.firestore();
    console.log('[FirebaseAuth] Initialized ✅');
  }

  // ════════════════════════════════════════════════════
  //  GOOGLE SIGN IN
  // ════════════════════════════════════════════════════
  async function signInWithGoogle(expectedRole) {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const cred     = await _auth.signInWithPopup(provider);
      const user     = cred.user;

      const doc = await _db.collection('users').doc(user.uid).get();

      if (doc.exists) {
        const userData = doc.data();
        if (userData.role === 'teacher' && !userData.approved) {
          await _auth.signOut();
          return { success: false, message: 'Admin approval pending hai. Wait karo.' };
        }
        const session = {
          uid: user.uid, email: user.email,
          name: userData.name, role: userData.role,
          department: userData.department || '',
        };
        localStorage.setItem('nitkkr_session', JSON.stringify(session));
        return { success: true, role: userData.role, isNew: false };
      } else {
        const role = expectedRole || 'student';
        await _db.collection('users').doc(user.uid).set({
          uid: user.uid, email: user.email,
          name: user.displayName || 'User',
          role: role, department: '',
          verified: true,
          approved: role === 'student' ? true : false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        if (role === 'student') {
          await _db.collection('students').doc(user.uid).set({
            uid: user.uid, email: user.email,
            name: user.displayName || 'User',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else if (role === 'teacher') {
          await _db.collection('teachers').doc(user.uid).set({
            uid: user.uid, email: user.email,
            name: user.displayName || 'User',
            department: '', approved: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
        const session = {
          uid: user.uid, email: user.email,
          name: user.displayName || 'User',
          role: role, department: '',
        };
        localStorage.setItem('nitkkr_session', JSON.stringify(session));
        return { success: true, role: role, isNew: true };
      }
    } catch (err) {
      return { success: false, message: _friendlyError(err.code) };
    }
  }

  // ════════════════════════════════════════════════════
  //  EMAIL SIGNUP / LOGIN
  // ════════════════════════════════════════════════════
  async function signupWithEmail(email, password, name, role, department) {
    try {
      if ((role === 'teacher' || role === 'admin') && !email.endsWith('@nitkkr.ac.in')) {
        return { success: false, message: 'Sirf @nitkkr.ac.in email allowed hai.' };
      }
      const cred = await _auth.createUserWithEmailAndPassword(email, password);
      const user = cred.user;
      await user.sendEmailVerification();
      await _db.collection('users').doc(user.uid).set({
        uid: user.uid, email: email, name: name,
        role: role, department: department || '',
        verified: false,
        approved: role === 'student' ? true : false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      if (role === 'teacher') {
        await _db.collection('teachers').doc(user.uid).set({
          uid: user.uid, email, name, department,
          approved: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else if (role === 'student') {
        await _db.collection('students').doc(user.uid).set({
          uid: user.uid, email, name,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      return {
        success: true,
        message: `Verification email bheja gaya: ${email}. Verify karo aur login karo.`,
        uid: user.uid
      };
    } catch (err) {
      return { success: false, message: _friendlyError(err.code) };
    }
  }

  async function loginWithEmail(email, password) {
    try {
      const cred = await _auth.signInWithEmailAndPassword(email, password);
      const user = cred.user;
      if (!user.emailVerified) {
        await _auth.signOut();
        return {
          success: false,
          message: 'Email verify nahi hui. Inbox check karo aur link pe click karo.',
          needsVerification: true, email: email
        };
      }
      const doc = await _db.collection('users').doc(user.uid).get();
      if (!doc.exists) {
        return { success: false, message: 'User data nahi mila. Support se contact karo.' };
      }
      const userData = doc.data();
      if (userData.role === 'teacher' && !userData.approved) {
        await _auth.signOut();
        return { success: false, message: 'Admin approval pending hai. Wait karo.' };
      }
      const session = {
        uid: user.uid, email: user.email,
        name: userData.name, role: userData.role,
        department: userData.department || '',
      };
      localStorage.setItem('nitkkr_session', JSON.stringify(session));
      return { success: true, role: userData.role, session };
    } catch (err) {
      return { success: false, message: _friendlyError(err.code) };
    }
  }

  async function resendVerificationEmail(email, password) {
    try {
      const cred = await _auth.signInWithEmailAndPassword(email, password);
      await cred.user.sendEmailVerification();
      await _auth.signOut();
      return { success: true, message: 'Verification email dobara bheja gaya!' };
    } catch (err) {
      return { success: false, message: _friendlyError(err.code) };
    }
  }

  async function resetPassword(email) {
    try {
      await _auth.sendPasswordResetEmail(email);
      return { success: true, message: 'Password reset email bheja gaya: ' + email };
    } catch (err) {
      return { success: false, message: _friendlyError(err.code) };
    }
  }

  // ════════════════════════════════════════════════════
  //  PHONE OTP
  // ════════════════════════════════════════════════════
  async function sendPhoneOTP(phoneNumber, recaptchaContainerId) {
    try {
      if (!_recaptchaVerifier) {
        _recaptchaVerifier = new firebase.auth.RecaptchaVerifier(recaptchaContainerId, {
          size: 'invisible', callback: () => {}
        });
      }
      const formatted = phoneNumber.startsWith('+') ? phoneNumber : '+91' + phoneNumber;
      _confirmationResult = await _auth.signInWithPhoneNumber(formatted, _recaptchaVerifier);
      return { success: true, message: 'OTP bheja gaya: ' + formatted };
    } catch (err) {
      if (_recaptchaVerifier) { _recaptchaVerifier.clear(); _recaptchaVerifier = null; }
      return { success: false, message: _friendlyError(err.code) };
    }
  }

  async function verifyPhoneOTP(otp, name, role) {
    try {
      if (!_confirmationResult) return { success: false, message: 'Pehle OTP bhejo.' };
      const cred = await _confirmationResult.confirm(otp);
      const user = cred.user;
      const existingDoc = await _db.collection('users').doc(user.uid).get();
      if (!existingDoc.exists) {
        await _db.collection('users').doc(user.uid).set({
          uid: user.uid, phone: user.phoneNumber,
          name: name || 'Student', role: role || 'student',
          verified: true, approved: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        if (role === 'student' || !role) {
          await _db.collection('students').doc(user.uid).set({
            uid: user.uid, phone: user.phoneNumber, name: name || 'Student',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      }
      const userData = existingDoc.exists
        ? existingDoc.data()
        : { name: name || 'Student', role: role || 'student', department: '' };
      const session = {
        uid: user.uid, phone: user.phoneNumber,
        name: userData.name, role: userData.role || 'student',
        department: userData.department || '',
      };
      localStorage.setItem('nitkkr_session', JSON.stringify(session));
      return { success: true, role: userData.role || 'student', session };
    } catch (err) {
      return { success: false, message: _friendlyError(err.code) };
    }
  }

  // ════════════════════════════════════════════════════
  //  SESSION
  // ════════════════════════════════════════════════════
  function getSession() {
    const s = localStorage.getItem('nitkkr_session');
    return s ? JSON.parse(s) : null;
  }
  function isLoggedIn() { return !!getSession(); }
  function getRole()    { return getSession()?.role || null; }

  async function logout() {
    try { await _auth.signOut(); } catch(e) {}
    localStorage.removeItem('nitkkr_session');
  }

  function requireLogin(requiredRole) {
    const session = getSession();
    if (!session) { window.location.href = 'login.html'; return false; }
    if (requiredRole && session.role !== requiredRole) {
      const map = { admin: 'dashboard-admin.html', teacher: 'dashboard-teacher.html', student: 'dashboard-student.html' };
      window.location.href = map[session.role] || 'login.html';
      return false;
    }
    return true;
  }

  // ════════════════════════════════════════════════════
  //  ADMIN — TEACHER MANAGEMENT
  // ════════════════════════════════════════════════════
  async function getPendingTeachers() {
    const snap = await _db.collection('teachers').where('approved', '==', false).get();
    return snap.docs.map(d => d.data());
  }
  async function approveTeacher(uid) {
    await _db.collection('teachers').doc(uid).update({ approved: true });
    await _db.collection('users').doc(uid).update({ approved: true });
    return { success: true };
  }
  async function removeTeacher(uid) {
    await _db.collection('teachers').doc(uid).delete();
    await _db.collection('users').doc(uid).delete();
    return { success: true };
  }
  async function getAllTeachers() {
    const snap = await _db.collection('teachers').get();
    return snap.docs.map(d => d.data());
  }

  // ── Error messages ───────────────────────────────────
  function _friendlyError(code) {
    const messages = {
      'auth/user-not-found':            'Yeh email registered nahi hai.',
      'auth/wrong-password':            'Password galat hai.',
      'auth/invalid-credential':        'Email ya password galat hai.',
      'auth/email-already-in-use':      'Yeh email already registered hai. Login karo.',
      'auth/weak-password':             'Password kam se kam 6 characters ka hona chahiye.',
      'auth/invalid-email':             'Email format sahi nahi hai.',
      'auth/too-many-requests':         'Bahut zyada attempts. Kuch der baad try karo.',
      'auth/network-request-failed':    'Network error. Internet check karo.',
      'auth/invalid-verification-code': 'OTP galat hai. Dobara check karo.',
      'auth/code-expired':              'OTP expire ho gaya. Dobara bhejo.',
      'auth/invalid-phone-number':      'Phone number sahi nahi hai (10 digits chahiye).',
      'auth/quota-exceeded':            'SMS limit cross ho gayi. Kal try karo.',
      'auth/popup-closed-by-user':      'Google popup band kar diya. Dobara try karo.',
      'auth/cancelled-popup-request':   'Popup cancel ho gaya. Dobara try karo.',
      'auth/popup-blocked':             'Browser ne popup block ki. Allow karo aur try karo.',
    };
    return messages[code] || 'Kuch error aayi. Dobara try karo. (' + (code || 'unknown') + ')';
  }

  return {
    init,
    signInWithGoogle,
    signupWithEmail,
    loginWithEmail,
    resendVerificationEmail,
    resetPassword,
    sendPhoneOTP,
    verifyPhoneOTP,
    getSession, isLoggedIn, getRole, logout, requireLogin,
    getPendingTeachers, approveTeacher, removeTeacher, getAllTeachers,
  };

})();

document.addEventListener('DOMContentLoaded', () => FirebaseAuth.init());