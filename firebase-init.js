// Firebase config — safe to commit; keys are public identifiers, not secrets.
// Security is enforced by Firestore Security Rules, not by hiding the config.
firebase.initializeApp({
  apiKey:            'AIzaSyCH8IF04KzB2_4jZv9kZY_bvCtnTVY4MQY',
  authDomain:        'mission-control-6f68f.firebaseapp.com',
  projectId:         'mission-control-6f68f',
  storageBucket:     'mission-control-6f68f.firebasestorage.app',
  messagingSenderId: '121344908876',
  appId:             '1:121344908876:web:589c57aedc86813068dee9',
});

window.mcDb   = firebase.firestore();
window.mcAuth = firebase.auth();
