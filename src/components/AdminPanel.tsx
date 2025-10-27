"use client";

import { useState } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { MachineStatus } from '@/types';

export default function AdminPanel() {
  const { 
    isAdmin, 
    setIsAdmin, 
    verifyAdminKey, 
    machineState, 
    markDone, 
    startNext, 
    clearQueue 
  } = useLaundry();
  
  const [adminKey, setAdminKey] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [error, setError] = useState('');

  // Handle admin login
  const handleAdminLogin = () => {
    if (adminKey.trim() === '') {
      setError('Please enter the admin key');
      return;
    }
    
    const isValid = verifyAdminKey(adminKey.trim());
    if (!isValid) {
      setError('Invalid admin key');
    } else {
      setError('');
    }
  };

  // Handle admin logout
  const handleAdminLogout = () => {
    setIsAdmin(false);
    setAdminKey('');
  };

  // Handle clear queue confirmation
  const handleClearQueueConfirm = () => {
    clearQueue();
    setShowConfirmClear(false);
  };

  if (!isAdmin) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-800">🔒 Admin Access</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="adminKey" className="block text-sm font-semibold text-gray-700 mb-1">
              Admin Key
            </label>
            <input
              id="adminKey"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              placeholder="Enter admin key"
            />
            {error && <p className="mt-1 text-red-600 text-sm font-semibold">{error}</p>}
          </div>
          <button
            onClick={handleAdminLogin}
            className="w-full bg-purple-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-purple-700 transition-colors shadow-md"
          >
            Login as Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-purple-700 p-6 rounded-lg shadow-lg mb-6 border-2 border-purple-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">🔧 Admin Panel</h2>
        <button
          onClick={handleAdminLogout}
          className="text-sm font-semibold text-white bg-purple-800 hover:bg-purple-900 px-3 py-2 rounded"
        >
          Logout
        </button>
      </div>
      
      <div className="space-y-4">
        {machineState.status === MachineStatus.WASHING && (
          <button
            onClick={markDone}
            className="w-full bg-green-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-green-700 transition-colors shadow-md"
          >
            ✅ Mark Current Washing as Done
          </button>
        )}
        
        <button
          onClick={startNext}
          className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-blue-700 transition-colors shadow-md"
        >
          ▶️ Start Next in Queue
        </button>
        
        {!showConfirmClear ? (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="w-full bg-red-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-red-700 transition-colors shadow-md"
          >
            🗑️ Clear Queue
          </button>
        ) : (
          <div className="bg-red-100 p-4 rounded-md border-2 border-red-300">
            <p className="text-red-900 font-bold mb-3 text-base">Are you sure you want to clear the queue?</p>
            <div className="flex space-x-2">
              <button
                onClick={handleClearQueueConfirm}
                className="bg-red-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-700 transition-colors shadow"
              >
                Yes, Clear Queue
              </button>
              <button
                onClick={() => setShowConfirmClear(false)}
                className="bg-gray-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-700 transition-colors shadow"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
