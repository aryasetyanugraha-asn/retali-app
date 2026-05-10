import React, { useEffect, useState } from 'react';
import { dbService } from '../../services/firebaseService';
import { storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { where, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  Calendar,
  Clock,
  Instagram,
  Facebook,
  Video,
  Image as ImageIcon,
  Plus,
  X,
  Upload,
  Trash2,
  AlertTriangle,
  Pencil
} from 'lucide-react';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PostingCalendar rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800">Something went wrong</h3>
          <p className="text-sm text-red-600 mt-2">Failed to load the posting calendar. Please try refreshing the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ScheduledPost {
  id: string;
  content: string;
  imageUrl?: string; // Kept for backwards compatibility
  mediaUrls?: string[];
  mediaType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  platforms: string[];
  status: string;
  scheduledAt: Timestamp | Date;
  createdAt: Timestamp | Date;
  userId: string;
  partnerId?: string;
  branchId?: string;
}

export const PostingCalendar: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [content, setContent] = useState('');
  const [mediaUrlsInput, setMediaUrlsInput] = useState(''); // Allow comma-separated inputs
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | 'CAROUSEL'>('IMAGE');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile) return;

    setLoading(true);

    let constraints: any[] = [orderBy('scheduledAt', 'asc')];
    if (profile?.role?.toUpperCase() === 'MITRA') {
      constraints.push(where('partnerId', '==', user.uid));
    } else if (profile?.role?.toUpperCase() === 'CABANG') {
      constraints.push(where('branchId', '==', profile.branchId));
    }

    const unsubscribe = dbService.subscribeToCollection(
      'scheduledPosts',
      (data) => {
        setPosts(data as ScheduledPost[]);
        setLoading(false);
      },
      constraints,
      (error) => {
        console.error("Error fetching scheduledPosts:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, profile]);

  const handlePlatformToggle = (platform: string) => {
    setPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFilesToStorage = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    setIsUploading(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    let completedFiles = 0;

    for (const file of files) {
      const timestamp = Date.now();
      const filename = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const storageRef = ref(storage, `post_media/${user?.uid}/${timestamp}_${filename}`);

      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            // Calculate overall progress across all files
            const overallProgress = ((completedFiles * 100) + progress) / totalFiles;
            setUploadProgress(Math.round(overallProgress));
          },
          (error) => {
            console.error('Upload failed:', error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            uploadedUrls.push(downloadURL);
            resolve();
          }
        );
      });
      completedFiles++;
    }

    setIsUploading(false);
    return uploadedUrls;
  };

  const handleSchedulePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !content || platforms.length === 0 || !scheduledDate) {
      alert('Tolong lengkapi form dengan benar.');
      return;
    }

    try {
      const scheduledTimestamp = new Date(scheduledDate);

      let uploadedUrls: string[] = [];
      if (selectedFiles.length > 0) {
        uploadedUrls = await uploadFilesToStorage(selectedFiles);
      }

      // Parse media URLs
      const manualUrls = mediaUrlsInput.split(',').map(u => u.trim()).filter(u => u);
      const allUrls = [...manualUrls, ...uploadedUrls];

      let finalMediaType = mediaType;
      if (allUrls.length > 1 && mediaType === 'IMAGE') {
          finalMediaType = 'CAROUSEL';
      }

      const newPost: Partial<ScheduledPost> = {
        content,
        imageUrl: allUrls.length > 0 ? allUrls[0] : undefined, // Keep for backward compatibility
        mediaUrls: allUrls,
        mediaType: finalMediaType,
        platforms,
        status: 'PENDING',
        scheduledAt: scheduledTimestamp,
        createdAt: new Date(),
        userId: user.uid,
      };

      if (profile?.role?.toUpperCase() === 'MITRA') {
         newPost.partnerId = user.uid;
         newPost.userId = user.uid; // Forcefully inject userId and partnerId just in case
      }
      if (profile?.role?.toUpperCase() === 'CABANG' || profile?.branchId) {
         newPost.branchId = profile.branchId;
      }

      if (editingPostId) {
        await dbService.updateDocument('scheduledPosts', editingPostId, newPost);
      } else {
        await dbService.addDocument('scheduledPosts', newPost);
      }

      // Reset form and close modal
      setIsModalOpen(false);
      setEditingPostId(null);
      setContent('');
      setMediaUrlsInput('');
      setSelectedFiles([]);
      setUploadProgress(0);
      setMediaType('IMAGE');
      setPlatforms([]);
      setScheduledDate('');
    } catch (error) {
      console.error('Error scheduling post:', error);
      alert('Gagal menjadwalkan postingan.');
    }
  };

  const handleEditClick = (post: ScheduledPost) => {
    setEditingPostId(post.id);
    setContent(post.content);
    setMediaUrlsInput(post.mediaUrls?.join(', ') || post.imageUrl || '');
    setPlatforms(post.platforms || []);
    setMediaType(post.mediaType || 'IMAGE');
    setSelectedFiles([]);
    setUploadProgress(0);

    // Format the date to YYYY-MM-DDTHH:mm
    const d = post.scheduledAt instanceof Timestamp ? post.scheduledAt.toDate() : new Date(post.scheduledAt);
    const tzoffset = d.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
    setScheduledDate(localISOTime);

    setIsModalOpen(true);
  };

  const handleDelete = async (postId: string) => {
    const isConfirmed = window.confirm('Apakah Anda yakin ingin menghapus jadwal ini?');
    if (!isConfirmed) return;

    try {
      await dbService.deleteDocument('scheduledPosts', postId);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Gagal menghapus postingan.');
    }
  };

  const formatDate = (date: Timestamp | Date) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: Timestamp | Date) => {
    if (!date) return '';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'INSTAGRAM': return <Instagram className="w-4 h-4 text-pink-600" />;
      case 'FACEBOOK': return <Facebook className="w-4 h-4 text-blue-600" />;
      case 'TIKTOK': return <Video className="w-4 h-4 text-black" />;
      default: return <ImageIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!user) return null;

  return (
    <ErrorBoundary>
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">Jadwal Posting</h2>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setEditingPostId(null);
            setContent('');
            setMediaUrlsInput('');
            setSelectedFiles([]);
            setUploadProgress(0);
            setMediaType('IMAGE');
            setPlatforms([]);
            setScheduledDate('');
          }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Jadwalkan Baru</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900">Belum ada postingan terjadwal</h3>
          <p className="text-xs text-gray-500 mt-1">Klik tombol di atas untuk membuat jadwal baru.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="group bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all overflow-hidden flex flex-col md:flex-row h-full md:h-40">
              {/* Image Section */}
              <div className="relative w-full md:w-48 h-48 md:h-full bg-gray-100 flex-shrink-0">
                {(post.mediaUrls && post.mediaUrls.length > 0) || post.imageUrl ? (
                  <>
                  {post.mediaType === 'VIDEO' ? (
                     <div className="w-full h-full flex items-center justify-center bg-gray-900">
                       <Video className="w-12 h-12 text-white/50" />
                     </div>
                  ) : (
                     <img
                       src={post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls[0] : post.imageUrl}
                       alt="Post visual"
                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                     />
                  )}
                  {post.mediaType === 'CAROUSEL' || (post.mediaUrls && post.mediaUrls.length > 1) ? (
                      <div className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-md text-xs font-bold">
                         1/{post.mediaUrls?.length || 1}
                      </div>
                  ) : null}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                    <span className="text-xs font-medium">No Image</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                    {((post.platforms as string[] | undefined) || []).map(p => (
                        <div key={p} className="bg-white/90 backdrop-blur-sm p-1 rounded-md shadow-sm">
                          {getPlatformIcon(p)}
                        </div>
                    ))}
                    {/* Fallback for older posts that might have just `platform` string */}
                    {!(post.platforms && post.platforms.length > 0) && (post as any).platform && (
                        <div key={(post as any).platform} className="bg-white/90 backdrop-blur-sm p-1 rounded-md shadow-sm">
                          {getPlatformIcon((post as any).platform)}
                        </div>
                    )}
                </div>
              </div>

              {/* Content Section */}
              <div className="p-4 flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center text-sm font-medium text-gray-800">
                        <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
                        {formatDate(post.scheduledAt)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                          post.status === 'POSTED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                          {post.status}
                      </span>
                      {(post.status === 'PENDING' || post.status === 'FAILED') && (
                        <button
                          onClick={() => handleEditClick(post)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit jadwal"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Hapus jadwal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                </div>

                <div className="flex items-center text-xs text-gray-500 mb-3">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTime(post.scheduledAt)}
                </div>

                <p className="text-sm text-gray-600 line-clamp-3 overflow-hidden text-ellipsis flex-1">
                  {post.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Schedule Post */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg">{editingPostId ? 'Edit Postingan' : 'Jadwalkan Postingan'}</h3>
              <button onClick={() => {
                setIsModalOpen(false);
                setEditingPostId(null);
                setContent('');
                setMediaUrlsInput('');
                setSelectedFiles([]);
                setUploadProgress(0);
                setMediaType('IMAGE');
                setPlatforms([]);
                setScheduledDate('');
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSchedulePost} className="p-4 space-y-4 overflow-y-auto">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caption / Konten</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tulis caption untuk postingan Anda..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none h-32"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Media Upload</label>

                <div className="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {/* URL Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Dari URL</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Upload className="w-4 h-4 text-gray-400" />
                        </div>
                        <textarea
                            value={mediaUrlsInput}
                            onChange={(e) => setMediaUrlsInput(e.target.value)}
                            placeholder="https://example.com/image.jpg, https://example.com/image2.jpg"
                            className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none h-20 text-sm bg-white"
                        />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">Pisahkan dengan koma untuk banyak URL.</p>
                  </div>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium uppercase">ATAU</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                  </div>

                  {/* File Upload Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Upload File (Gambar/Video)</label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-emerald-50 file:text-emerald-700
                        hover:file:bg-emerald-100 cursor-pointer"
                    />

                    {/* Visual Preview */}
                    {selectedFiles.length > 0 && (
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="relative w-16 h-16 border rounded bg-white overflow-hidden group">
                            {file.type.startsWith('video/') ? (
                               <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                 <Video className="w-6 h-6 text-white/50" />
                               </div>
                            ) : (
                               <img
                                 src={URL.createObjectURL(file)}
                                 alt={`preview ${idx}`}
                                 className="w-full h-full object-cover"
                               />
                            )}
                            <button
                              type="button"
                              onClick={() => removeSelectedFile(idx)}
                              className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-md opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mediaType"
                      value="IMAGE"
                      checked={mediaType === 'IMAGE' || mediaType === 'CAROUSEL'}
                      onChange={() => setMediaType('IMAGE')}
                      className="rounded-full text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm">Gambar / Carousel</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mediaType"
                      value="VIDEO"
                      checked={mediaType === 'VIDEO'}
                      onChange={() => setMediaType('VIDEO')}
                      className="rounded-full text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm">Video</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform Tujuan</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                      checked={platforms.includes('FACEBOOK')}
                      onChange={() => handlePlatformToggle('FACEBOOK')}
                    />
                    <Facebook className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Facebook</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                      checked={platforms.includes('INSTAGRAM')}
                      onChange={() => handlePlatformToggle('INSTAGRAM')}
                    />
                    <Instagram className="w-4 h-4 text-pink-600" />
                    <span className="text-sm">Instagram</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                      checked={platforms.includes('TIKTOK')}
                      onChange={() => handlePlatformToggle('TIKTOK')}
                    />
                    <Video className="w-4 h-4 text-black" />
                    <span className="text-sm">TikTok</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jadwal (Tanggal & Waktu)</label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              {isUploading && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  <p className="text-xs text-center text-gray-500 mt-1">Mengunggah... {uploadProgress}%</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPostId(null);
                    setContent('');
                    setMediaUrlsInput('');
                    setSelectedFiles([]);
                    setUploadProgress(0);
                    setMediaType('IMAGE');
                    setPlatforms([]);
                    setScheduledDate('');
                  }}
                  disabled={isUploading}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!profile || !content || platforms.length === 0 || !scheduledDate || isUploading}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Menyimpan...' : 'Jadwalkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
};
