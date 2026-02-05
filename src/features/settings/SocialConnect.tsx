import React, { useEffect, useState } from 'react';
// @ts-ignore - types might not be available for this specific path
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';
import { integrationService } from '../../services/firebaseService';
import { useAuth } from '../../context/AuthContext';
import { Instagram, Facebook, Trash2, CheckCircle, AlertCircle, Share2 } from 'lucide-react';

export const SocialConnect: React.FC = () => {
  const { user } = useAuth();
  const [integration, setIntegration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
        setLoading(false);
        return;
    }

    const unsubscribe = integrationService.subscribeToIntegration(user.uid, (data) => {
      setIntegration(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const responseFacebook = async (response: any) => {
    if (response.accessToken && user?.uid) {
      try {
        await integrationService.saveUserIntegration(user.uid, response);
        setError(null);
      } catch (err) {
        console.error("Error saving integration:", err);
        setError("Failed to save integration.");
      }
    } else {
        console.error("Facebook login failed or cancelled", response);
        if (response.status !== 'unknown') {
             setError("Failed to connect with Social Media.");
        }
    }
  };

  const handleDisconnect = async () => {
    if (!user?.uid) return;
    if (window.confirm("Are you sure you want to disconnect your social accounts?")) {
        try {
            await integrationService.deleteUserIntegration(user.uid);
            setIntegration(null);
        } catch (err) {
            console.error("Error disconnecting:", err);
            setError("Failed to disconnect.");
        }
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading integration status...</div>;
  }

  const appId = import.meta.env.VITE_FACEBOOK_APP_ID || '';

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-2xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-50 rounded-lg flex space-x-1">
          <Facebook className="w-6 h-6 text-blue-600" />
          <Instagram className="w-6 h-6 text-pink-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Social Media Connection</h3>
          <p className="text-sm text-gray-500">Connect your Facebook & Instagram Professional accounts for auto-posting.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center">
             <AlertCircle className="w-4 h-4 mr-2" />
             {error}
        </div>
      )}

      {integration ? (
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center text-green-700 font-medium">
            <CheckCircle className="w-5 h-5 mr-2" />
            Connected
          </div>
          <button
            onClick={handleDisconnect}
            className="flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors border border-red-200 bg-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Disconnect
          </button>
        </div>
      ) : (
        <div>
           {!appId && (
               <div className="mb-4 text-amber-600 text-xs bg-amber-50 p-2 rounded border border-amber-200">
                   <strong>Setup Required:</strong> Please set <code>VITE_FACEBOOK_APP_ID</code> in your environment variables.
               </div>
           )}
          <FacebookLogin
            appId={appId}
            autoLoad={false}
            fields="name,email,picture"
            scope="instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,pages_manage_posts"
            callback={responseFacebook}
            render={(renderProps: any) => (
              <button
                onClick={renderProps.onClick}
                disabled={!appId}
                className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 text-white rounded-lg transition-colors font-medium ${!appId ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1877F2] hover:bg-[#166fe5]'}`}
              >
                <Share2 className="w-5 h-5 mr-2" />
                Connect with Facebook & Instagram
              </button>
            )}
          />
        </div>
      )}
    </div>
  );
};
