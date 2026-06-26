import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/firebaseService';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../context/RoleContext';
import {
  Image as ImageIcon,
  Video,
  Trash2,
  Plus,
  Loader2,
  Search,
  Filter
} from 'lucide-react';

type AssetType = 'PHOTO' | 'VIDEO' | 'COMPONENT' | 'LOGO';

interface MediaAsset {
  id: string;
  name: string;
  url: string;
  type: AssetType;
  size: number;
  createdAt: string;
  uploadedBy: string;
}

export const MediaLibrary: React.FC = () => {
  const { user } = useAuth();
  const { role } = useRole();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filterType, setFilterType] = useState<AssetType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<AssetType>('PHOTO');

  useEffect(() => {
    const unsubscribe = dbService.subscribeToCollection('media_assets', (data) => {
      setAssets(data as MediaAsset[]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Auto-suggest category based on file type
    let suggestedCategory: AssetType = 'PHOTO';
    if (file.type.includes('video')) suggestedCategory = 'VIDEO';
    else if (file.name.toLowerCase().includes('logo')) suggestedCategory = 'LOGO';
    else if (file.type.includes('svg')) suggestedCategory = 'COMPONENT';

    setUploadFile(file);
    setUploadCategory(suggestedCategory);
    setIsUploadModalOpen(true);
    // Reset input
    e.target.value = '';
  };

  const confirmUpload = async () => {
    if (!uploadFile || !user) return;

    setIsUploadModalOpen(false);
    setIsUploading(true);
    const type = uploadCategory;
    const file = uploadFile;

    const storageRef = ref(storage, `media/${type.toLowerCase()}s/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

        const assetData = {
          name: file.name,
          url: downloadURL,
          type,
          size: file.size,
          createdAt: new Date().toISOString(),
          uploadedBy: user.uid,
          storagePath: uploadTask.snapshot.ref.fullPath
        };

        await dbService.addDocument('media_assets', assetData);
        setIsUploading(false);
        setUploadProgress(0);
      }
    );
  };

  const handleDelete = async (asset: any) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;

    try {
      // Delete from Storage
      const storageRef = ref(storage, asset.storagePath);
      await deleteObject(storageRef);

      // Delete from Firestore
      await dbService.deleteDocument('media_assets', asset.id);
    } catch (error) {
      console.error("Error deleting asset:", error);
      alert("Failed to delete asset.");
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesType = filterType === 'ALL' || asset.type === filterType;
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  if (role !== 'PUSAT') {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-500">Access Restricted. Only PUSAT can manage Media Library.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-500">Manage assets for AI Content generation</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors">
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Upload Asset
            <input type="file" className="hidden" onChange={handleFileSelect} disabled={isUploading} />
          </label>
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && uploadFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Upload Asset</h3>
              <button
                onClick={() => { setIsUploadModalOpen(false); setUploadFile(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selected File</label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 truncate">
                  {uploadFile.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['PHOTO', 'VIDEO', 'COMPONENT', 'LOGO'] as AssetType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setUploadCategory(type)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium border text-center transition-colors ${
                        uploadCategory === type
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:border-emerald-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Select the correct category to ensure it works properly in the AI Content Generator.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => { setIsUploadModalOpen(false); setUploadFile(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Upload File
              </button>
            </div>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-emerald-700">Uploading asset...</span>
            <span className="text-sm text-emerald-600 font-bold">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <Filter className="w-4 h-4 text-gray-400 mr-2" />
          {(['ALL', 'PHOTO', 'VIDEO', 'COMPONENT', 'LOGO'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === type
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Assets Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No assets found</h3>
          <p className="text-gray-500 mt-1">Upload photos, videos, or design components to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                {asset.type === 'PHOTO' || asset.type === 'LOGO' || asset.type === 'COMPONENT' ? (
                  <img src={asset.url} alt={asset.name} crossOrigin="anonymous" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <Video className="w-10 h-10 mb-2" />
                    <span className="text-[10px] font-bold uppercase">Video Clip</span>
                  </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => window.open(asset.url, '_blank')}
                    className="p-2 bg-white rounded-full text-gray-700 hover:text-emerald-600 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(asset)}
                    className="p-2 bg-white rounded-full text-gray-700 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-gray-700 truncate">{asset.name}</p>
                <div className="flex items-center justify-between mt-1">
                   <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                     asset.type === 'PHOTO' ? 'bg-blue-50 text-blue-600' :
                     asset.type === 'VIDEO' ? 'bg-purple-50 text-purple-600' :
                     asset.type === 'LOGO' ? 'bg-orange-50 text-orange-600' :
                     'bg-gray-50 text-gray-600'
                   }`}>
                     {asset.type}
                   </span>
                   <span className="text-[10px] text-gray-400">
                     {(asset.size / 1024 / 1024).toFixed(2)} MB
                   </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
