import React, { useState, useEffect } from 'react';
import { functionsService } from '../../services/firebaseService';
import { RefreshCw, ExternalLink, Calendar, Search } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface MarketInsight {
  id: string;
  title: string;
  source_url: string;
  publish_date: { seconds: number; nanoseconds: number } | null;
  content_snippet: string;
  platform: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
}

export const MarketInsights: React.FC = () => {
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to market insights
    const q = query(
      collection(db, 'market_insights'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MarketInsight[];
      setInsights(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching market insights:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    setToastMessage(null);
    try {
      const result = await functionsService.manualDataCrawl();
      if (result && (result as any).success) {
        setToastMessage('Data berhasil ditarik!');
      } else {
         setToastMessage('Selesai menarik data.');
      }
    } catch (error: any) {
      console.error("Error refreshing data manually:", error);
      setToastMessage(`Error: ${error.message || 'Gagal menarik data'}`);
    } finally {
      setRefreshing(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const formatDate = (timestamp: { seconds: number; nanoseconds: number } | null) => {
    if (!timestamp) return 'Tanggal tidak tersedia';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <Search className="w-6 h-6 mr-2 text-emerald-600" />
            Market Insights
          </h1>
          <p className="text-gray-500 mt-1">Pantau berita dan informasi terbaru dari berbagai sumber.</p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
            refreshing
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
          }`}
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Menarik Data...' : 'Tarik Data Terbaru'}
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 z-50 animate-fade-in-up">
          <div className="text-sm font-medium">{toastMessage}</div>
        </div>
      )}

      {/* Content Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">Belum ada data</h3>
          <p className="text-gray-500 mt-1">Klik "Tarik Data Terbaru" untuk mengambil berita terkini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {insights.map((insight) => (
            <div key={insight.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    {insight.platform}
                  </span>
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(insight.publish_date || insight.createdAt)}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {insight.title}
                </h3>

                <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1">
                  {insight.content_snippet}
                </p>

                <div className="mt-auto pt-4 border-t border-gray-100">
                  <a
                    href={insight.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    Baca Selengkapnya
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
