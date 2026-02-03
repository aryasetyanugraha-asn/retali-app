import React from 'react';
import { ScheduledPostsList } from '../content/ScheduledPostsList';

export const SchedulePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Jadwal Posting</h1>
            <p className="text-gray-500">Kelola dan pantau jadwal konten media sosial Anda.</p>
        </div>
      </div>

      <ScheduledPostsList />
    </div>
  );
};
