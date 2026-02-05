import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface SocialMedia {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'PUSAT' | 'CABANG' | 'MITRA';
  phoneNumber?: string;
  bankDetails?: BankDetails;
  socialMedia?: SocialMedia;
  feeAchievement?: number;
  createdAt?: any;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      } else {
        // Handle case where auth exists but firestore doc doesn't (rare/race condition)
        setProfile(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching user profile:", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  return { profile, loading, error };
};
