import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/firebaseService';
import { useRole } from '../../context/RoleContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { where, QueryConstraint } from 'firebase/firestore';
import { Phone, Search, Award, FileText, CheckCircle2, Circle, X } from 'lucide-react';

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
  package_schedule?: string;
  payment_status?: 'BELUM DP' | 'DP' | 'LUNAS';
  documents?: {
    ktp: boolean;
    paspor: boolean;
    kk: boolean;
    buku_kuning: boolean;
  };
  equipment_taken?: boolean;
  identity?: {
    nik: string;
    passport_no: string;
    passport_expiry: string;
  };
  mahram?: string;
  apparel_size?: string;
  medical_notes?: string;
}

export const JamaahAktif: React.FC = () => {
  const [jamaah, setJamaah] = useState<Jamaah[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJamaah, setSelectedJamaah] = useState<Jamaah | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { role } = useRole();
  const { profile } = useUserProfile();

  useEffect(() => {
    let constraints: QueryConstraint[] = [];
    if (role === 'CABANG' && profile?.branchId) {
      constraints.push(where('branchId', '==', profile.branchId));
    } else if (role === 'MITRA' && profile?.uid) {
      constraints.push(where('partnerId', '==', profile.uid));
    }

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
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt.seconds * 1000) : new Date(0),
          package_schedule: doc.package_schedule || '',
          payment_status: doc.payment_status || 'BELUM DP',
          documents: doc.documents || { ktp: false, paspor: false, kk: false, buku_kuning: false },
          equipment_taken: doc.equipment_taken || false,
          identity: doc.identity || { nik: '', passport_no: '', passport_expiry: '' },
          mahram: doc.mahram || '',
          apparel_size: doc.apparel_size || '',
          medical_notes: doc.medical_notes || ''
        })) as Jamaah[];

      // Sort by recently updated
      mappedJamaah.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      setJamaah(mappedJamaah);
      setLoading(false);
    }, constraints, () => setLoading(false));

    return () => unsubscribe();
  }, [role, profile]);

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

  const getPaymentBadgeColor = (status?: string) => {
    switch (status) {
      case 'LUNAS': return 'bg-green-100 text-green-800 border-green-200';
      case 'DP': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getCompletedDocsCount = (docs: any) => {
    if (!docs) return 0;
    return Object.values(docs).filter(Boolean).length;
  };

  const handleRowClick = (person: Jamaah) => {
    setSelectedJamaah(person);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedJamaah(null);
    setIsModalOpen(false);
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJamaah) return;

    try {
      const updates = {
        identity: selectedJamaah.identity,
        mahram: selectedJamaah.mahram,
        apparel_size: selectedJamaah.apparel_size,
        medical_notes: selectedJamaah.medical_notes,
        package_schedule: selectedJamaah.package_schedule,
        payment_status: selectedJamaah.payment_status,
        equipment_taken: selectedJamaah.equipment_taken,
        documents: selectedJamaah.documents,
      };

      await dbService.updateDocument('leads', selectedJamaah.id, updates);
      closeModal();
    } catch (error) {
      console.error('Error updating document:', error);
      alert('Failed to update. Please try again.');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (selectedJamaah) {
      setSelectedJamaah({ ...selectedJamaah, [field]: value });
    }
  };

  const handleIdentityChange = (field: string, value: string) => {
    if (selectedJamaah) {
      setSelectedJamaah({
        ...selectedJamaah,
        identity: {
          ...selectedJamaah.identity,
          nik: selectedJamaah.identity?.nik || '',
          passport_no: selectedJamaah.identity?.passport_no || '',
          passport_expiry: selectedJamaah.identity?.passport_expiry || '',
          [field]: value
        }
      });
    }
  };

  const handleDocChange = (docType: string, value: boolean) => {
    if (selectedJamaah) {
      setSelectedJamaah({
        ...selectedJamaah,
        documents: {
          ktp: selectedJamaah.documents?.ktp || false,
          paspor: selectedJamaah.documents?.paspor || false,
          kk: selectedJamaah.documents?.kk || false,
          buku_kuning: selectedJamaah.documents?.buku_kuning || false,
          [docType]: value
        }
      });
    }
  };

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
                <th className="px-6 py-4 font-semibold">Full Name</th>
                <th className="px-6 py-4 font-semibold">Package & Schedule</th>
                <th className="px-6 py-4 font-semibold">Payment Status</th>
                <th className="px-6 py-4 font-semibold">Documents</th>
                <th className="px-6 py-4 font-semibold">Equipment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 overflow-y-auto">
              {filteredJamaah.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No active jamaah found. Convert leads to see them here!
                  </td>
                </tr>
              ) : (
                filteredJamaah.map((person) => (
                  <tr
                    key={person.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(person)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold flex-shrink-0">
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{person.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <Phone className="w-3 h-3" />
                            {person.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {person.package_schedule || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPaymentBadgeColor(person.payment_status)}`}>
                        {person.payment_status || 'BELUM DP'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">
                          {getCompletedDocsCount(person.documents)}/4 Completed
                        </span>
                      </div>
                      <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-2">
                        <div
                          className="h-1.5 bg-emerald-500 rounded-full"
                          style={{ width: `${(getCompletedDocsCount(person.documents) / 4) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {person.equipment_taken ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Taken
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                          <Circle className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedJamaah && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-gray-900">Jamaah Details: {selectedJamaah.name}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveChanges} className="p-6 space-y-6">
              {/* Package & Status Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Package & Schedule</label>
                  <input
                    type="text"
                    value={selectedJamaah.package_schedule || ''}
                    onChange={(e) => handleInputChange('package_schedule', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g. Umrah Reguler - 15 Nov 2026"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                  <select
                    value={selectedJamaah.payment_status || 'BELUM DP'}
                    onChange={(e) => handleInputChange('payment_status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="BELUM DP">BELUM DP</option>
                    <option value="DP">DP</option>
                    <option value="LUNAS">LUNAS</option>
                  </select>
                </div>
              </div>

              {/* Identity Section */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Identity Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NIK</label>
                    <input
                      type="text"
                      value={selectedJamaah.identity?.nik || ''}
                      onChange={(e) => handleIdentityChange('nik', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mahram (Relation/Companion)</label>
                    <input
                      type="text"
                      value={selectedJamaah.mahram || ''}
                      onChange={(e) => handleInputChange('mahram', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
                    <input
                      type="text"
                      value={selectedJamaah.identity?.passport_no || ''}
                      onChange={(e) => handleIdentityChange('passport_no', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Passport Expiry</label>
                    <input
                      type="date"
                      value={selectedJamaah.identity?.passport_expiry || ''}
                      onChange={(e) => handleIdentityChange('passport_expiry', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Documents & Equipment */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Documents & Equipment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Required Documents</label>
                    <div className="space-y-2">
                      {['ktp', 'paspor', 'kk', 'buku_kuning'].map((doc) => (
                        <div key={doc} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`doc-${doc}`}
                            checked={selectedJamaah.documents?.[doc as keyof typeof selectedJamaah.documents] || false}
                            onChange={(e) => handleDocChange(doc, e.target.checked)}
                            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`doc-${doc}`} className="ml-2 block text-sm text-gray-900 uppercase">
                            {doc.replace('_', ' ')}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Status</label>
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="equipment_taken"
                        checked={selectedJamaah.equipment_taken || false}
                        onChange={(e) => handleInputChange('equipment_taken', e.target.checked)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <label htmlFor="equipment_taken" className="ml-2 block text-sm text-gray-900">
                        Equipment Taken
                      </label>
                    </div>

                    <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">Apparel Size</label>
                    <select
                      value={selectedJamaah.apparel_size || ''}
                      onChange={(e) => handleInputChange('apparel_size', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Select Size...</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="XXL">XXL</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Medical Notes */}
              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Medical Notes</label>
                <textarea
                  value={selectedJamaah.medical_notes || ''}
                  onChange={(e) => handleInputChange('medical_notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Any specific medical conditions, dietary requirements, or notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
