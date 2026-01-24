import React, { useEffect, useState } from 'react';
// import { dbService } from '../../services/firebaseService';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  // const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Example: Fetching from a 'stats' collection
        // In a real app, this would likely be empty until configured
        // const stats = await dbService.getCollection('stats');
        // setData(stats);

        // Simulating delay for demo
        setTimeout(() => setLoading(false), 1000);
      } catch (error) {
        console.error("Error loading dashboard", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

      {loading ? (
        <div className="text-gray-500">Loading data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mock Widget 1 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">1,234</p>
          </div>

          {/* Mock Widget 2 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">Revenue</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">$12,345</p>
          </div>

          {/* Mock Widget 3 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">Active Sessions</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">42</p>
          </div>
        </div>
      )}
    </div>
  );
};
