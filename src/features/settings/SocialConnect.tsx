import React, { useEffect, useState } from 'react';
// @ts-ignore - types might not be available for this specific path
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';
import { integrationService } from '../../services/firebaseService';
import { useAuth } from '../../context/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../lib/firebase';
import { Instagram, Facebook, Trash2, CheckCircle, AlertCircle, Share2, Music, Phone } from 'lucide-react';

// Helper to generate a random string for code_verifier
const generateRandomString = (length: number) => {
  const array = new Uint32Array(length / 2);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
};

// Helper to calculate SHA-256 for code_challenge
const generateCodeChallenge = async (codeVerifier: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);

  // Base64URL encode the result
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const SocialConnect: React.FC = () => {
  const { user } = useAuth();
  const [integration, setIntegration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isConnectingTikTok, setIsConnectingTikTok] = useState(false);
  const [isConnectingMeta, setIsConnectingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [waIntegration, setWaIntegration] = useState<any>(null);
  const [waStatus, setWaStatus] = useState<'disconnected' | 'loading' | 'qr_ready' | 'connected'>('disconnected');
  const [waQrCode, setWaQrCode] = useState<string | null>(null);


  // Subscribe to Facebook and TikTok integration status
  useEffect(() => {
    if (!user?.uid) {
        setLoading(false);
        return;
    }


    const unsubscribeFacebook = integrationService.subscribeToIntegration(user.uid, (data) => {
      setIntegration(data);
      setLoading(false);
    });

    const unsubscribeWhatsApp = integrationService.subscribeToIntegration(user.uid, (data) => {
      setWaIntegration(data);
      if (data?.status === 'connected') {
        setWaStatus('connected');
      }
    }, 'whatsapp');

    return () => {
      unsubscribeFacebook();
      unsubscribeWhatsApp();
    };

  }, [user]);

  // Handle TikTok Redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
        // Log the code as required
        console.log("TikTok Auth Code:", code);

        const exchangeToken = async () => {
           setIsConnectingTikTok(true);
           setError(null);
           setSuccessMessage(null);

           try {
               const functions = getFunctions(app, 'asia-southeast2');
               const exchangeTikTokToken = httpsCallable(functions, 'exchangeTikTokToken');

               const redirectUri = import.meta.env.VITE_TIKTOK_REDIRECT_URI;

               if (!redirectUri) {
                   throw new Error("Missing TikTok redirect URI configuration.");
               }

               const codeVerifier = sessionStorage.getItem('tiktok_code_verifier');

               const result = await exchangeTikTokToken({
                 code,
                 redirect_uri: redirectUri,
                 code_verifier: codeVerifier
               });

               // Clean up storage
               sessionStorage.removeItem('tiktok_code_verifier');

               console.log("TikTok Token Exchange Success:", result.data);
               setSuccessMessage("TikTok connected successfully!");

               // Clean up the URL
               const newUrl = window.location.pathname;
               window.history.replaceState({}, document.title, newUrl);
           } catch (err: any) {
               console.error("TikTok token exchange error:", err);
               setError(err.message || "Failed to connect TikTok.");
           } finally {
               setIsConnectingTikTok(false);
           }
        };

        exchangeToken();
    }
  }, []);

  const responseFacebook = async (response: any) => {
    if (response.accessToken && user?.uid) {
      setIsConnectingMeta(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const functionsInstance = getFunctions(app, 'asia-southeast2');
        const exchangeMetaTokenFn = httpsCallable(functionsInstance, 'exchangeMetaToken');
        await exchangeMetaTokenFn({
            shortLivedToken: response.accessToken,
            responseData: response
        });
        setSuccessMessage("Meta connected successfully!");
      } catch (err: any) {
        console.error("Error saving integration:", err);
        setError(err.message || "Failed to connect Meta account.");
      } finally {
        setIsConnectingMeta(false);
      }
    } else {
        console.error("Facebook login failed or cancelled", response);
        if (response.status !== 'unknown') {
             setError("Failed to connect with Social Media.");
        }
    }
  };


  const handleConnectWhatsApp = async () => {
    setWaStatus('loading');
    setError(null);
    setWaQrCode(null);
    try {
      const functionsInstance = getFunctions(app, 'asia-southeast2');
      const generateWhatsAppQRFn = httpsCallable(functionsInstance, 'generateWhatsAppQR');

      const result: any = await generateWhatsAppQRFn();

      if (result.data.status === 'connected') {
        setWaStatus('connected');
      } else if (result.data.status === 'qr_ready') {
        setWaQrCode(result.data.qrCode);
        setWaStatus('qr_ready');
      }
    } catch (err: any) {
      console.error("Error generating WhatsApp QR:", err);
      setError(err.message || "Failed to generate WhatsApp QR Code.");
      setWaStatus('disconnected');
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!user?.uid) return;
    if (window.confirm("Are you sure you want to disconnect WhatsApp?")) {
        try {
            await integrationService.deleteUserIntegration(user.uid, 'whatsapp');
            setWaIntegration(null);
            setWaStatus('disconnected');
        } catch (err) {
            console.error("Error disconnecting WhatsApp:", err);
            setError("Failed to disconnect WhatsApp.");
        }
    }
  };

  const handleDisconnect = async () => {
    if (!user?.uid) return;
    if (window.confirm("Are you sure you want to disconnect your social accounts?")) {
        try {
            await integrationService.deleteUserIntegration(user.uid, 'instagram');
            await integrationService.deleteUserIntegration(user.uid, 'facebook');
            setIntegration(null);
        } catch (err) {
            console.error("Error disconnecting:", err);
            setError("Failed to disconnect.");
        }
    }
  };

  const handleTikTokLogin = async () => {
    const clientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY;
    const redirectUri = import.meta.env.VITE_TIKTOK_REDIRECT_URI;

    if (!clientKey || !redirectUri) {
        setError("TikTok configuration is missing (VITE_TIKTOK_CLIENT_KEY or VITE_TIKTOK_REDIRECT_URI).");
        return;
    }

    try {
      // PKCE implementation
      const codeVerifier = generateRandomString(64);
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store code_verifier to use during token exchange
      sessionStorage.setItem('tiktok_code_verifier', codeVerifier);

      // CSRF state protection
      const state = Math.random().toString(36).substring(7);

      const url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${import.meta.env.VITE_TIKTOK_CLIENT_KEY}&response_type=code&scope=user.info.profile,video.list&redirect_uri=${encodeURIComponent(import.meta.env.VITE_TIKTOK_REDIRECT_URI)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

      window.location.href = url;
    } catch (err) {
      console.error("Failed to generate PKCE challenge:", err);
      setError("Failed to initialize TikTok login.");
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading integration status...</div>;
  }

  const appId = import.meta.env.VITE_FACEBOOK_APP_ID || '';

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-2xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gray-50 rounded-lg flex space-x-1">
          <Facebook className="w-6 h-6 text-blue-600" />
          <Instagram className="w-6 h-6 text-pink-600" />
          <Music className="w-6 h-6 text-black" />
          <Phone className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Social Media Connection</h3>
          <p className="text-sm text-gray-500">Connect your social accounts for auto-posting.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center">
             <AlertCircle className="w-4 h-4 mr-2" />
             {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm flex items-center">
             <CheckCircle className="w-4 h-4 mr-2" />
             {successMessage}
        </div>
      )}

      <div className="space-y-6">
        {/* Facebook & Instagram Section */}
        <div>
           <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              Facebook & Instagram
           </h4>

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
                scope="pages_show_list,pages_manage_posts,pages_manage_metadata,business_management,instagram_basic,instagram_content_publish"
                callback={responseFacebook}
                render={(renderProps: any) => (
                  <button
                    onClick={renderProps.onClick}
                    disabled={!appId || isConnectingMeta}
                    className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 text-white rounded-lg transition-colors font-medium ${(!appId || isConnectingMeta) ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1877F2] hover:bg-[#166fe5]'}`}
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    {isConnectingMeta ? 'Connecting...' : 'Connect with Facebook & Instagram'}
                  </button>
                )}
              />
            </div>
          )}
        </div>

        {/* TikTok Section */}
        <div className="border-t border-gray-100 pt-6">
           <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              TikTok
           </h4>
           <div className="flex flex-col sm:flex-row gap-3">
               <button
                  onClick={handleTikTokLogin}
                  disabled={isConnectingTikTok}
                  className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 text-white rounded-lg transition-colors font-medium ${isConnectingTikTok ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800'}`}
                >
                  <Music className="w-5 h-5 mr-2" />
                  {isConnectingTikTok ? 'Connecting...' : 'Connect with TikTok'}
                </button>
           </div>
        </div>

        {/* WhatsApp Section */}
        <div className="border-t border-gray-100 pt-6">
           <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              WhatsApp
           </h4>

           {waStatus === 'connected' ? (
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center text-green-700 font-medium">
                <CheckCircle className="w-5 h-5 mr-2" />
                Connected {waIntegration?.name ? `(${waIntegration.name})` : ''}
              </div>
              <button
                onClick={handleDisconnectWhatsApp}
                className="flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors border border-red-200 bg-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Disconnect
              </button>
            </div>
           ) : (
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleConnectWhatsApp}
                    disabled={waStatus === 'loading' || waStatus === 'qr_ready'}
                    className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 text-white rounded-lg transition-colors font-medium ${(waStatus === 'loading' || waStatus === 'qr_ready') ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    {waStatus === 'loading' ? 'Generating QR...' : 'Connect WhatsApp'}
                  </button>
              </div>

              {waStatus === 'qr_ready' && waQrCode && (
                <div className="flex flex-col items-center p-4 border border-gray-200 rounded-lg bg-gray-50 max-w-sm">
                  <p className="text-sm font-medium text-gray-700 mb-2">Scan this QR code with WhatsApp</p>
                  <img src={waQrCode} alt="WhatsApp QR Code" className="w-64 h-64 border border-gray-300 rounded bg-white p-2" />
                  <p className="text-xs text-gray-500 mt-2 text-center">Open WhatsApp on your phone {"->"} Linked Devices {"->"} Link a Device</p>
                </div>
              )}
            </div>
           )}
        </div>

      </div>
    </div>
  );
};
