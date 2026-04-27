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
  setDoc,
  deleteDoc,
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

  updateDocument: async (collectionName: string, id: string, data: any) => {
    return await setDoc(doc(db, collectionName, id), data, { merge: true });
  },

  deleteDocument: async (collectionName: string, id: string) => {
    return await deleteDoc(doc(db, collectionName, id));
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

export const integrationService = {
  saveUserIntegration: async (userId: string, tokenData: any, platform: string = 'instagram') => {
    // path: users/{userId}/integrations/{platform}
    await setDoc(doc(db, 'users', userId, 'integrations', platform), {
      ...tokenData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  },

  deleteUserIntegration: async (userId: string, platform: string = 'instagram') => {
    await deleteDoc(doc(db, 'users', userId, 'integrations', platform));
  },

  subscribeToIntegration: (userId: string, callback: (data: any) => void, platform: string = 'instagram') => {
    return onSnapshot(doc(db, 'users', userId, 'integrations', platform), (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() });
      } else {
        callback(null);
      }
    });
  }
};

// Functions Service Abstraction
const functions = getFunctions(app, "asia-southeast2");

export const functionsService = {
  generateContent: async (topic: string, platform: string, includeImage: boolean = false) => {
    const generateContentFn = httpsCallable(functions, 'generateContent');
    const result = await generateContentFn({ topic, platform, includeImage });
    return result.data;
  },

  sendWhatsAppMessage: async (phoneNumber: string, text: string, conversationId: string) => {
    const sendWhatsAppMessageFn = httpsCallable(functions, 'sendWhatsAppMessage');
    const result = await sendWhatsAppMessageFn({ phoneNumber, text, conversationId });
    return result.data;
  },

  generateCampaignOptions: async (title: string, target_audience: string, start_date: string) => {
    const generateCampaignOptionsFn = httpsCallable(functions, 'generateCampaignOptions');
    const result = await generateCampaignOptionsFn({ title, target_audience, start_date });
    return result.data;
  },

  generateMonthBreakdown: async (campaign_title: string, option_theme: string, month_name: string, monthly_theme: string, key_goal: string) => {
    const generateMonthBreakdownFn = httpsCallable(functions, 'generateMonthBreakdown');
    const result = await generateMonthBreakdownFn({ campaign_title, option_theme, month_name, monthly_theme, key_goal });
    return result.data;
  },

  replyToMetaMessage: async (participantId: string, text: string, platform: string, conversationId: string) => {
    const replyFn = httpsCallable(functions, 'replyToMetaMessage');
    const result = await replyFn({ participantId, text, platform, conversationId });
    return result.data;
  },

  generateAiReply: async (chatHistory: any[]) => {
    const aiReplyFn = httpsCallable(functions, 'generateAiReply');
    const result = await aiReplyFn({ chatHistory });
    return result.data;
  },

  manualDataCrawl: async () => {
    const crawlFn = httpsCallable(functions, 'manualDataCrawl');
    const result = await crawlFn();
    return result.data;
  }
};
