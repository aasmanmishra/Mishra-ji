// TutorConnect – Firebase connection (free plan: Auth + Firestore)
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, query, where, writeBatch } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

var ADMIN_EMAIL = "office.manmishra@gmail.com";
var firebaseConfig = {
  apiKey: "AIzaSyA1gRzKLePaWui3gct_VZliqmRefH6Q03k",
  authDomain: "tutor-connect-28e27.firebaseapp.com",
  projectId: "tutor-connect-28e27",
  storageBucket: "tutor-connect-28e27.firebasestorage.app",
  messagingSenderId: "777390967092",
  appId: "1:777390967092:web:f8e6b210804f1b949d7d61"
};

var app = initializeApp(firebaseConfig), auth = getAuth(app), fs = getFirestore(app), cbs = [];
function isAdminEmail(e) { return !!e && e.toLowerCase() === ADMIN_EMAIL; }
function rows(q) { return q.docs.map(function (d) { var o = d.data(); o.id = d.id; return o; }); }

var api = {
  user: function () { return auth.currentUser; },
  isAdmin: function () { return isAdminEmail(auth.currentUser && auth.currentUser.email); },
  isAdminEmail: isAdminEmail,
  onChange: function (f) { cbs.push(f); },
  signUp: function (e, p) { return createUserWithEmailAndPassword(auth, e, p).then(function (r) { return r.user; }); },
  signIn: function (e, p) { return signInWithEmailAndPassword(auth, e, p).then(function (r) { return r.user; }); },
  signOut: function () { return signOut(auth); },
  reset: function (e) { return sendPasswordResetEmail(auth, e); },

  async list(c) {
    try {
      var u = auth.currentUser; if (!u) return [];
      var ad = api.isAdmin();
      if (c == 'tutors') {
        var q = ad ? collection(fs, 'tutors') : query(collection(fs, 'tutors'), where('status', '==', 'approved'));
        var t = rows(await getDocs(q));
        if (ad) {
          var m = {};
          rows(await getDocs(collection(fs, 'tutorContacts'))).forEach(function (x) { m[x.id] = x.email; });
          t.forEach(function (x) { x.email = m[x.id] || ''; });
        }
        return t;
      }
      if (c == 'students') {
        if (ad) return rows(await getDocs(collection(fs, 'students')));
        var s = await getDoc(doc(fs, 'students', u.uid));
        if (!s.exists()) return [];
        var o = s.data(); o.id = s.id; return [o];
      }
      if (c == 'requests') {
        return rows(await getDocs(ad ? collection(fs, 'requests') : query(collection(fs, 'requests'), where('uid', '==', u.uid))));
      }
      return [];
    } catch (e) { console.error('list ' + c, e); return []; }
  },

  async put(c, o) {
    var id = o.id || Math.random().toString(36).slice(2, 10), at = Date.now(), u = auth.currentUser;
    if (c == 'tutors') {
      var em = o.email, p = Object.assign({}, o);
      delete p.email; delete p.id; p.at = at; p.status = 'pending';
      var b = writeBatch(fs);
      b.set(doc(fs, 'tutors', id), p);
      b.set(doc(fs, 'tutorContacts', id), { email: em, at: at });
      await b.commit();
    } else if (c == 'students') {
      var s = Object.assign({}, o); delete s.id; s.uid = u.uid; s.at = at;
      await setDoc(doc(fs, 'students', u.uid), s); id = u.uid;
    } else {
      var r = Object.assign({}, o); delete r.id; r.uid = u.uid; r.at = at;
      await setDoc(doc(fs, 'requests', id), r);
    }
    o.id = id; return o;
  },

  async patch(c, id, p) { await updateDoc(doc(fs, c, id), p); },

  async del(c, id) {
    var b = writeBatch(fs);
    b.delete(doc(fs, c, id));
    if (c == 'tutors') b.delete(doc(fs, 'tutorContacts', id));
    await b.commit();
  }
};

var first = true;
onAuthStateChanged(auth, function (u) {
  cbs.forEach(function (f) { try { f(u); } catch (e) { } });
  if (first) { first = false; window.TCRES(api); }
});
