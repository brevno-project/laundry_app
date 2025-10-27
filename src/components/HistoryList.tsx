"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import { formatDate } from '@/contexts/LaundryContext';

export default function HistoryList() {
  const { history } = useLaundry();

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">📊 Recent History</h2>
      <div className="space-y-3">
        {history.map((item) => (
          <div 
            key={item.id} 
            className="p-4 bg-gradient-to-r from-gray-100 to-gray-50 rounded-md border-l-4 border-green-600 shadow-sm"
          >
            <p className="font-bold text-gray-900 text-base">{item.userName} {item.userRoom && `(Room ${item.userRoom})`}</p>
            <div className="text-sm text-gray-700 mt-2 space-y-1">
              <p><span className="font-semibold">Started:</span> {formatDate(item.startedAt)}</p>
              <p><span className="font-semibold">Finished:</span> {formatDate(item.finishedAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
