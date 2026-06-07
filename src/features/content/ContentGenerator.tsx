import React, { useState, useEffect, useRef } from 'react';
import { functionsService, dbService } from '../../services/firebaseService';
import { PostingCalendar } from "./PostingCalendar";
import { LayoutEditor } from './LayoutEditor';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle,
  Copy,
  Instagram,
  Facebook,
  Video,
  Loader2,
  Image as ImageIcon,
  Palette,
  Layers,
  Download,
  X,
  AlertTriangle,
  Timer
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
  const [isCopied, setIsCopied] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>('INSTAGRAM');
  const [includeImage, setIncludeImage] = useState(false);
  const [generationMode, setGenerationMode] = useState<'SCRATCH' | 'LAYOUT' | 'VIDEO_WATERMARK'>('SCRATCH');
  const [animateWithAI, setAnimateWithAI] = useState(false);
  const [style, setStyle] = useState<'MINIMALIST' | 'BUSY'>('MINIMALIST');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const [assets, setAssets] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [brandText, setBrandText] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [customImagePrompt, setCustomImagePrompt] = useState('');

  const [showLayoutEditor, setShowLayoutEditor] = useState(false);

  useEffect(() => {
    const unsubscribe = dbService.subscribeToCollection('media_assets', (data) => {
      setAssets(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isGenerating) {
      setElapsedTimeMs(0);
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedTimeMs(Date.now() - startTime);
      }, 10); // Update every 10ms for smooth millisecond display
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isGenerating]);

  const formatElapsedTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;

    const padMs = (num: number) => {
      if (num < 10) return `00${num}`;
      if (num < 100) return `0${num}`;
      return num.toString().slice(0, 3);
    };

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${padMs(milliseconds)}`;
  };

  const handleGenerate = async () => {
    if (generationMode === 'LAYOUT') {
        setShowLayoutEditor(true);
        return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedContent('');
    setGeneratedImage(null);
    setGeneratedVideo(null);

    try {
      const result: any = await functionsService.generateContent(
        topic,
        platform,
        includeImage,
        generationMode,
        style,
        null,
        selectedVideo,
        selectedLogo,
        null,
        brandText,
        animateWithAI,
        customImagePrompt || null
      );

      if (result.success && result.data) {
        setGeneratedContent(result.data);
        if (result.image) {
          setGeneratedImage(result.image);
        }
        if (result.videoUrl) {
          setGeneratedVideo(result.videoUrl);
        }
      } else {
        console.error('AI Generation failed:', result);
        setGenerationError(result.error || result.message || 'Unknown generation error occurred.');
      }
    } catch (error: any) {
      console.error('Error generating content:', error);
      setGenerationError(error?.message || 'An unexpected error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSchedule = () => {
    if (!generatedContent && !generatedImage && !generatedVideo) return;

    const event = new CustomEvent('open-schedule-modal', {
      detail: {
        content: generatedContent || '',
        mediaUrls: generatedImage || generatedVideo ? [generatedImage || generatedVideo] : [],
        mediaType: generatedVideo ? 'VIDEO' : (generatedImage ? 'IMAGE' : 'IMAGE')
      }
    });
    window.dispatchEvent(event);
  };

  const handleCopy = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownloadImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `generated-poster-${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
      const link = document.createElement('a');
      link.href = imageUrl;
      link.target = '_blank';
      link.download = `generated-poster-${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-8">
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

            <div className="flex items-center space-x-2 pt-8 sm:col-span-2">
              <input
                type="checkbox"
                id="includeImage"
                checked={includeImage}
                onChange={(e) => setIncludeImage(e.target.checked)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="includeImage" className="text-sm font-medium text-gray-700 cursor-pointer">
                Include Generated Image
              </label>
            </div>

            {includeImage && (
              <div className="sm:col-span-2 space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Generation Mode</label>
                    <div className="flex bg-white p-1 rounded-lg border border-gray-200">
                      <button
                        onClick={() => setGenerationMode('SCRATCH')}
                        className={`flex-1 flex flex-col items-center py-2 rounded-md transition-all ${generationMode === 'SCRATCH' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <ImageIcon className="w-4 h-4 mb-1" />
                        <span className="text-[10px] font-bold">Scratch</span>
                      </button>
                      <button
                        onClick={() => {
                            setGenerationMode('LAYOUT');
                            setShowLayoutEditor(true);
                        }}
                        className={`flex-1 flex flex-col items-center py-2 rounded-md transition-all ${generationMode === 'LAYOUT' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <Layers className="w-4 h-4 mb-1" />
                        <span className="text-[10px] font-bold">Layout Editor</span>
                      </button>
                      <button
                        onClick={() => setGenerationMode('VIDEO_WATERMARK')}
                        className={`flex-1 flex flex-col items-center py-2 rounded-md transition-all ${generationMode === 'VIDEO_WATERMARK' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <Video className="w-4 h-4 mb-1" />
                        <span className="text-[10px] font-bold">Video</span>
                      </button>
                    </div>
                    {generationMode === 'SCRATCH' && (
                      <div className="mt-2 flex justify-center items-center space-x-1.5 bg-gray-50 px-2 py-1.5 rounded border border-gray-200 w-full">
                        <input
                          type="checkbox"
                          id="animateWithAI"
                          checked={animateWithAI}
                          onChange={(e) => setAnimateWithAI(e.target.checked)}
                          className="w-3 h-3 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                        />
                        <label htmlFor="animateWithAI" className="text-[10px] font-medium text-gray-700 whitespace-nowrap cursor-pointer">
                          ✨ Animate with AI Video
                        </label>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Design Style</label>
                    <div className="flex bg-white p-1 rounded-lg border border-gray-200">
                      <button
                        onClick={() => setStyle('MINIMALIST')}
                        className={`flex-1 flex flex-col items-center py-2 rounded-md transition-all ${style === 'MINIMALIST' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <Palette className="w-4 h-4 mb-1" />
                        <span className="text-[10px] font-bold">Minimalist</span>
                      </button>
                      <button
                        onClick={() => setStyle('BUSY')}
                        className={`flex-1 flex flex-col items-center py-2 rounded-md transition-all ${style === 'BUSY' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <Palette className="w-4 h-4 mb-1" />
                        <span className="text-[10px] font-bold">Busy</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Poster Text</label>
                    <input
                      type="text"
                      placeholder="Overlay text (optional)"
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                      value={brandText}
                      onChange={(e) => setBrandText(e.target.value)}
                    />
                  </div>
                </div>

                {generationMode === 'SCRATCH' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Custom Image Prompt (Optional)</label>
                    <textarea
                      placeholder="e.g. A family praying in front of the Kaaba, golden hour lighting..."
                      className="w-full bg-white/50 backdrop-blur-sm border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none h-20 shadow-inner"
                      value={customImagePrompt}
                      onChange={(e) => setCustomImagePrompt(e.target.value)}
                    />
                  </div>
                )}

                {generationMode === 'VIDEO_WATERMARK' && (
                  <div className="space-y-3 pt-2 border-t border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Select Assets from Library</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] font-medium text-gray-400 mb-1 block">Video Clip</span>
                          <select
                            className="w-full text-xs border border-gray-200 rounded p-1.5"
                            value={selectedVideo || ''}
                            onChange={(e) => setSelectedVideo(e.target.value)}
                          >
                            <option value="">Select Video</option>
                            {assets.filter(a => a.type === 'VIDEO').map(a => (
                              <option key={a.id} value={a.url}>{a.name}</option>
                            ))}
                          </select>
                        </div>
                      <div>
                        <span className="text-[10px] font-medium text-gray-400 mb-1 block">Logo</span>
                        <select
                          className="w-full text-xs border border-gray-200 rounded p-1.5"
                          value={selectedLogo || ''}
                          onChange={(e) => setSelectedLogo(e.target.value)}
                        >
                          <option value="">Select Logo</option>
                          {assets.filter(a => a.type === 'LOGO').map(a => (
                            <option key={a.id} value={a.url}>{a.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {generationMode !== 'LAYOUT' && (
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
          )}

          {isGenerating && (
            <div className="mt-3 flex items-center justify-center text-sm font-medium text-gray-500 bg-gray-50 py-2 rounded-lg border border-gray-100 animate-pulse">
              <Timer className="w-4 h-4 mr-2 text-purple-500" />
              Elapsed Time: <span className="ml-1 font-mono text-purple-600">{formatElapsedTime(elapsedTimeMs)}</span>
            </div>
          )}

          {generationError && !isGenerating && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-3 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-800">Generation Failed</h4>
                <p className="text-xs text-red-600 mt-1">{generationError}</p>
              </div>
            </div>
          )}

          {/* Generated Result */}
          {(generatedContent || generatedImage || generatedVideo) && (
            <div className="mt-6 animate-fade-in">
              <label className="block text-sm font-medium text-gray-700 mb-2">Generated Result</label>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                {generatedContent && (
                  <textarea
                    readOnly
                    className="w-full bg-transparent border-none focus:ring-0 text-gray-800 text-sm h-48 resize-none mb-4"
                    value={generatedContent}
                  />
                )}

                {generatedImage && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      <ImageIcon className="w-3 h-3 inline mr-1" />
                      Generated Poster
                    </label>
                    <div
                      className="relative group cursor-pointer w-full max-w-sm rounded-lg overflow-hidden border border-gray-200"
                      onClick={() => setLightboxImage(generatedImage)}
                    >
                      <img
                        src={generatedImage}
                        alt="Generated Poster"
                        className="w-full shadow-sm"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-white text-sm font-medium">Click to view Full Screen</span>
                      </div>
                    </div>
                  </div>
                )}

                {generatedVideo && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      <Video className="w-3 h-3 inline mr-1" />
                      Processed Video
                    </label>
                    <video
                      src={generatedVideo}
                      controls
                      className="w-full rounded-lg shadow-sm max-w-sm border border-gray-200"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={handleCopy}
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    {isCopied ? <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                    {isCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleSchedule}
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
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

      <PostingCalendar />

      {/* Layout Editor Modal */}
      {showLayoutEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="relative max-w-6xl w-full bg-white rounded-xl shadow-2xl p-6 my-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Layers className="w-6 h-6 mr-2 text-purple-600" />
                        Interactive Layout Editor
                    </h2>
                    <button
                        onClick={() => {
                            setShowLayoutEditor(false);
                            setGenerationMode('SCRATCH');
                        }}
                        className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <LayoutEditor
                    onSave={async (base64Image) => {
                        setIsGenerating(true);
                        setShowLayoutEditor(false);

                        try {
                            const result: any = await functionsService.generateContent(
                                topic,
                                platform,
                                true, // includeImage
                                'LAYOUT', // trigger layout logic in backend
                                style,
                                base64Image, // pass base64 image as bgUrl
                                selectedVideo,
                                selectedLogo,
                                null,
                                brandText,
                                false, // animateWithAI
                                null
                            );

                            if (result.success && result.data) {
                                setGeneratedContent(result.data);
                                if (result.image) {
                                    setGeneratedImage(result.image);
                                }
                            } else {
                                setGenerationError(result.error || result.message || 'Unknown error');
                            }
                        } catch (err: any) {
                            setGenerationError(err.message || 'An unexpected error occurred.');
                        } finally {
                            setIsGenerating(false);
                            setGenerationMode('SCRATCH');
                        }
                    }}
                    onCancel={() => {
                        setShowLayoutEditor(false);
                        setGenerationMode('SCRATCH');
                    }}
                />
            </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center">
            <div className="absolute top-4 right-4 flex gap-4">
              <button
                onClick={() => handleDownloadImage(lightboxImage)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                title="Download Image"
              >
                <Download className="w-6 h-6" />
              </button>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                title="Close Lightbox"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <img
              src={lightboxImage}
              alt="Generated Poster Full"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};
