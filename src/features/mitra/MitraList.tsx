import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/firebaseService';
import { where } from 'firebase/firestore';
import {
  Search,
  Phone,
  Calendar,
  Globe,
  Instagram,
  Facebook,
} from 'lucide-react';

interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface SocialMedia {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

interface Mitra {
  id: string;
  displayName?: string;
  email: string;
  phoneNumber?: string;
  bankDetails?: BankDetails;
  socialMedia?: SocialMedia;
  createdAt?: any;
}

const SocialLink = ({ url, icon: Icon, color }: { url?: string, icon: any, color: string }) => {
    if (!url) return null;
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded-full bg-gray-50 hover:bg-gray-100 ${color} transition-colors`}>
            <Icon className="w-4 h-4" />
        </a>
    );
};

export const MitraList: React.FC = () => {
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = dbService.subscribeToCollection('users', (data) => {
      // Filter is handled by Firestore query below, but safer to typecast here
      const mappedMitras = data.map(doc => ({
        id: doc.id,
        displayName: doc.displayName,
        email: doc.email,
        phoneNumber: doc.phoneNumber,
        bankDetails: doc.bankDetails,
        socialMedia: doc.socialMedia,
        createdAt: doc.createdAt
      })) as Mitra[];

      setMitras(mappedMitras);
      setLoading(false);
    }, [where('role', '==', 'MITRA')]);

    return () => unsubscribe();
  }, []);

  const filteredMitras = mitras.filter(mitra => {
    const searchLower = searchTerm.toLowerCase();
    return (
        (mitra.displayName || '').toLowerCase().includes(searchLower) ||
        (mitra.email || '').toLowerCase().includes(searchLower) ||
        (mitra.phoneNumber || '').includes(searchTerm)
    );
  });

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    // Handle Firestore Timestamp or Date
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Mitra</h1>
          <p className="text-gray-500 mt-1">Daftar mitra yang telah bergabung</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari nama, email, atau no HP..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Mitra</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Kontak</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Bank Info</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Bergabung</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Social Media</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMitras.map((mitra) => (
                <tr key={mitra.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs mr-3">
                        {(mitra.displayName || mitra.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{mitra.displayName || 'No Name'}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{mitra.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-3.5 h-3.5 mr-2 text-gray-400" />
                        {mitra.phoneNumber || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {mitra.bankDetails?.accountNumber ? (
                        <div className="text-sm">
                            <p className="font-medium text-gray-900">{mitra.bankDetails.bankName}</p>
                            <p className="text-xs text-gray-500">{mitra.bankDetails.accountNumber}</p>
                            <p className="text-xs text-gray-400 truncate">{mitra.bankDetails.accountName}</p>
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400 italic">Belum diisi</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-3.5 h-3.5 mr-2 text-gray-400" />
                        {formatDate(mitra.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                        <SocialLink url={mitra.socialMedia?.instagram} icon={Instagram} color="text-pink-600" />
                        <SocialLink url={mitra.socialMedia?.facebook} icon={Facebook} color="text-blue-600" />
                        <SocialLink url={mitra.socialMedia?.tiktok} icon={Globe} color="text-black" />
                        {!mitra.socialMedia?.instagram && !mitra.socialMedia?.facebook && !mitra.socialMedia?.tiktok && (
                            <span className="text-xs text-gray-400">-</span>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredMitras.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'Tidak ada mitra yang ditemukan.' : 'Belum ada data mitra.'}
          </div>
        )}
      </div>
    </div>
  );
};
