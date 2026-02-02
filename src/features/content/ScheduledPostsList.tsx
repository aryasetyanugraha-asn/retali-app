import React, { useEffect, useState } from 'react';
import { dbService } from '../../services/firebaseService';
import { useAuth } from '../../context/AuthContext';
import { where, orderBy, Timestamp } from 'firebase/firestore';
import {
  Calendar,
  Clock,
  Instagram,
  Facebook,
  Video,
  Image as ImageIcon,
  MoreHorizontal
} from 'lucide-react';

interface ScheduledPost {
  id: string;
  topic: string;
  platform: string;
  content: string;
  imageUrl?: string;
  status: string;
  scheduledAt: Timestamp | Date; // Can be either depending on how it's handled
  createdAt: Timestamp | Date;
  userId: string;
}

export const ScheduledPostsList: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Note: This compound query (where + orderBy) might require a Firestore index.
    // If the index is missing, Firestore will throw an error with a link to create it.
    // For now we implement as requested.
    const unsubscribe = dbService.subscribeToCollection(
      'posts',
      (data) => {
        setPosts(data as ScheduledPost[]);
        setLoading(false);
      },
      [
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      ]
    );

    return () => unsubscribe();
  }, [user]);

  const formatDate = (date: Timestamp | Date) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: Timestamp | Date) => {
    if (!date) return '';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleTimeString('en-US', {
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

  const getTopicBadgeColor = (topic: string) => {
    switch (topic) {
      case 'PROMO': return 'bg-red-100 text-red-600';
      case 'MANASIK': return 'bg-purple-100 text-purple-600';
      case 'DOA': return 'bg-green-100 text-green-600';
      case 'TIPS': return 'bg-blue-100 text-blue-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">Your Scheduled Content</h2>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
            {posts.length} Posts
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900">No scheduled posts yet</h3>
          <p className="text-xs text-gray-500 mt-1">Generate content above to schedule your first post.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div key={post.id} className="group bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all overflow-hidden flex flex-col h-full">
              {/* Image Section */}
              <div className="relative h-48 bg-gray-100 overflow-hidden">
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
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold shadow-sm backdrop-blur-sm bg-white/90 ${
                    post.status === 'POSTED' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {post.status}
                  </span>
                </div>
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm p-1.5 rounded-lg shadow-sm">
                  {getPlatformIcon(post.platform)}
                </div>
              </div>

              {/* Content Section */}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getTopicBadgeColor(post.topic)}`}>
                    {post.topic}
                  </span>
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(post.scheduledAt)}
                  </div>
                </div>

                <p className="text-sm text-gray-700 line-clamp-3 mb-4 flex-1">
                  {post.content}
                </p>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-auto">
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTime(post.scheduledAt)}
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
