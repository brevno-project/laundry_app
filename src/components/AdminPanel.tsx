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
    queue,
    markDone, 
    startNext, 
    clearQueue 
  } = useLaundry();
  
  const [adminKey, setAdminKey] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [error, setError] = useState('');
  
  // Find current washing item from queue
  const washingItem = queue.find(item => item.status === 'washing');

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
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">🔒 Администратор</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="adminKey" className="block text-sm font-bold mb-2 text-gray-700">
              Ключ администратора
            </label>
            <input
              id="adminKey"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              placeholder="Введите ключ"
            />
            {error && <p className="mt-2 text-red-600 text-sm font-semibold">{error}</p>}
          </div>
          <button
            onClick={handleAdminLogin}
            className="w-full bg-purple-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-purple-700 transition-colors shadow-md"
          >
            Войти как админ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-purple-700 p-6 rounded-lg shadow-lg border-2 border-purple-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">👑 Панель админа</h2>
        <button
          onClick={handleAdminLogout}
          className="bg-purple-800 hover:bg-purple-900 text-white text-sm font-semibold px-3 py-2 rounded transition-colors"
        >
          🚪 Выйти
        </button>
      </div>
      
      <div className="space-y-4">
        {washingItem && (
          <button
            onClick={() => markDone(washingItem.id)}
            className="w-full bg-green-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-green-700 transition-colors shadow-md"
          >
            ✅ Отметить стирку завершенной
          </button>
        )}
        
        <button
          onClick={startNext}
          className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-blue-700 transition-colors shadow-md"
        >
          ▶️ Запустить следующего
        </button>
        
        {!showConfirmClear ? (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="w-full bg-red-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-red-700 transition-colors shadow-md"
          >
            🗑️ Очистить очередь
          </button>
        ) : (
          <div className="bg-white p-4 rounded-md border-2 border-red-400">
            <p className="text-red-700 font-bold text-base mb-3">⚠️ Вы уверены, что хотите очистить всю очередь?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
              >
                ❌ Отмена
              </button>
              <button
                onClick={handleClearQueueConfirm}
                className="flex-1 bg-red-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                ✅ Да, очистить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
