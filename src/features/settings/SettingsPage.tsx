import React, { useEffect, useState } from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { dbService } from '../../services/firebaseService';
import { InstagramConnect } from './InstagramConnect';
import { User, Phone, CreditCard, Save, Globe } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { profile, loading: profileLoading } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountName: ''
  });
  const [socialMedia, setSocialMedia] = useState({
    instagram: '',
    facebook: '',
    tiktok: ''
  });

  useEffect(() => {
    if (profile) {
      setPhoneNumber(profile.phoneNumber || '');
      setBankDetails({
        bankName: profile.bankDetails?.bankName || '',
        accountNumber: profile.bankDetails?.accountNumber || '',
        accountName: profile.bankDetails?.accountName || ''
      });
      setSocialMedia({
        instagram: profile.socialMedia?.instagram || '',
        facebook: profile.socialMedia?.facebook || '',
        tiktok: profile.socialMedia?.tiktok || ''
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;

    setLoading(true);
    setSuccessMessage(null);

    try {
      await dbService.updateDocument('users', profile.uid, {
        phoneNumber,
        bankDetails,
        socialMedia
      });
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings & Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <User className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="+62..."
                  required
                />
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-2 mb-2">
                <CreditCard className="w-5 h-5 text-gray-500" />
                <h3 className="text-md font-medium text-gray-900">Bank Details</h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg mb-4">
                <strong>Important:</strong> Account name must match your registered partner name for fee processing.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g. BCA, Mandiri"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    value={bankDetails.accountName}
                    onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Full Name"
                  />
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-5 h-5 text-gray-500" />
                <h3 className="text-md font-medium text-gray-900">Social Media Profiles</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">Provide links to your social media profiles.</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
                <input
                  type="url"
                  value={socialMedia.instagram}
                  onChange={(e) => setSocialMedia({...socialMedia, instagram: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="https://instagram.com/username"
                />
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facebook URL</label>
                <input
                  type="url"
                  value={socialMedia.facebook}
                  onChange={(e) => setSocialMedia({...socialMedia, facebook: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="https://facebook.com/username"
                />
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TikTok URL</label>
                <input
                  type="url"
                  value={socialMedia.tiktok}
                  onChange={(e) => setSocialMedia({...socialMedia, tiktok: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="https://tiktok.com/@username"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center px-4 py-2 text-white rounded-lg font-medium transition-colors ${
                  loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Save className="w-5 h-5 mr-2" />
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
              {successMessage && (
                <p className="mt-2 text-center text-sm text-green-600">{successMessage}</p>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Integrations */}
        <div className="space-y-6">
            <InstagramConnect />
        </div>
      </div>
    </div>
  );
};
