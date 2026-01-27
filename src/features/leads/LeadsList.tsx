import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/firebaseService';
import {
  Search,
  Filter,
  MoreVertical,
  Phone,
  Mail,
  Facebook,
  Instagram,
  MessageCircle,
  Video
} from 'lucide-react';

type LeadStatus = 'HOT' | 'WARM' | 'COLD' | 'NEW';
type Platform = 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'WEB';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  platform: Platform;
  status: LeadStatus;
  lastContact: string;
  notes: string;
}

const StatusBadge = ({ status }: { status: LeadStatus }) => {
  const styles = {
    HOT: 'bg-red-100 text-red-700 border-red-200',
    WARM: 'bg-orange-100 text-orange-700 border-orange-200',
    COLD: 'bg-blue-100 text-blue-700 border-blue-200',
    NEW: 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {status}
    </span>
  );
};

const PlatformIcon = ({ platform }: { platform: Platform }) => {
  switch (platform) {
    case 'WHATSAPP': return <MessageCircle className="w-4 h-4 text-green-600" />;
    case 'FACEBOOK': return <Facebook className="w-4 h-4 text-blue-600" />;
    case 'INSTAGRAM': return <Instagram className="w-4 h-4 text-pink-600" />;
    case 'TIKTOK': return <Video className="w-4 h-4 text-black" />; // Lucide doesn't have TikTok, using Video
    default: return <Mail className="w-4 h-4 text-gray-600" />;
  }
};

export const LeadsList: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = dbService.subscribeToCollection('leads', (data) => {
      // Map Firestore data to Lead interface
      const mappedLeads = data.map(doc => ({
        id: doc.id,
        name: doc.name || 'Unknown',
        phone: doc.phone || '',
        email: doc.email || '',
        platform: doc.source || 'WEB', // Assuming 'source' in DB maps to 'platform'
        status: doc.status || 'NEW',
        lastContact: doc.createdAt ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
        notes: doc.notes || ''
      })) as Lead[];

      setLeads(mappedLeads);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredLeads = leads.filter(lead => {
    const matchesStatus = filter === 'ALL' || lead.status === filter;
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.phone.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads Management</h1>
          <p className="text-gray-500 mt-1">Manage and track your potential Jamaah</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center">
          <Phone className="w-4 h-4 mr-2" />
          Add New Lead
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            className="border border-gray-200 rounded-lg text-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="ALL">All Status</option>
            <option value="NEW">New</option>
            <option value="HOT">Hot</option>
            <option value="WARM">Warm</option>
            <option value="COLD">Cold</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Lead Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Platform</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Last Interaction</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs mr-3">
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{lead.notes}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-full bg-gray-100">
                        <PlatformIcon platform={lead.platform} />
                      </div>
                      <span className="text-xs text-gray-500 capitalize">{lead.platform.toLowerCase()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-1.5 hover:bg-green-50 rounded text-gray-400 hover:text-green-600 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 hover:bg-blue-50 rounded text-gray-400 hover:text-blue-600 transition-colors">
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{lead.lastContact}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLeads.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No leads found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
};
