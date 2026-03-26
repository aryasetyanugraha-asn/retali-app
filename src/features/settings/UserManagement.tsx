import React, { useState } from 'react';
import { useRole } from '../../context/RoleContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../lib/firebase';
import { Shield, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { role } = useRole();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [targetUid, setTargetUid] = useState('');
  const [targetRole, setTargetRole] = useState<'CABANG' | 'MITRA'>('MITRA');
  const [branchId, setBranchId] = useState('');
  const [partnerId, setPartnerId] = useState('');

  // Strictly visible only to PUSAT
  if (role !== 'PUSAT') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const functions = getFunctions(app, 'asia-southeast2');
      const setCustomUserClaims = httpsCallable(functions, 'setCustomUserClaims');

      const payload: any = {
        uid: targetUid,
        role: targetRole,
      };

      if (targetRole === 'CABANG') {
        if (!branchId) throw new Error('Branch ID is required for CABANG role');
        payload.branchId = branchId;
      }

      if (targetRole === 'MITRA') {
        if (!partnerId) throw new Error('Partner ID is required for MITRA role');
        payload.partnerId = partnerId;
      }

      await setCustomUserClaims(payload);

      setSuccess(`Successfully assigned role ${targetRole} to user ${targetUid}`);

      // Reset form
      setTargetUid('');
      setBranchId('');
      setPartnerId('');
    } catch (err: any) {
      console.error('Error assigning role:', err);
      setError(err.message || 'Failed to assign role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
      <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">User Management (Admin Only)</h2>
          <p className="text-sm text-gray-500">Assign roles and IDs to users.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User UID</label>
          <input
            type="text"
            value={targetUid}
            onChange={(e) => setTargetUid(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="User's Firebase UID"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value as 'CABANG' | 'MITRA')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="CABANG">Cabang (Branch)</option>
            <option value="MITRA">Mitra (Partner)</option>
          </select>
        </div>

        {targetRole === 'CABANG' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch ID</label>
            <input
              type="text"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Assign Branch ID"
              required
            />
          </div>
        )}

        {targetRole === 'MITRA' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Partner ID</label>
            <input
              type="text"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Assign Partner ID"
              required
            />
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center px-4 py-2 text-white rounded-lg font-medium transition-colors ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <UserPlus className="w-5 h-5 mr-2" />
            {loading ? 'Assigning Role...' : 'Assign Role'}
          </button>
        </div>
      </form>
    </div>
  );
};
