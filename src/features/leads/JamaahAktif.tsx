import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/firebaseService';
import { Phone, Mail, Search, Award } from 'lucide-react';

interface Jamaah {
  id: string;
  name: string;
  phone: string;
  email: string;
  platform: string;
  status: string;
  lastContact: string;
  notes: string;
  updatedAt: any;
}

export const JamaahAktif: React.FC = () => {
  const [jamaah, setJamaah] = useState<Jamaah[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Note: in a real large-scale app, we might want to query specifically where status == 'WON'
    // to reduce read operations, but since we are subscribing to the whole collection
    // and filtering client side elsewhere, we do the same here for consistency.
    const unsubscribe = dbService.subscribeToCollection('leads', (data) => {
      const mappedJamaah = data
        .filter(doc => doc.status === 'WON')
        .map(doc => ({
          id: doc.id,
          name: doc.name || 'Unknown',
          phone: doc.phone || '',
          email: doc.email || '',
          platform: doc.source || 'WEB',
          status: doc.status || 'WON',
          lastContact: doc.createdAt ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
          notes: doc.notes || '',
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt.seconds * 1000) : new Date(0)
        })) as Jamaah[];

      // Sort by recently updated
      mappedJamaah.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      setJamaah(mappedJamaah);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredJamaah = jamaah.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-600" />
            Jamaah Aktif
          </h1>
          <p className="text-gray-500 mt-1">List of all converted and active pilgrims</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-shrink-0">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-grow flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Contact Info</th>
                <th className="px-6 py-4 font-semibold">Source</th>
                <th className="px-6 py-4 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 overflow-y-auto">
              {filteredJamaah.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No active jamaah found. Convert leads to see them here!
                  </td>
                </tr>
              ) : (
                filteredJamaah.map((person) => (
                  <tr key={person.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold flex-shrink-0">
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{person.name}</p>
                          <p className="text-xs text-gray-500">Since {person.lastContact}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {person.phone}
                      </div>
                      {person.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {person.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {person.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {person.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
