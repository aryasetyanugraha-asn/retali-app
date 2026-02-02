import { auth, db, app } from '../lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  onSnapshot,
  query,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';

// Auth Service Abstraction
export const authService = {
  login: (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password),

  register: (email: string, password: string) =>
    createUserWithEmailAndPassword(auth, email, password),

  logout: () => firebaseSignOut(auth),

  getCurrentUser: (): User | null => auth.currentUser,
};

// Database Service Abstraction (Generic)
export const dbService = {
  getCollection: async (collectionName: string) => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  getDocument: async (collectionName: string, id: string) => {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  },

  addDocument: async (collectionName: string, data: DocumentData) => {
    return await addDoc(collection(db, collectionName), data);
  },

  subscribeToCollection: (
    collectionName: string,
    callback: (data: any[]) => void,
    constraints: QueryConstraint[] = []
  ) => {
    const q = query(collection(db, collectionName), ...constraints);
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(data);
    });
  }
};

// Functions Service Abstraction
const functions = getFunctions(app);

export const functionsService = {
  generateContent: async (topic: string, platform: string) => {
    const generateContentFn = httpsCallable(functions, 'generateContent');
    const result = await generateContentFn({ topic, platform });
    return result.data;
  }
};
