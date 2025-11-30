'use client';

import { useState } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';

export default function AdminLogin() {
  const { adminLogin } = useLaundry();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError('Введите пароль');
      return;
    }
  
    setLoading(true);
    setError('');
  
    try {
      // ✅ Вызываем безопасный API route, который проверяет пароль на сервере
      await adminLogin(password);
      setError('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg border-2 border-gray-700 mt-4">
      <h3 className="text-lg font-bold text-white mb-3 text-center">🔑 Вход для админа</h3>
      <form onSubmit={handleAdminLogin} className="space-y-3">
        <div>
          {/* ✅ Улучшенное поле пароля с белым текстом */}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full rounded-md border-2 border-gray-600 bg-gray-900 text-white text-lg font-bold shadow-sm p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 placeholder:text-gray-400"
            disabled={loading}
          />
        </div>
        
        {error && (
          <div className="bg-red-100 border-2 border-red-400 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? 'Вход...' : '🔓 Войти как админ'}
        </button>
      </form>
    </div>
  );
}