import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  role: string;
  branchId?: string;
  partnerId?: string;
  phoneNumber?: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    accountName?: string;
  };
  feeAchievement?: number;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProfile({ uid: user.uid, ...docSnap.data() } as UserProfile);
        } else {
          setProfile(null);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  return { profile, loading, error };
}
