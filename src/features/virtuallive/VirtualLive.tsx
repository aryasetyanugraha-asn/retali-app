import React, { useState } from 'react';
import { Play, Square, Video, Settings, Eye, EyeOff, Radio, Users, ThumbsUp, Clock } from 'lucide-react';

export const VirtualLive: React.FC = () => {
  const [isLive, setIsLive] = useState(false);
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [serverUrl, setServerUrl] = useState('rtmp://live.tiktok.com/app/');
  const [streamKey, setStreamKey] = useState('live_987654321_abc123');

  const toggleLiveStatus = () => {
    setIsLive(!isLive);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Video className="w-6 h-6 mr-2 text-emerald-600" />
            TikTok Auto-Live Studio
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure and manage your evergreen auto-looping live streams.
          </p>
        </div>
        <div className="flex items-center">
          <div
            className={`flex items-center px-4 py-2 rounded-full font-medium text-sm transition-colors ${
              isLive
                ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse'
                : 'bg-gray-100 text-gray-700 border border-gray-200'
            }`}
          >
            <Radio className={`w-4 h-4 mr-2 ${isLive ? 'text-red-600' : 'text-gray-500'}`} />
            {isLive ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {/* Configuration Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-gray-500" />
              Stream Configuration
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Server URL / RTMP
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  placeholder="rtmp://..."
                  disabled={isLive}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stream Key
                </label>
                <div className="relative">
                  <input
                    type={showStreamKey ? 'text' : 'password'}
                    value={streamKey}
                    onChange={(e) => setStreamKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm pr-10"
                    placeholder="Enter stream key"
                    disabled={isLive}
                  />
                  <button
                    type="button"
                    onClick={() => setShowStreamKey(!showStreamKey)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                    disabled={isLive}
                  >
                    {showStreamKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Media Selection Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Media Source</h2>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer">
                <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Select Evergreen Video (.mp4)</p>
                <p className="text-xs text-gray-500 mt-1">Looping enabled automatically</p>
              </div>

              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center truncate">
                  <Video className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                  <span className="text-sm text-emerald-800 truncate">webinar-promo-final.mp4</span>
                </div>
                <span className="text-xs text-emerald-600 font-medium px-2 py-1 bg-emerald-100 rounded-full ml-2">Selected</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Action Area & Preview */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Stream Preview</h2>

              <button
                onClick={toggleLiveStatus}
                className={`flex items-center px-6 py-2.5 rounded-lg font-semibold text-white transition-all shadow-sm ${
                  isLive
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-100'
                    : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-100'
                }`}
              >
                {isLive ? (
                  <>
                    <Square className="w-5 h-5 mr-2" fill="currentColor" />
                    Stop Streaming
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" fill="currentColor" />
                    Go Live / Start Streaming
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 bg-black rounded-lg relative overflow-hidden flex items-center justify-center min-h-[300px]">
              {isLive ? (
                <div className="absolute inset-0">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 opacity-50 text-xl font-bold">
                    [ Playing: webinar-promo-final.mp4 ]
                  </div>
                  <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                    LIVE
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 flex flex-col items-center">
                  <Video className="w-12 h-12 mb-2 opacity-50" />
                  <p>Stream is currently offline</p>
                </div>
              )}
            </div>

            {/* Dummy Analytics Card */}
            {isLive && (
              <div className="mt-6 grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-center">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Current Viewers</p>
                    <p className="text-lg font-bold text-gray-900">124</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-center">
                  <div className="bg-pink-100 p-2 rounded-lg mr-3">
                    <ThumbsUp className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Total Likes</p>
                    <p className="text-lg font-bold text-gray-900">4.5K</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-center">
                  <div className="bg-purple-100 p-2 rounded-lg mr-3">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Stream Duration</p>
                    <p className="text-lg font-bold text-gray-900">02:15:00</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
