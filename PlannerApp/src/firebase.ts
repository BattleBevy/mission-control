import { initializeApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyCH8IF04KzB2_4jZv9kZY_bvCtnTVY4MQY',
  authDomain: 'mission-control-6f68f.firebaseapp.com',
  projectId: 'mission-control-6f68f',
  storageBucket: 'mission-control-6f68f.firebasestorage.app',
  messagingSenderId: '121344908876',
  appId: '1:121344908876:web:589c57aedc86813068dee9',
}

const app = initializeApp(firebaseConfig)

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

export const auth = getAuth(app)
