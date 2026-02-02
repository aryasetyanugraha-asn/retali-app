import React, { useState } from 'react';
import { functionsService } from '../../services/firebaseService';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle,
  Copy,
  Instagram,
  Facebook,
  Video,
  Loader2
} from 'lucide-react';

type Topic = 'PROMO' | 'MANASIK' | 'DOA' | 'TIPS';
type Platform = 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK';

const MOCK_SCHEDULED_POSTS = [
  { id: 1, topic: 'PROMO', platform: 'INSTAGRAM', date: 'Oct 24, 2023', time: '10:00 AM', status: 'SCHEDULED', title: 'Early Bird Ramadhan' },
  { id: 2, topic: 'DOA', platform: 'FACEBOOK', date: 'Oct 23, 2023', time: '05:00 AM', status: 'POSTED', title: 'Doa Safar' },
  { id: 3, topic: 'MANASIK', platform: 'TIKTOK', date: 'Oct 25, 2023', time: '08:00 PM', status: 'SCHEDULED', title: 'Tata Cara Ihram' },
];

export const ContentGenerator: React.FC = () => {
  const [topic, setTopic] = useState<Topic>('PROMO');
  const [platform, setPlatform] = useState<Platform>('INSTAGRAM');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedContent('');

    try {
      const result: any = await functionsService.generateContent(topic, platform);
      if (result.success && result.data) {
        setGeneratedContent(result.data);
      } else {
        console.error('AI Generation failed:', result);
      }
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Generator Section */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">AI Content Generator</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Topic</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value as Topic)}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              >
                <option value="PROMO">Promo & Penawaran</option>
                <option value="MANASIK">Edukasi Manasik</option>
                <option value="DOA">Doa & Hadits</option>
                <option value="TIPS">Tips Travel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              >
                <option value="INSTAGRAM">Instagram Feed</option>
                <option value="FACEBOOK">Facebook Post</option>
                <option value="TIKTOK">TikTok Caption</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Content...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate with AI
              </>
            )}
          </button>

          {/* Generated Result */}
          {generatedContent && (
            <div className="mt-6 animate-fade-in">
              <label className="block text-sm font-medium text-gray-700 mb-2">Generated Result</label>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <textarea
                  readOnly
                  className="w-full bg-transparent border-none focus:ring-0 text-gray-800 text-sm h-48 resize-none"
                  value={generatedContent}
                />
                <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-gray-200">
                  <button className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-md transition-colors">
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy
                  </button>
                  <button className="flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    Schedule Post
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scheduler Sidebar */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Scheduled Posts</h3>
            <button className="text-sm text-blue-600 hover:underline">View All</button>
          </div>

          <div className="space-y-4">
            {MOCK_SCHEDULED_POSTS.map((post) => (
              <div key={post.id} className="p-3 rounded-lg border border-gray-100 hover:shadow-md transition-shadow bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    post.topic === 'PROMO' ? 'bg-red-100 text-red-600' :
                    post.topic === 'DOA' ? 'bg-green-100 text-green-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {post.topic}
                  </span>
                  {post.platform === 'INSTAGRAM' && <Instagram className="w-3 h-3 text-pink-600" />}
                  {post.platform === 'FACEBOOK' && <Facebook className="w-3 h-3 text-blue-600" />}
                  {post.platform === 'TIKTOK' && <Video className="w-3 h-3 text-black" />}
                </div>
                <p className="text-sm font-semibold text-gray-800 line-clamp-1">{post.title}</p>
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {post.date} • {post.time}
                </div>
                <div className="flex items-center mt-1">
                  <span className={`flex items-center text-[10px] font-medium ${
                    post.status === 'POSTED' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {post.status === 'POSTED' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                    {post.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 flex items-center justify-center">
            <Calendar className="w-4 h-4 mr-2" />
            Open Calendar View
          </button>
        </div>
      </div>
    </div>
  );
};
