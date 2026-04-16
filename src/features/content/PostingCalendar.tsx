import React, { useEffect, useState } from 'react';
import { dbService } from '../../services/firebaseService';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { where, orderBy, Timestamp } from 'firebase/firestore';
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
  Trash2
} from 'lucide-react';

interface ScheduledPost {
  id: string;
  content: string;
  imageUrl?: string;
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
  const [mediaUrl, setMediaUrl] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    let constraints: any[] = [orderBy('scheduledAt', 'asc')];
    if (profile?.role === 'MITRA') {
      constraints.push(where('partnerId', '==', profile.partnerId || user.uid));
    } else if (profile?.role === 'CABANG') {
      constraints.push(where('branchId', '==', profile.branchId));
    }

    const unsubscribe = dbService.subscribeToCollection(
      'scheduledPosts',
      (data) => {
        setPosts(data as ScheduledPost[]);
        setLoading(false);
      },
      constraints
    );

    return () => unsubscribe();
  }, [user, profile]);

  const handlePlatformToggle = (platform: string) => {
    setPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const handleSchedulePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content || platforms.length === 0 || !scheduledDate) {
      alert('Tolong lengkapi form dengan benar.');
      return;
    }

    try {
      const scheduledTimestamp = new Date(scheduledDate);

      const newPost: Partial<ScheduledPost> = {
        content,
        imageUrl: mediaUrl || undefined,
        platforms,
        status: 'PENDING',
        scheduledAt: scheduledTimestamp,
        createdAt: new Date(),
        userId: user.uid,
      };

      if (profile?.role === 'MITRA') {
         newPost.partnerId = profile.partnerId || user.uid;
      }
      if (profile?.role === 'CABANG' || profile?.branchId) {
         newPost.branchId = profile.branchId;
      }

      await dbService.addDocument('scheduledPosts', newPost);

      // Reset form and close modal
      setIsModalOpen(false);
      setContent('');
      setMediaUrl('');
      setPlatforms([]);
      setScheduledDate('');
    } catch (error) {
      console.error('Error scheduling post:', error);
      alert('Gagal menjadwalkan postingan.');
    }
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
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">Jadwal Posting</h2>
        <button
          onClick={() => setIsModalOpen(true)}
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
                {post.imageUrl ? (
                  <img
                    src={post.imageUrl}
                    alt="Post visual"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                    <span className="text-xs font-medium">No Image</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                    {post.platforms.map(p => (
                        <div key={p} className="bg-white/90 backdrop-blur-sm p-1 rounded-md shadow-sm">
                          {getPlatformIcon(p)}
                        </div>
                    ))}
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
              <h3 className="font-bold text-lg">Jadwalkan Postingan</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Media URL (Opsional)</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Upload className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                        type="url"
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
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

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!content || platforms.length === 0 || !scheduledDate}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Jadwalkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
