// TutorConnect – Firebase connection v4 (free plan: Auth + Firestore). Roles: parent / teacher / admin
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

var app = initializeApp(firebaseConfig), auth = getAuth(app), fs = getFirestore(app), cbs = [], role = '', rv = 0;
function isAdminEmail(e) { return !!e && e.toLowerCase() === ADMIN_EMAIL; }
function rows(q) { return q.docs.map(function (d) { var o = d.data(); o.id = d.id; return o; }); }

// Finds out if the signed-in person is admin, parent or teacher.
async function setRole(u) {
  var my = ++rv, r = '';
  if (u) {
    if (isAdminEmail(u.email)) r = 'admin';
    else { try { var s = await getDoc(doc(fs, 'users', u.uid)); r = s.exists() ? s.data().role : ''; } catch (e) { r = ''; } }
  }
  if (my === rv) role = r;
}

var api = {
  user: function () { return auth.currentUser; },
  role: function () { return role; },
  isAdmin: function () { return isAdminEmail(auth.currentUser && auth.currentUser.email); },
  isAdminEmail: isAdminEmail,
  onChange: function (f) { cbs.push(f); },
  signUp: function (e, p) { return createUserWithEmailAndPassword(auth, e, p).then(function (r) { return r.user; }); },
  signIn: function (e, p) { return signInWithEmailAndPassword(auth, e, p).then(async function (r) { await setRole(r.user); return r.user; }); },
  signOut: function () { return signOut(auth); },
  reset: function (e) { return sendPasswordResetEmail(auth, e); },

  async list(c) {
    try {
      var u = auth.currentUser; if (!u) return [];
      var ad = api.isAdmin();
      if (c == 'tutors') {
        if (ad) {
          var t = rows(await getDocs(collection(fs, 'tutors'))), m = {};
          rows(await getDocs(collection(fs, 'tutorContacts'))).forEach(function (x) { m[x.id] = x.email; });
          t.forEach(function (x) { x.email = m[x.id] || ''; });
          return t;
        }
        if (role == 'teacher') {
          var s0 = await getDoc(doc(fs, 'tutors', u.uid));
          if (!s0.exists()) return [];
          var o0 = s0.data(); o0.id = s0.id; o0.email = u.email; return [o0];
        }
        if (role == 'parent') return rows(await getDocs(query(collection(fs, 'tutors'), where('status', '==', 'approved'))));
        return [];
      }
      if (c == 'students') {
        if (ad) return rows(await getDocs(collection(fs, 'students')));
        var s = await getDoc(doc(fs, 'students', u.uid));
        if (!s.exists()) return [];
        var o = s.data(); o.id = s.id; return [o];
      }
      if (c == 'children') {
        return rows(await getDocs(ad ? collection(fs, 'children') : query(collection(fs, 'children'), where('uid', '==', u.uid))));
      }
      if (c == 'requests') {
        // Teacher sees the request; parent contact details are merged in only when the rules allow it (admin approved).
        var rq = rows(await getDocs(ad ? collection(fs, 'requests') : query(collection(fs, 'requests'), where(role == 'teacher' ? 'tutorId' : 'uid', '==', u.uid)))), cm = {};
        if (ad || role == 'parent') {
          rows(await getDocs(ad ? collection(fs, 'requestContacts') : query(collection(fs, 'requestContacts'), where('uid', '==', u.uid)))).forEach(function (x) { cm[x.id] = x; });
        } else if (role == 'teacher') {
          await Promise.all(rq.filter(function (r) { return r.status == 'approved'; }).map(async function (r) {
            try { var sc = await getDoc(doc(fs, 'requestContacts', r.id)); if (sc.exists()) cm[r.id] = sc.data(); } catch (e) { }
          }));
        }
        rq.forEach(function (r) { var x = cm[r.id]; if (x) { r.parent = x.parent; r.child = x.child; r.details = x.details; } });
        return rq;
      }
      return [];
    } catch (e) { console.error('list ' + c, e); return []; }
  },

  async put(c, o) {
    var id = o.id || Math.random().toString(36).slice(2, 10), at = Date.now(), u = auth.currentUser, b;
    if (c == 'tutors') {
      var p = Object.assign({}, o);
      delete p.email; delete p.id; p.at = at; p.status = 'pending';
      b = writeBatch(fs);
      b.set(doc(fs, 'users', u.uid), { role: 'teacher', name: p.name, email: u.email, at: at });
      b.set(doc(fs, 'tutors', u.uid), p);
      b.set(doc(fs, 'tutorContacts', u.uid), { email: u.email, at: at });
      await b.commit();
      rv++; role = 'teacher'; id = u.uid;
    } else if (c == 'students') {
      var s = Object.assign({}, o); delete s.id; s.email = u.email; s.uid = u.uid; s.at = at;
      b = writeBatch(fs);
      b.set(doc(fs, 'users', u.uid), { role: 'parent', name: s.name, email: u.email, at: at });
      b.set(doc(fs, 'students', u.uid), s);
      await b.commit();
      rv++; role = 'parent'; id = u.uid;
    } else if (c == 'children') {
      var k = Object.assign({}, o); delete k.id; k.uid = u.uid; k.at = at;
      await setDoc(doc(fs, 'children', id), k);
    } else {
      b = writeBatch(fs);
      b.set(doc(fs, 'requests', id), { tutorId: o.tutorId, tutor: o.tutor, uid: u.uid, status: 'pending', info: o.info, at: at });
      b.set(doc(fs, 'requestContacts', id), { uid: u.uid, tutorId: o.tutorId, parent: o.parent, child: o.child, details: o.details, at: at });
      await b.commit();
    }
    o.id = id; return o;
  },

  async patch(c, id, p) { await updateDoc(doc(fs, c, id), p); },

  async del(c, id) {
    var b = writeBatch(fs);
    b.delete(doc(fs, c, id));
    if (c == 'tutors') b.delete(doc(fs, 'tutorContacts', id));
    if (c == 'requests') b.delete(doc(fs, 'requestContacts', id));
    await b.commit();
  }
};

var first = true;
onAuthStateChanged(auth, async function (u) {
  await setRole(u);
  cbs.forEach(function (f) { try { f(u); } catch (e) { } });
  if (first) { first = false; window.TCRES(api); }
});
