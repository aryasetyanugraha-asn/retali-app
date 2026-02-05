import React, { useState, useEffect } from 'react';
import { useRole, UserRole } from '../../context/RoleContext';
import { useUserProfile } from '../../hooks/useUserProfile'; // Import hook
import { useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Info,
  Wallet, // Add Wallet
  AlertCircle // Add AlertCircle
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// Mock Data Generators
const generateGrowthData = (base: number, volatility: number) => {
  return Array.from({ length: 7 }, (_, i) => ({
    name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    value: Math.floor(base + Math.random() * volatility)
  }));
};

const STATS_DATA = {
  PUSAT: {
    totalLeads: 15420,
    leadsChange: '+12.5%',
    conversion: '2.4%',
    conversionChange: '-0.1%',
    activeCampaigns: 24,
    campaignsChange: '+3',
    chartData: generateGrowthData(500, 100)
  },
  CABANG: {
    totalLeads: 1250,
    leadsChange: '+5.2%',
    conversion: '4.8%',
    conversionChange: '+1.2%',
    activeCampaigns: 5,
    campaignsChange: '+1',
    chartData: generateGrowthData(50, 20)
  },
  MITRA: {
    totalLeads: 48,
    leadsChange: '+8.5%',
    conversion: '15.2%',
    conversionChange: '+2.5%',
    activeCampaigns: 1,
    campaignsChange: '0',
    chartData: generateGrowthData(5, 5)
  }
};

const StatCard = ({ title, value, change, icon: Icon, color }: any) => {
  const isPositive = change.startsWith('+');
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="mt-4 flex items-center">
        <span className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
          {change}
        </span>
        <span className="text-sm text-gray-400 ml-2">vs last week</span>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { role } = useRole();
  const { profile } = useUserProfile(); // Get profile
  const navigate = useNavigate();
  const [data, setData] = useState(STATS_DATA['PUSAT']);
  const [loading, setLoading] = useState(false);

  // Check if profile is incomplete (only for real MITRA users)
  const isProfileIncomplete = role === 'MITRA' && profile?.role === 'MITRA' &&
    (!profile.phoneNumber || !profile.bankDetails?.accountNumber);

  useEffect(() => {
    // Simulate API fetch when role changes
    setLoading(true);
    const timer = setTimeout(() => {
      setData(STATS_DATA[role as UserRole]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [role]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {role === 'PUSAT' && 'Headquarters Overview'}
            {role === 'CABANG' && 'Branch Performance'}
            {role === 'MITRA' && 'Partner Dashboard'}
          </h1>
          <p className="text-gray-500 mt-1">Real-time monitoring and analytics</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Download Report
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <>
          {/* Complete Profile Banner */}
          {isProfileIncomplete && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm animate-fade-in">
              <div className="flex items-center space-x-3 mb-3 sm:mb-0">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-amber-800">Lengkapi Profil Anda</h3>
                  <p className="text-sm text-amber-700">Mohon lengkapi data diri dan rekening bank untuk keperluan transfer fee.</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="w-full sm:w-auto bg-amber-100 text-amber-800 px-4 py-2 rounded-lg font-medium hover:bg-amber-200 transition-colors whitespace-nowrap"
              >
                Lengkapi Sekarang
              </button>
            </div>
          )}

          {/* Welcome Message for MITRA */}
          {role === 'MITRA' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                  <Info className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-emerald-900 mb-2">
                    Selamat Datang di Mitra Retali
                  </h2>
                  <div className="space-y-3 text-emerald-800">
                    <p>
                      Terima kasih telah bergabung bersama kami. Langkah pertama Anda adalah melengkapi profil dan menghubungkan akun media sosial Anda.
                    </p>
                    <div className="bg-white/60 rounded-lg p-4 border border-emerald-100">
                      <p className="font-medium mb-1">Status Sistem:</p>
                      <p className="text-sm mb-3">
                        Saat ini sedang tahap koneksi ke jaringan media sosial.
                      </p>
                      <p className="text-sm font-medium">
                        "Mohon menunggu fitur kami yang akan datang jika ada pertanyaan dapat menghubungi kontak berikut : <span className="font-bold select-all">08131914048 (Pak Budi - Kacab Jaksel Retali)</span>"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {role === 'MITRA' ? (
              <StatCard
                title="Pencapaian Fee"
                value={`Rp ${(profile?.feeAchievement || 0).toLocaleString('id-ID')}`}
                change={profile?.feeAchievement ? "+100%" : "0%"}
                icon={Wallet}
                color="bg-emerald-500"
              />
            ) : (
              <StatCard
                title="Total Leads"
                value={data.totalLeads.toLocaleString()}
                change={data.leadsChange}
                icon={Users}
                color="bg-blue-500"
              />
            )}

            <StatCard
              title={role === 'MITRA' ? "Total Leads" : "Conversion Rate"}
              value={data.conversion}
              change={data.conversionChange}
              icon={Target}
              color="bg-green-500"
            />
            <StatCard
              title="Active Campaigns"
              value={data.activeCampaigns}
              change={data.campaignsChange}
              icon={Activity}
              color="bg-purple-500"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-gray-500" />
                Lead Growth Trend
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Role Specific Widget */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {role === 'PUSAT' && 'Top Performing Branches'}
                {role === 'CABANG' && 'Top Partners'}
                {role === 'MITRA' && 'Recent Activities'}
              </h3>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                        {role === 'MITRA' ? 'L' : i}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {role === 'PUSAT' && `Branch Jakarta South ${i}`}
                          {role === 'CABANG' && `Partner Ahmad ${i}`}
                          {role === 'MITRA' && `New Lead: Budi Santoso`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {role === 'MITRA' ? 'Just now' : `${Math.floor(Math.random() * 100)} Leads generated`}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {role === 'MITRA' ? 'Pending' : '+12%'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
